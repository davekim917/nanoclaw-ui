import { useState, useEffect, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost, apiDelete } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Plug, Server, CheckCircle, Link2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';

// ---- Types ----

interface RawCapabilities {
  channels: string[];
  groups: Array<{ jid: string; name: string; folder: string; channel: string }>;
  features?: Record<string, boolean>;
}

interface ChannelInfo {
  name: string;
  connected: boolean;
  groups: string[];
}

interface McpServer {
  id: string;
  name: string;
  url: string;
  type: 'sse' | 'stdio' | 'streamable-http';
  group: string;
}

// ---- Channel icon / color ----

interface ChannelStyle {
  cardClass: string;
  badgeClass: string;
  icon: string;
}

function channelStyle(name: string): ChannelStyle {
  const map: Record<string, ChannelStyle> = {
    discord: {
      cardClass: 'border-indigo-200 dark:border-indigo-800',
      badgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700',
      icon: '💬',
    },
    whatsapp: {
      cardClass: 'border-green-200 dark:border-green-800',
      badgeClass: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
      icon: '📱',
    },
    slack: {
      cardClass: 'border-purple-200 dark:border-purple-800',
      badgeClass: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
      icon: '💼',
    },
    telegram: {
      cardClass: 'border-blue-200 dark:border-blue-800',
      badgeClass: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
      icon: '✈️',
    },
    gmail: {
      cardClass: 'border-red-200 dark:border-red-800',
      badgeClass: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
      icon: '📧',
    },
  };
  return map[name.toLowerCase()] ?? {
    cardClass: 'border-border',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    icon: '🔌',
  };
}

// ---- Skeletons ----

function ChannelSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-48" />
      </CardContent>
    </Card>
  );
}

function McpSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3 border rounded-lg">
      <div className="space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-9 w-9" />
    </div>
  );
}

// ---- Add MCP Dialog ----

interface AddMcpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: string;
}

function AddMcpDialog({ open, onOpenChange, group }: AddMcpDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'sse' | 'stdio' | 'streamable-http'>('sse');

  const addMutation = useMutation({
    mutationFn: (data: Omit<McpServer, 'id'>) => apiPost<McpServer>('/api/mcp-servers', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers(group) });
      onOpenChange(false);
      setName('');
      setUrl('');
      setType('sse');
      toast({ title: 'MCP server added' });
    },
    onError: (err) => {
      toast({ title: 'Failed to add server', description: err.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    addMutation.mutate({ name, url, type, group });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add MCP Server</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mcp-name">Name</Label>
            <Input
              id="mcp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My MCP Server"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mcp-url">URL</Label>
            <Input
              id="mcp-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/mcp"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mcp-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger id="mcp-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sse">SSE</SelectItem>
                <SelectItem value="stdio">stdio</SelectItem>
                <SelectItem value="streamable-http">Streamable HTTP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Adding...' : 'Add Server'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Page ----

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState('');
  const [addMcpOpen, setAddMcpOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: capabilities, isLoading: capsLoading } = useQuery<RawCapabilities>({
    queryKey: queryKeys.capabilities(),
    queryFn: () => api<RawCapabilities>('/api/capabilities'),
    staleTime: 60_000,
  });

  // Derive channel info from raw capabilities
  const channels: ChannelInfo[] = (capabilities?.channels ?? []).map((name) => {
    const groupsUsingChannel = (capabilities?.groups ?? [])
      .filter((g) => g.channel === name)
      .map((g) => g.name);
    // Deduplicate (multiple JIDs can map to the same group name)
    const uniqueGroups = [...new Set(groupsUsingChannel)];
    return { name, connected: uniqueGroups.length > 0, groups: uniqueGroups };
  });

  const groupFolders = [...new Set((capabilities?.groups ?? []).map((g) => g.folder))];

  // Set default selected group once capabilities load
  useEffect(() => {
    if (groupFolders.length && !selectedGroup) {
      setSelectedGroup(groupFolders[0]!);
    }
  }, [groupFolders.length, selectedGroup]);

  const { data: mcpServers, isLoading: mcpLoading } = useQuery<McpServer[]>({
    queryKey: queryKeys.mcpServers(selectedGroup),
    queryFn: async () => {
      const raw = await api<{ data: McpServer[] } | McpServer[]>(`/api/mcp-servers?group=${encodeURIComponent(selectedGroup)}`);
      return Array.isArray(raw) ? raw : (raw.data ?? []);
    },
    enabled: !!selectedGroup,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/api/mcp-servers/${encodeURIComponent(id)}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.mcpServers(selectedGroup) });
      const prev = queryClient.getQueryData<McpServer[]>(queryKeys.mcpServers(selectedGroup));
      queryClient.setQueryData(
        queryKeys.mcpServers(selectedGroup),
        (old: McpServer[] | undefined) => old?.filter((s) => s.id !== id) ?? [],
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      queryClient.setQueryData(queryKeys.mcpServers(selectedGroup), ctx?.prev);
      toast({ title: 'Failed to delete server', variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Server removed' });
    },
  });

  const typeBadge = (type: McpServer['type']) => {
    const map = { sse: 'SSE', stdio: 'stdio', 'streamable-http': 'HTTP' };
    return map[type] ?? type;
  };

  return (
    <div className="relative">
      <div className="ambient-glow" />
      <PageHeader icon={Plug} title="Integrations" subtitle="Connected channels and MCP servers" />
    <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto space-y-10">

      {/* Connected Channels */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Plug className="h-4 w-4 text-accent" />
          <h2 className="text-base font-semibold">Connected Channels</h2>
        </div>

        {capsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <ChannelSkeleton key={i} />)}
          </div>
        ) : !channels.length ? (
          <p className="text-sm text-muted-foreground">No channels configured.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((ch) => {
              const style = channelStyle(ch.name);
              return (
                <Card key={ch.name} className={style.cardClass}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-base border ${style.badgeClass}`}
                      >
                        {style.icon}
                      </span>
                      <span className="capitalize">{ch.name}</span>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      {ch.connected ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-green-700 dark:text-green-400">Connected</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Not connected</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  {ch.groups && ch.groups.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-1">
                        {ch.groups.map((g) => (
                          <Badge key={g} variant="outline" className={`text-xs ${style.badgeClass}`}>
                            {g}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Separator />

      {/* MCP Servers */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">MCP Servers</h2>
          </div>
          <Button
            size="sm"
            className="min-h-[44px]"
            onClick={() => setAddMcpOpen(true)}
            disabled={!selectedGroup}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Server
          </Button>
        </div>

        {/* Group selector */}
        {groupFolders.length > 1 && (
          <div className="mb-4 flex items-center gap-3">
            <Label htmlFor="mcp-group" className="text-sm shrink-0">Group</Label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger id="mcp-group" className="w-48">
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {groupFolders.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!selectedGroup ? (
          <p className="text-sm text-muted-foreground">Select a group to view MCP servers.</p>
        ) : mcpLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <McpSkeleton key={i} />)}
          </div>
        ) : !mcpServers?.length ? (
          <div className="text-center py-10 text-muted-foreground border rounded-lg">
            <Server className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No MCP servers</p>
            <p className="text-sm mt-1">Add a server to extend agent capabilities</p>
          </div>
        ) : (
          <div className="space-y-2">
            {mcpServers.map((server) => (
              <div
                key={server.id}
                className="flex items-center justify-between px-4 py-3 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{server.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {typeBadge(server.type)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                    {server.url}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px] text-destructive hover:text-destructive shrink-0 ml-2"
                  onClick={() => setDeleteTarget(server.id)}
                  disabled={deleteMutation.isPending}
                  aria-label={`Remove ${server.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <AddMcpDialog
        open={addMcpOpen}
        onOpenChange={setAddMcpOpen}
        group={selectedGroup}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove MCP server</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove{' '}
            <strong>{mcpServers?.find((s) => s.id === deleteTarget)?.name ?? 'this server'}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) { deleteMutation.mutate(deleteTarget); }
                setDeleteTarget(null);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Integration CTA */}
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Link2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground">Need another integration?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Request new channel integrations or connect custom services
        </p>
      </div>
    </div>
    </div>
  );
}
