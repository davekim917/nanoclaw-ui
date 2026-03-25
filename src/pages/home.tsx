import { Link, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  History,
  CheckSquare,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  PauseCircle,
  ChevronRight,
  AlertCircle,
  MessageSquare,
  Workflow,
  Settings,
} from 'lucide-react';
import { api, apiPost } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// ---- Greeting ----

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ---- API types ----

interface Session {
  key: string;
  group: string;
  channel?: string;
  startedAt?: string;
  messageCount?: number;
}

interface Task {
  id: string;
  name?: string;
  description?: string;
  status: 'pending' | 'running' | 'scheduled' | 'paused' | 'done' | 'cancelled';
  scheduledAt?: string;
}

interface Gate {
  id: string;
  group?: string;
  description?: string;
  createdAt?: string;
  type?: string;
}

interface LogEntry {
  id?: string;
  group?: string;
  summary?: string;
  createdAt?: string;
}

// Raw backend types (snake_case)
interface RawSession { session_key: string; group_folder: string; chat_jid: string; created_at: string; last_activity?: string }
interface RawTask { id: string; group_folder: string; prompt: string; schedule_value: string; status: string; next_run?: string; description?: string }
interface RawGate { id: string; group_folder?: string; label: string; summary?: string; created_at: string; status: string }
interface RawShipLogEntry { id?: number; group_folder?: string; summary?: string; created_at?: string }

function jidToChannel(jid: string): string {
  if (jid.startsWith('dc:')) return 'discord';
  if (jid.startsWith('slack:')) return 'slack';
  if (jid.startsWith('tg:')) return 'telegram';
  if (jid.includes('@s.whatsapp.net') || jid.includes('@g.us')) return 'whatsapp';
  return 'web';
}

function mapSession(s: RawSession): Session {
  return { key: s.session_key, group: s.group_folder, channel: jidToChannel(s.chat_jid), startedAt: s.created_at };
}
function mapTask(t: RawTask): Task {
  return { id: t.id, name: t.description ?? t.prompt.slice(0, 50), status: t.status as Task['status'], scheduledAt: t.next_run };
}
function mapGate(g: RawGate): Gate {
  return { id: g.id, group: g.group_folder, description: g.label, createdAt: g.created_at };
}
function mapShipLog(e: RawShipLogEntry): LogEntry {
  return { id: e.id != null ? String(e.id) : undefined, group: e.group_folder, summary: e.summary, createdAt: e.created_at };
}

// Dashboard raw response shape
interface RawDashboardData {
  recentSessions?: RawSession[];
  activeTasks?: RawTask[];
  pendingGates?: RawGate[];
  recentShipLog?: RawShipLogEntry[];
}

// ---- Status badge helpers ----

const taskStatusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.FC<{ className?: string }> }
> = {
  running: { label: 'Running', variant: 'default', icon: PlayCircle },
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
  scheduled: { label: 'Scheduled', variant: 'outline', icon: Clock },
  paused: { label: 'Paused', variant: 'outline', icon: PauseCircle },
  done: { label: 'Done', variant: 'secondary', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
};

function TaskStatusBadge({ status }: { status: string }) {
  const config = taskStatusConfig[status] ?? { label: status, variant: 'secondary' as const, icon: Clock };
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="flex items-center gap-1 text-xs">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ---- Section loading skeleton ----

function SectionSkeleton() {
  return (
    <div className="space-y-2 mt-1">
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
}

// ---- Empty state (reuse shared component) ----

import { EmptyState as SharedEmptyState } from '@/components/ui/empty-state';

// ---- Welcome state (shown when no group or all data is empty/errored) ----

function WelcomeState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-6">
        <Activity className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Welcome to NanoClaw</h2>
      <p className="text-muted-foreground text-sm mb-8 max-w-xs">
        Your personal AI cockpit — connect your channels and start chatting.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild variant="default" className="min-h-[44px]">
          <Link to="/chat">
            <MessageSquare className="h-4 w-4 mr-2" />
            Start a chat
          </Link>
        </Button>
        <Button asChild variant="outline" className="min-h-[44px]">
          <Link to="workflows">
            <Workflow className="h-4 w-4 mr-2" />
            Create a workflow
          </Link>
        </Button>
        <Button asChild variant="outline" className="min-h-[44px]">
          <Link to="/settings">
            <Settings className="h-4 w-4 mr-2" />
            View settings
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ---- Recent Sessions section ----

function RecentSessions({ group, sessions, isLoading }: { group: string; sessions: Session[]; isLoading: boolean }) {
  const slice = sessions.slice(0, 5);

  return (
    <Card className="border-l-2 border-l-primary/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <History className="h-4 w-4 text-primary/70" />
          Recent Sessions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <SectionSkeleton />
        ) : slice.length === 0 ? (
          <SharedEmptyState
            icon={History}
            title="No recent sessions"
            description="Sessions will appear here as you chat across channels."
            action={{ label: 'Start a chat', to: `/g/${group}/chat` }}
            compact
          />
        ) : (
          <ul className="divide-y divide-border -mx-2">
            {slice.map((s) => (
              <li key={s.key}>
                <Link
                  to={`/g/${group}/sessions/${s.key}`}
                  className="flex items-center justify-between px-2 py-2.5 hover:bg-accent rounded-md transition-colors duration-150 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{s.key}</p>
                    {s.startedAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(s.startedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {s.channel && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {s.channel}
                      </Badge>
                    )}
                    {typeof s.messageCount === 'number' && (
                      <span className="text-xs text-muted-foreground">
                        {s.messageCount} msgs
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Active Tasks section ----

function ActiveTasks({ group, tasks, isLoading }: { group: string; tasks: Task[]; isLoading: boolean }) {
  const active = tasks.filter((t) =>
    ['running', 'pending', 'scheduled'].includes(t.status),
  );

  return (
    <Card className="border-l-2 border-l-primary/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary/70" />
          Active Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <SectionSkeleton />
        ) : active.length === 0 ? (
          <SharedEmptyState
            icon={Activity}
            title="No active tasks"
            description="Scheduled tasks and running workflows will show here."
            action={{ label: 'Create a workflow', to: `/g/${group}/workflows` }}
            compact
          />
        ) : (
          <ul className="divide-y divide-border -mx-2">
            {active.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between px-2 py-2.5 min-h-[44px]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {t.name ?? t.description ?? t.id}
                  </p>
                  {t.scheduledAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(t.scheduledAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="ml-3 shrink-0">
                  <TaskStatusBadge status={t.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Pending Approvals section ----

function PendingApprovals({ gates, isLoading }: { gates: Gate[]; isLoading: boolean }) {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/api/gates/${encodeURIComponent(id)}/approve`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.gates() }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/api/gates/${encodeURIComponent(id)}/cancel`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.gates() }),
  });

  return (
    <Card className="border-l-2 border-l-yellow-400/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-yellow-500/80" />
          Pending Approvals
          {gates.length > 0 && (
            <Badge variant="destructive" className="ml-auto text-xs h-5 px-1.5">
              {gates.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <SectionSkeleton />
        ) : gates.length === 0 ? (
          <SharedEmptyState
            icon={CheckSquare}
            title="No pending approvals"
            description="When agents need your permission, approval requests appear here."
            compact
          />
        ) : (
          <ul className="divide-y divide-border -mx-2">
            {gates.map((g) => (
              <li
                key={g.id}
                className="flex items-start justify-between gap-3 px-2 py-3 min-h-[44px]"
              >
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {g.description ?? g.type ?? 'Approval required'}
                    </p>
                    {g.group && (
                      <p className="text-xs text-muted-foreground">{g.group}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => approveMutation.mutate(g.id)}
                    disabled={approveMutation.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => cancelMutation.mutate(g.id)}
                    disabled={cancelMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Recent Activity section ----

function RecentActivity({ logs, isLoading }: { logs: LogEntry[]; isLoading: boolean }) {
  const slice = logs.slice(0, 5);

  return (
    <Card className="border-l-2 border-l-primary/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary/70" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <SectionSkeleton />
        ) : slice.length === 0 ? (
          <SharedEmptyState
            icon={Activity}
            title="No recent activity"
            description="Agent actions, completions, and events will be logged here."
            compact
          />
        ) : (
          <ul className="divide-y divide-border -mx-2">
            {slice.map((entry, idx) => (
              <li
                key={entry.id ?? idx}
                className="px-2 py-2.5 min-h-[44px]"
              >
                <p className="text-sm truncate">{entry.summary ?? '—'}</p>
                {entry.createdAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Main page ----

export default function HomePage() {
  const { group } = useParams<{ group: string }>();
  const { user, isAdmin } = useAuth();
  const activeGroup = group ?? '';

  // Single dashboard endpoint — transforms raw snake_case to UI types
  const { data: dashboardData, isLoading: dashLoading, isError: dashError } = useQuery({
    queryKey: queryKeys.dashboard(activeGroup),
    queryFn: async () => {
      const raw = await api<RawDashboardData>(`/api/dashboard?group=${activeGroup}`);
      return {
        sessions: (raw.recentSessions ?? []).map(mapSession),
        tasks: (raw.activeTasks ?? []).map(mapTask),
        gates: (raw.pendingGates ?? []).map(mapGate),
        logs: (raw.recentShipLog ?? []).map(mapShipLog),
      };
    },
    staleTime: 30_000,
    retry: false,
  });

  const allSessions: Session[] = dashboardData?.sessions ?? [];
  const tasks: Task[] = dashboardData?.tasks ?? [];
  const gates: Gate[] = dashboardData?.gates ?? [];
  const logs: LogEntry[] = dashboardData?.logs ?? [];

  const isLoadingSessions = dashLoading;
  const isLoadingTasks = dashLoading;
  const isLoadingGates = dashLoading;
  const isLoadingLogs = dashLoading;

  // Show welcome state when the backend is unreachable or returns no data and no group selected
  const allErrored = dashError;
  const allEmpty =
    !dashLoading &&
    allSessions.length === 0 &&
    tasks.length === 0 &&
    gates.length === 0 &&
    logs.length === 0;
  const showWelcome = !activeGroup || (allErrored && allEmpty);

  const greeting = getGreeting();

  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto w-full">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting}
          {user?.username ? `, ${user.username}` : ''}
        </h1>
        <p className="text-muted-foreground text-sm mt-1.5">
          {activeGroup ? `Viewing group: ${activeGroup}` : 'Select a group to get started'}
        </p>
      </div>

      {showWelcome ? (
        <WelcomeState />
      ) : (
        /* Dashboard grid */
        <div className="grid gap-4">
          <RecentSessions
            group={activeGroup}
            sessions={allSessions}
            isLoading={isLoadingSessions}
          />

          <ActiveTasks group={activeGroup} tasks={tasks} isLoading={isLoadingTasks} />

          {isAdmin && (
            <PendingApprovals gates={gates} isLoading={isLoadingGates} />
          )}

          <RecentActivity logs={logs} isLoading={isLoadingLogs} />
        </div>
      )}
    </div>
  );
}
