import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useUiStore } from '@/stores/ui-store';
import {
  Home,
  MessageSquare,
  Workflow,
  CheckSquare,
  History,
  FileText,
  Puzzle,
  Settings,
  Users,
  Layers,
} from 'lucide-react';

const navItems = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Chat', icon: MessageSquare, path: '/chat' },
  { label: 'Workflows', icon: Workflow, path: '/workflows' },
  { label: 'Approvals', icon: CheckSquare, path: '/approvals', global: true },
  { label: 'Sessions', icon: History, path: '/sessions' },
  { label: 'Skills', icon: Puzzle, path: '/skills', global: true },
  { label: 'Logs', icon: FileText, path: '/logs' },
  { label: 'Integrations', icon: Layers, path: '/integrations', global: true },
  { label: 'Settings', icon: Settings, path: '/settings', global: true },
  { label: 'Users', icon: Users, path: '/settings/users', global: true },
];

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUiStore();
  const { group } = useParams<{ group?: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const handleSelect = (path: string, isGlobal: boolean) => {
    setCommandPaletteOpen(false);
    if (isGlobal) {
      void navigate(path);
    } else {
      const base = group ? `/g/${group}` : '';
      void navigate(`${base}${path}`);
    }
  };

  return (
    <CommandDialog
      open={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {navItems.map(({ label, icon: Icon, path, global: isGlobal }) => (
            <CommandItem
              key={path}
              onSelect={() => handleSelect(path, isGlobal ?? false)}
            >
              <Icon className="mr-2 h-4 w-4" />
              <span>{label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => setCommandPaletteOpen(false)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>New message</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
