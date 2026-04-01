import { type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StructuredCardProps {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

const variantStyles = {
  default: 'border-border',
  success: 'border-green-200 dark:border-green-900',
  warning: 'border-yellow-200 dark:border-yellow-900',
  info: 'border-blue-200 dark:border-blue-900',
};

const iconVariantStyles = {
  default: 'text-muted-foreground',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  info: 'text-blue-600 dark:text-blue-400',
};

export function StructuredCard({
  icon: Icon,
  label,
  children,
  className,
  variant = 'default',
}: StructuredCardProps) {
  return (
    <Card className={cn('my-2 max-w-sm', variantStyles[variant], className)}>
      <CardHeader className="py-3 px-4 pb-0">
        <div className="flex items-center gap-1.5">
          <Icon className={cn('h-3.5 w-3.5', iconVariantStyles[variant])} />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 py-3 pt-2">
        {children}
      </CardContent>
    </Card>
  );
}
