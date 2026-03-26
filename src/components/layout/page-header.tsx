import type { FC } from 'react';

interface PageHeaderProps {
  icon: FC<{ className?: string }>;
  title: string;
  subtitle?: string;
  maxWidth?: string;
  children?: React.ReactNode;
}

export function PageHeader({ icon: Icon, title, subtitle, maxWidth = 'max-w-4xl', children }: PageHeaderProps) {
  return (
    <header className="relative border-b border-border px-4 md:px-8 py-8">
      <div className={`mx-auto ${maxWidth} flex items-center gap-3`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
          <Icon className="h-5 w-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </header>
  );
}
