import React, { Suspense, useEffect, useState } from 'react';
import { createBrowserRouter, Navigate, RouterProvider, useNavigate, useRouteError } from 'react-router';
import { AppShell } from '@/components/layout/app-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';

// ---- Lazy-loaded pages ----

const LoginPage = React.lazy(() => import('@/pages/login'));
const SetupPage = React.lazy(() => import('@/pages/setup'));
const HomePage = React.lazy(() => import('@/pages/home'));
const ChatPage = React.lazy(() => import('@/pages/chat'));
const WorkflowsPage = React.lazy(() => import('@/pages/workflows'));
const SessionsPage = React.lazy(() => import('@/pages/sessions'));
const SessionDetailPage = React.lazy(() => import('@/pages/session-detail'));
const LogsPage = React.lazy(() => import('@/pages/logs'));
const ApprovalsPage = React.lazy(() => import('@/pages/approvals'));
const IntegrationsPage = React.lazy(() => import('@/pages/integrations'));
const SkillsPage = React.lazy(() => import('@/pages/skills'));
const SettingsPage = React.lazy(() => import('@/pages/settings'));
const UsersPage = React.lazy(() => import('@/pages/users'));

// ---- Fallback ----

function PageSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
      <div className="space-y-2 mt-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

// ---- Error boundary ----

function ErrorFallback() {
  const error = useRouteError();
  const navigate = useNavigate();
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-md">{message}</p>
      <button
        onClick={() => void navigate('/')}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Back to home
      </button>
    </div>
  );
}

// ---- Dynamic group redirect ----

interface GroupInfo { jid: string; name: string; folder: string }

function GroupRedirect() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    api<{ groups: GroupInfo[] }>('/api/groups')
      .then((res) => {
        const first = res.groups?.[0]?.folder;
        if (first) {
          void navigate(`/g/${first}/`, { replace: true });
        } else {
          setChecked(true);
        }
      })
      .catch(() => setChecked(true));
  }, [navigate]);

  if (!checked) return <PageSkeleton />;
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-xl font-semibold mb-2">No groups available</h2>
      <p className="text-muted-foreground text-sm">Connect a channel to get started.</p>
    </div>
  );
}

// ---- Router ----

const router = createBrowserRouter(
  [
    // Auth pages (no shell)
    {
      path: '/login',
      element: (
        <LazyPage>
          <LoginPage />
        </LazyPage>
      ),
    },
    {
      path: '/setup',
      element: (
        <LazyPage>
          <SetupPage />
        </LazyPage>
      ),
    },

    // Authenticated shell
    {
      element: <AppShell />,
      errorElement: <ErrorFallback />,
      children: [
        // Group-scoped routes
        {
          path: '/g/:group/',
          element: (
            <LazyPage>
              <HomePage />
            </LazyPage>
          ),
        },
        {
          path: '/g/:group/chat',
          element: (
            <LazyPage>
              <ChatPage />
            </LazyPage>
          ),
        },
        {
          path: '/g/:group/chat/:threadId',
          element: (
            <LazyPage>
              <ChatPage />
            </LazyPage>
          ),
        },
        {
          path: '/g/:group/workflows',
          element: (
            <LazyPage>
              <WorkflowsPage />
            </LazyPage>
          ),
        },
        {
          path: '/g/:group/workflows/:id',
          element: (
            <LazyPage>
              <WorkflowsPage />
            </LazyPage>
          ),
        },
        {
          path: '/g/:group/sessions',
          element: (
            <LazyPage>
              <SessionsPage />
            </LazyPage>
          ),
        },
        {
          path: '/g/:group/sessions/:key',
          element: (
            <LazyPage>
              <SessionDetailPage />
            </LazyPage>
          ),
        },
        {
          path: '/g/:group/logs',
          element: (
            <LazyPage>
              <LogsPage />
            </LazyPage>
          ),
        },

        // Global routes (no group scope)
        {
          path: '/approvals',
          element: (
            <LazyPage>
              <ApprovalsPage />
            </LazyPage>
          ),
        },
        {
          path: '/integrations',
          element: (
            <LazyPage>
              <IntegrationsPage />
            </LazyPage>
          ),
        },
        {
          path: '/skills',
          element: (
            <LazyPage>
              <SkillsPage />
            </LazyPage>
          ),
        },
        {
          path: '/settings',
          element: (
            <LazyPage>
              <SettingsPage />
            </LazyPage>
          ),
        },
        {
          path: '/settings/users',
          element: (
            <LazyPage>
              <UsersPage />
            </LazyPage>
          ),
        },

        // Root redirect — pick first available group
        {
          path: '/',
          element: <GroupRedirect />,
        },
      ],
    },

    // 404 fallback
    {
      path: '*',
      element: <Navigate to="/" replace />,
    },
  ],
  {
    basename: '/ui',
  },
);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
