import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost, apiPatch, apiDelete } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/ui/empty-state';

// ---- Types ----

interface User {
  id: string;
  username: string;
  displayName?: string;
  role: 'admin' | 'user';
  groups: string[];
}

interface Capabilities {
  groups: string[];
}

// ---- Skeletons ----

function UserRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-9 w-20" /></TableCell>
    </TableRow>
  );
}

// ---- User Dialog ----

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
  allGroups: string[];
}

function UserDialog({ open, onOpenChange, user, allGroups }: UserDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!user;

  const [username, setUsername] = useState(user?.username ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>(user?.role ?? 'user');
  const [selectedGroups, setSelectedGroups] = useState<string[]>(user?.groups ?? []);

  // Reset when dialog opens with different user
  useEffect(() => {
    if (open) {
      setUsername(user?.username ?? '');
      setDisplayName(user?.displayName ?? '');
      setPassword('');
      setRole(user?.role ?? 'user');
      setSelectedGroups(user?.groups ?? []);
    }
  }, [open, user]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<User> & { password?: string }) =>
      apiPost<User>('/api/auth/users', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      onOpenChange(false);
      toast({ title: 'User created' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create user', description: err.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<User> & { password?: string }) =>
      apiPatch<User>(`/api/auth/users/${encodeURIComponent(user!.id)}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      onOpenChange(false);
      toast({ title: 'User updated' });
    },
    onError: (err) => {
      toast({ title: 'Failed to update user', description: err.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data: Partial<User> & { password?: string } = {
      username,
      displayName: displayName || undefined,
      role,
      groups: selectedGroups,
    };
    if (password) data.password = password;
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const toggleGroup = (g: string) => {
    setSelectedGroups((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Add User'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="u-username">Username</Label>
              <Input
                id="u-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                required
                autoComplete="off"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="u-display">Display name</Label>
            <Input
              id="u-display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-password">
              {isEdit ? 'New password (leave blank to keep)' : 'Password'}
            </Label>
            <Input
              id="u-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? 'Leave blank to keep current' : 'Enter password'}
              required={!isEdit}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger id="u-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/50" />
                    Member
                  </span>
                </SelectItem>
                <SelectItem value="admin">
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                    Admin
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {allGroups.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Groups</Label>
                {selectedGroups.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {selectedGroups.length} selected
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[48px] bg-muted/30">
                {allGroups.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGroup(g)}
                    className={`touch-compact inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedGroups.includes(g)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Create user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Delete Confirm Dialog ----

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onConfirm: () => void;
  isPending: boolean;
}

function DeleteDialog({ open, onOpenChange, user, onConfirm, isPending }: DeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete user</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete{' '}
          <strong>{user?.displayName ?? user?.username}</strong>? This action cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Page ----

export default function UsersPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      void navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: queryKeys.users(),
    queryFn: () => api<User[]>('/api/auth/users'),
    enabled: isAdmin,
  });

  const { data: capabilities } = useQuery<Capabilities>({
    queryKey: queryKeys.capabilities(),
    queryFn: () => api<Capabilities>('/api/capabilities'),
    enabled: isAdmin,
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/api/auth/users/${encodeURIComponent(id)}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      setDeleteTarget(null);
      toast({ title: 'User deleted' });
    },
    onError: (err) => {
      toast({ title: 'Failed to delete user', description: err.message, variant: 'destructive' });
    },
  });

  const allGroups = capabilities?.groups ?? [];

  if (authLoading) {
    return (
      <div className="px-4 md:px-6 py-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="px-4 md:px-6 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <Link
            to="/settings"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Settings
          </Link>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            User Management
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage user accounts and permissions
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="min-h-[44px] shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Display name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Groups</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => <UserRowSkeleton key={i} />)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : !users?.length ? (
        <EmptyState
          icon={Users}
          title="No users yet"
          description="Invite family or team members so they can access their own groups through the cockpit."
          action={{ label: 'Add User', onClick: () => setAddOpen(true) }}
        />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Display name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Groups</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-sm">{u.username}</TableCell>
                    <TableCell className="text-sm">{u.displayName ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                        {u.role === 'admin' ? 'Admin' : 'Member'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.groups.length > 0 ? (
                          u.groups.map((g) => (
                            <Badge key={g} variant="outline" className="text-xs">
                              {g}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px] h-9 w-9 p-0"
                          onClick={() => setEditUser(u)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px] h-9 w-9 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <UserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        allGroups={allGroups}
      />
      <UserDialog
        open={!!editUser}
        onOpenChange={(open) => { if (!open) setEditUser(null); }}
        user={editUser ?? undefined}
        allGroups={allGroups}
      />
      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        user={deleteTarget}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
