import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoggingIn, loginError, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  React.useEffect(() => {
    if (isAuthenticated) {
      void navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ username, password });
      void navigate('/');
    } catch {
      // Error is shown via loginError
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-4 shadow-md">
            {/* Claw mark SVG */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M10 26 C10 26 8 20 12 14 C14 11 16 10 16 10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M16 26 C16 26 16 19 18 14 C19.5 11 21 10 21 10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M22 26 C22 26 22 20 22 14 C22 11 24 9 26 8" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">NanoClaw</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your cockpit</p>
        </div>

        <Card className="shadow-lg border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  disabled={isLoggingIn}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={isLoggingIn}
                />
              </div>

              {loginError && (
                <p className="text-sm text-destructive">
                  {loginError.message || 'Invalid credentials'}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoggingIn || !username || !password}
              >
                {isLoggingIn ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
