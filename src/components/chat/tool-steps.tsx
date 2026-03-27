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
      {/* Vertical connector line */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full transition-colors',
            isRunning && 'bg-primary/10 text-primary',
            isDone && 'bg-muted text-muted-foreground',
            !isRunning && !isDone && 'bg-muted/50 text-muted-foreground/50',
          )}
        >
          {isDone ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : isRunning ? (
            <Icon className="h-3 w-3" />
          ) : (
            <Icon className="h-3 w-3" />
          )}
        </div>
        {!isLast && <div className="mt-0.5 h-3 w-px bg-border" />}
      </div>

      {/* Step content */}
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

      {/* Running spinner */}
      {isRunning && (
        <Loader2 className="h-3 w-3 animate-spin text-primary mt-1 shrink-0" />
      )}
    </div>
  );
}

interface ToolStepsProps {
  steps: ToolStep[];
  className?: string;
}

export function ToolSteps({ steps, className }: ToolStepsProps) {
  if (steps.length === 0) return null;

  return (
    <div className={cn('py-2 px-1', className)}>
      {steps.map((step, idx) => (
        <ToolStepRow
          key={step.id}
          step={step}
          isLast={idx === steps.length - 1}
        />
      ))}
    </div>
  );
}
