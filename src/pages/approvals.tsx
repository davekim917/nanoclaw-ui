import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, Clock, CheckCircle, XCircle } from 'lucide-react';
import React from 'react';

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

// ---- Helpers ----

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold">{gate.label}</CardTitle>
          {gate.group && (
            <Badge variant="outline" className="shrink-0 text-xs">
              {gate.group}
            </Badge>
          )}
        </div>
        {gate.summary && (
          <p className="text-sm text-muted-foreground">{gate.summary}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {gate.context && (
          <div className="rounded-md bg-muted p-3 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-auto">
            {gate.context}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {relativeTime(gate.createdAt)}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="min-h-[44px] bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onApprove(gate.id)}
              disabled={isPending}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="min-h-[44px]"
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
  return (
    <Card>
      <CardContent className="py-3 px-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
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
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 20;

  // Redirect non-admins
  React.useEffect(() => {
    if (!authLoading && !isAdmin) {
      void navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  const { data: pending, isLoading: pendingLoading } = useQuery<Gate[]>({
    queryKey: [...queryKeys.gates(), 'pending'],
    queryFn: () => api<Gate[]>('/api/gates?status=pending'),
    enabled: isAdmin,
  });

  const { data: history, isLoading: historyLoading } = useQuery<Gate[]>({
    queryKey: [...queryKeys.gateHistory(), page],
    queryFn: () => api<Gate[]>(`/api/gates/history?page=${page}&limit=${PAGE_SIZE}`),
    enabled: isAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiPost<void>(`/api/gates/${id}/approve`),
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
    mutationFn: (id: string) => apiPost<void>(`/api/gates/${id}/cancel`),
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
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          Approvals
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Review and approve pending agent gate requests
        </p>
      </div>

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
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">All clear</p>
              <p className="text-sm mt-1">No pending approvals</p>
            </div>
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
            <div className="text-center py-16 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No history yet</p>
              <p className="text-sm mt-1">Resolved gates will appear here</p>
            </div>
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
  );
}
