import { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  Trash2, 
  Utensils,
  ChevronRight,
  MoreVertical,
  LayoutGrid,
  Users2,
  MapPin,
  Map as MapIcon,
  Calendar,
  Lock,
  DoorOpen,
  CalendarClock,
  ChefHat,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX,
  Timer,
  Check,
  AlertTriangle,
  Download
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc,
  orderBy,
  where,
  addDoc,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppStore } from '../store/useAppStore';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { generateInvoicePDF } from '../lib/invoiceGenerator';
import TableCard from '../components/orders/TableCard';
import OrderProgressTracker from '../components/orders/OrderProgressTracker';

const statusMap = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  preparing: { label: 'Preparing', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  ready: { label: 'Ready', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  delivered: { label: 'Delivered', color: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200' },
};

const tableStatusMap = {
  available: { 
    label: 'Available', 
    color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    icon: DoorOpen,
    accent: 'bg-emerald-500',
    iconContainer: 'bg-emerald-50 border-emerald-100 text-emerald-500'
  },
  occupied: { 
    label: 'Occupied', 
    color: 'bg-orange-50 text-orange-700 border-orange-100',
    icon: Utensils,
    accent: 'bg-orange-500',
    iconContainer: 'bg-orange-100 border-orange-200 text-orange-600'
  },
  reserved: { 
    label: 'Reserved', 
    color: 'bg-blue-50 text-blue-700 border-blue-100',
    icon: CalendarClock,
    accent: 'bg-blue-500',
    iconContainer: 'bg-blue-50 border-blue-100 text-blue-500'
  },
};

export default function Orders() {
  const { user } = useAppStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'tables'>('orders');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  
  // Kitchen Display mode state
  const [isKitchenMode, setIsKitchenMode] = useState(false);
  const [kdsFilter, setKdsFilter] = useState<'active' | 'pending' | 'preparing' | 'ready'>('active');
  const [kdsFontSize, setKdsFontSize] = useState<'lg' | 'xl' | '2xl'>('xl');
  const [now, setNow] = useState(Date.now());
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [prevOrdersCount, setPrevOrdersCount] = useState(0);

  // Interval for ticking order elapsed times every 15 seconds
  useEffect(() => {
    let intervalId: any;
    if (isKitchenMode) {
      intervalId = setInterval(() => {
        setNow(Date.now());
      }, 15000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isKitchenMode]);

  // Play a clear kitchen chime (Web Audio synthesised ding-dong bell)
  const playKitchenBell = () => {
    if (!isSoundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Tone 1
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(783.99, audioCtx.currentTime); // G5 note
      gain1.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.4);

      // Tone 2 (offset)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.50, audioCtx.currentTime); // C6 note
        gain2.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.5);
      }, 100);
    } catch (e) {
      console.warn('Audio Context sound block or disabled in iframe', e);
    }
  };

  // Listen to order count changes to ring the chime on new orders
  useEffect(() => {
    if (orders.length > prevOrdersCount) {
      // Only play chime in Kitchen Mode and if it is not the initial load
      if (prevOrdersCount > 0 && isKitchenMode) {
        playKitchenBell();
      }
      setPrevOrdersCount(orders.length);
    } else {
      setPrevOrdersCount(orders.length);
    }
  }, [orders.length, isKitchenMode]);

  useEffect(() => {
    const path = 'orders';
    if (!user) return;

    let q;
    if (user.role === 'customer') {
      q = query(
        collection(db, path), 
        where('customerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(collection(db, path), orderBy('createdAt', 'desc'));
    }

    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const path = 'tables';
    if (!user || user.role === 'customer') return;

    const q = query(collection(db, path), orderBy('number', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        // Init tables for demo if empty
        const initialTables = [
          { number: 'T1', capacity: 2, status: 'available' },
          { number: 'T2', capacity: 4, status: 'available' },
          { number: 'T3', capacity: 4, status: 'available' },
          { number: 'T4', capacity: 6, status: 'available' },
          { number: 'T5', capacity: 2, status: 'available' },
          { number: 'T6', capacity: 8, status: 'available' },
        ];
        initialTables.forEach(t => {
          setDoc(doc(db, 'tables', t.number), t);
        });
      }
      setTables(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsub();
  }, [user]);

  const updateStatus = async (id: string, newStatus: string) => {
    const batch = writeBatch(db);
    try {
      const orderRef = doc(db, 'orders', id);
      batch.update(orderRef, { 
        status: newStatus,
        updatedAt: serverTimestamp() 
      });
      
      const order = orders.find(o => o.id === id);
      if (newStatus === 'cancelled' && order?.tableNumber) {
        const tableRef = doc(db, 'tables', order.tableNumber);
        batch.update(tableRef, {
          status: 'available',
          currentOrderId: null,
          updatedAt: serverTimestamp()
        });
      }
      
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const deleteOrder = async (id: string) => {
    const path = `orders/${id}`;
    if (confirm('Delete this order record?')) {
      try {
        await deleteDoc(doc(db, 'orders', id));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, path);
      }
    }
  };

  const assignTable = async (orderId: string, tableNumber: string) => {
    const batch = writeBatch(db);
    try {
      batch.update(doc(db, 'orders', orderId), { 
        tableNumber,
        updatedAt: serverTimestamp()
      });
      batch.update(doc(db, 'tables', tableNumber), { 
        status: 'occupied', 
        currentOrderId: orderId,
        updatedAt: serverTimestamp()
      });
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const clearTable = async (tableId: string) => {
    try {
      await updateDoc(doc(db, 'tables', tableId), { 
        status: 'available', 
        currentOrderId: null,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `tables/${tableId}`);
    }
  };

  const setTableStatus = async (tableId: string, status: 'available' | 'reserved') => {
    try {
      await updateDoc(doc(db, 'tables', tableId), { 
        status,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `tables/${tableId}`);
    }
  };

  const getElapsedTimeInfo = (createdAt: any) => {
    if (!createdAt) return { text: 'New', color: 'text-emerald-400' };
    let createdMs = 0;
    if (createdAt.seconds) {
      createdMs = createdAt.seconds * 1000;
    } else if (typeof createdAt.toDate === 'function') {
      createdMs = createdAt.toDate().getTime();
    } else {
      createdMs = new Date(createdAt).getTime();
    }
    const diffMinutes = Math.floor((now - createdMs) / 60000);
    
    if (diffMinutes <= 0) return { text: 'Just now', color: 'text-zinc-400' };
    if (diffMinutes < 8) return { text: `${diffMinutes}m ago`, color: 'text-emerald-400 font-bold' };
    if (diffMinutes < 15) return { text: `${diffMinutes}m (WARN)`, color: 'text-amber-400 font-black' };
    return { text: `${diffMinutes}m (URGENT)`, color: 'text-rose-500 font-black animate-pulse' };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">
            {activeTab === 'orders' ? 'Live Orders' : 'Table Management'}
          </h1>
          <p className="text-zinc-500 mt-1">
            {activeTab === 'orders' 
              ? 'Monitor and manage real-time active orders.' 
              : 'Track floor availability and seating assignments.'}
          </p>
        </div>
        {user?.role !== 'customer' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-zinc-200 p-1 rounded-xl shadow-sm">
              <button 
                onClick={() => setActiveTab('orders')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all",
                  activeTab === 'orders' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"
                )}
              >
                <ClipboardList size={16} />
                Active Orders
              </button>
              <button 
                onClick={() => setActiveTab('tables')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all",
                  activeTab === 'tables' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"
                )}
              >
                <LayoutGrid size={16} />
                Floor Map
              </button>
            </div>

            {activeTab === 'orders' && (
              <button
                onClick={() => {
                  setIsKitchenMode(true);
                  setNow(Date.now());
                }}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl transition-all shadow-md active:scale-95"
              >
                <ChefHat size={16} className="text-amber-400 animate-pulse" />
                <span>Kitchen Display</span>
              </button>
            )}
          </div>
        )}
      </div>

      {activeTab === 'orders' ? (
        isKitchenMode ? (
          <div className="fixed inset-0 z-[100] bg-zinc-950 text-zinc-100 p-6 md:p-8 flex flex-col overflow-y-auto font-sans select-none animate-in fade-in duration-300">
            {/* KDS Header Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b-2 border-zinc-900">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-black flex items-center justify-center shadow-lg">
                  <ChefHat size={28} className="stroke-[2.5]" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-black tracking-wider text-white uppercase flex items-center gap-2">
                    Kitchen Display Screen
                    <span className="text-[10px] bg-red-600 text-white font-extrabold px-2.5 py-1 rounded-full animate-pulse uppercase tracking-widest leading-none">
                      Live Queue
                    </span>
                  </h1>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5 animate-in fade-in duration-300">
                    <span>Active Prep Station</span>
                    <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                    <span className="text-amber-400">{orders.filter(o => o.status === 'pending').length} Pending</span>
                    <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                    <span className="text-blue-400">{orders.filter(o => o.status === 'preparing').length} Preparing</span>
                    <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                    <span className="text-emerald-400">{orders.filter(o => o.status === 'ready').length} Ready</span>
                  </p>
                </div>
              </div>

              {/* Controls bar */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Audio chime toggle */}
                <button
                  onClick={() => {
                    setIsSoundEnabled(!isSoundEnabled);
                    // play test bell to give quick interactive user audio confirmation
                    if (!isSoundEnabled) {
                      setTimeout(() => playKitchenBell(), 100);
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider",
                    isSoundEnabled 
                      ? "bg-zinc-900 border-zinc-700 text-amber-400 hover:bg-zinc-800" 
                      : "bg-zinc-900/40 border-zinc-800/80 text-zinc-600 hover:text-zinc-500"
                  )}
                  title="Toggle Audio Ding on New Orders"
                >
                  {isSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  <span>Chime {isSoundEnabled ? "On" : "Muted"}</span>
                </button>

                {/* Font selector */}
                <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
                  {(['lg', 'xl', '2xl'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setKdsFontSize(sz)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all",
                        kdsFontSize === sz 
                          ? "bg-amber-500 text-black shadow-md" 
                          : "text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      {sz === 'lg' ? 'A' : sz === 'xl' ? 'A+' : 'A++'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsKitchenMode(false)}
                  className="bg-red-655 hover:bg-red-700 bg-red-650 text-white font-extrabold text-xs uppercase tracking-widest px-5 py-3 rounded-xl transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
                >
                  <Minimize2 size={14} />
                  <span>Exit KDS</span>
                </button>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2 py-4">
              {(['active', 'pending', 'preparing', 'ready'] as const).map((filterOpt) => {
                const count = orders.filter(o => {
                  if (filterOpt === 'active') return o.status === 'pending' || o.status === 'preparing';
                  return o.status === filterOpt;
                }).length;

                return (
                  <button
                    key={filterOpt}
                    onClick={() => setKdsFilter(filterOpt)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border",
                      kdsFilter === filterOpt 
                        ? "bg-white text-zinc-950 border-white font-black" 
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                    )}
                  >
                    {filterOpt === 'active' ? 'Cooking Queue' : filterOpt} ({count})
                  </button>
                );
              })}
            </div>

            {/* KDS Main Grid */}
            {orders.filter(order => {
              if (kdsFilter === 'active') return order.status === 'pending' || order.status === 'preparing';
              return order.status === kdsFilter;
            }).length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-zinc-800 rounded-3xl mt-4">
                <CheckCircle2 size={64} className="text-emerald-500 animate-bounce mb-4" />
                <h3 className="text-2xl font-black text-white uppercase tracking-wider">Kitchen Queue Clear</h3>
                <p className="text-zinc-500 text-sm mt-1 max-w-sm font-medium">All tasks are processed! Let's take a quick breath or prepare for the next rush.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4">
                {orders
                  .filter(order => {
                    if (kdsFilter === 'active') return order.status === 'pending' || order.status === 'preparing';
                    return order.status === kdsFilter;
                  })
                  .map((order) => {
                    const elapsed = getElapsedTimeInfo(order.createdAt);
                    const isOverdue = elapsed.text.includes('URGENT');
                    const sizeMap = {
                      lg: { item: 'text-base', qty: 'text-xl', title: 'text-lg', meta: 'text-xs' },
                      xl: { item: 'text-lg', qty: 'text-2xl', title: 'text-xl', meta: 'text-sm' },
                      '2xl': { item: 'text-xl', qty: 'text-3xl', title: 'text-2xl', meta: 'text-base' }
                    };
                    const currentSizes = sizeMap[kdsFontSize];

                    return (
                      <div 
                        key={order.id}
                        className={cn(
                          "bg-black rounded-3xl overflow-hidden flex flex-col justify-between transition-all shadow-2xl relative",
                          order.status === 'pending' ? "border-2 border-amber-500/80" :
                          order.status === 'preparing' ? "border-2 border-blue-500/80" :
                          "border-2 border-emerald-500",
                          isOverdue && "ring-4 ring-rose-600/90"
                        )}
                      >
                        {/* Urgent highlight badge */}
                        {isOverdue && (
                          <div className="absolute top-0 inset-x-0 h-1.5 bg-rose-600 animate-pulse" />
                        )}

                        {/* Card Header information */}
                        <div className={cn(
                          "p-4 border-b border-zinc-900 flex justify-between items-start gap-2",
                          order.status === 'pending' ? "bg-amber-950/20" :
                          order.status === 'preparing' ? "bg-blue-950/20" :
                          "bg-emerald-950/20"
                        )}>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={cn("font-black tracking-wider text-white", currentSizes.title)}>
                                #{order.id.slice(-4).toUpperCase()}
                              </span>
                              {order.tableNumber ? (
                                <span className="bg-orange-500 text-black px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm font-mono">
                                  <MapPin size={10} className="stroke-[3]" />
                                  {order.tableNumber}
                                </span>
                              ) : (
                                <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider font-mono">
                                  TAKEOUT
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-wider">
                              {order.type} • {order.customerEmail ? order.customerEmail.split('@')[0] : 'GUEST'}
                            </p>
                          </div>

                          {/* Order Age counter */}
                          <div className="text-right">
                            <span className={cn("text-xs font-black uppercase tracking-wider block font-mono", elapsed.color)}>
                              ⏳ {elapsed.text}
                            </span>
                            <span className="text-[9px] text-zinc-500 block font-bold font-mono mt-0.5">
                              {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                            </span>
                          </div>
                        </div>

                        {/* Order Items List */}
                        <div className="p-5 flex-1 space-y-4 max-h-[300px] overflow-y-auto">
                          {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-start justify-between gap-1.5 pb-2 border-b border-zinc-900/50 last:border-0">
                              <div className="flex items-start gap-3">
                                {/* Red-Orange bold highlighted Quantity Badge */}
                                <span className={cn(
                                  "inline-flex items-center justify-center font-black rounded-lg px-2.5 py-1.5 leading-none bg-yellow-400 text-black border-2 border-yellow-500 shadow-sm",
                                  currentSizes.qty
                                )}>
                                  {item.qty}
                                </span>
                                
                                <div className="flex flex-col py-0.5">
                                  <span className={cn("font-extrabold text-white tracking-wide uppercase", currentSizes.item)}>
                                    {item.name}
                                  </span>
                                  {item.notes && (
                                    <span className="text-xs font-bold text-amber-400 mt-1 italic leading-tight uppercase font-mono">
                                      ⚠️ NOTE: {item.notes}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Action Buttons inside Card Footer */}
                        <div className="p-4 bg-zinc-950/90 border-t border-zinc-900 flex flex-col gap-2">
                          {order.status === 'pending' && (
                            <button
                              onClick={() => {
                                updateStatus(order.id, 'preparing');
                              }}
                              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-98 flex items-center justify-center gap-1.5 border border-blue-500"
                            >
                              <Timer size={16} className="stroke-[3]" />
                              <span>Start Chef Prep</span>
                            </button>
                          )}

                          {order.status === 'preparing' && (
                            <button
                              onClick={() => {
                                updateStatus(order.id, 'ready');
                              }}
                              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-98 flex items-center justify-center gap-1.5 border border-emerald-550"
                            >
                              <Check size={16} className="stroke-[3]" />
                              <span>Mark As Ready</span>
                            </button>
                          )}

                          {order.status === 'ready' && (
                            <button
                              onClick={() => {
                                updateStatus(order.id, 'delivered');
                              }}
                              className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-extrabold text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-98 flex items-center justify-center gap-1.5 border border-zinc-700"
                            >
                              <CheckCircle2 size={16} />
                              <span>Deliver Order</span>
                            </button>
                          )}

                          {/* Quick Cancel button */}
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">
                              Type: {order.type}
                            </span>
                            <button
                              onClick={() => deleteOrder(order.id)}
                              className="text-[10px] uppercase font-black tracking-wider text-zinc-600 hover:text-red-500 px-2 py-1 transition-all"
                            >
                              Discard
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <AnimatePresence>
            {orders.map((order) => (
              <motion.div 
                layout
                key={order.id}
                className={cn(
                  "card group hover:border-zinc-300 transition-all overflow-hidden",
                  expandedOrderId === order.id && "border-brand/30 shadow-lg ring-1 ring-brand/5"
                )}
              >
                <div 
                  className="p-4 border-b border-zinc-100 flex items-center justify-between bg-white cursor-pointer select-none"
                  onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-center text-zinc-400 group-hover:bg-brand/5 group-hover:border-brand/20 group-hover:text-brand transition-colors",
                      expandedOrderId === order.id && "bg-brand/5 border-brand/20 text-brand"
                    )}>
                      <Utensils size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-zinc-900 text-sm">#{order.id.slice(-4).toUpperCase()}</span>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border",
                          statusMap[order.status as keyof typeof statusMap]?.color
                        )}>
                          {statusMap[order.status as keyof typeof statusMap]?.label}
                        </span>
                        {order.tableNumber && (
                          <span className="bg-orange-50 text-orange-700 border-orange-100 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border flex items-center gap-1">
                            <MapPin size={8} />
                            {order.tableNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 font-bold mt-0.5 flex items-center gap-1.5 uppercase tracking-tighter">
                        <span>{order.customerEmail || 'Guest'}</span>
                        <span className="w-0.5 h-0.5 bg-zinc-300 rounded-full" />
                        <span>{order.type}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <p className="font-black text-zinc-900 text-base">{formatCurrency(order.totalAmount)}</p>
                      <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-mono mt-0.5">
                        <Clock size={10} />
                        {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedOrderId === order.id ? 90 : 0 }}
                      className="text-zinc-300"
                    >
                      <ChevronRight size={16} />
                    </motion.div>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedOrderId === order.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-b border-zinc-100"
                    >
                      <div className="p-4 bg-zinc-50/30 flex flex-col gap-5">
                        <div className="bg-white p-4.5 rounded-2xl border border-zinc-200 shadow-2xs">
                          <OrderProgressTracker status={order.status} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                          <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                            <Users2 size={10} />
                            Details
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                             <div className="bg-white p-2 rounded-xl border border-zinc-200">
                               <p className="text-[8px] text-zinc-400 font-bold uppercase mb-0.5">Email</p>
                               <p className="text-[10px] font-medium text-zinc-700 truncate">{order.customerEmail || 'Guest'}</p>
                             </div>
                             <div className="bg-white p-2 rounded-xl border border-zinc-200">
                               <p className="text-[8px] text-zinc-400 font-bold uppercase mb-0.5">Type</p>
                               <p className="text-[10px] font-medium text-zinc-700 capitalize">{order.type}</p>
                             </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                            <ClipboardList size={10} />
                            Items
                          </h4>
                          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100">
                            <div className="p-2 space-y-2">
                              {order.items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-[11px]">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200 flex-shrink-0">
                                      {item.image ? (
                                        <img 
                                          src={item.image} 
                                          alt={item.name} 
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                          <Utensils size={12} />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-5 h-5 flex-shrink-0 bg-zinc-100 border border-zinc-200 text-zinc-600 text-[9px] font-black rounded flex items-center justify-center">
                                          {item.qty}
                                        </span>
                                        <span className="font-bold text-zinc-700 line-clamp-1">{item.name}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5 pl-6">
                                        <span className="text-[9px] font-bold text-zinc-400">{formatCurrency(item.price)} ea</span>
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-zinc-500 font-mono font-bold">{formatCurrency(item.price * item.qty)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="bg-zinc-50/50 p-2 flex justify-between items-center">
                              <span className="text-[9px] font-black text-zinc-400 uppercase">Total</span>
                              <span className="text-xs font-black text-brand">{formatCurrency(order.totalAmount)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  )}
                </AnimatePresence>

                {!expandedOrderId && (
                  <div className="px-4 py-3 bg-zinc-50/50 border-b border-zinc-100/50">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {order.items?.slice(0, 3).map((item: any, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 bg-white border border-zinc-200 rounded-md text-[10px] font-bold text-zinc-600 uppercase tracking-tight shadow-sm">
                          {item.qty}× {item.name}
                        </span>
                      ))}
                      {order.items?.length > 3 && (
                        <span className="px-2 py-0.5 bg-zinc-200/50 border border-zinc-200 text-zinc-500 rounded-md text-[10px] font-black uppercase tracking-tighter">
                          +{order.items.slice(3).reduce((acc: number, item: any) => acc + (item.qty || 0), 0)} more items
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="px-4 py-3 border-t border-zinc-100 flex items-center justify-between bg-white">
                  <div className="flex gap-1.5">
                    {order.status === 'pending' && (
                      <button 
                        onClick={() => updateStatus(order.id, 'preparing')}
                        className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        Start
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button 
                        onClick={() => updateStatus(order.id, 'ready')}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                        Ready
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button 
                        onClick={() => updateStatus(order.id, 'delivered')}
                        className="px-3 py-1.5 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-zinc-800 transition-colors shadow-sm"
                      >
                        Finish
                      </button>
                    )}
                    
                    {/* Table Assignment Section */}
                    {user?.role !== 'customer' && !order.tableNumber && order.status !== 'delivered' && order.type === 'dine-in' && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-px h-6 bg-zinc-100 mx-1" />
                        <div className="relative group/select">
                          <select 
                            onChange={(e) => assignTable(order.id, e.target.value)}
                            className="appearance-none bg-orange-50/50 border border-orange-100 text-[9px] font-black uppercase tracking-widest pl-6 pr-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-200 transition-all cursor-pointer hover:bg-orange-50 text-orange-700"
                            defaultValue=""
                          >
                            <option value="" disabled>Table</option>
                            {tables.filter(t => t.status === 'available').length > 0 ? (
                              tables.filter(t => t.status === 'available').map(t => (
                                <option key={t.id} value={t.number}>{t.number} ({t.capacity})</option>
                              ))
                            ) : (
                              <option value="" disabled>Full</option>
                            )}
                          </select>
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none">
                            <MapPin size={10} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button 
                      onClick={() => generateInvoicePDF(order)}
                      className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Download Invoice PDF"
                    >
                      <Download size={16} />
                    </button>
                    <button 
                      onClick={() => deleteOrder(order.id)}
                      className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Order"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        )
      ) : (
        <div className="space-y-6">
          {/* Status Legend */}
          <div className="flex flex-wrap items-center gap-6 pb-2 border-b border-zinc-100">
            {Object.entries(tableStatusMap).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", config.accent)} />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  {config.label}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {tables.map((table) => (
              <TableCard 
                key={table.id}
                table={table}
                currentOrder={orders.find(o => o.tableNumber === table.number && o.status !== 'delivered' && o.status !== 'cancelled')}
                statusConfig={tableStatusMap[table.status as keyof typeof tableStatusMap] || tableStatusMap.available}
                onClear={clearTable}
                onSetStatus={setTableStatus}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
           <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center text-zinc-300">
              <ClipboardList size={40} />
           </div>
           <div>
              <p className="text-zinc-900 font-bold text-lg">No active orders</p>
              <p className="text-zinc-500 max-w-xs mx-auto">When customers place orders, they will appear here in real-time.</p>
           </div>
        </div>
      )}
    </div>
  );
}
