import { Bell, Search, User, Menu as MenuIcon, LogOut } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { auth } from '../../lib/firebase';

export default function Header({ onMenuClick, showMobileMenuBtn }: { onMenuClick?: () => void, showMobileMenuBtn?: boolean }) {
  const { user } = useAppStore();

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {showMobileMenuBtn && (
          <button 
            onClick={onMenuClick}
            className="md:hidden p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg"
          >
            <MenuIcon size={20} />
          </button>
        )}
        <div className="flex-1 max-w-md relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Search orders, menu..."
            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-full transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-brand rounded-full border-2 border-white"></span>
        </button>

        <div className="h-8 w-px bg-zinc-200 mx-2 hidden sm:block"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-zinc-900">{user?.email?.split('@')[0]}</p>
            <p className="text-xs text-brand font-medium capitalize">{user?.role}</p>
          </div>
          
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-sm font-bold text-zinc-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
            title="Sign Out"
          >
            <LogOut size={16} />
            <span className="hidden xs:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
