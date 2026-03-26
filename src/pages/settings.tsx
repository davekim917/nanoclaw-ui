import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/hooks/use-auth';
import { useUiStore } from '@/stores/ui-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Users, Moon, Sun, Globe, Save, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const [displayName, setDisplayName] = useState(user?.username ?? '');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    // Profile save would go to an API endpoint; show optimistic feedback for now.
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Detect user timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="relative">
      <div className="ambient-glow" />
      <PageHeader icon={SettingsIcon} title="Settings" subtitle="Manage your account and preferences" maxWidth="max-w-3xl" />
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto space-y-6">

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your display name shown in the cockpit</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Username</p>
              <p className="text-sm font-mono text-muted-foreground">{user?.username}</p>
            </div>
            <Button
              type="submit"
              size="sm"
              className="min-h-[44px] bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saved ? 'Saved!' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Customize how the cockpit looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Sun className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">Dark mode</p>
                <p className="text-xs text-muted-foreground">
                  Currently: {theme === 'dark' ? 'Dark' : 'Light'}
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleTheme()}
              aria-label="Toggle dark mode"
              className={cn(
                'flex h-5 w-9 items-center rounded-full px-0.5 transition-colors duration-300',
                theme === 'dark' ? 'bg-sidebar-accent justify-start' : 'bg-accent justify-end',
              )}
            >
              <div
                className={cn(
                  'h-4 w-4 rounded-full shadow-sm transition-colors duration-300',
                  theme === 'dark' ? 'bg-muted-foreground' : 'bg-accent-foreground',
                )}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
          <CardDescription>Regional and display settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Timezone</p>
              <p className="text-sm text-muted-foreground font-mono">{timezone}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Detected automatically from your browser
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin section */}
      {isAdmin && (
        <>
          <Separator />
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Administration
              </CardTitle>
              <CardDescription>Manage users and access controls</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/settings/users">
                <Button variant="outline" className="min-h-[44px]">
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  User Management
                </Button>
              </Link>
            </CardContent>
          </Card>
        </>
      )}

      <Separator />

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="min-h-[44px] border-destructive text-destructive hover:bg-destructive/10">
            Delete account
          </Button>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
