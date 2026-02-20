import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';

interface TopBarProps {
  title: string;
  onMenuToggle: () => void;
}

export function TopBar({ title, onMenuToggle }: TopBarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 bg-white border-b border-primary-100 flex items-center justify-between px-4 shrink-0 shadow-sm">
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="md:hidden text-primary-600 hover:text-primary-800 cursor-pointer">
          <span className="text-xl">☰</span>
        </button>
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-primary-600 font-medium hidden sm:inline">{user?.name}</span>
        <Button variant="ghost" onClick={logout} className="text-xs">Logout</Button>
      </div>
    </header>
  );
}
