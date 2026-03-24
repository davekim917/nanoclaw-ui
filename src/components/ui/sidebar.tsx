/**
 * Sidebar primitives — simplified implementation compatible with shadcn sidebar patterns.
 * Uses CSS variables and data attributes for collapse state.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

// ---- Context ----

interface SidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue>({
  open: true,
  setOpen: () => undefined,
  toggle: () => undefined,
});

export function useSidebar() {
  return React.useContext(SidebarContext);
}

// ---- Provider ----

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  SidebarProviderProps
>(
  (
    {
      children,
      defaultOpen = true,
      open: controlledOpen,
      onOpenChange,
      className,
      style,
    },
    ref,
  ) => {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
    const open = controlledOpen ?? internalOpen;

    const setOpen = React.useCallback(
      (next: boolean) => {
        setInternalOpen(next);
        onOpenChange?.(next);
      },
      [onOpenChange],
    );

    const toggle = React.useCallback(() => {
      setOpen(!open);
    }, [open, setOpen]);

    return (
      <SidebarContext.Provider value={{ open, setOpen, toggle }}>
        <div
          ref={ref}
          data-sidebar-open={open}
          className={cn('flex min-h-svh w-full', className)}
          style={style}
        >
          {children}
        </div>
      </SidebarContext.Provider>
    );
  },
);
SidebarProvider.displayName = 'SidebarProvider';

// ---- Sidebar ----

interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  collapsible?: 'icon' | 'none' | 'offcanvas';
  side?: 'left' | 'right';
}

export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ className, collapsible = 'icon', side = 'left', children, ...props }, ref) => {
    const { open } = useSidebar();

    return (
      <aside
        ref={ref}
        data-collapsible={collapsible}
        data-open={open}
        data-side={side}
        className={cn(
          'group relative flex flex-col border-r bg-card transition-all duration-300 ease-in-out',
          open ? 'w-64' : collapsible === 'icon' ? 'w-14' : 'w-0 overflow-hidden',
          className,
        )}
        {...props}
      >
        {children}
      </aside>
    );
  },
);
Sidebar.displayName = 'Sidebar';

// ---- SidebarInset ----

export const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('relative flex min-h-svh flex-1 flex-col overflow-auto', className)}
    {...props}
  />
));
SidebarInset.displayName = 'SidebarInset';

// ---- SidebarHeader ----

export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col gap-2 p-2', className)}
    {...props}
  />
));
SidebarHeader.displayName = 'SidebarHeader';

// ---- SidebarFooter ----

export const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col gap-2 p-2 mt-auto', className)}
    {...props}
  />
));
SidebarFooter.displayName = 'SidebarFooter';

// ---- SidebarContent ----

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-1 flex-col gap-2 overflow-auto p-2', className)}
    {...props}
  />
));
SidebarContent.displayName = 'SidebarContent';

// ---- SidebarGroup ----

export const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('relative flex w-full min-w-0 flex-col', className)}
    {...props}
  />
));
SidebarGroup.displayName = 'SidebarGroup';

// ---- SidebarGroupLabel ----

export const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { open } = useSidebar();
  return (
    <div
      ref={ref}
      className={cn(
        'flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-muted-foreground transition-all duration-300',
        !open && 'opacity-0 h-0 overflow-hidden',
        className,
      )}
      {...props}
    />
  );
});
SidebarGroupLabel.displayName = 'SidebarGroupLabel';

// ---- SidebarMenu ----

export const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn('flex w-full min-w-0 flex-col gap-1', className)}
    {...props}
  />
));
SidebarMenu.displayName = 'SidebarMenu';

// ---- SidebarMenuItem ----

export const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn('group/menu-item relative', className)} {...props} />
));
SidebarMenuItem.displayName = 'SidebarMenuItem';

// ---- SidebarMenuButton ----

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string;
}

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  SidebarMenuButtonProps
>(({ className, asChild = false, isActive, children, ...props }, ref) => {
  const Comp = asChild ? React.Fragment : 'button';
  const inner = (
    <button
      ref={ref}
      data-active={isActive}
      className={cn(
        'peer/menu-button flex w-full min-h-[44px] items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-all hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 active:bg-accent active:text-accent-foreground disabled:pointer-events-none disabled:opacity-50',
        isActive && 'bg-accent text-accent-foreground font-medium',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );

  if (asChild) {
    return inner;
  }

  return <Comp>{inner}</Comp>;
});
SidebarMenuButton.displayName = 'SidebarMenuButton';

// ---- SidebarRail ----

export const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { toggle } = useSidebar();

  return (
    <button
      ref={ref}
      aria-label="Toggle sidebar"
      onClick={toggle}
      className={cn(
        'absolute -right-3 top-1/2 z-20 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent transition-colors',
        className,
      )}
      {...props}
    >
      <span className="sr-only">Toggle sidebar</span>
    </button>
  );
});
SidebarRail.displayName = 'SidebarRail';

// ---- SidebarTrigger ----

export const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { toggle } = useSidebar();

  return (
    <button
      ref={ref}
      onClick={(e) => {
        onClick?.(e);
        toggle();
      }}
      className={cn(
        'inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-accent',
        className,
      )}
      {...props}
    />
  );
});
SidebarTrigger.displayName = 'SidebarTrigger';
