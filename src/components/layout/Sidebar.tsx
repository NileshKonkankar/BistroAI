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
import { motion } from 'motion/react';
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
    <aside className="w-64 h-full bg-white border-r border-zinc-200 flex flex-col select-none">
      <div className="p-6 flex items-center gap-3">
        <motion.div 
          whileHover={{ rotate: 12, scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200 cursor-pointer"
        >
          <Utensils size={22} />
        </motion.div>
        <span className="font-extrabold text-xl tracking-tight text-zinc-900">BistroAI</span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.href;
          const IconComponent = item.icon;

          return (
            <motion.div
              key={item.href}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
              className="relative"
            >
              <Link
                to={item.href}
                onClick={onClose}
                className={cn(
                  "relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 z-10",
                  isActive
                    ? "text-brand font-bold"
                    : "text-zinc-500 hover:text-zinc-900"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarTabPill"
                    className="absolute inset-0 bg-brand/10 border border-brand/20 rounded-xl z-0"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <motion.div
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 350, damping: 22 }}
                  className="z-10"
                >
                  <IconComponent size={20} />
                </motion.div>
                <span className="z-10">{item.label}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-100">
        <motion.button
          whileHover={{ scale: 1.02, x: 2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => auth.signOut()}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={20} />
          Sign Out
        </motion.button>
      </div>
    </aside>
  );
}
