import { useState } from 'react';
import { NavLink, useParams } from 'react-router';
import { Home, MessageSquare, Workflow, History, MoreHorizontal, CheckSquare, Puzzle, FileText, Layers, Settings } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
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
  { label: 'Sessions', icon: History, path: '/sessions' },
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
            ? 'text-primary'
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const groupBase = group ? `/g/${group}` : '';

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
          <nav className="mt-4 grid grid-cols-3 gap-2">
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
