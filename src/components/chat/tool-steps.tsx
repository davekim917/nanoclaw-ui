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
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolStep {
  id: string;
  tool: string;
  label: string;
  status: 'pending' | 'running' | 'done';
}

const toolIconMap: Record<string, React.FC<{ className?: string }>> = {
  search: Search,
  web_search: Search,
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

interface ToolStepRowProps {
  step: ToolStep;
  isLast: boolean;
}

function ToolStepRow({ step, isLast }: ToolStepRowProps) {
  const Icon = getToolIcon(step.tool);
  const isRunning = step.status === 'running';
  const isDone = step.status === 'done';

  return (
    <div className="flex items-start gap-2 group">
      <div className="flex flex-col items-center shrink-0">
        <div
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full transition-colors',
            isRunning && 'bg-accent/10 text-accent',
            isDone && 'bg-muted text-muted-foreground',
            !isRunning && !isDone && 'bg-muted/50 text-muted-foreground/50',
          )}
        >
          {isDone ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <Icon className="h-3 w-3" />
          )}
        </div>
        {!isLast && <div className="mt-0.5 h-3 w-px bg-border" />}
      </div>

      <div className="flex-1 min-w-0 pb-2">
        <span
          className={cn(
            'text-xs leading-5 truncate block',
            isRunning && 'text-foreground animate-pulse',
            isDone && 'text-muted-foreground',
            !isRunning && !isDone && 'text-muted-foreground/60',
          )}
        >
          {step.label}
        </span>
      </div>

      {isRunning && (
        <Loader2 className="h-3 w-3 animate-spin text-accent mt-1 shrink-0" />
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

  // Single-pass stats
  let hasRunning = false;
  let doneCount = 0;
  for (const s of steps) {
    if (s.status === 'running') hasRunning = true;
    if (s.status === 'done') doneCount++;
  }

  const [expanded, setExpanded] = useState(defaultExpanded ?? hasRunning);

  useEffect(() => {
    if (hasRunning) setExpanded(true);
  }, [hasRunning]);

  const summary = hasRunning
    ? `Running tools (${doneCount}/${steps.length})`
    : `Used ${steps.length} tool${steps.length !== 1 ? 's' : ''}`;

  return (
    <div className={cn('rounded-xl border border-border bg-muted/30 overflow-hidden', className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="touch-compact flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Wrench className="h-3 w-3 shrink-0" />
        <span className="flex-1 text-left">{summary}</span>
        {hasRunning && <Loader2 className="h-3 w-3 animate-spin text-accent" />}
        <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="px-3 pb-2 border-t border-border pt-2">
          {steps.map((step, idx) => (
            <ToolStepRow
              key={step.id}
              step={step}
              isLast={idx === steps.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
