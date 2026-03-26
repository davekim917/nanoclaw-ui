import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Markdown from 'react-markdown';
import { api, apiPost } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Search, Package, Download, CheckCircle, Loader2, Sparkles, Brain, Copy, Check, Terminal, ChevronRight, FileText, Folder } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';

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

// ---- Skill Detail API types ----

interface SkillFileEntry {
  name: string;
  type: 'file' | 'directory';
  children?: SkillFileEntry[];
}

interface SkillDetailResponse {
  name: string;
  description: string;
  path: string;
  category: string;
  group?: string;
  content: string;
  files: SkillFileEntry[];
}

// ---- File Tree Component ----

function FileTreeNode({ entry, depth = 0 }: { entry: SkillFileEntry; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isDir = entry.type === 'directory';

  return (
    <div>
      <button
        onClick={() => isDir && setExpanded(!expanded)}
        className={`flex items-center gap-1.5 w-full text-left py-0.5 text-xs font-mono hover:text-foreground transition-colors ${isDir ? 'text-foreground cursor-pointer' : 'text-muted-foreground cursor-default'}`}
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        {isDir ? (
          <>
            <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            <Folder className="h-3.5 w-3.5 shrink-0 text-accent/70" />
          </>
        ) : (
          <>
            <span className="w-3" />
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          </>
        )}
        <span className="truncate">{entry.name}</span>
      </button>
      {isDir && expanded && entry.children?.map((child) => (
        <FileTreeNode key={child.name} entry={child} depth={depth + 1} />
      ))}
    </div>
  );
}

// ---- Skill Detail Panel ----

function SkillDetailPanel({
  skill,
  open,
  onOpenChange,
}: {
  skill: InstalledSkill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  const { data: detail, isLoading: detailLoading } = useQuery<SkillDetailResponse>({
    queryKey: ['skill-detail', skill?.name],
    queryFn: () => api<SkillDetailResponse>(`/api/skills/${encodeURIComponent(skill!.name)}/detail`),
    enabled: open && !!skill,
    staleTime: 5 * 60_000,
  });

  if (!skill) return null;

  const catCfg = categoryConfig[skill.category ?? ''];
  const pathSegments = skill.path?.split('/') ?? [];

  const handleCopyPath = () => {
    if (!skill.path) return;
    void navigator.clipboard.writeText(skill.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto p-0"
      >
        <SheetTitle className="sr-only">{skill.name}</SheetTitle>
        <SheetDescription className="sr-only">Details for {skill.name}</SheetDescription>

        {/* Top accent line */}
        <div className="h-0.5 bg-gradient-to-r from-accent/0 via-accent to-accent/0" />

        <div className="px-6 pt-8 pb-10 space-y-6">
          {/* Header */}
          <div>
            {pathSegments.length > 1 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono mb-3 overflow-x-auto">
                {pathSegments.map((seg, i) => (
                  <span key={i} className="flex items-center gap-1 shrink-0">
                    {i > 0 && <ChevronRight className="h-3 w-3 opacity-40" />}
                    <span className={i === pathSegments.length - 1 ? 'text-foreground' : ''}>{seg}</span>
                  </span>
                ))}
              </div>
            )}

            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {skill.name}
            </h2>

            <div className="flex items-center gap-3 mt-3">
              {catCfg && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span>{catCfg.icon}</span>
                  {catCfg.label}
                </span>
              )}
              {skill.group && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-xs text-muted-foreground">{skill.group}</span>
                </>
              )}
            </div>
          </div>

          {/* Summary */}
          {skill.description && (
            <div className="border-l-2 border-accent/40 pl-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-1.5">Summary</p>
              <p className="text-sm leading-relaxed text-foreground/90">
                {skill.description}
              </p>
            </div>
          )}

          {/* Location */}
          {skill.path && (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-2">
                Location
              </p>
              <div className="group/path relative rounded-lg bg-muted/60 border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <Terminal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <code className="text-[13px] font-mono text-foreground flex-1 break-all">
                    {skill.path}
                  </code>
                  <button
                    onClick={handleCopyPath}
                    className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/50 transition-all opacity-0 group-hover/path:opacity-100 focus:opacity-100"
                    aria-label="Copy path"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* File tree */}
          {detail && detail.files.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-2">
                Files
              </p>
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-0.5">
                {detail.files.map((entry) => (
                  <FileTreeNode key={entry.name} entry={entry} />
                ))}
              </div>
            </div>
          )}

          {/* SKILL.md content */}
          {detailLoading && (
            <div className="space-y-3 pt-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          )}
          {detail?.content && (
            <div className="pt-2 min-w-0 overflow-hidden">
              <div className="h-px bg-border mb-6" />
              <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-xl prose-h1:mb-3 prose-h2:text-lg prose-h2:mb-2 prose-h3:text-base prose-h3:mb-2 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-strong:text-foreground prose-code:text-[13px] prose-code:font-mono prose-code:bg-muted prose-code:text-foreground prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:text-foreground prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:overflow-x-auto prose-a:text-accent prose-a:no-underline hover:prose-a:underline [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-1.5 [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5">
                <Markdown>{detail.content}</Markdown>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---- Installed Skills ----

function InstalledTab() {
  const [selectedSkill, setSelectedSkill] = useState<InstalledSkill | null>(null);

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

  const totalSkills = skills.length;

  return (
    <div className="space-y-8">
      {/* Stats bar */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <Sparkles className="h-6 w-6 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalSkills}</p>
            <p className="text-sm text-muted-foreground">Skills installed</p>
          </div>
        </div>
      </div>

      {/* Skills grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {skills.map((skill) => {
          const catCfg = categoryConfig[skill.category ?? ''];
          return (
            <button
              key={skill.name}
              onClick={() => setSelectedSkill(skill)}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:border-accent/30 hover:shadow-md text-left cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                    <Package className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{skill.name}</h3>
                    {skill.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{skill.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-3">
                      {catCfg && (
                        <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
                          {catCfg.icon} {catCfg.label}
                        </span>
                      )}
                      {skill.group && (
                        <Badge variant="outline" className="text-xs">{skill.group}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent/0 via-accent to-accent/0" />
            </button>
          );
        })}
      </div>

      {/* Custom Skills CTA */}
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Brain className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground">Build Custom Skills</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Create specialized skills tailored to your workflow
        </p>
      </div>

      <SkillDetailPanel
        skill={selectedSkill}
        open={!!selectedSkill}
        onOpenChange={(open) => { if (!open) setSelectedSkill(null); }}
      />
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
    <div className="relative">
      <div className="ambient-glow" />
      <PageHeader icon={Package} title="Skills" subtitle="Manage installed skills and discover new ones" />
      <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">
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
    </div>
  );
}
