import { Home, FileText, MessageSquare, FolderOpen } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/processes', icon: FileText, label: 'Processes' },
  { to: '/chat', icon: MessageSquare, label: 'AI Assistant' },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-gray-900 text-gray-300 flex flex-col min-h-0">
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-800 text-gray-400 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <FolderOpen size={14} />
          <span>Connected to Google Drive</span>
        </div>
      </div>
    </aside>
  );
}
