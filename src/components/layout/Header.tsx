import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Search, 
  Menu as MenuIcon, 
  LogOut, 
  Volume2, 
  VolumeX, 
  ChefHat, 
  ExternalLink, 
  Sparkles, 
  Trash2, 
  Check, 
  MapPin, 
  Radio
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { auth } from '../../lib/firebase';
import { displayNewOrderToast } from '../notifications/OrderNotificationListener';
import { testOrderChime } from '../../lib/audioAlert';
import { formatCurrency, cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Header({ 
  onMenuClick, 
  showMobileMenuBtn 
}: { 
  onMenuClick?: () => void; 
  showMobileMenuBtn?: boolean; 
}) {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    markAllAsRead, 
    clearNotifications, 
    soundEnabled, 
    toggleSound,
    addNotification
  } = useNotificationStore();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleOpen = () => {
    if (!isOpen) {
      markAllAsRead();
    }
    setIsOpen(!isOpen);
  };

  const handleSoundToggle = () => {
    toggleSound();
    if (!soundEnabled) {
      setTimeout(() => testOrderChime(), 100);
    }
  };

  const triggerTestAlert = () => {
    const mockOrder = {
      id: `DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
      customerEmail: 'sarah.davis@example.com',
      tableNumber: `T${Math.floor(1 + Math.random() * 6)}`,
      type: 'dine-in',
      items: [
        { name: 'Truffle Wagyu Burger', qty: 2, price: 26 },
        { name: 'Crispy Rosemary Fries', qty: 1, price: 9 },
        { name: 'Artisanal Cold Brew', qty: 2, price: 7 }
      ],
      totalAmount: 75,
      createdAt: new Date(),
    };

    const itemCount = mockOrder.items.reduce((acc, c) => acc + c.qty, 0);
    const itemSummary = mockOrder.items.map(i => `${i.qty}x ${i.name}`).join(', ');

    addNotification({
      orderId: mockOrder.id,
      customerEmail: mockOrder.customerEmail,
      tableNumber: mockOrder.tableNumber,
      type: mockOrder.type,
      itemCount,
      itemSummary,
      totalAmount: mockOrder.totalAmount,
    });

    displayNewOrderToast(mockOrder, (path) => {
      setIsOpen(false);
      navigate(path);
    });
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const formatElapsed = (timestamp: number) => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    return `${diffHour}h ago`;
  };

  return (
    <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {showMobileMenuBtn && (
          <button 
            onClick={onMenuClick}
            className="md:hidden p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg cursor-pointer"
          >
            <MenuIcon size={20} />
          </button>
        )}
        <div className="flex-1 max-w-md relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Search orders, menu items..."
            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Real-time Order Notification Popover */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={handleToggleOpen}
            className={cn(
              "p-2.5 rounded-full transition-all relative cursor-pointer",
              isOpen ? "bg-orange-50 text-brand ring-2 ring-brand/30" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
            )}
            title="Real-Time Staff Order Notifications"
          >
            <Bell size={20} className={cn(unreadCount > 0 && "animate-bounce")} />
            
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-brand text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center px-1 shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white ring-1 ring-emerald-200" title="Live listener active" />
            )}
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute right-0 mt-2 w-[340px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden z-50 text-zinc-900"
              >
                {/* Header */}
                <div className="p-4 border-b border-zinc-100 bg-zinc-50/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-zinc-900">Order Notifications</h3>
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        Live
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Real-time toasts & audio chimes</p>
                  </div>

                  {/* Sound Chime Toggle */}
                  <button
                    onClick={handleSoundToggle}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer",
                      soundEnabled 
                        ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100" 
                        : "bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200"
                    )}
                    title={soundEnabled ? "Mute audio chime" : "Enable audio chime"}
                  >
                    {soundEnabled ? <Volume2 size={14} className="text-amber-600" /> : <VolumeX size={14} />}
                    <span>{soundEnabled ? "Sound ON" : "Muted"}</span>
                  </button>
                </div>

                {/* Quick actions bar */}
                <div className="px-4 py-2 bg-brand/5 border-b border-brand/10 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-brand flex items-center gap-1">
                    <Sparkles size={12} />
                    Test Notification System
                  </span>
                  <button
                    onClick={triggerTestAlert}
                    className="text-[11px] font-bold bg-brand hover:bg-brand/90 text-white px-2.5 py-1 rounded-md transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    Trigger Test Toast
                  </button>
                </div>

                {/* Notifications list */}
                <div className="max-h-[320px] overflow-y-auto divide-y divide-zinc-100">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
                        <Radio size={18} className="animate-pulse text-zinc-500" />
                      </div>
                      <p className="text-xs font-bold text-zinc-700">Listening for new orders</p>
                      <p className="text-[11px] text-zinc-400 max-w-[220px] mx-auto leading-relaxed">
                        When a customer places an order, an instant Sonner toast will appear here and ring the kitchen chime.
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        className={cn(
                          "p-3.5 hover:bg-zinc-50 transition-colors flex flex-col gap-1.5 cursor-pointer group",
                          !notif.read && "bg-orange-50/30"
                        )}
                        onClick={() => {
                          setIsOpen(false);
                          navigate('/orders');
                        }}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-zinc-900 bg-zinc-100 px-1.5 py-0.5 rounded text-[11px]">
                              #{notif.orderId.slice(-4).toUpperCase()}
                            </span>
                            {notif.tableNumber && (
                              <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                <MapPin size={9} />
                                {notif.tableNumber}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-medium">
                            {formatElapsed(notif.timestamp)}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-600 line-clamp-1">
                          {notif.itemSummary}
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-black text-zinc-900 font-mono">
                            {formatCurrency(notif.totalAmount)}
                          </span>
                          <span className="text-[10px] text-brand font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            View Order <ExternalLink size={10} />
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="p-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between text-xs">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/orders');
                      }}
                      className="text-xs font-bold text-zinc-800 hover:text-zinc-950 flex items-center gap-1 cursor-pointer"
                    >
                      <ChefHat size={14} className="text-brand" />
                      Go to Kitchen Orders
                    </button>
                    <button
                      onClick={clearNotifications}
                      className="text-[11px] text-zinc-400 hover:text-red-600 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} />
                      Clear All
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-8 w-px bg-zinc-200 mx-1 hidden sm:block"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-zinc-900">{user?.email?.split('@')[0]}</p>
            <p className="text-xs text-brand font-medium capitalize">{user?.role}</p>
          </div>
          
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-sm font-bold text-zinc-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all cursor-pointer"
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
