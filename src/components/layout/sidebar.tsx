import { NavLink, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Home,
  MessageSquare,
  Workflow,
  CheckSquare,
  History,
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
  SidebarMenuButton,
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
import { cn } from '@/lib/utils';

interface Group {
  jid: string;
  name: string;
  folder: string;
}

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
  { label: 'Sessions', icon: History, path: '/sessions' },
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
            'flex w-full min-h-[44px] items-center gap-2 overflow-hidden rounded-md px-2 py-2 text-sm transition-all hover:bg-accent hover:text-accent-foreground',
            isActive && 'bg-accent text-accent-foreground font-medium',
          )
        }
      >
        <item.icon className="h-4 w-4 shrink-0" />
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
      </NavLink>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { group } = useParams<{ group?: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const { open } = useSidebar();
  const { theme, toggleTheme, setActiveGroup } = useUiStore();

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api<{ groups: Group[] }>('/api/groups'),
    staleTime: 60_000,
  });

  const groups = groupsData?.groups ?? [];
  const groupBase = group ? `/g/${group}` : '';

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
                'flex w-full min-h-[44px] items-center gap-2 rounded-md px-2 hover:bg-accent transition-colors',
                !open && 'justify-center',
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-sm">
                N
              </div>
              {open && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold truncate">NanoClaw</p>
                    {group && (
                      <p className="text-xs text-muted-foreground truncate">{group}</p>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {groupsLoading ? (
              <div className="p-2 space-y-1">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              groups.map((g) => (
                <DropdownMenuItem
                  key={g.jid}
                  onSelect={() => handleGroupChange(g.folder)}
                  className={cn(group === g.folder && 'bg-accent')}
                >
                  {g.name || g.folder}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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

        {/* Thread list placeholder */}
        <SidebarGroup>
          <SidebarGroupLabel>Recent Threads</SidebarGroupLabel>
          <SidebarMenu>
            {open && (
              <SidebarMenuItem>
                <SidebarMenuButton disabled className="text-muted-foreground text-xs">
                  No recent threads
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: User + Actions */}
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex w-full min-h-[44px] items-center gap-2 rounded-md px-2 hover:bg-accent transition-colors',
                !open && 'justify-center',
              )}
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
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
