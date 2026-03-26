import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoggingIn, loginError, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      void navigate('/');
      return;
    }
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (res.status === 401) {
          return fetch('/api/auth/setup-status', { credentials: 'include' });
        }
        return null;
      })
      .then((res) => {
        if (res && res.ok) {
          return res.json();
        }
        return null;
      })
      .then((data: { needsSetup?: boolean } | null) => {
        if (data && data.needsSetup) {
          void navigate('/setup', { replace: true });
        }
      })
      .catch(() => {})
      .finally(() => setCheckingSetup(false));
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login({ username, password });
      void navigate('/');
    } catch {
      // Error is shown via loginError
    }
  };

  if (checkingSetup) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-svh bg-background overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        {/* Large ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-accent/10 blur-[150px]" />

        {/* Decorative grid */}
        <div className="absolute inset-0 grid-pattern" />

        {/* Oversized brand letter */}
        <div className="absolute -bottom-32 -left-20 text-[40rem] font-bold leading-none text-foreground/[0.02] select-none pointer-events-none">
          N
        </div>
      </div>

      {/* Content */}
      <div className="relative flex min-h-svh flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <div className="mb-12 flex flex-col items-center">
          <div className="relative mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-2xl shadow-primary/20">
              <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M10 26 C10 26 8 20 12 14 C14 11 16 10 16 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary-foreground"/>
                <path d="M16 26 C16 26 16 19 18 14 C19.5 11 21 10 21 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary-foreground"/>
                <path d="M22 26 C22 26 22 20 22 14 C22 11 24 9 26 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary-foreground"/>
              </svg>
            </div>
            <div className="absolute -inset-2 rounded-[2rem] bg-accent/20 blur-xl -z-10" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            NanoClaw
          </h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to your cockpit
          </p>
        </div>

        {/* Login card */}
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-2xl shadow-black/20">
            {/* Card glow line */}
            <div className="glow-line" />

            <div className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                Welcome back
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your credentials to continue
              </p>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
              {/* Username */}
              <div>
                <label htmlFor="username" className="mb-2 block text-sm font-medium text-foreground">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  required
                  disabled={isLoggingIn}
                  className="w-full rounded-xl border border-border bg-input px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 hover:border-muted-foreground/30 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    disabled={isLoggingIn}
                    className="w-full rounded-xl border border-border bg-input px-4 py-3.5 pr-12 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 hover:border-muted-foreground/30 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="touch-compact absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {loginError && (
                <p className="text-sm text-destructive">
                  {loginError.message || 'Invalid credentials'}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoggingIn || !username || !password}
                className={cn(
                  'group relative w-full overflow-hidden rounded-xl py-4 text-sm font-semibold transition-all duration-300',
                  username && password
                    ? 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/25'
                    : 'bg-muted text-muted-foreground cursor-not-allowed',
                )}
              >
                <span
                  className={cn(
                    'flex items-center justify-center gap-2 transition-transform',
                    isLoggingIn && '-translate-y-10 opacity-0',
                  )}
                >
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
                {isLoggingIn && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or continue with</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Social login */}
            <div className="grid grid-cols-3 gap-3">
              {['Discord', 'Slack', 'Google'].map((provider) => (
                <button
                  key={provider}
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Coming soon"
                  className="flex items-center justify-center rounded-xl border border-border bg-muted/50 py-3 text-xs font-medium text-muted-foreground cursor-not-allowed opacity-60"
                >
                  {provider}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-muted-foreground/60">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
