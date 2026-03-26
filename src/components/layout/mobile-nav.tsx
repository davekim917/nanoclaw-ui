import { useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Home, MessageSquare, Workflow, MoreHorizontal, CheckSquare, Puzzle, FileText, Layers, Settings, Check } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api-client';
import { buildFolders, type CapabilitiesResponse } from '@/lib/channels';
import { ChannelIcon } from '@/components/channel-icon';
import { useUiStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

interface NavTab {
  label: string;
  icon: React.FC<{ className?: string }>;
  path: string;
  global?: boolean;
}

const primaryTabs: NavTab[] = [
  { label: 'Home', icon: Home, path: '' },
  { label: 'Chat', icon: MessageSquare, path: '/chat' },
  { label: 'Workflows', icon: Workflow, path: '/workflows' },
];

const secondaryItems: NavTab[] = [
  { label: 'Approvals', icon: CheckSquare, path: '/approvals', global: true },
  { label: 'Skills', icon: Puzzle, path: '/skills', global: true },
  { label: 'Logs', icon: FileText, path: '/logs' },
  { label: 'Integrations', icon: Layers, path: '/integrations', global: true },
  { label: 'Settings', icon: Settings, path: '/settings', global: true },
];

function MobileTabButton({ tab, groupBase }: { tab: NavTab; groupBase: string }) {
  const to = tab.global ? tab.path : `${groupBase}${tab.path}`;

  return (
    <NavLink
      to={to}
      end={tab.path === ''}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center justify-center gap-1 min-h-[56px] text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
          isActive
            ? 'text-accent'
            : 'text-muted-foreground hover:text-foreground',
        )
      }
    >
      <tab.icon className="h-5 w-5" />
      <span>{tab.label}</span>
    </NavLink>
  );
}

export function MobileNav() {
  const { group } = useParams<{ group?: string }>();
  const navigate = useNavigate();
  const setActiveGroup = useUiStore((s) => s.setActiveGroup);
  const [sheetOpen, setSheetOpen] = useState(false);
  const groupBase = group ? `/g/${group}` : '';

  const { data: capData } = useQuery({
    queryKey: ['capabilities'],
    queryFn: () => api<CapabilitiesResponse>('/api/capabilities'),
    staleTime: 60_000,
  });

  const folders = buildFolders(capData);

  const handleGroupChange = (folder: string) => {
    setActiveGroup(folder);
    void navigate(`/g/${folder}/`);
    setSheetOpen(false);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t bg-background md:hidden pb-[env(safe-area-inset-bottom)]">
      {primaryTabs.map((tab) => (
        <MobileTabButton key={tab.path} tab={tab} groupBase={groupBase} />
      ))}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            className="flex flex-1 flex-col items-center justify-center gap-1 min-h-[56px] text-xs rounded-none h-auto text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="pb-safe">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>

          {/* Group switcher — one entry per folder */}
          <div className="mt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">Switch Group</p>
            <div className="flex flex-wrap gap-1.5">
              {folders.map((f) => {
                const uniqueChannels = [...new Map(f.channels.map((c) => [c.channel, c])).values()];
                return (
                  <button
                    key={f.folder}
                    onClick={() => handleGroupChange(f.folder)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px]',
                      group === f.folder
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent/10 hover:text-accent',
                    )}
                  >
                    {group === f.folder && <Check className="h-3 w-3" />}
                    <span>{f.folder}</span>
                    <span className="flex items-center gap-1">
                      {uniqueChannels.map((c) => (
                        <ChannelIcon key={c.channel} channel={c.channel} size={12} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Navigation items */}
          <nav className="grid grid-cols-3 gap-2">
            {secondaryItems.map((item) => {
              const to = item.global ? item.path : `${groupBase}${item.path}`;
              return (
                <NavLink
                  key={item.path}
                  to={to}
                  onClick={() => setSheetOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center justify-center gap-2 rounded-lg p-3 text-sm transition-colors duration-150 min-h-[72px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground',
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
