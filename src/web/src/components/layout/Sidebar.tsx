import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

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
  const allLinks = isAdmin ? [...links, ...adminLinks] : links;

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-60 bg-white border-r border-primary-100 flex flex-col transform transition-transform md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-primary-100">
          <h1 className="text-xl font-bold text-primary-600">TaskFlow</h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {allLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 border-l-3 border-primary-500'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <span className="text-base w-5 text-center">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
