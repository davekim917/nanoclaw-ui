import { useMutation } from '@tanstack/react-query';
import { apiPost, apiDelete } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Play, Pause, Trash2, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import type { InstalledBlueprint } from './types';

interface InstalledManagerProps {
  installed: InstalledBlueprint[];
  onRefresh: () => void;
}

export function InstalledManager({ installed, onRefresh }: InstalledManagerProps) {
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<InstalledBlueprint | null>(null);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);

  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiPost<void>(`/api/workshop/installed/${encodeURIComponent(id)}/toggle`),
    onSuccess: (_, id) => {
      const bp = installed.find((b) => b.id === id);
      toast({ title: bp?.status === 'active' ? 'Blueprint disabled' : 'Blueprint enabled' });
      onRefresh();
    },
    onError: (err) => {
      toast({ title: 'Toggle failed', description: err.message, variant: 'destructive' });
    },
    onSettled: () => setPendingToggleId(null),
  });

  const runMutation = useMutation({
    mutationFn: (id: string) => apiPost<void>(`/api/workshop/installed/${encodeURIComponent(id)}/run`),
    onSuccess: () => {
      toast({ title: 'Blueprint running', description: 'Check the chat for output.' });
    },
    onError: (err) => {
      toast({ title: 'Run failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/api/workshop/installed/${encodeURIComponent(id)}`),
    onSuccess: () => {
      toast({ title: 'Blueprint uninstalled' });
      setDeleteTarget(null);
      onRefresh();
    },
    onError: (err) => {
      toast({ title: 'Uninstall failed', description: err.message, variant: 'destructive' });
      setDeleteTarget(null);
    },
  });

  if (!installed.length) return null;

  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-lg font-semibold">Installed Blueprints</h2>

      <div className="space-y-3">
        {installed.map((bp) => {
          const displayName = bp.blueprint_name ?? bp.blueprint_id;
          return (
            <div
              key={bp.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent/20"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{displayName}</span>
                  <Badge
                    variant={bp.status === 'active' ? 'default' : 'secondary'}
                    className="text-[10px] capitalize"
                  >
                    {bp.status}
                  </Badge>
                  {bp.update_available && (
                    <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-500">
                      Update
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {bp.trigger_type === 'scheduled' ? <Clock className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                    {bp.trigger_type}
                  </span>
                  <span>v{bp.blueprint_version}</span>
                  <span>Installed {new Date(bp.installed_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={bp.status === 'active' ? 'Disable blueprint' : 'Enable blueprint'}
                  className={cn(
                    'min-h-[32px] text-xs',
                    bp.status === 'active'
                      ? 'text-amber-500 hover:bg-amber-500/10'
                      : 'text-emerald-500 hover:bg-emerald-500/10',
                  )}
                  onClick={() => { setPendingToggleId(bp.id); toggleMutation.mutate(bp.id); }}
                  disabled={pendingToggleId === bp.id}
                >
                  {bp.status === 'active' ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>

                {bp.trigger_type === 'on-demand' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Run ${displayName}`}
                    className="min-h-[32px] text-xs text-accent hover:bg-accent/10"
                    onClick={() => runMutation.mutate(bp.id)}
                    disabled={runMutation.isPending && runMutation.variables === bp.id}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Run
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Uninstall ${displayName}`}
                  className="min-h-[32px] text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(bp)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Uninstall Blueprint</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to uninstall <strong>{deleteTarget?.blueprint_name ?? deleteTarget?.blueprint_id}</strong>?
            {deleteTarget?.trigger_type === 'scheduled' && ' This will also remove its scheduled task.'}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Removing...' : 'Uninstall'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
