import { Outlet, Navigate } from 'react-router';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './sidebar';
import { ChatInput } from './chat-input';
import { MobileNav } from './mobile-nav';
import { CommandPalette } from './command-palette';
import { useAuth } from '@/hooks/use-auth';
import { useUiStore } from '@/stores/ui-store';
import { Skeleton } from '@/components/ui/skeleton';

function LoadingShell() {
  return (
    <div className="flex h-svh items-center justify-center bg-background">
      <div className="space-y-3 text-center">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}

export function AppShell() {
  const { isAuthenticated, isLoading } = useAuth();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);

  if (isLoading) return <LoadingShell />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <>
      <SidebarProvider
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        className="min-h-svh"
      >
        <AppSidebar />

        <SidebarInset className="flex flex-col">
          {/* Page content */}
          <main className="flex-1 overflow-auto pb-14 md:pb-0">
            <Outlet />
          </main>

          {/* Persistent chat input */}
          <div className="hidden md:block">
            <ChatInput />
          </div>
        </SidebarInset>
      </SidebarProvider>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* Mobile chat input above bottom nav */}
      <div className="fixed bottom-14 left-0 right-0 z-30 md:hidden">
        <ChatInput />
      </div>

      {/* Command palette (global) */}
      <CommandPalette />
    </>
  );
}
