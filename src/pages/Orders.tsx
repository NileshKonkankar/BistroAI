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
  CalendarClock
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
import TableCard from '../components/orders/TableCard';

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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
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
        )}
      </div>

      {activeTab === 'orders' ? (
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
                      <div className="p-4 bg-zinc-50/30 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                      <span className="font-bold text-zinc-700 line-clamp-1">{item.name}</span>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[9px] font-black text-zinc-400">QTY: {item.qty}</span>
                                        <span className="w-0.5 h-0.5 bg-zinc-200 rounded-full" />
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
                    </motion.div>
                  )}
                </AnimatePresence>

                {!expandedOrderId && (
                  <div className="px-4 py-3 bg-zinc-50/50">
                    <div className="flex flex-wrap gap-1.5">
                      {order.items?.slice(0, 3).map((item: any, idx: number) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-white border border-zinc-200 rounded text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">
                          {item.qty}x {item.name}
                        </span>
                      ))}
                      {order.items?.length > 3 && (
                        <span className="px-1.5 py-0.5 bg-zinc-100 rounded text-[9px] font-black text-zinc-400 uppercase">
                          +{order.items.length - 3}
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
                      onClick={() => deleteOrder(order.id)}
                      className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
