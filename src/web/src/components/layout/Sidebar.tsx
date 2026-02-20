import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const links = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/reminders', label: 'Reminders', icon: '♦' },
  { to: '/tasks', label: 'Tasks', icon: '✓' },
  { to: '/people', label: 'People', icon: '♟' },
  { to: '/calendars', label: 'Calendars', icon: '▧' },
  { to: '/kids', label: 'Kids', icon: '★' },
  { to: '/guide', label: 'Guide', icon: '?' },
];

const adminLinks = [
  { to: '/admin/users', label: 'Admin', icon: '⚙' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { isAdmin } = useAuth();
  const { theme, setTheme, themeKeys, themes } = useTheme();
  const allLinks = isAdmin ? [...links, ...adminLinks] : links;

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-60 bg-gradient-to-b from-primary-600 to-primary-800 flex flex-col transform transition-transform md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-primary-500/30">
          <h1 className="text-xl font-bold text-white tracking-wide">TaskFlow</h1>
          <p className="text-xs text-primary-200 mt-0.5">Your productivity hub</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {allLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm'
                    : 'text-primary-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="text-base w-5 text-center">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-primary-500/30">
          <div className="px-3 py-2 text-xs text-primary-300">
            TaskFlow v1.0
          </div>
          <div className="px-3 pb-1 flex items-center gap-1.5">
            {themeKeys.map((key) => (
              <button
                key={key}
                title={themes[key].label}
                onClick={() => setTheme(key)}
                className="w-5 h-5 rounded-full border-2 transition-all flex-shrink-0"
                style={{
                  backgroundColor: themes[key].preview,
                  borderColor: theme === key ? '#fff' : 'transparent',
                  boxShadow: theme === key ? '0 0 0 2px rgba(255,255,255,0.4)' : 'none',
                }}
              />
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
