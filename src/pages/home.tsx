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
  ArrowUpRight,
  Zap,
} from 'lucide-react';
import { api, apiPost } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { channelFromJid } from '@/lib/channels';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSessionTitle, formatSessionKey } from '@/hooks/use-session-title';
import { relativeTime } from '@/lib/format';

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

function mapSession(s: RawSession): Session {
  return { key: s.session_key, group: s.group_folder, channel: channelFromJid(s.chat_jid), startedAt: s.created_at };
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

// ---- Quick Actions for welcome ----

const quickActions = [
  { title: 'Start a chat', icon: MessageSquare, href: '/chat', primary: true },
  { title: 'Create workflow', icon: Workflow, href: 'workflows' },
  { title: 'View settings', icon: Settings, href: '/settings' },
];

// ---- Stats for welcome ----

interface StatItem {
  label: string;
  value: string;
  change?: string | null;
}

function StatsGrid({ stats }: { stats: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-accent/30 hover:bg-muted/50"
        >
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-accent/5 transition-transform group-hover:scale-150" />
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">
                {stat.value}
              </span>
              {stat.change && (
                <span className="flex items-center text-xs font-medium text-success">
                  <Zap className="mr-0.5 h-3 w-3" />
                  {stat.change}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Welcome state ----

function WelcomeState() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 animate-fade-in-up delay-100"
    >
      <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-accent/5 to-transparent" />
      <div className="relative flex flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Activity className="h-8 w-8 text-accent" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          Welcome to NanoClaw
        </h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          Your personal AI cockpit — connect your channels and start chatting.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              to={action.href}
              className={cn(
                'group flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200 min-h-[44px]',
                action.primary
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/10'
                  : 'border border-border bg-card hover:bg-muted hover:border-muted',
              )}
            >
              <action.icon className="h-4 w-4" />
              {action.title}
              <ArrowUpRight className="h-3 w-3 opacity-0 -translate-y-0.5 translate-x-0.5 transition-all group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Session row with semantic title ----

function SessionRow({ session, group }: { session: Session; group: string }) {
  const title = useSessionTitle(session.key);
  const displayName = title ?? formatSessionKey(session.key);

  return (
    <li>
      <Link
        to={`/g/${group}/sessions/${session.key}`}
        className="flex items-center justify-between px-2 py-2.5 hover:bg-muted/50 rounded-lg transition-colors duration-150 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {session.startedAt ? relativeTime(session.startedAt) : 'Unknown'}
            {session.channel && <> · <span className="capitalize">{session.channel}</span></>}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
      </Link>
    </li>
  );
}

// ---- Recent Sessions section ----

function RecentSessions({ group, sessions, isLoading }: { group: string; sessions: Session[]; isLoading: boolean }) {
  const slice = sessions.slice(0, 5);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10">
            <History className="h-3.5 w-3.5 text-accent" />
          </div>
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
              <SessionRow key={s.key} session={s} group={group} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Active Tasks section ----

function ActiveTasks({ group, active, isLoading }: { group: string; active: Task[]; isLoading: boolean }) {

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10">
            <Activity className="h-3.5 w-3.5 text-accent" />
          </div>
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
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10">
            <CheckSquare className="h-3.5 w-3.5 text-amber-500" />
          </div>
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
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
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
                    className="h-7 px-2 text-xs bg-success hover:bg-success/90 text-white"
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
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10">
            <Zap className="h-3.5 w-3.5 text-accent" />
          </div>
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
      const raw = await api<RawDashboardData>(`/api/dashboard?group=${encodeURIComponent(activeGroup)}`);
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
  const activeTasks = tasks.filter((t) => ['running', 'pending', 'scheduled'].includes(t.status));

  const showWelcome = !activeGroup || (dashError && !dashLoading &&
    allSessions.length === 0 && tasks.length === 0 && gates.length === 0 && logs.length === 0);

  const greeting = getGreeting();

  return (
    <div className="relative">
      {/* Ambient glow */}
      <div className="ambient-glow" />

      {/* Header */}
      <header className="relative border-b border-border px-4 md:px-8 py-10">
        <div className="mx-auto max-w-5xl">
          <h1
            className={cn(
              'text-4xl md:text-5xl font-bold tracking-tight text-foreground transition-all duration-700',
              'animate-fade-in-up',
            )}
          >
            {greeting}
            {user?.username ? `, ${user.username}` : ''}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {activeGroup ? (
              <>Viewing group: <span className="font-mono text-foreground">{activeGroup}</span></>
            ) : (
              'Select a group to get started'
            )}
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="relative px-4 md:px-8 py-12">
        <div className="mx-auto max-w-5xl space-y-12">
          {/* Welcome Card — always shown */}
          {showWelcome && <WelcomeState />}

          {/* Stats Grid */}
          <StatsGrid stats={[
            { label: 'Active Sessions', value: String(allSessions.length) },
            { label: 'Messages Today', value: '0' },
            { label: 'Workflows', value: String(tasks.length), change: tasks.length > 0 ? `+${tasks.length}` : null },
            { label: 'Integrations', value: '0' },
          ]} />

          {/* Dashboard sections — compact 2-col grid */}
          {!showWelcome && (
            <div className="grid gap-4 md:grid-cols-2">
              <RecentSessions group={activeGroup} sessions={allSessions} isLoading={dashLoading} />
              <ActiveTasks group={activeGroup} active={activeTasks} isLoading={dashLoading} />
              {isAdmin && <PendingApprovals gates={gates} isLoading={dashLoading} />}
              <RecentActivity logs={logs} isLoading={dashLoading} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
