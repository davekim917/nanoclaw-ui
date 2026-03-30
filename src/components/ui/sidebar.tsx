/**
 * Sidebar primitives — desktop inline + mobile slide-over sheet.
 * On mobile (<md), renders as a fixed overlay that slides in from the left.
 * Supports swipe gestures: drag from left edge to open, swipe left to close.
 */
import * as React from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---- Context ----

interface SidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /** True when rendered as mobile overlay */
  isMobile: boolean;
  /** Internal refs for gesture handling */
  _sidebarRef: React.RefObject<HTMLElement | null>;
  _backdropRef: React.RefObject<HTMLDivElement | null>;
}

const SidebarContext = React.createContext<SidebarContextValue>({
  open: true,
  setOpen: () => undefined,
  toggle: () => undefined,
  isMobile: false,
  _sidebarRef: { current: null },
  _backdropRef: { current: null },
});

export function useSidebar() {
  return React.useContext(SidebarContext);
}

// ---- Hook: detect mobile ----

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches,
  );
  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mql);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
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
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const isMobile = useIsMobile();
    // Desktop uses controlled/persisted state; mobile uses its own (starts closed)
    const open = isMobile ? mobileOpen : (controlledOpen ?? internalOpen);

    const setOpen = React.useCallback(
      (next: boolean) => {
        if (isMobile) {
          setMobileOpen(next);
        } else {
          setInternalOpen(next);
          onOpenChange?.(next);
        }
      },
      [isMobile, onOpenChange],
    );

    const toggle = React.useCallback(() => {
      setOpen(!open);
    }, [open, setOpen]);

    // Refs for gesture handling
    const openRef = React.useRef(open);
    React.useEffect(() => { openRef.current = open; }, [open]);

    const sidebarRef = React.useRef<HTMLElement | null>(null);
    const backdropRef = React.useRef<HTMLDivElement | null>(null);

    // Mobile swipe gestures: drag to open from left edge, drag to close
    React.useEffect(() => {
      if (!isMobile) return;

      const SIDEBAR_W = 288; // w-72 = 18rem
      const EDGE_ZONE = window.innerWidth * 0.5; // left half of screen triggers open gesture
      const VELOCITY_THRESHOLD = 0.3; // px/ms — fast flick triggers regardless of distance
      const DISTANCE_FRACTION = 0.3; // fraction of sidebar width to trigger on slow drag

      let startX = 0;
      let startY = 0;
      let tracking = false;
      let gesture: 'open' | 'close' | null = null;
      let committed = false; // has moved enough to commit as horizontal gesture
      let lastX = 0;
      let lastTime = 0;
      let velocity = 0;

      const resetElements = () => {
        const sb = sidebarRef.current;
        const bd = backdropRef.current;
        if (sb) { sb.style.transition = ''; sb.style.transform = ''; }
        if (bd) { bd.style.transition = ''; bd.style.opacity = ''; bd.style.pointerEvents = ''; }
      };

      const cancel = () => {
        tracking = false;
        gesture = null;
        committed = false;
        resetElements();
      };

      const onTouchStart = (e: TouchEvent) => {
        const touch = e.touches[0];
        const isOpen = openRef.current;

        if (!isOpen && touch.clientX < EDGE_ZONE) {
          gesture = 'open';
        } else if (isOpen) {
          gesture = 'close';
        } else {
          return;
        }

        startX = touch.clientX;
        startY = touch.clientY;
        lastX = startX;
        lastTime = Date.now();
        velocity = 0;
        tracking = true;
        committed = false;
      };

      const onTouchMove = (e: TouchEvent) => {
        if (!tracking) return;

        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(touch.clientY - startY);

        // If we haven't committed yet, decide if this is horizontal or vertical
        if (!committed) {
          if (absDy > absDx + 10) { cancel(); return; } // vertical scroll
          if (absDx > 10) committed = true; else return; // wait for enough movement

          // Disable CSS transition for live tracking
          const sb = sidebarRef.current;
          const bd = backdropRef.current;
          if (sb) sb.style.transition = 'none';
          if (bd) bd.style.transition = 'none';
        }

        // Velocity tracking
        const now = Date.now();
        const dt = now - lastTime;
        if (dt > 0) velocity = (touch.clientX - lastX) / dt;
        lastX = touch.clientX;
        lastTime = now;

        const sb = sidebarRef.current;
        const bd = backdropRef.current;
        if (!sb) return;

        let progress: number; // 0 = closed, 1 = open

        if (gesture === 'open') {
          const offset = Math.max(0, Math.min(SIDEBAR_W, dx));
          progress = offset / SIDEBAR_W;
          sb.style.transform = `translateX(${-SIDEBAR_W + offset}px)`;
        } else {
          const offset = Math.min(0, Math.max(-SIDEBAR_W, dx));
          progress = 1 + offset / SIDEBAR_W;
          sb.style.transform = `translateX(${offset}px)`;
        }

        if (bd) {
          bd.style.opacity = String(Math.max(0, progress) * 0.5);
          bd.style.pointerEvents = progress > 0.01 ? 'auto' : 'none';
        }
      };

      const onTouchEnd = () => {
        if (!tracking) return;
        tracking = false;

        const sb = sidebarRef.current;
        const bd = backdropRef.current;

        // Restore CSS transitions so the snap animates
        if (sb) { sb.style.transition = ''; sb.style.transform = ''; }
        if (bd) { bd.style.transition = ''; bd.style.opacity = ''; bd.style.pointerEvents = ''; }

        if (!committed) { gesture = null; return; }

        const distThreshold = SIDEBAR_W * DISTANCE_FRACTION;
        const dx = lastX - startX;

        if (gesture === 'open') {
          if (dx > distThreshold || velocity > VELOCITY_THRESHOLD) setOpen(true);
        } else if (gesture === 'close') {
          if (dx < -distThreshold || velocity < -VELOCITY_THRESHOLD) setOpen(false);
        }

        gesture = null;
      };

      document.addEventListener('touchstart', onTouchStart, { passive: true });
      document.addEventListener('touchmove', onTouchMove, { passive: true });
      document.addEventListener('touchend', onTouchEnd, { passive: true });
      document.addEventListener('touchcancel', cancel, { passive: true });
      return () => {
        document.removeEventListener('touchstart', onTouchStart);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        document.removeEventListener('touchcancel', cancel);
      };
    }, [isMobile, setOpen]);

    return (
      <SidebarContext.Provider value={{ open, setOpen, toggle, isMobile, _sidebarRef: sidebarRef, _backdropRef: backdropRef }}>
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
    const { open, setOpen, isMobile, _sidebarRef, _backdropRef } = useSidebar();

    // Merge forwarded ref with internal gesture ref
    const mergedSidebarRef = React.useCallback(
      (el: HTMLElement | null) => {
        _sidebarRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) (ref as React.RefObject<HTMLElement | null>).current = el;
      },
      [ref, _sidebarRef],
    );

    // Mobile: slide-over sheet with backdrop
    if (isMobile) {
      return (
        <>
          {/* Backdrop — always mounted so gesture handler can fade it in */}
          <div
            ref={_backdropRef}
            className={cn(
              'fixed inset-0 z-40 bg-black transition-opacity duration-300',
              open ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none',
            )}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Sidebar panel */}
          <aside
            ref={mergedSidebarRef}
            data-collapsible={collapsible}
            data-open={open}
            data-side={side}
            className={cn(
              'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-card transition-transform duration-300 ease-in-out',
              open ? 'translate-x-0' : '-translate-x-full',
              className,
            )}
            {...props}
          >
            {children}
          </aside>
        </>
      );
    }

    // Desktop: inline collapsible sidebar
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
        'flex h-8 shrink-0 items-center rounded-md px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground transition-all duration-300',
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
  const { toggle, open, isMobile } = useSidebar();

  // No rail on mobile — use the close button or backdrop instead
  if (isMobile) return null;

  return (
    <button
      ref={ref}
      aria-label="Toggle sidebar"
      onClick={toggle}
      className={cn(
        'absolute -right-3 top-1/2 z-20 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent transition-all duration-150 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    >
      <ChevronLeft
        className={cn('h-3.5 w-3.5 transition-transform duration-300', !open && 'rotate-180')}
        aria-hidden="true"
      />
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
