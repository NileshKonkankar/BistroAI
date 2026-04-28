import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAppStore } from '../../store/useAppStore';
import { Menu as MenuIcon, X } from 'lucide-react';

export default function Layout() {
  const { user } = useAppStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  const isNotCustomer = user.role !== 'customer';

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      {/* Sidebar - Desktop */}
      {isNotCustomer && (
        <div className="hidden md:flex">
          <Sidebar />
        </div>
      )}
      
      {/* Sidebar - Mobile Drawer */}
      {isNotCustomer && isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white animate-in slide-in-from-left duration-300">
            <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} showMobileMenuBtn={isNotCustomer} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
