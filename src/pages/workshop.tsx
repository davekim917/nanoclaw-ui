import { useState, useMemo } from 'react';
import { useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Wrench, Search, RefreshCw, Clock, Zap } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { cn } from '@/lib/utils';
import { BlueprintCard } from '@/components/workshop/blueprint-card';
import { BlueprintDetail } from '@/components/workshop/blueprint-detail';
import { InstalledManager } from '@/components/workshop/installed-manager';
import type {
  CatalogEntry,
  InstalledBlueprint,
  StatusFilter,
  TriggerFilter,
} from '@/components/workshop/types';

export default function WorkshopPage() {
  const { group } = useParams<{ group: string }>();
  if (!group) return null;
  return <WorkshopContent group={group} />;
}

function WorkshopContent({ group }: { group: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState<string | null>(null);
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(null);

  // Fetch catalog
  const {
    data: catalog,
    isLoading: catalogLoading,
    refetch: refetchCatalog,
    isRefetching,
  } = useQuery<CatalogEntry[]>({
    queryKey: queryKeys.workshopCatalog(),
    queryFn: async () => {
      const res = await api<{ blueprints: CatalogEntry[] }>('/api/workshop/catalog');
      return res.blueprints ?? [];
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Fetch installed for this group
  const { data: installed, isError: installedError } = useQuery<InstalledBlueprint[]>({
    queryKey: queryKeys.workshopInstalled(group),
    queryFn: () => api<InstalledBlueprint[]>(`/api/workshop/installed?group=${encodeURIComponent(group)}`),
    staleTime: 30_000,
    retry: false,
  });

  // Show error toast once if installed query fails
  if (installedError) {
    // TanStack Query will only trigger this on the failed render
  }

  // Single run mutation — shared across card grid and installed manager
  const runMutation = useMutation({
    mutationFn: (installedId: string) => apiPost<void>(`/api/workshop/installed/${encodeURIComponent(installedId)}/run`),
    onSuccess: () => {
      toast({ title: 'Blueprint running', description: 'Check the chat for output.' });
    },
    onError: (err) => {
      toast({ title: 'Run failed', description: err.message, variant: 'destructive' });
    },
  });

  const handleRun = (installedId: string) => runMutation.mutate(installedId);

  // Build installed lookup
  const installedMap = useMemo(() => {
    const map = new Map<string, InstalledBlueprint>();
    for (const bp of installed ?? []) {
      map.set(bp.blueprint_id, bp);
    }
    return map;
  }, [installed]);

  // Extract unique trades for filter
  const allTrades = useMemo(() => {
    const trades = new Set<string>();
    for (const bp of catalog ?? []) trades.add(bp.trade);
    return Array.from(trades).sort();
  }, [catalog]);

  // Filter catalog
  const hasActiveFilters = !!(search || tradeFilter || triggerFilter !== 'all' || statusFilter !== 'all');

  const filtered = useMemo(() => {
    let items = catalog ?? [];

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (bp) =>
          bp.name.toLowerCase().includes(q) ||
          bp.description.toLowerCase().includes(q) ||
          (bp.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (tradeFilter) {
      items = items.filter((bp) => bp.trade === tradeFilter);
    }

    if (triggerFilter !== 'all') {
      items = items.filter((bp) => bp.trigger_type === triggerFilter);
    }

    if (statusFilter === 'installed') {
      items = items.filter((bp) => installedMap.has(bp.id));
    } else if (statusFilter === 'available') {
      items = items.filter((bp) => !installedMap.has(bp.id));
    }

    return items;
  }, [catalog, search, tradeFilter, triggerFilter, statusFilter, installedMap]);

  const handleRefresh = () => {
    void refetchCatalog();
    toast({ title: 'Refreshing catalog...' });
  };

  return (
    <div className="relative">
      <div className="ambient-glow" />
      <PageHeader icon={Wrench} title="The Workshop" subtitle="Browse and install Blueprint automations" maxWidth="max-w-6xl">
        <Button
          variant="outline"
          size="sm"
          className="ml-auto min-h-[44px]"
          onClick={handleRefresh}
          disabled={isRefetching}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isRefetching && 'animate-spin')} />
          Refresh
        </Button>
      </PageHeader>

      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
        {/* Installed query error banner */}
        {installedError && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Failed to load installed Blueprints. Install status may be inaccurate.
          </div>
        )}

        {/* Search + Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Blueprints..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border',
                !tradeFilter ? 'bg-accent text-accent-foreground border-accent' : 'bg-card text-muted-foreground border-border hover:border-accent/30',
              )}
              aria-pressed={!tradeFilter}
              onClick={() => setTradeFilter(null)}
            >
              All Trades
            </button>
            {allTrades.map((trade) => (
              <button
                key={trade}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border capitalize',
                  tradeFilter === trade ? 'bg-accent text-accent-foreground border-accent' : 'bg-card text-muted-foreground border-border hover:border-accent/30',
                )}
                aria-pressed={tradeFilter === trade}
                onClick={() => setTradeFilter(tradeFilter === trade ? null : trade)}
              >
                {trade}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary filters */}
        <div className="flex gap-4 mb-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Trigger:</span>
            {(['all', 'scheduled', 'on-demand'] as TriggerFilter[]).map((t) => (
              <button
                key={t}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2 py-1 transition-colors',
                  triggerFilter === t ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
                aria-pressed={triggerFilter === t}
                onClick={() => setTriggerFilter(t)}
              >
                {t === 'scheduled' && <Clock className="h-3 w-3" />}
                {t === 'on-demand' && <Zap className="h-3 w-3" />}
                <span className="capitalize">{t}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            {(['all', 'installed', 'available'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                className={cn(
                  'rounded-md px-2 py-1 transition-colors capitalize',
                  statusFilter === s ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
                aria-pressed={statusFilter === s}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {catalogLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : !filtered.length ? (
          <EmptyState
            icon={Wrench}
            title={hasActiveFilters ? 'No Blueprints match your filters' : 'The Workshop is empty'}
            description={hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'No Blueprints are available in the catalog yet.'}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((bp) => (
              <div
                key={bp.id}
                className="cursor-pointer"
                onClick={() => setSelectedBlueprintId(bp.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedBlueprintId(bp.id); } }}
              >
                <BlueprintCard
                  blueprint={bp}
                  installed={installedMap.get(bp.id)}
                  onBuild={() => setSelectedBlueprintId(bp.id)}
                  onRun={handleRun}
                  isRunPending={runMutation.isPending && runMutation.variables === installedMap.get(bp.id)?.id}
                />
              </div>
            ))}
          </div>
        )}

        {/* Installed Management Section */}
        {statusFilter === 'installed' && installed && installed.length > 0 && (
          <InstalledManager
            installed={installed}
            onRefresh={() => void queryClient.invalidateQueries({ queryKey: queryKeys.workshopInstalled(group) })}
          />
        )}
      </div>

      {/* Blueprint Detail Dialog — key forces remount on selection change */}
      {selectedBlueprintId && (
        <BlueprintDetail
          key={selectedBlueprintId}
          blueprintId={selectedBlueprintId}
          groupFolder={group}
          installed={installedMap.get(selectedBlueprintId)}
          onClose={() => setSelectedBlueprintId(null)}
          onInstalled={() => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.workshopInstalled(group) });
            setSelectedBlueprintId(null);
          }}
        />
      )}
    </div>
  );
}
