import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  UtensilsCrossed, 
  ClipboardList, 
  Package, 
  Users, 
  LogOut,
  Utensils
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { useAppStore } from '../../store/useAppStore';

const navItems = [
  { href: '/', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'staff'] },
  { href: '/menu', label: 'Menu', icon: UtensilsCrossed, roles: ['admin', 'staff'] },
  { href: '/orders', label: 'Orders', icon: ClipboardList, roles: ['admin', 'staff'] },
  { href: '/inventory', label: 'Inventory', icon: Package, roles: ['admin'] },
  { href: '/staff', label: 'Staff', icon: Users, roles: ['admin'] },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const { user } = useAppStore();

  const filteredNav = navItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <aside className="w-64 h-full bg-white border-r border-zinc-200 flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center text-white shadow-lg shadow-orange-200">
          <Utensils size={24} />
        </div>
        <span className="font-bold text-xl tracking-tight text-zinc-900">BistroAI</span>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {filteredNav.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              location.pathname === item.href
                ? "bg-brand/10 text-brand shadow-sm"
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
            )}
          >
            <item.icon size={20} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-100">
        <button
          onClick={() => auth.signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
