import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost, apiPatch, apiDelete } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Play, Pause, Trash2, ArrowLeft, Clock, Calendar, Activity } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

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

interface TaskLog {
  id: string;
  taskId: string;
  startedAt: string;
  finishedAt?: string;
  status: 'success' | 'error' | 'running';
  output?: string;
}

// ---- Helpers ----

function humanCron(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  const [min, hour, dom, month, dow] = parts;

  if (min === '0' && dom === '*' && month === '*' && dow === '*') {
    return `Every day at ${hour}:00`;
  }
  if (dom === '*' && month === '*' && dow === '*') {
    return `Every hour at :${min.padStart(2, '0')}`;
  }
  if (dom === '*' && month === '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dow !== '*' ? days[parseInt(dow)] ?? dow : null;
    if (dayName) return `Every ${dayName} at ${hour}:${min.padStart(2, '0')}`;
  }
  return cron;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

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

  const handleSubmit = (e: React.FormEvent) => {
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

  const { data: tasks, isLoading, isError } = useQuery<Task[]>({
    queryKey: queryKeys.tasks(group),
    queryFn: () => api<Task[]>(`/api/tasks?group=${encodeURIComponent(group)}`),
    retry: false,
  });

  return (
    <div className="px-4 md:px-6 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Scheduled tasks for {group}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </div>

      {isLoading && !isError ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <WorkflowCardSkeleton key={i} />)}
        </div>
      ) : !tasks?.length ? (
        <EmptyState
          icon={Calendar}
          title="No workflows yet"
          description="Schedule recurring tasks — briefings, reports, maintenance — and let your agent handle them automatically."
          action={{ label: 'New Workflow', onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className="cursor-pointer hover:shadow-md hover:border-primary/20 active:scale-[0.99] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => void navigate(`/g/${group}/workflows/${task.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void navigate(`/g/${group}/workflows/${task.id}`); } }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{task.name}</CardTitle>
                  <Badge variant={statusVariant(task.status)} className="shrink-0 capitalize">
                    {task.status}
                  </Badge>
                </div>
                {task.description && (
                  <CardDescription className="text-sm">{task.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{humanCron(task.schedule)}</span>
                </div>
                {task.lastRun && (
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    <span>Last run {relativeTime(task.lastRun)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateWorkflowDialog open={createOpen} onOpenChange={setCreateOpen} group={group} />
    </div>
  );
}

// ---- Detail View ----

function WorkflowDetailView({ group, id }: { group: string; id: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: task, isLoading, isError: taskError } = useQuery<Task>({
    queryKey: [...queryKeys.tasks(group), id],
    queryFn: () => api<Task>(`/api/tasks/${id}`),
    retry: false,
  });

  const { data: logs, isLoading: logsLoading, isError: logsError } = useQuery<TaskLog[]>({
    queryKey: [...queryKeys.tasks(group), id, 'logs'],
    queryFn: () => api<TaskLog[]>(`/api/tasks/${id}/logs`),
    retry: false,
  });

  const pauseMutation = useMutation({
    mutationFn: () => apiPatch<Task>(`/api/tasks/${id}`, { status: 'paused' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.tasks(group), id] });
      toast({ title: 'Workflow paused' });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => apiPatch<Task>(`/api/tasks/${id}`, { status: 'active' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.tasks(group), id] });
      toast({ title: 'Workflow resumed' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete<void>(`/api/tasks/${id}`),
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
            onClick={() => {
              if (confirm(`Delete "${task.name}"?`)) deleteMutation.mutate();
            }}
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
                  <CardContent className="py-3 px-4 flex items-center justify-between">
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
