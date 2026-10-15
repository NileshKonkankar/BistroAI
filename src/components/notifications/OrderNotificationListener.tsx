import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '../../lib/firebase';
import { useAppStore } from '../../store/useAppStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { playOrderChime } from '../../lib/audioAlert';
import { formatCurrency } from '../../lib/utils';
import { Bell, ChefHat, ExternalLink, MapPin, ShoppingBag, X } from 'lucide-react';

interface OrderItem {
  id?: string;
  name: string;
  qty: number;
  price?: number;
}

interface NewOrderData {
  id: string;
  customerEmail?: string | null;
  tableNumber?: string | null;
  type?: string;
  items?: OrderItem[];
  totalAmount?: number;
  createdAt?: any;
}

/**
 * Fires an interactive, beautifully styled Sonner toast alert for a new order
 */
export function displayNewOrderToast(order: NewOrderData, onNavigate: (path: string) => void) {
  // Play chime for staff
  playOrderChime();

  const orderShortId = (order.id || 'NEW').slice(-4).toUpperCase();
  const itemCount = (order.items || []).reduce((acc, curr) => acc + (curr.qty || 1), 0);
  const itemsSummary = (order.items || [])
    .slice(0, 2)
    .map((i) => `${i.qty}x ${i.name}`)
    .join(', ') + ((order.items || []).length > 2 ? ` +${(order.items || []).length - 2} more` : '');

  const customerName = order.customerEmail ? order.customerEmail.split('@')[0] : 'Guest Customer';
  const tableText = order.tableNumber ? `Table ${order.tableNumber}` : (order.type === 'dine-in' ? 'Dine-In' : 'Takeout');

  toast.custom(
    (t) => (
      <div className="w-[360px] sm:w-[400px] bg-white rounded-2xl border-2 border-brand/40 shadow-2xl p-4 text-zinc-900 pointer-events-auto flex flex-col gap-3 relative overflow-hidden backdrop-blur-lg animate-in slide-in-from-top-4 duration-300">
        {/* Glowing top line accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand via-amber-500 to-orange-400" />

        {/* Header section with pulsating live tag */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand"></span>
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest text-brand font-mono">
              New Order Received
            </span>
            <span className="bg-zinc-900 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-md">
              #{orderShortId}
            </span>
          </div>

          <button
            onClick={() => toast.dismiss(t)}
            className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
            title="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>

        {/* Order Details Body */}
        <div className="flex items-start justify-between gap-3 bg-zinc-50 border border-zinc-200/60 rounded-xl p-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
              <span className="truncate">{customerName}</span>
              <span className="text-zinc-300">•</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded">
                <MapPin size={10} />
                {tableText}
              </span>
            </div>
            <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
              {itemsSummary || `${itemCount} delicious items`}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-sm font-black text-zinc-900 font-mono block">
              {formatCurrency(order.totalAmount || 0)}
            </span>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            onClick={() => {
              toast.dismiss(t);
              onNavigate('/orders');
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <ChefHat size={14} className="text-amber-400" />
            <span>Open in Orders & KDS</span>
            <ExternalLink size={12} className="text-zinc-400" />
          </button>
          <button
            onClick={() => toast.dismiss(t)}
            className="px-3 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    ),
    {
      duration: 10000,
      position: 'top-right',
    }
  );
}

export default function OrderNotificationListener() {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const knownOrderIds = useRef<Set<string>>(new Set());
  const isInitialized = useRef<boolean>(false);

  useEffect(() => {
    // Only listen for staff or admin roles
    if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
      return;
    }

    const ordersCol = collection(db, 'orders');
    // Listen to most recent orders
    const q = query(ordersCol, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // First snapshot load: populate initial set of IDs so we don't spam toasts on page refresh
        if (!isInitialized.current) {
          snapshot.docs.forEach((doc) => {
            knownOrderIds.current.add(doc.id);
          });
          isInitialized.current = true;
          return;
        }

        // On subsequent changes, detect newly added orders
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const docId = change.doc.id;
            if (!knownOrderIds.current.has(docId)) {
              knownOrderIds.current.add(docId);
              const data = change.doc.data();

              const orderObj: NewOrderData = {
                id: docId,
                customerEmail: data.customerEmail,
                tableNumber: data.tableNumber,
                type: data.type || 'dine-in',
                items: data.items || [],
                totalAmount: data.totalAmount || 0,
                createdAt: data.createdAt,
              };

              // Only notify if order is in initial active state (pending or new)
              if (!data.status || data.status === 'pending' || data.status === 'preparing') {
                const itemCount = (orderObj.items || []).reduce((acc, c) => acc + (c.qty || 1), 0);
                const itemSummary = (orderObj.items || []).map((i) => `${i.qty}x ${i.name}`).join(', ');

                // Add to internal session notification history
                addNotification({
                  orderId: docId,
                  customerEmail: data.customerEmail || 'Guest',
                  tableNumber: data.tableNumber,
                  type: orderObj.type || 'dine-in',
                  itemCount,
                  itemSummary: itemSummary || `${itemCount} items`,
                  totalAmount: orderObj.totalAmount || 0,
                });

                // Display Sonner toast
                displayNewOrderToast(orderObj, (path) => navigate(path));
              }
            }
          }
        });
      },
      (error) => {
        console.warn('Real-time order listener notice:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user, navigate, addNotification]);

  return null;
}
