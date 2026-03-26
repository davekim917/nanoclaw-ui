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
import { channelIcon, channelFromJid } from '@/lib/channels';
import { cn } from '@/lib/utils';

interface Group {
  jid: string;
  name: string;
  folder: string;
  channel: string;
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

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api<{ groups: Group[] }>('/api/groups'),
    staleTime: 60_000,
  });

  const groups = groupsData?.groups ?? [];
  const groupBase = group ? `/g/${group}` : '';

  // Sync active group JID from URL param when groups load
  const activeGroupJid = useUiStore((s) => s.activeGroupJid);
  useEffect(() => {
    if (group && groups.length > 0 && !activeGroupJid) {
      const jid = groups.find((g) => g.folder === group)?.jid ?? '';
      if (jid) setActiveGroup(group, jid);
    }
  }, [group, groups, activeGroupJid, setActiveGroup]);

  const handleGroupChange = (folder: string) => {
    const jid = groups.find((g) => g.folder === folder)?.jid ?? '';
    setActiveGroup(folder, jid);
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
            ) : (() => {
              // Filter server-level Discord entries, then deduplicate by (folder + channel)
              // so "illysium" appears once under Discord AND once under Slack
              const seen = new Set<string>();
              const byChannel = new Map<string, Group[]>();
              for (const g of groups) {
                if (g.folder.startsWith('discord_')) continue;
                const ch = g.channel || channelFromJid(g.jid);
                const key = `${g.folder}::${ch}`;
                if (seen.has(key)) continue;
                seen.add(key);
                if (!byChannel.has(ch)) byChannel.set(ch, []);
                // Use folder as display name for deduped entries
                byChannel.get(ch)!.push({ ...g, name: g.folder });
              }
              return [...byChannel.entries()].map(([ch, channelGroups], idx) => (
                <div key={ch}>
                  {idx > 0 && <DropdownMenuSeparator />}
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {channelIcon(ch)} {ch}
                  </div>
                  {channelGroups.map((g) => (
                    <DropdownMenuItem
                      key={g.jid}
                      onSelect={() => handleGroupChange(g.folder)}
                      className={cn('pl-4', group === g.folder && 'bg-accent')}
                    >
                      {g.name || g.folder}
                    </DropdownMenuItem>
                  ))}
                </div>
              ));
            })()}
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
