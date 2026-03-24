import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { AppShell } from '@/components/layout/app-shell';
import { Skeleton } from '@/components/ui/skeleton';

// ---- Lazy-loaded pages ----

const LoginPage = React.lazy(() => import('@/pages/login'));
const SetupPage = React.lazy(() => import('@/pages/setup'));
const HomePage = React.lazy(() => import('@/pages/home'));
const ChatPage = React.lazy(() => import('@/pages/chat'));
const WorkflowsPage = React.lazy(() => import('@/pages/workflows'));
const WorkflowDetailPage = React.lazy(() => import('@/pages/workflow-detail'));
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
              <WorkflowDetailPage />
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

        // Root redirect
        {
          path: '/',
          element: <Navigate to="/g/default/" replace />,
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
