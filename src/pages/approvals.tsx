import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { relativeTime } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, Clock, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/layout/page-header';

// ---- Types ----

interface Gate {
  id: string;
  label: string;
  summary?: string;
  context?: string;
  createdAt: string;
  resolvedAt?: string;
  status: 'pending' | 'approved' | 'cancelled';
  group?: string;
}

interface RawGate {
  id: string;
  label: string;
  summary?: string;
  context_data?: string;
  created_at: string;
  resolved_at?: string;
  status: string;
  group_folder?: string;
}

interface GatesResponse {
  data: RawGate[];
  total: number;
}

function mapGate(raw: RawGate): Gate {
  return {
    id: raw.id,
    label: raw.label,
    summary: raw.summary,
    context: raw.context_data,
    createdAt: raw.created_at,
    resolvedAt: raw.resolved_at,
    status: raw.status as Gate['status'],
    group: raw.group_folder,
  };
}

// ---- Skeleton ----

function GateSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-72 mt-1" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Pending Gate Card ----

interface PendingCardProps {
  gate: Gate;
  onApprove: (id: string) => void;
  onCancel: (id: string) => void;
  isPending: boolean;
}

function PendingGateCard({ gate, onApprove, onCancel, isPending }: PendingCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-amber-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base font-semibold">{gate.label}</CardTitle>
              {gate.group && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  {gate.group}
                </Badge>
              )}
            </div>
            {gate.summary && (
              <p className="text-sm text-muted-foreground mt-0.5">{gate.summary}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {gate.context && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="touch-compact flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
              {expanded ? 'Hide details' : 'View details'}
            </button>
            {expanded && (
              <div className="rounded-lg bg-muted p-3 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-auto">
                {gate.context}
              </div>
            )}
          </>
        )}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {relativeTime(gate.createdAt)}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="min-h-[44px] bg-success hover:bg-success/90 text-white"
              onClick={() => onApprove(gate.id)}
              disabled={isPending}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="min-h-[44px] border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onCancel(gate.id)}
              disabled={isPending}
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- History Gate Card ----

function HistoryGateCard({ gate }: { gate: Gate }) {
  const statusIcon = gate.status === 'approved'
    ? <CheckCircle className="h-4 w-4 text-success" />
    : <XCircle className="h-4 w-4 text-destructive" />;

  return (
    <Card>
      <CardContent className="py-3 px-4 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted mt-0.5">
          {statusIcon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{gate.label}</p>
          {gate.summary && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{gate.summary}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {gate.resolvedAt ? relativeTime(gate.resolvedAt) : relativeTime(gate.createdAt)}
          </p>
        </div>
        <Badge
          variant={gate.status === 'approved' ? 'default' : 'secondary'}
          className="shrink-0 capitalize"
        >
          {gate.status}
        </Badge>
      </CardContent>
    </Card>
  );
}

// ---- Page ----

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      void navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  const { data: pending, isLoading: pendingLoading } = useQuery<Gate[]>({
    queryKey: [...queryKeys.gates(), 'pending'],
    queryFn: async () => {
      const raw = await api<GatesResponse>('/api/gates?status=pending');
      return (raw.data ?? []).map(mapGate);
    },
    enabled: isAdmin,
  });

  const { data: history, isLoading: historyLoading } = useQuery<Gate[]>({
    queryKey: [...queryKeys.gateHistory(), page],
    queryFn: async () => {
      const raw = await api<GatesResponse>(`/api/gates?status=resolved&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
      return (raw.data ?? []).map(mapGate);
    },
    enabled: isAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiPost<void>(`/api/gates/${encodeURIComponent(id)}/approve`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [...queryKeys.gates(), 'pending'] });
      const prev = queryClient.getQueryData<Gate[]>([...queryKeys.gates(), 'pending']);
      queryClient.setQueryData(
        [...queryKeys.gates(), 'pending'],
        (old: Gate[] | undefined) => old?.filter((g) => g.id !== id) ?? [],
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      queryClient.setQueryData([...queryKeys.gates(), 'pending'], ctx?.prev);
      toast({ title: 'Failed to approve', variant: 'destructive' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gateHistory() });
      toast({ title: 'Gate approved' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiPost<void>(`/api/gates/${encodeURIComponent(id)}/cancel`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [...queryKeys.gates(), 'pending'] });
      const prev = queryClient.getQueryData<Gate[]>([...queryKeys.gates(), 'pending']);
      queryClient.setQueryData(
        [...queryKeys.gates(), 'pending'],
        (old: Gate[] | undefined) => old?.filter((g) => g.id !== id) ?? [],
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      queryClient.setQueryData([...queryKeys.gates(), 'pending'], ctx?.prev);
      toast({ title: 'Failed to cancel', variant: 'destructive' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gateHistory() });
      toast({ title: 'Gate cancelled' });
    },
  });

  const isMutating = approveMutation.isPending || cancelMutation.isPending;

  if (authLoading) {
    return (
      <div className="px-4 md:px-6 py-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="relative">
      <div className="ambient-glow" />
      <PageHeader icon={ShieldCheck} title="Approvals" subtitle="Review and approve pending agent gate requests" maxWidth="max-w-3xl">
        {pending && pending.length > 0 && (
          <Badge className="ml-auto rounded-xl bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 py-1">
            {pending.length} pending
          </Badge>
        )}
      </PageHeader>
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto">

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">
            Pending
            {pending && pending.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] text-xs px-1.5">
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingLoading ? (
            <div className="space-y-4">
              <GateSkeleton />
              <GateSkeleton />
            </div>
          ) : !pending?.length ? (
            <EmptyState
              icon={CheckCircle}
              title="All clear"
              description="No agents are waiting for your approval. Requests will appear here when they need permission to act."
            />
          ) : (
            <div className="space-y-4">
              {pending.map((gate) => (
                <PendingGateCard
                  key={gate.id}
                  gate={gate}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onCancel={(id) => cancelMutation.mutate(id)}
                  isPending={isMutating}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {historyLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !history?.length ? (
            <EmptyState
              icon={Clock}
              title="No history yet"
              description="Past approval decisions — approves, cancels, and their outcomes — will be recorded here."
            />
          ) : (
            <div className="space-y-2">
              {history.map((gate) => (
                <HistoryGateCard key={gate.id} gate={gate} />
              ))}
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="min-h-[44px]"
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">Page {page}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(history?.length ?? 0) < PAGE_SIZE}
                  onClick={() => setPage((p) => p + 1)}
                  className="min-h-[44px]"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </div>
  );
}
