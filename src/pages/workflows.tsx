import { useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost, apiPatch, apiDelete } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import { relativeTime, humanCron } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Play, Pause, Trash2, ArrowLeft, Clock, Calendar, Activity, Workflow as WorkflowIcon, Zap, Settings2, MoreHorizontal } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';

// ---- Types ----

interface Task {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  schedule: string;
  status: 'active' | 'paused' | 'completed';
  lastRun?: string;
  nextRun?: string;
  group: string;
}

interface RawTask {
  id: string;
  group_folder: string;
  prompt: string;
  schedule_type: string;
  schedule_value: string;
  status: string;
  next_run?: string;
  last_run_at?: string;
  description?: string;
}

interface TasksResponse {
  data: RawTask[];
  total: number;
}

function mapTask(raw: RawTask): Task {
  return {
    id: raw.id,
    name: raw.description ?? raw.prompt.slice(0, 50),
    description: raw.description,
    prompt: raw.prompt,
    schedule: raw.schedule_value,
    status: raw.status as Task['status'],
    lastRun: raw.last_run_at,
    nextRun: raw.next_run,
    group: raw.group_folder,
  };
}

interface TaskLog {
  id: string;
  taskId: string;
  startedAt: string;
  finishedAt?: string;
  status: 'success' | 'error' | 'running';
  output?: string;
}

interface RawTaskLog {
  id: number;
  task_id: string;
  run_at: string;
  duration_ms: number;
  status: string;
  result?: string;
  error?: string;
}

// ---- Helpers ----

const WORKFLOW_STATUS_CFG: Record<string, { color: string; label: string }> = {
  active: { color: 'bg-emerald-500', label: 'Active' },
  paused: { color: 'bg-amber-500', label: 'Paused' },
  completed: { color: 'bg-muted-foreground', label: 'Done' },
};

function statusVariant(status: Task['status']): 'default' | 'secondary' | 'outline' {
  if (status === 'active') return 'default';
  if (status === 'paused') return 'secondary';
  return 'outline';
}

// ---- Skeletons ----

function WorkflowCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64 mt-1" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </CardContent>
    </Card>
  );
}

// ---- Create Dialog ----

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: string;
}

function CreateWorkflowDialog({ open, onOpenChange, group }: CreateDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [schedule, setSchedule] = useState('0 9 * * *');

  const createMutation = useMutation({
    mutationFn: (data: Partial<Task>) => apiPost<Task>('/api/tasks', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks(group) });
      onOpenChange(false);
      setName('');
      setDescription('');
      setPrompt('');
      setSchedule('0 9 * * *');
      toast({ title: 'Workflow created' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create workflow', description: err.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name, description, prompt, schedule, group });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Workflow</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wf-name">Name</Label>
            <Input
              id="wf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Daily digest"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wf-description">Description</Label>
            <Input
              id="wf-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this workflow does"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wf-prompt">Prompt</Label>
            <Textarea
              id="wf-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Summarize the latest news and send it to me"
              rows={4}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wf-schedule">Schedule (cron)</Label>
            <Input
              id="wf-schedule"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="0 9 * * *"
              required
            />
            {schedule && (
              <p className="text-xs text-muted-foreground">{humanCron(schedule)}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Workflow'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- List View ----

function WorkflowsListPage({ group }: { group: string }) {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  // Fetch all tasks (cross-group), then optionally filter
  const { data: tasks, isLoading, isError } = useQuery<Task[]>({
    queryKey: queryKeys.tasks('__all'),
    queryFn: async () => {
      const raw = await api<TasksResponse>('/api/tasks?limit=100');
      return (raw.data ?? []).map(mapTask);
    },
    staleTime: 30_000,
    retry: false,
  });

  return (
    <div className="relative">
      <div className="ambient-glow" />
      <PageHeader icon={Calendar} title="Workflows" subtitle="Scheduled tasks across all groups">
        <Button onClick={() => setCreateOpen(true)} className="ml-auto min-h-[44px] bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20">
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </PageHeader>
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">

      {isLoading && !isError ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <WorkflowCardSkeleton key={i} />)}
        </div>
      ) : !tasks?.length ? (
        <EmptyState
          icon={Calendar}
          title="No workflows yet"
          description="Schedule recurring tasks — briefings, reports, maintenance — and let your agent handle them automatically."
          action={{ label: 'New Workflow', onClick: () => setCreateOpen(true) }}
        />
      ) : (() => {
        const activeCount = tasks.filter((t) => t.status === 'active').length;
        return (
          <div className="space-y-8">
            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: 'Total Workflows', value: String(tasks.length), icon: WorkflowIcon },
                { label: 'Active', value: String(activeCount), icon: Play },
                { label: 'Total Runs', value: '—', icon: Zap },
                { label: 'Avg. Response', value: '—', icon: Clock },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <stat.icon className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Workflow Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tasks.map((task) => {
                const statusCfg = WORKFLOW_STATUS_CFG[task.status] ?? { color: 'bg-muted-foreground', label: task.status };

                return (
                  <div
                    key={task.id}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all cursor-pointer hover:border-accent/30"
                    onClick={() => void navigate(`/g/${task.group || group}/workflows/${task.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void navigate(`/g/${task.group || group}/workflows/${task.id}`); } }}
                  >
                    {/* Status dot */}
                    <div className="absolute right-4 top-4 flex items-center gap-2">
                      <div className={cn('h-2 w-2 rounded-full', statusCfg.color)} />
                      <span className="text-xs text-muted-foreground">{statusCfg.label}</span>
                    </div>

                    {/* Icon */}
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-accent/10">
                      <WorkflowIcon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-accent" />
                    </div>

                    <h3 className="font-semibold text-foreground">{task.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {humanCron(task.schedule)}
                    </p>

                    {/* Meta */}
                    <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {task.schedule}
                      </div>
                      {task.lastRun && (
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {relativeTime(task.lastRun)}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                      <button
                        className={cn(
                          'touch-compact flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                          task.status === 'active'
                            ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20',
                        )}
                        onClick={(e) => { e.stopPropagation(); }}
                      >
                        {task.status === 'active' ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Start</>}
                      </button>
                      <button
                        className="touch-compact flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        onClick={(e) => { e.stopPropagation(); void navigate(`/g/${task.group || group}/workflows/${task.id}`); }}
                      >
                        <Settings2 className="h-3 w-3" /> Configure
                      </button>
                      <button className="touch-compact ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Create Workflow CTA card */}
              <div
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center transition-colors hover:border-accent/50 hover:bg-accent/5 cursor-pointer"
                onClick={() => setCreateOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCreateOpen(true); } }}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">Create Workflow</p>
                <p className="mt-1 text-xs text-muted-foreground">Build a new automation</p>
              </div>
            </div>
          </div>
        );
      })()}

      <CreateWorkflowDialog open={createOpen} onOpenChange={setCreateOpen} group={group} />
    </div>
    </div>
  );
}

// ---- Detail View ----

function WorkflowDetailView({ group, id }: { group: string; id: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: task, isLoading, isError: taskError } = useQuery<Task>({
    queryKey: [...queryKeys.tasks(group), id],
    queryFn: async () => {
      const raw = await api<{ data: RawTask }>(`/api/tasks/${encodeURIComponent(id)}`);
      return mapTask(raw.data);
    },
    staleTime: 30_000,
    retry: false,
  });

  const { data: logs, isLoading: logsLoading, isError: logsError } = useQuery<TaskLog[]>({
    queryKey: [...queryKeys.tasks(group), id, 'logs'],
    queryFn: async () => {
      const raw = await api<{ data: RawTaskLog[] }>(`/api/tasks/${encodeURIComponent(id)}/logs`);
      return (raw.data ?? []).map((l) => ({
        id: String(l.id),
        taskId: l.task_id,
        startedAt: l.run_at,
        finishedAt: l.duration_ms ? new Date(new Date(l.run_at).getTime() + l.duration_ms).toISOString() : undefined,
        status: l.status as TaskLog['status'],
        output: l.result ?? l.error,
      }));
    },
    staleTime: 30_000,
    retry: false,
  });

  const pauseMutation = useMutation({
    mutationFn: () => apiPatch<void>(`/api/tasks/${encodeURIComponent(id)}/pause`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.tasks(group), id] });
      toast({ title: 'Workflow paused' });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => apiPatch<void>(`/api/tasks/${encodeURIComponent(id)}/resume`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.tasks(group), id] });
      toast({ title: 'Workflow resumed' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete<void>(`/api/tasks/${encodeURIComponent(id)}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks(group) });
      void navigate(`/g/${group}/workflows`);
      toast({ title: 'Workflow deleted' });
    },
    onError: (err) => {
      toast({ title: 'Failed to delete', description: err.message, variant: 'destructive' });
    },
  });

  if (isLoading && !taskError) {
    return (
      <div className="px-4 md:px-6 py-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Workflow not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => void navigate(`/g/${group}/workflows`)}>
          Back to Workflows
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => void navigate(`/g/${group}/workflows`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Workflows
          </button>
          <h1 className="text-2xl font-bold tracking-tight">{task.name}</h1>
          {task.description && (
            <p className="text-muted-foreground text-sm mt-0.5">{task.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={statusVariant(task.status)} className="capitalize">
            {task.status}
          </Badge>
          {task.status === 'active' ? (
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
            >
              <Pause className="h-3.5 w-3.5 mr-1.5" />
              Pause
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Resume
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(task.name)}
            disabled={deleteMutation.isPending}
            aria-label="Delete workflow"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Run History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
                Prompt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{task.prompt}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-mono">{task.schedule}</p>
              <p className="text-muted-foreground">{humanCron(task.schedule)}</p>
              {task.lastRun && (
                <p className="text-muted-foreground">Last run: {relativeTime(task.lastRun)}</p>
              )}
              {task.nextRun && (
                <p className="text-muted-foreground">
                  Next run: {new Date(task.nextRun).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          {logsLoading && !logsError ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !logs?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No runs yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="py-3 px-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-medium">
                          {new Date(log.startedAt).toLocaleString()}
                        </span>
                        {log.finishedAt && (
                          <span className="text-muted-foreground ml-2">
                            · {Math.round((new Date(log.finishedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)}s
                          </span>
                        )}
                      </div>
                      <Badge
                        variant={log.status === 'success' ? 'default' : log.status === 'error' ? 'destructive' : 'secondary'}
                        className="capitalize"
                      >
                        {log.status}
                      </Badge>
                    </div>
                    {log.output && (
                      <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{log.output}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardContent className="py-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-xs">{task.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Group</span>
                <span>{task.group}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="capitalize">{task.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Schedule</span>
                <span className="font-mono">{task.schedule}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete workflow</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => { deleteMutation.mutate(); setDeleteTarget(null); }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Entry Point ----

export default function WorkflowsPage() {
  const { group, id } = useParams<{ group: string; id?: string }>();

  if (!group) return null;
  if (id) return <WorkflowDetailView group={group} id={id} />;
  return <WorkflowsListPage group={group} />;
}
