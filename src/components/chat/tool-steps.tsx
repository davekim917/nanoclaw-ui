import { useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  Mail,
  Globe,
  Users,
  File,
  Loader2,
  Terminal,
  Wrench,
  CheckCircle2,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolStep {
  id: string;
  tool: string;
  label: string;
  status: 'pending' | 'running' | 'done';
}

const toolIconMap: Record<string, React.FC<{ className?: string }>> = {
  thinking: Clock,
  search: Search,
  web_search: Search,
  exa: Search,
  calendar: Calendar,
  mail: Mail,
  gmail: Mail,
  fetch: Globe,
  web_fetch: Globe,
  browser: Globe,
  users: Users,
  contacts: Users,
  file: File,
  read_file: File,
  write_file: File,
  bash: Terminal,
  computer: Terminal,
};

function getToolIcon(toolName: string): React.FC<{ className?: string }> {
  const lower = toolName.toLowerCase();
  for (const [key, Icon] of Object.entries(toolIconMap)) {
    if (lower.includes(key)) return Icon;
  }
  return Wrench;
}

function ToolStepRow({ step }: { step: ToolStep }) {
  const Icon = getToolIcon(step.tool);
  const isRunning = step.status === 'running';
  const isDone = step.status === 'done';
  const isThinking = step.tool === 'thinking';
  const isDoneMarker = step.tool === '__done__';

  return (
    <div className="flex items-start gap-2.5 py-0.5">
      <div
        className={cn(
          'flex h-5 w-5 items-center justify-center shrink-0',
          isDoneMarker && 'text-emerald-500',
          isThinking && 'text-muted-foreground',
          !isThinking && !isDoneMarker && 'text-accent',
        )}
      >
        {isDoneMarker ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Icon className={cn('h-3.5 w-3.5', isRunning && !isThinking && 'animate-pulse')} />
        )}
      </div>

      <span
        className={cn(
          'text-xs leading-5 flex-1 min-w-0',
          isDoneMarker && 'text-muted-foreground font-medium',
          isThinking && 'text-muted-foreground',
          !isThinking && !isDoneMarker && 'text-foreground',
        )}
      >
        {step.label}
      </span>

      {/* Result badge for completed tool steps */}
      {!isThinking && !isDoneMarker && isDone && (
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground shrink-0">
          Result
        </span>
      )}

      {isRunning && !isThinking && (
        <Loader2 className="h-3 w-3 animate-spin text-accent shrink-0 mt-1" />
      )}
    </div>
  );
}

interface ToolStepsProps {
  steps: ToolStep[];
  className?: string;
  defaultExpanded?: boolean;
}

export function ToolSteps({ steps, className, defaultExpanded }: ToolStepsProps) {
  if (steps.length === 0) return null;

  let hasRunning = false;
  let doneCount = 0;
  for (const s of steps) {
    if (s.status === 'running') hasRunning = true;
    if (s.status === 'done') doneCount++;
  }
  const allDone = !hasRunning && doneCount === steps.length;

  const [expanded, setExpanded] = useState(defaultExpanded ?? hasRunning);

  useEffect(() => {
    if (hasRunning) setExpanded(true);
  }, [hasRunning]);

  // Append a "Done" marker when all steps are complete
  const displaySteps = allDone
    ? [...steps, { id: '__done__', tool: '__done__', label: 'Done', status: 'done' as const }]
    : steps;

  const summaryText = allDone
    ? deriveSummary(steps)
    : steps.find((s) => s.status === 'running')?.label ?? 'Processing…';

  return (
    <div className={cn('text-sm', className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="touch-compact flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        <span className="flex-1 text-left truncate">{summaryText}</span>
        {hasRunning && <Loader2 className="h-3 w-3 animate-spin text-accent shrink-0" />}
        <ChevronRight
          className={cn('h-3 w-3 transition-transform shrink-0', expanded && 'rotate-90')}
        />
      </button>

      {expanded && (
        <div className="mt-1">
          {displaySteps.map((step) => (
            <ToolStepRow key={step.id} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}

function deriveSummary(steps: ToolStep[]): string {
  // Use the last thinking step's text as summary if it's descriptive enough
  const thinkingSteps = steps.filter((s) => s.tool === 'thinking');
  if (thinkingSteps.length > 0) {
    const last = thinkingSteps[thinkingSteps.length - 1];
    if (last.label && last.label !== 'Thinking…' && last.label.length > 10) {
      return last.label.length > 80 ? last.label.slice(0, 77) + '…' : last.label;
    }
  }
  // Fallback: describe tools used
  const toolNames = [
    ...new Set(
      steps
        .filter((s) => s.tool !== 'thinking')
        .map((s) => s.label.replace(/…$/, '').trim()),
    ),
  ];
  if (toolNames.length > 0) return toolNames.join(', ');
  return `Used ${steps.length} step${steps.length !== 1 ? 's' : ''}`;
}
