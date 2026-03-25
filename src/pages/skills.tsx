import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Package, Download, CheckCircle, Loader2 } from 'lucide-react';

// ---- Types ----

interface InstalledSkill {
  name: string;
  description?: string;
  path?: string;
  category?: 'nanoclaw' | 'container' | 'global' | 'group';
  group?: string;
}

interface MarketplaceSkill {
  name: string;
  description?: string;
  source: string;
  author?: string;
  stars?: number;
}

interface InstallProgress {
  name: string;
  stage: string;
  done: boolean;
  error?: string;
}

// ---- Helpers ----

const categoryConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline'; icon: string }> = {
  nanoclaw: { label: 'NanoClaw', variant: 'default', icon: '🦞' },
  container: { label: 'Agent', variant: 'secondary', icon: '📦' },
  global: { label: 'Claude Code', variant: 'outline', icon: '✨' },
  group: { label: 'Group', variant: 'outline', icon: '👥' },
};

// ---- Skeletons ----

function SkillCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-64 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-6 w-16" />
      </CardContent>
    </Card>
  );
}

// ---- Installed Skills ----

function InstalledTab() {
  const { data: skills, isLoading, isError } = useQuery<InstalledSkill[]>({
    queryKey: queryKeys.skills(),
    queryFn: async () => {
      const raw = await api<{ data: InstalledSkill[] } | InstalledSkill[]>('/api/skills/installed');
      return Array.isArray(raw) ? raw : (raw.data ?? []);
    },
    staleTime: 30_000,
    retry: false,
  });

  if (isLoading && !isError) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkillCardSkeleton key={i} />)}
      </div>
    );
  }

  if (!skills?.length) {
    return (
      <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted mb-4">
          <Package className="h-7 w-7 text-muted-foreground/60" />
        </div>
        <p className="text-base font-medium text-foreground">No skills installed</p>
        <p className="text-sm mt-1">Browse the marketplace to install skills</p>
      </div>
    );
  }

  // Group skills by category
  const nanoclaw = skills.filter((s) => s.category === 'nanoclaw');
  const container = skills.filter((s) => s.category === 'container');
  const global = skills.filter((s) => s.category === 'global');
  const group = skills.filter((s) => s.category === 'group');
  const uncategorized = skills.filter((s) => !s.category);

  const sections = [
    { key: 'nanoclaw', label: 'NanoClaw Skills', skills: nanoclaw },
    { key: 'container', label: 'Agent Skills', skills: container },
    { key: 'global', label: 'Claude Code Skills', skills: global },
    { key: 'group', label: 'Group Skills', skills: group },
    ...(uncategorized.length ? [{ key: 'other', label: 'Other', skills: uncategorized }] : []),
  ].filter((s) => s.skills.length > 0);

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section.key}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <span>{categoryConfig[section.key]?.icon ?? '📋'}</span>
            {section.label}
            <Badge variant="outline" className="ml-1 text-xs">{section.skills.length}</Badge>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {section.skills.map((skill) => (
              <Card key={`${section.key}-${skill.name}`} className="border-border/60">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-medium">{skill.name}</CardTitle>
                    {skill.group && (
                      <Badge variant="outline" className="shrink-0 text-xs">{skill.group}</Badge>
                    )}
                  </div>
                  {skill.description && (
                    <CardDescription className="text-xs line-clamp-2">{skill.description}</CardDescription>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Marketplace Tab ----

function MarketplaceTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [installProgress, setInstallProgress] = useState<Record<string, InstallProgress>>({});

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results, isLoading: searching, isError: searchError } = useQuery<MarketplaceSkill[]>({
    queryKey: ['skills', 'marketplace', debouncedQuery],
    queryFn: async () => {
      const raw = await api<{ data: MarketplaceSkill[] } | MarketplaceSkill[]>(`/api/skills/marketplace?q=${encodeURIComponent(debouncedQuery)}`);
      return Array.isArray(raw) ? raw : (raw.data ?? []);
    },
    enabled: true,
    staleTime: 30_000,
    retry: false,
  });

  const installMutation = useMutation({
    mutationFn: (skill: MarketplaceSkill) =>
      apiPost<void>('/api/skills/install', { name: skill.name, source: skill.source }),
    onSuccess: (_data, skill) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.skills() });
      toast({ title: `${skill.name} installed` });
      setInstallProgress((prev) => ({
        ...prev,
        [skill.name]: { name: skill.name, stage: 'Done', done: true },
      }));
    },
    onError: (err, skill) => {
      toast({ title: `Failed to install ${skill.name}`, description: err.message, variant: 'destructive' });
      setInstallProgress((prev) => {
        const next = { ...prev };
        delete next[skill.name];
        return next;
      });
    },
  });

  // Poll install progress for any in-progress installs
  const inProgressNames = Object.values(installProgress)
    .filter((p) => !p.done && !p.error)
    .map((p) => p.name);

  useEffect(() => {
    if (inProgressNames.length === 0) return;

    const interval = setInterval(() => {
      inProgressNames.forEach((name) => {
        void api<{ name: string; stage: string; done: boolean; error?: string }>(
          `/api/skills/install/${encodeURIComponent(name)}/status`,
        ).then((status) => {
          setInstallProgress((prev) => ({
            ...prev,
            [status.name]: {
              name: status.name,
              stage: status.stage,
              done: status.done,
              error: status.error,
            },
          }));
        }).catch(() => {
          // ignore transient poll errors
        });
      });
    }, 2000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inProgressNames.join(',')]);

  const handleInstall = (skill: MarketplaceSkill) => {
    setInstallProgress((prev) => ({
      ...prev,
      [skill.name]: { name: skill.name, stage: 'Starting...', done: false },
    }));
    installMutation.mutate(skill);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search skills..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {searching && !searchError ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkillCardSkeleton key={i} />)}
        </div>
      ) : !results?.length ? (
        <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted mb-4">
            <Search className="h-7 w-7 text-muted-foreground/60" />
          </div>
          <p className="text-base font-medium text-foreground">No skills found</p>
          <p className="text-sm mt-1">
            {debouncedQuery ? 'Try a different search term' : 'The marketplace is not available right now'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((skill) => {
            const progress = installProgress[skill.name];
            const isInstalling = progress && !progress.done;
            const isDone = progress?.done;

            return (
              <Card key={skill.name}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{skill.name}</CardTitle>
                    {skill.author && (
                      <span className="text-xs text-muted-foreground shrink-0">{skill.author}</span>
                    )}
                  </div>
                  {skill.description && (
                    <CardDescription>{skill.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground font-mono truncate max-w-[60%]">
                    {skill.source}
                  </div>
                  <Button
                    size="sm"
                    className="min-h-[44px] shrink-0"
                    onClick={() => handleInstall(skill)}
                    disabled={isInstalling ?? false}
                    variant={isDone ? 'outline' : 'default'}
                  >
                    {isInstalling ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        {progress.stage}
                      </>
                    ) : isDone ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                        Installed
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Install
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- Page ----

export default function SkillsPage() {
  return (
    <div className="px-4 md:px-6 py-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Skills</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage installed skills and discover new ones
        </p>
      </div>

      <Tabs defaultValue="installed">
        <TabsList className="mb-4">
          <TabsTrigger value="installed">Installed</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
        </TabsList>

        <TabsContent value="installed">
          <InstalledTab />
        </TabsContent>

        <TabsContent value="marketplace">
          <MarketplaceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
