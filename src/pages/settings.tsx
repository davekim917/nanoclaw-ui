import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/hooks/use-auth';
import { useUiStore } from '@/stores/ui-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Users, Moon, Sun, Globe, Save } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { isAdmin } = useAuth();
  const { theme, toggleTheme } = useUiStore();
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
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your account and preferences</p>
      </div>

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
              <Label className="text-muted-foreground">Username</Label>
              <p className="text-sm font-mono text-muted-foreground">{user?.username}</p>
            </div>
            <Button
              type="submit"
              size="sm"
              className="min-h-[44px]"
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
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={() => toggleTheme()}
              aria-label="Toggle dark mode"
            />
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
    </div>
  );
}
