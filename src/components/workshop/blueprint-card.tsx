import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Play, Zap, ShieldCheck, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CatalogEntry, InstalledBlueprint } from './types';

const TRADE_COLORS: Record<string, string> = {
  productivity: 'bg-blue-500/10 text-blue-500',
  dev: 'bg-purple-500/10 text-purple-500',
  email: 'bg-amber-500/10 text-amber-500',
  research: 'bg-emerald-500/10 text-emerald-500',
  creative: 'bg-pink-500/10 text-pink-500',
  ops: 'bg-orange-500/10 text-orange-500',
};

interface BlueprintCardProps {
  blueprint: CatalogEntry;
  installed?: InstalledBlueprint;
  onBuild: (blueprintId: string) => void;
  onRun?: (installedId: string) => void;
  isRunPending?: boolean; // FIX: BUG run button pending guard
}

export function BlueprintCard({ blueprint, installed, onBuild, onRun, isRunPending }: BlueprintCardProps) {
  const tradeColor = TRADE_COLORS[blueprint.trade] ?? 'bg-muted text-muted-foreground';

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:border-accent/30">
      {blueprint.verified && (
        <div className="absolute right-4 top-4">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
        </div>
      )}

      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-accent/10">
        <Wrench className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-accent" />
      </div>

      <h3 className="font-semibold text-foreground">{blueprint.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{blueprint.description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', tradeColor)}>
          {blueprint.trade}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {blueprint.trigger_type === 'scheduled' ? <Clock className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
          {blueprint.trigger_type}
        </span>
      </div>

      {blueprint.integrations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {blueprint.integrations.map((int) => (
            <Badge key={int} variant="outline" className="text-[10px] px-1.5 py-0">
              {int}
            </Badge>
          ))}
        </div>
      )}

      {installed?.update_available && (
        <div className="mt-2">
          <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-500">
            Update available
          </Badge>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
        {installed ? (
          <>
            <Badge variant={installed.status === 'active' ? 'default' : 'secondary'} className="capitalize text-xs">
              {installed.status === 'active' ? 'Installed' : 'Disabled'}
            </Badge>
            {installed.trigger_type === 'on-demand' && onRun && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto min-h-[32px] text-xs"
                disabled={isRunPending}
                onClick={(e) => { e.stopPropagation(); onRun(installed.id); }}
              >
                <Play className="h-3 w-3 mr-1" />
                {isRunPending ? 'Running...' : 'Run'}
              </Button>
            )}
          </>
        ) : (
          <Button
            size="sm"
            className="ml-auto min-h-[32px] bg-accent text-accent-foreground hover:bg-accent/90 text-xs"
            onClick={(e) => { e.stopPropagation(); onBuild(blueprint.id); }}
          >
            <Wrench className="h-3 w-3 mr-1" />
            Build
          </Button>
        )}
      </div>
    </div>
  );
}
