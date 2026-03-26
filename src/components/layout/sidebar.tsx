import { useEffect } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Home,
  MessageSquare,
  Workflow,
  CheckSquare,
  Puzzle,
  FileText,
  Layers,
  Settings,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useUiStore } from '@/stores/ui-store';
import { api } from '@/lib/api-client';
import { channelIcon, buildFolders, type CapabilitiesResponse } from '@/lib/channels';
import { cn } from '@/lib/utils';

interface NavItemConfig {
  label: string;
  icon: React.FC<{ className?: string }>;
  path: string;
  global?: boolean;
  adminOnly?: boolean;
}

const navItems: NavItemConfig[] = [
  { label: 'Home', icon: Home, path: '' },
  { label: 'Chat', icon: MessageSquare, path: '/chat' },
  { label: 'Workflows', icon: Workflow, path: '/workflows' },
  { label: 'Approvals', icon: CheckSquare, path: '/approvals', global: true },
  { label: 'Skills', icon: Puzzle, path: '/skills', global: true },
  { label: 'Logs', icon: FileText, path: '/logs' },
  { label: 'Integrations', icon: Layers, path: '/integrations', global: true },
  { label: 'Settings', icon: Settings, path: '/settings', global: true },
];

function NavItem({
  item,
  groupBase,
  isAdmin,
}: {
  item: NavItemConfig;
  groupBase: string;
  isAdmin: boolean;
}) {
  const { open } = useSidebar();
  if (item.adminOnly && !isAdmin) return null;

  const to = item.global ? item.path : `${groupBase}${item.path}`;

  return (
    <SidebarMenuItem>
      <NavLink
        to={to}
        end={item.path === ''}
        className={({ isActive }) =>
          cn(
            'group relative flex w-full min-h-[44px] items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
            )}
            <item.icon
              className={cn(
                'h-4 w-4 shrink-0 transition-colors',
                isActive ? 'text-accent' : 'text-muted-foreground group-hover:text-sidebar-accent-foreground',
              )}
            />
            <span
              className={cn(
                'transition-all duration-300 truncate',
                open ? 'opacity-100 w-auto' : 'opacity-0 w-0',
              )}
            >
              {item.label}
            </span>
            {item.label === 'Approvals' && isAdmin && open && (
              <Badge variant="secondary" className="ml-auto text-xs">
                Admin
              </Badge>
            )}
          </>
        )}
      </NavLink>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { group } = useParams<{ group?: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const { open } = useSidebar();
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const setActiveGroup = useUiStore((s) => s.setActiveGroup);

  const { data: capData, isLoading: groupsLoading } = useQuery({
    queryKey: ['capabilities'],
    queryFn: () => api<CapabilitiesResponse>('/api/capabilities'),
    staleTime: 60_000,
  });

  const folders = buildFolders(capData);
  const groupBase = group ? `/g/${group}` : '';

  // Sync active group from URL param
  useEffect(() => {
    if (group && folders.length > 0) setActiveGroup(group);
  }, [group, folders.length, setActiveGroup]);

  const handleGroupChange = (folder: string) => {
    setActiveGroup(folder);
    void navigate(`/g/${folder}/`);
  };

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '??';

  return (
    <Sidebar collapsible="icon">
      {/* Header: Logo + Group Selector */}
      <SidebarHeader>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3 hover:bg-sidebar-accent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                !open && 'justify-center',
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm">
                N
              </div>
              {open && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-lg font-bold tracking-tight truncate">NanoClaw</p>
                    <p className="text-xs font-medium text-muted-foreground truncate">
                      {group || 'AI Cockpit'}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 max-h-[60vh] overflow-auto">
            {groupsLoading ? (
              <div className="p-2 space-y-1">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : folders.map((f) => {
              // Deduplicate channel types for badge display
              const uniqueChannels = [...new Map(f.channels.map((c) => [c.channel, c])).values()];
              return (
                <DropdownMenuItem
                  key={f.folder}
                  onSelect={() => handleGroupChange(f.folder)}
                  className={cn('gap-2', group === f.folder && 'bg-accent')}
                >
                  <span className="flex-1 truncate">{f.folder}</span>
                  <span className="flex items-center gap-0.5 shrink-0">
                    {uniqueChannels.map((c) => (
                      <span key={c.channel} className="text-xs" title={c.channel}>
                        {channelIcon(c.channel)}
                      </span>
                    ))}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => (
              <NavItem
                key={item.path + (item.global ? '-global' : '')}
                item={item}
                groupBase={groupBase}
                isAdmin={isAdmin}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>

      </SidebarContent>

      {/* Footer: User + Actions */}
      <SidebarFooter className="border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-sidebar-accent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                !open && 'justify-center',
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {open && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user?.username ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user?.role ?? 'user'}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-48">
            <DropdownMenuItem onClick={toggleTheme}>
              {theme === 'light' ? (
                <>
                  <Moon className="mr-2 h-4 w-4" />
                  Dark mode
                </>
              ) : (
                <>
                  <Sun className="mr-2 h-4 w-4" />
                  Light mode
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
