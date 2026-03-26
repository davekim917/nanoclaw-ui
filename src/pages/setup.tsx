import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { api, apiPost } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SetupPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if setup is already complete
  useEffect(() => {
    api<{ usersExist: boolean }>('/api/auth/setup-status')
      .then((res) => {
        if (res.usersExist) void navigate('/login', { replace: true });
      })
      .catch(() => {
        // Ignore — API may not support this endpoint yet
      });
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await apiPost('/api/auth/setup', { username, password });
      void navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-svh bg-background overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-accent/10 blur-[150px]" />
        <div className="absolute inset-0 grid-pattern" />
      </div>
      <div className="relative flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="relative inline-block mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-2xl shadow-primary/20">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M10 26 C10 26 8 20 12 14 C14 11 16 10 16 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary-foreground"/>
                <path d="M16 26 C16 26 16 19 18 14 C19.5 11 21 10 21 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary-foreground"/>
                <path d="M22 26 C22 26 22 20 22 14 C22 11 24 9 26 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary-foreground"/>
              </svg>
            </div>
            <div className="absolute -inset-2 rounded-[1.5rem] bg-accent/20 blur-xl -z-10" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">NanoClaw Setup</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Create your admin account to get started</p>
        </div>

        <Card className="relative overflow-hidden rounded-3xl border bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/20">
          <div className="glow-line" />
          <CardHeader className="pb-4">
            <CardTitle className="text-base">First-time setup</CardTitle>
            <CardDescription>
              Create an admin account to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !username || !password || !confirm}
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
