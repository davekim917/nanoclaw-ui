import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, apiPost } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Wrench, Clock, Zap, ShieldCheck, AlertTriangle, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  BlueprintSpecResponse,
  BlueprintParameter,
  InstalledBlueprint,
} from './types';

// Simple mustache-style template rendering for preview
function renderTemplate(template: string, vars: Record<string, string | number | boolean>): string {
  if (template.length > 10_000) return template; // guard against oversized templates
  let result = template;
  result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, content) => {
    return vars[key] ? content : '';
  });
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
  return result;
}

function parseConfig(raw: string, paramKeys: Set<string>): Record<string, string | number | boolean> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const obj = parsed as Record<string, unknown>;
    const filtered: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (paramKeys.has(k) && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) {
        filtered[k] = v;
      }
    }
    return filtered;
  } catch {
    return {};
  }
}

interface BlueprintDetailProps {
  blueprintId: string;
  groupFolder: string;
  installed?: InstalledBlueprint;
  onClose: () => void;
  onInstalled: () => void;
}

export function BlueprintDetail({
  blueprintId,
  groupFolder,
  installed,
  onClose,
  onInstalled,
}: BlueprintDetailProps) {
  const { toast } = useToast();

  const { data: spec, isLoading } = useQuery<BlueprintSpecResponse>({
    queryKey: queryKeys.workshopSpec(blueprintId, groupFolder),
    queryFn: () => api<BlueprintSpecResponse>(`/api/workshop/catalog/${encodeURIComponent(blueprintId)}?group=${encodeURIComponent(groupFolder)}`),
    staleTime: 60_000,
    retry: false,
  });

  const params = spec?.parameters ?? [];
  const paramKeys = useMemo(() => new Set(params.map((p) => p.key)), [params]);

  const [config, setConfig] = useState<Record<string, string | number | boolean>>(() => {
    if (installed) return parseConfig(installed.config, paramKeys);
    return {};
  });

  const configWithDefaults = useMemo(() => {
    const merged: Record<string, string | number | boolean> = {};
    for (const p of params) {
      if (config[p.key] !== undefined) {
        merged[p.key] = config[p.key];
      } else if (p.default !== undefined) {
        merged[p.key] = p.default;
      }
    }
    return merged;
  }, [params, config]);

  const missingRequired = useMemo(() => {
    return params
      .filter((p) => {
        const val = configWithDefaults[p.key];
        if (!p.required) return false;
        if (val === undefined || val === '') return true;
        if (typeof val === 'number' && isNaN(val)) return true;
        return false;
      })
      .map((p) => p.key);
  }, [params, configWithDefaults]);

  const promptPreview = useMemo(() => {
    if (!spec?.prompt_template) return '';
    return renderTemplate(spec.prompt_template, {
      ...configWithDefaults,
      group_name: groupFolder,
      group_folder: groupFolder,
      chat_channel: 'chat',
    });
  }, [spec?.prompt_template, configWithDefaults, groupFolder]);

  const installMutation = useMutation({
    mutationFn: () =>
      apiPost<{ id: string }>('/api/workshop/install', {
        blueprint_id: blueprintId,
        group_folder: groupFolder,
        chat_jid: '',
        config: configWithDefaults,
      }),
    onSuccess: () => {
      toast({ title: 'Blueprint installed', description: `${spec?.name} is now active.` });
      onInstalled();
    },
    onError: (err) => {
      toast({ title: 'Install failed', description: err.message, variant: 'destructive' });
    },
  });

  // FIX: pass installed.id as argument to avoid stale closure
  const configureMutation = useMutation({
    mutationFn: (installedId: string) =>
      apiPost<void>(`/api/workshop/installed/${encodeURIComponent(installedId)}/configure`, {
        config: configWithDefaults,
      }),
    onSuccess: () => {
      toast({ title: 'Configuration updated' });
      onInstalled();
    },
    onError: (err) => {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    if (installed) {
      configureMutation.mutate(installed.id);
    } else {
      installMutation.mutate();
    }
  };

  const isPending = installMutation.isPending || configureMutation.isPending;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : spec ? (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 shrink-0">
                  <Wrench className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-xl">{spec.name}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{spec.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="outline" className="capitalize text-xs">{spec.trade}</Badge>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      {spec.trigger_type === 'scheduled' ? <Clock className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                      {spec.trigger_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">~{spec.estimated_setup_time} setup</span>
                    {spec.verified ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-500">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-500">
                        <AlertTriangle className="h-3 w-3" /> Community
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>

            {!spec.verified && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-500 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>This Blueprint is community-contributed and has not been reviewed. Check the prompt preview below before activating.</span>
              </div>
            )}

            {spec.integrations_status && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Integrations</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(spec.integrations_status).map(([name, status]) => (
                    <span
                      key={name}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs',
                        status === 'available' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive',
                      )}
                    >
                      {status === 'available' ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {params.length > 0 && (
              <div className="space-y-4">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Configuration</Label>
                {params.map((param) => (
                  <ParamInput
                    key={param.key}
                    param={param}
                    value={configWithDefaults[param.key]}
                    onChange={(val) => setConfig((prev) => ({ ...prev, [param.key]: val }))}
                  />
                ))}
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Prompt Preview</Label>
              <pre className="text-xs font-mono bg-muted border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words max-h-48">
                {promptPreview}
              </pre>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending || missingRequired.length > 0}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isPending
                  ? (installed ? 'Updating...' : 'Building...')
                  : installed
                    ? 'Update Config'
                    : 'Build'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="p-4 text-center text-muted-foreground">Blueprint not found.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ParamInput({
  param,
  value,
  onChange,
}: {
  param: BlueprintParameter;
  value: string | number | boolean | undefined;
  onChange: (val: string | number | boolean) => void;
}) {
  const id = `param-${param.key}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label htmlFor={id} className="text-sm">
          {param.label}
          {param.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      </div>
      {param.description && (
        <p className="text-xs text-muted-foreground">{param.description}</p>
      )}

      {param.type === 'select' && param.options ? (
        <Select value={String(value ?? '')} onValueChange={(v) => onChange(v)}>
          <SelectTrigger id={id}>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {param.options.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : param.type === 'boolean' ? (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            id={id}
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded border-input"
          />
          <span className="text-sm text-muted-foreground">{param.label}</span>
        </label>
      ) : param.type === 'number' ? (
        <Input
          id={id}
          type="number"
          value={String(value ?? '')}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(isNaN(n) || e.target.value === '' ? '' : n);
          }}
          placeholder={param.default !== undefined ? String(param.default) : ''}
        />
      ) : (
        <Input
          id={id}
          type="text"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={param.default !== undefined ? String(param.default) : param.type === 'cron' ? '0 8 * * 1-5' : ''}
        />
      )}
    </div>
  );
}
