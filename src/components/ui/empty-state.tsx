import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    to?: string;
    onClick?: () => void;
  };
  compact?: boolean;
  className?: string;
}

/**
 * Actionable empty state — never show passive "Nothing here" text.
 * Every empty state must include: icon, title, explanation, and optional CTA.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        compact ? 'py-6' : 'py-12',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-xl bg-muted/60',
          compact ? 'h-10 w-10 mb-3' : 'h-14 w-14 mb-4',
        )}
      >
        <Icon
          className={cn(
            'text-muted-foreground/70',
            compact ? 'h-5 w-5' : 'h-7 w-7',
          )}
        />
      </div>
      <h3
        className={cn(
          'font-medium text-foreground',
          compact ? 'text-sm mb-1' : 'text-base mb-1.5',
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          'text-muted-foreground max-w-[280px]',
          compact ? 'text-xs' : 'text-sm',
        )}
      >
        {description}
      </p>
      {action && (
        <div className={compact ? 'mt-3' : 'mt-5'}>
          {action.to ? (
            <Button asChild size={compact ? 'sm' : 'default'} className="min-h-[44px]">
              <Link to={action.to}>{action.label}</Link>
            </Button>
          ) : (
            <Button
              size={compact ? 'sm' : 'default'}
              className="min-h-[44px]"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
