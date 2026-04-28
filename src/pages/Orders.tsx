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
                className="card group hover:border-zinc-300 transition-all overflow-hidden"
              >
                <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-brand/5 group-hover:border-brand/20 group-hover:text-brand transition-colors">
                      <Utensils size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900">#{order.id.slice(-4).toUpperCase()}</span>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border",
                          statusMap[order.status as keyof typeof statusMap]?.color
                        )}>
                          {statusMap[order.status as keyof typeof statusMap]?.label}
                        </span>
                        {order.tableNumber && (
                          <span className="bg-orange-50 text-orange-700 border-orange-100 text-[10px] font-bold uppercase px-2 py-0.5 rounded border flex items-center gap-1">
                            <MapPin size={10} />
                            {order.tableNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 font-medium mt-0.5 flex items-center gap-2">
                        <span>{order.customerEmail || 'Guest Order'}</span>
                        <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                        <span className="capitalize">{order.type}</span>
                        {order.type === 'dine-in' && !order.tableNumber && (
                          <>
                            <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                            <span className="text-orange-600 font-bold">Unassigned</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="font-bold text-zinc-900 text-lg">{formatCurrency(order.totalAmount)}</p>
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono mt-1">
                      <Clock size={12} />
                      {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-zinc-50/50">
                  <div className="space-y-3">
                    {order.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-zinc-200 rounded text-[10px] font-bold flex items-center justify-center text-zinc-600">
                            {item.qty}x
                          </span>
                          <span className="font-medium text-zinc-700">{item.name}</span>
                        </div>
                        <span className="text-zinc-500 font-medium">{formatCurrency(item.price * item.qty)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 border-t border-zinc-100 flex items-center justify-between bg-white">
                  <div className="flex gap-2">
                    {order.status === 'pending' && (
                      <button 
                        onClick={() => updateStatus(order.id, 'preparing')}
                        className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        Start Prep
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button 
                        onClick={() => updateStatus(order.id, 'ready')}
                        className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                        Mark Ready
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button 
                        onClick={() => updateStatus(order.id, 'delivered')}
                        className="px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-lg hover:bg-zinc-800 transition-colors shadow-sm"
                      >
                        Delivered
                      </button>
                    )}
                    
                    {/* Table Assignment Section */}
                    {user?.role !== 'customer' && !order.tableNumber && order.status !== 'delivered' && order.type === 'dine-in' && (
                      <div className="flex items-center gap-2">
                        <div className="w-px h-8 bg-zinc-100 mx-2" />
                        <div className="relative group/select">
                          <select 
                            onChange={(e) => assignTable(order.id, e.target.value)}
                            className="appearance-none bg-orange-50/50 border border-orange-100 text-[10px] font-black uppercase tracking-wider pl-8 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all cursor-pointer hover:bg-orange-50 text-orange-700"
                            defaultValue=""
                          >
                            <option value="" disabled>Assign Table</option>
                            {tables.filter(t => t.status === 'available').length > 0 ? (
                              tables.filter(t => t.status === 'available').map(t => (
                                <option key={t.id} value={t.number}>{t.number} ({t.capacity} Seats)</option>
                              ))
                            ) : (
                              <option value="" disabled>No Tables Available</option>
                            )}
                          </select>
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none">
                            <MapPin size={14} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
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
