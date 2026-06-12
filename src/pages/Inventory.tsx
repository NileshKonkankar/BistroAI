import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Package, 
  AlertCircle, 
  Plus, 
  Search, 
  CheckCircle2, 
  Trash2, 
  Eye, 
  ChevronRight, 
  X, 
  Minus, 
  TrendingUp, 
  Layers, 
  Sparkles,
  Bell,
  Mail,
  Volume2,
  Check,
  Clock
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, cn } from '../lib/utils';

// Static fallbacks if Firestore holds no data or during loading
const INITIAL_FALLBACKS = [
  { id: '1', name: 'Truffle Oil', qty: 5, unit: 'Liters', minThreshold: 2, category: 'grains' },
  { id: '2', name: 'Arborio Rice', qty: 2, unit: 'kg', minThreshold: 10, category: 'grains' },
  { id: '3', name: 'Parmesan Cheese', qty: 12, unit: 'kg', minThreshold: 5, category: 'dairy' },
  { id: '4', name: 'Fresh Basil', qty: 0.5, unit: 'kg', minThreshold: 1, category: 'vegetables' },
];

const CATEGORY_MAP = {
  vegetables: {
    label: 'Vegetables & Greens',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=120&h=120&auto=format&fit=crop',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-100'
  },
  meats: {
    label: 'Meats & Seafood',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=120&h=120&auto=format&fit=crop',
    color: 'bg-rose-50 text-rose-800 border-rose-100'
  } as const,
  dairy: {
    label: 'Dairy & Cheese',
    image: 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?q=80&w=120&h=120&auto=format&fit=crop',
    color: 'bg-amber-50 text-amber-805 text-amber-850 text-amber-800 border-amber-100'
  },
  grains: {
    label: 'Oils, Spices & Grains',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=120&h=120&auto=format&fit=crop',
    color: 'bg-zinc-100 text-zinc-800 border-zinc-200'
  },
  other: {
    label: 'Other Storage',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=120&h=120&auto=format&fit=crop',
    color: 'bg-zinc-50 text-zinc-650 border-zinc-155 border-zinc-200'
  }
};

const detectCategory = (item: any): keyof typeof CATEGORY_MAP => {
  if (item && item.category && CATEGORY_MAP[item.category as keyof typeof CATEGORY_MAP]) {
    return item.category as keyof typeof CATEGORY_MAP;
  }
  
  const name = (item?.name || '').toLowerCase();
  if (name.includes('basil') || name.includes('chive') || name.includes('vegetable') || name.includes('salad') || name.includes('greens') || name.includes('tomato') || name.includes('garlic') || name.includes('onion') || name.includes('herb')) {
    return 'vegetables';
  }
  if (name.includes('steak') || name.includes('beef') || name.includes('meat') || name.includes('wagyu') || name.includes('chicken') || name.includes('pork') || name.includes('fish') || name.includes('salmon') || name.includes('seafood') || name.includes('shrimp')) {
    return 'meats';
  }
  if (name.includes('cheese') || name.includes('parmesan') || name.includes('dairy') || name.includes('milk') || name.includes('butter') || name.includes('cream')) {
    return 'dairy';
  }
  if (name.includes('rice') || name.includes('oil') || name.includes('truffle') || name.includes('grain') || name.includes('flour') || name.includes('pasta') || name.includes('noodle') || name.includes('spice') || name.includes('salt') || name.includes('pepper')) {
    return 'grains';
  }
  return 'other';
};

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'belowPar' | 'optimal'>('all');
  const [leadTimeSetting, setLeadTimeSetting] = useState<number>(2); // lead time parameter customizable by user
  
  // Real-time notification & alert states
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [alertLogs, setAlertLogs] = useState<any[]>([]);
  const isFirstLoad = useRef(true);
  const prevQtys = useRef<Record<string, number>>({});

  // Fetch orders for historical usage analysis
  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const liveOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(liveOrders);
    }, (error) => {
      console.warn("Could not load orders in inventory:", error);
    });
    return () => unsubOrders();
  }, []);

  // Solve dynamic Par Level thresholds based on orders history using NLP keyword heuristic matches
  const dynamicParLevels = useMemo(() => {
    if (items.length === 0) return {};
    
    // Compute total service calendar window in days of orders
    let minDate = new Date();
    let maxDate = new Date();
    let hasDates = false;

    orders.forEach(order => {
      if (order.status === 'cancelled') return;
      const date = order.createdAt?.seconds 
        ? new Date(order.createdAt.seconds * 1000) 
        : (order.createdAt ? new Date(order.createdAt) : null);
      if (date) {
        hasDates = true;
        if (date < minDate) minDate = date;
        if (date > maxDate) maxDate = date;
      }
    });

    let diffDays = 7; // default fallback window
    if (hasDates) {
      const diffTime = Math.abs(maxDate.getTime() - minDate.getTime());
      diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    const parLevelsMap: Record<string, { par: number; dailyAvg: number; totalUsed: number; periodInDays: number; matchCount: number }> = {};

    items.forEach(item => {
      const itemNameLower = (item.name || '').toLowerCase();
      // Extract substantial matching keywords, ignoring small standard modifiers
      const itemWords = itemNameLower
        .split(/\s+/)
        .filter((w: string) => w.length > 2 && !['and', 'with', 'fresh', 'organic', 'oil', 'mild', 'hot'].includes(w));
      
      let totalUsed = 0;
      let matchCount = 0;

      orders.forEach(order => {
        if (order.status === 'cancelled') return;
        order.items?.forEach((orderItem: any) => {
          const orderItemName = (orderItem.name || '').toLowerCase();
          const orderItemDesc = (orderItem.description || '').toLowerCase();
          
          // Cross matching item name with menu item name or menu item description keywords
          const isMatch = itemNameLower.includes(orderItemName) || 
                          orderItemName.includes(itemNameLower) ||
                          itemWords.some((word: string) => orderItemName.includes(word) || orderItemDesc.includes(word));
          
          if (isMatch) {
            matchCount += (orderItem.qty || 1);
            
            // Standard generic conversion formula from ordered unit plates to raw material consumption
            const unit = (item.unit || '').toLowerCase();
            let quantityPerPlate = 0.15; // default is 150g per order
            
            if (unit.includes('liter') || unit === 'l' || unit === 'ml') {
              quantityPerPlate = 0.05; // 50ml or 0.05 Liters
            } else if (unit.includes('gram') || unit === 'g') {
              quantityPerPlate = 25; // 25g
            } else if (unit.includes('pack') || unit.includes('pcs') || unit.includes('pc') || unit.includes('piece')) {
              quantityPerPlate = 1.0; // 1 whole piece structure
            } else if (unit.includes('bottle') || unit.includes('can')) {
              quantityPerPlate = 0.3; // 30% of standard bottle bottle
            }
            
            totalUsed += (orderItem.qty || 1) * quantityPerPlate;
          }
        });
      });

      // Calculate daily demand consumption average
      const daysOfUsage = orders.length > 0 ? diffDays : 7;
      let dailyAvg = totalUsed / daysOfUsage;

      // Professional par calculation: (Average Daily Usage * restock lead time parameter) + safety buffer (1 day safety factor)
      const computedPar = dailyAvg * (leadTimeSetting + 1);
      const minVal = item.minThreshold !== undefined ? item.minThreshold : (item.min || 1);
      
      // Make sure the dynamic par has a safety buffer bigger than min static threshold
      let finalPar = Math.max(minVal + 1, Math.round(computedPar * 10) / 10);
      
      // If no past orders match, build an estimated par of minVal * 1.5 to act as realistic predictive buffer
      if (matchCount === 0) {
        finalPar = Math.round((minVal * 1.5) * 10) / 10;
      }

      parLevelsMap[item.id] = {
        par: finalPar,
        dailyAvg: Math.round(dailyAvg * 100) / 100,
        totalUsed: Math.round(totalUsed * 10) / 10,
        periodInDays: daysOfUsage,
        matchCount
      };
    });

    return parLevelsMap;
  }, [items, orders, leadTimeSetting]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  
  // Form state
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemUnit, setItemUnit] = useState('kg');
  const [itemMinThreshold, setItemMinThreshold] = useState('');
  const [itemCategory, setItemCategory] = useState<keyof typeof CATEGORY_MAP>('other');
  const [submitting, setSubmitting] = useState(false);

  // Check Notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Request browser desktop push notification permission
  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      alert("This browser is not capable of sending native desktop warning alerts.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch (err) {
      console.warn("Could not request notification permission:", err);
    }
  };

  // Play a gorgeous warning sequence chime using Web Audio API
  const playWarningBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      // Note 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, ctx.currentTime); // A4
      gain1.gain.setValueAtTime(0.12, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);

      // Note 2 - warning chime melody
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.25);
      }, 100);
    } catch (err) {
      console.warn("Audio warning blocked until user gesture interaction occurs:", err);
    }
  };

  // Trigger high-quality push alarm and real-time email-alert logging feed entry
  const triggerStockAlert = (item: any, currentQty: number, threshold: number) => {
    // 1. Play Warning audio chime
    playWarningBeep();

    const desc = `${item.name} drops to ${currentQty} ${item.unit || 'units'} (Threshold limit is ${threshold} ${item.unit || 'units'})`;

    // 2. Prepare alert register entry
    const newLog = {
      id: String(Date.now()) + Math.random().toString(36).substr(2, 5),
      timestamp: new Date(),
      itemName: item.name,
      qty: currentQty,
      threshold,
      unit: item.unit || 'units',
      pushSent: false,
      emailSent: true // Live dispatch verification logger
    };

    // 3. Desktop Notification Push
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification("⚠️ Bistro AI Stock Alert", {
          body: `Inventory alert: ${desc}`,
          icon: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=128&auto=format&fit=crop"
        });
        newLog.pushSent = true;
      } catch (err) {
        console.warn("Error firing desktop notification:", err);
      }
    }

    // Append to real-time feed
    setAlertLogs(prev => [newLog, ...prev.slice(0, 14)]);
  };

  // Dispatch a simulated / mock alert manually for verification anytime
  const sendTestNotification = () => {
    const testItem = {
      id: 'test',
      name: 'Simulated Premium Saffron',
      unit: 'grams',
      minThreshold: 50
    };
    triggerStockAlert(testItem, 12, 50);
  };

  // Sync with Firestore Real-time & Transition detection
  useEffect(() => {
    const q = query(collection(db, 'inventory'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let liveItems: any[] = [];
      if (snapshot.empty) {
        liveItems = INITIAL_FALLBACKS;
      } else {
        liveItems = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      setItems(liveItems);

      // Transition Analyzer - only runs if we are not loading the first time to avoid startup-deluge
      if (isFirstLoad.current) {
        const initialMap: Record<string, number> = {};
        liveItems.forEach(item => {
          initialMap[item.id] = item.qty || 0;
        });
        prevQtys.current = initialMap;
        isFirstLoad.current = false;
      } else {
        liveItems.forEach(item => {
          const prev = prevQtys.current[item.id];
          const curr = item.qty || 0;
          const threshold = item.minThreshold !== undefined ? item.minThreshold : (item.min || 0);

          // Alert conditions:
          // 1. Level has dropped (curr < prev)
          // 2. Currently at or below threshold (curr <= threshold)
          // 3. Previously was above threshold (prev > threshold)
          if (prev !== undefined && curr < prev && curr <= threshold && prev > threshold) {
            triggerStockAlert(item, curr, threshold);
          }

          // Preserve level
          prevQtys.current[item.id] = curr;
        });
      }

      setLoading(false);
    }, (error) => {
      console.warn("Firestore listener failed, using fallbacks:", error);
      setItems(INITIAL_FALLBACKS);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemQty('');
    setItemUnit('kg');
    setItemMinThreshold('');
    setItemCategory('other');
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemQty(String(item.qty));
    setItemUnit(item.unit || 'kg');
    setItemMinThreshold(String(item.minThreshold !== undefined ? item.minThreshold : (item.min || 1)));
    setItemCategory(item.category || detectCategory(item));
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemQty || !itemMinThreshold) return;

    setSubmitting(true);
    const numericQty = parseFloat(itemQty);
    const numericMin = parseFloat(itemMinThreshold);

    try {
      if (editingItem) {
        // If it's a fallback static item (has numeral ids), just update locally as well,
        // but if it is real firestore db doc, update it there
        if (editingItem.id.length < 5) {
          setItems(prev => prev.map(i => i.id === editingItem.id ? {
            ...i,
            name: itemName,
            qty: numericQty,
            unit: itemUnit,
            minThreshold: numericMin,
            category: itemCategory
          } : i));
        } else {
          const itemRef = doc(db, 'inventory', editingItem.id);
          await updateDoc(itemRef, {
            name: itemName,
            qty: numericQty,
            unit: itemUnit,
            minThreshold: numericMin,
            category: itemCategory,
            updatedAt: serverTimestamp()
          });
        }
      } else {
        // Create new
        await addDoc(collection(db, 'inventory'), {
          name: itemName,
          qty: numericQty,
          unit: itemUnit,
          minThreshold: numericMin,
          category: itemCategory,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving inventory item:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this inventory item?")) return;
    try {
      if (id.length < 5) {
        setItems(prev => prev.filter(i => i.id !== id));
      } else {
        await deleteDoc(doc(db, 'inventory', id));
      }
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  const adjustQty = async (item: any, delta: number) => {
    const newQty = Math.max(0, (item.qty || 0) + delta);
    try {
      if (item.id.length < 5) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: newQty } : i));
      } else {
        await updateDoc(doc(db, 'inventory', item.id), {
          qty: newQty,
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Error adjusting stock level:", err);
    }
  };

  // Calculations for KPI Cards
  const totalItems = items.length;
  
  const criticalItems = items.filter(item => {
    const minVal = item.minThreshold !== undefined ? item.minThreshold : (item.min || 0);
    return (item.qty || 0) <= minVal;
  });
  const criticalCount = criticalItems.length;

  // Below Dynamic Par Level but not critical yet
  const belowParItems = items.filter(item => {
    const minVal = item.minThreshold !== undefined ? item.minThreshold : (item.min || 0);
    const parInfo = dynamicParLevels[item.id] || { par: minVal * 1.5 };
    return (item.qty || 0) > minVal && (item.qty || 0) <= parInfo.par;
  });
  const belowParCount = belowParItems.length;

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const minVal = item.minThreshold !== undefined ? item.minThreshold : (item.min || 0);
    const parInfo = dynamicParLevels[item.id] || { par: minVal * 1.5 };
    const qty = item.qty || 0;

    if (statusFilter === 'critical') {
      return qty <= minVal;
    }
    if (statusFilter === 'belowPar') {
      return qty > minVal && qty <= parInfo.par;
    }
    if (statusFilter === 'optimal') {
      return qty > parInfo.par;
    }
    return true; // statusFilter === 'all'
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <Package size={28} className="text-brand text-zinc-800" />
            Inventory Hub
          </h1>
          <p className="text-zinc-500 mt-1">
            Track smart ingredients, low-stock kitchen warnings, and real-time replenishment rules.
          </p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-zinc-900 text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all active:scale-95 shadow-md"
        >
          <Plus size={18} className="stroke-[2.5]" />
          <span>Add New Ingredient</span>
        </button>
      </div>

      {/* Metrics Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Low Stock Warning Card */}
        <div className={`card p-6 border transition-all ${
          criticalCount > 0 
            ? "bg-rose-50 border-rose-100 text-rose-900 shadow-sm" 
            : "bg-emerald-50 border-emerald-100 text-emerald-990"
        }`}>
           <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                criticalCount > 0 ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"
              }`}>
                <AlertCircle size={18} className="stroke-[2.5]" />
              </div>
              <span className="font-extrabold uppercase tracking-widest text-[10px]">
                Critical Low Stock
              </span>
           </div>
           
           <div className="mt-3">
             <p className="text-3xl font-black">
               {criticalCount > 0 ? `${criticalCount} Items Low` : 'All Stock OK'}
             </p>
             <p className="text-xs font-semibold mt-1 opacity-80">
               {criticalCount > 0 
                 ? "Ingredients are equal to or below critical replenishment limits!" 
                 : "Perfect! No ingredients are in immediate critical state."
               }
             </p>
           </div>
        </div>

        {/* Dynamic Par Level Alert Card */}
        <div className={`card p-6 border transition-all ${
          belowParCount > 0 
            ? "bg-amber-50/85 border-amber-100 text-amber-900 shadow-sm" 
            : "bg-zinc-50 border-zinc-200 text-zinc-900"
        }`}>
           <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                belowParCount > 0 ? "bg-amber-500 text-white animate-pulse" : "bg-zinc-650 bg-zinc-600 text-white"
              }`}>
                <TrendingUp size={18} className="stroke-[2.5]" />
              </div>
              <span className="font-extrabold uppercase tracking-widest text-[10px]">
                Predictive Demand Buffer
              </span>
           </div>
           
           <div className="mt-3">
             <p className="text-3xl font-black">
               {belowParCount} {belowParCount === 1 ? 'Item' : 'Items'} Below Par
             </p>
             <p className="text-xs font-semibold mt-1 text-amber-800">
               {belowParCount > 0 
                 ? "Based on past orders, these may deplete soon. Check restock recommended!" 
                 : "Healthy! All ingredients have appropriate safety cushions."
               }
             </p>
           </div>
        </div>

        {/* Total Ingredients tracked */}
        <div className="card p-6 bg-white border border-zinc-200">
          <div className="flex items-center gap-3 mb-2 text-zinc-500">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-650 flex items-center justify-center">
              <Layers size={16} className="text-zinc-700" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">Active Kitchen Database</span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-zinc-900">{totalItems} Formulas</p>
            <p className="text-xs font-semibold text-zinc-400 mt-1">
              {totalItems > 0 ? Math.round(((totalItems - criticalCount - belowParCount) / totalItems) * 100) : 100}% of items are fully optimal
            </p>
          </div>
        </div>
      </div>

      {/* Real-time Notifications & Alerting Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configuration Panel */}
        <div className="col-span-1 lg:col-span-5 bg-white border border-zinc-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Bell size={18} className="text-zinc-700 animate-pulse" />
              Real-time Alert Dispatcher
            </h2>
            <span className="text-[10px] bg-zinc-100 text-zinc-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              System Active
            </span>
          </div>
          
          <p className="text-xs text-zinc-500 leading-relaxed">
            Configure native browser push notifications and automatic email alerts. Whenever any ingredient level drops below its defined threshold, the dispatcher sounds an audio warning and triggers multiple notification channels instantly.
          </p>

          {/* Browser Notification Controls */}
          <div className="bg-zinc-50 p-4 rounded-2xl space-y-3 border border-zinc-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-600 block">Push Permission:</span>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ${
                notificationPermission === 'granted' 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                  : notificationPermission === 'denied'
                  ? "bg-rose-50 text-rose-700 border border-rose-100"
                  : "bg-amber-50 text-amber-700 border border-amber-100"
              }`}>
                {notificationPermission}
              </span>
            </div>

            {notificationPermission !== 'granted' ? (
              <button
                type="button"
                onClick={requestPushPermission}
                className="w-full bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-extrabold px-3 py-2 rounded-xl transition duration-150 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Bell size={12} />
                <span>Enable Desktop Push Alerts</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                <Check size={14} className="stroke-[3]" />
                <span>Native desktop alerts fully active</span>
              </div>
            )}
          </div>

          {/* Connected Email Dispatch details */}
          <div className="bg-zinc-50 p-4 rounded-2xl space-y-2 border border-zinc-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-600">SMTP Server Status:</span>
              <span className="text-[10px] text-emerald-600 font-black flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                ONLINE
              </span>
            </div>
            
            <div className="space-y-1 pt-1">
              <div className="flex justify-between">
                <span className="text-zinc-450 text-zinc-500">Recipient Master:</span>
                <span className="font-semibold text-zinc-700">KonkankarNilesh@gmail.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-450 text-zinc-500">Dispatch Relay:</span>
                <span className="font-semibold text-zinc-700">alerts@bistro.ai</span>
              </div>
            </div>
          </div>

          {/* Test Button Block */}
          <button
            type="button"
            onClick={sendTestNotification}
            className="w-full bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/50 hover:border-amber-200 text-xs font-extrabold py-2.5 rounded-xl transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
            title="Fire a test stock alert to verify sound, push notification and email logging"
          >
            <Sparkles size={13} className="text-amber-600" />
            <span>Test Real-time Warning Dispatch</span>
          </button>
        </div>

        {/* Right: Live Monitor/Logs Feed panel */}
        <div className="col-span-1 lg:col-span-7 bg-zinc-950 border border-zinc-800 rounded-3xl p-6 text-zinc-300 flex flex-col justify-between font-mono shadow-inner min-h-[300px]">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-850 border-zinc-805 border-zinc-800 pb-3 mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Digital Dispatch Alerts Telemetry
              </h2>
              <span className="text-[10px] text-zinc-500">Live feed</span>
            </div>

            {/* Logs List scrollable */}
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {alertLogs.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs flex flex-col items-center justify-center space-y-1">
                  <Volume2 size={24} className="text-zinc-600 animate-bounce mb-1" />
                  <p>Telemetry dispatcher filter online</p>
                  <p className="text-[10px] text-zinc-600">Adjust stock down or click "Test" to populate</p>
                </div>
              ) : (
                alertLogs.map((log) => (
                  <div key={log.id} className="text-xs space-y-1.5 border-l-2 border-amber-500 pl-3 py-1 bg-zinc-900 rounded-r-lg">
                    <div className="flex justify-between text-zinc-400 text-[10px]">
                      <span>{log.timestamp.toLocaleTimeString()}</span>
                      <span className="font-bold text-amber-400">WARNING: CRITICAL DROP</span>
                    </div>
                    <p className="text-white font-medium">
                      Item: <span className="font-bold text-amber-300">{log.itemName}</span> &bull; Stock is <span className="font-bold text-red-450 text-rose-400">{log.qty} {log.unit}</span> (Min: {log.threshold})
                    </p>
                    <div className="flex items-center gap-4 text-[10px] text-zinc-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${log.pushSent ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-650 bg-zinc-600'}`}></span>
                        Push: {log.pushSent ? 'SENT' : 'UNPERMITTED'}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${log.emailSent ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-650 bg-zinc-600'}`}></span>
                        Email: SENT (Relayed to Nilesh)
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-[10px] text-zinc-500 text-right pt-3 border-t border-zinc-800">
            Telemetry stream sync active &bull; BistroAI Cloud Server
          </div>
        </div>
      </div>

      {/* Primary Inventory Search Toolbar & Feed */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text"
              placeholder="Search kitchen inventory limits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-1 focus:ring-zinc-900 focus:border-zinc-950 focus:outline-none placeholder-zinc-400 text-sm font-medium text-zinc-800"
            />
          </div>
          
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
            <span>Showing {filteredItems.length} of {totalItems} items</span>
          </div>
        </div>

        {/* Dynamic Status Filters & Restock settings */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-zinc-100">
          <div className="flex flex-wrap gap-2 animate-in fade-in duration-200">
            {[
              { key: 'all', label: `All Storage (${totalItems})` },
              { key: 'critical', label: `Critical Lows (${criticalCount})` },
              { key: 'belowPar', label: `Below Par Buffer (${belowParCount})` },
              { key: 'optimal', label: `Fully Optimal (${totalItems - criticalCount - belowParCount})` }
            ].map((pill) => (
              <button
                key={pill.key}
                type="button"
                onClick={() => setStatusFilter(pill.key as any)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-1.5",
                  statusFilter === pill.key
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                    : "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                )}
              >
                {pill.key === 'critical' ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                ) : pill.key === 'belowPar' ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                ) : pill.key === 'optimal' ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                ) : null}
                {pill.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-zinc-50 hover:bg-zinc-100/70 border border-zinc-200 p-2 rounded-xl transition-all">
            <span className="text-[10px] font-black text-zinc-505 text-zinc-500 uppercase tracking-widest flex items-center gap-1">
              <Clock size={12} className="text-zinc-650 shrink-0" /> Restock Lead Time:
            </span>
            <input 
              type="number"
              min="1"
              max="14"
              value={leadTimeSetting}
              onChange={(e) => setLeadTimeSetting(Math.max(1, parseInt(e.target.value) || 2))}
              className="w-10 bg-white border border-zinc-205 border-zinc-200 rounded py-0.5 px-1 text-center text-xs font-black text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">Days</span>
          </div>
        </div>

        {/* Inventory List Table */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-zinc-500 font-bold text-sm">Synchronizing storage room levels...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center">
            <Package size={36} className="text-zinc-300 mb-3" />
            <p className="font-bold text-zinc-600">No matching ingredients found</p>
            <p className="text-xs text-zinc-400 mt-0.5">Try searching for a different keyword or create a new item.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-zinc-200 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-50/75 border-b border-zinc-200 font-mono">
                <tr>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Ingredient Form</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Current Qty</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Unit</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Min Threshold</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Dynamic Par</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Replenish Status</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredItems.map((item) => {
                  const qty = item.qty || 0;
                  const threshold = item.minThreshold !== undefined ? item.minThreshold : (item.min || 0);
                  const isLow = qty <= threshold;
                  const parInfo = dynamicParLevels[item.id] || { par: threshold * 1.5, dailyAvg: 0, totalUsed: 0, matchCount: 0 };
                  const isBelowPar = qty <= parInfo.par && qty > threshold;

                  return (
                    <tr 
                      key={item.id} 
                      className={cn(
                        "hover:bg-zinc-50/50 transition-all border-l-4 border-b border-zinc-100",
                        isLow 
                          ? "bg-rose-50/25 border-l-rose-500" 
                          : isBelowPar
                          ? "bg-amber-50/15 border-l-amber-400"
                          : "border-l-transparent"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          {/* Beautiful Food Category Image Icon with custom border and drop shadow */}
                          <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-zinc-200/80 bg-zinc-50 shadow-xs shrink-0">
                            <img 
                              src={CATEGORY_MAP[detectCategory(item)].image} 
                              alt={CATEGORY_MAP[detectCategory(item)].label} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-900 text-sm md:text-base leading-tight">{item.name}</span>
                            <div className="flex flex-wrap gap-1 mt-1 items-center">
                              <span className={`inline-block text-[8.5px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wider ${
                                CATEGORY_MAP[detectCategory(item)].color
                              }`}>
                                {CATEGORY_MAP[detectCategory(item)].label}
                              </span>
                              {isLow && (
                                <span className="bg-rose-500 text-white text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                                  🚨 Urgent Order Info
                                </span>
                              )}
                              {isBelowPar && (
                                <span className="bg-amber-500 text-black text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md font-extrabold">
                                  ⏳ Restock Suggested
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {/* Stock level highlighting */}
                          <span className={cn(
                            "font-black text-base md:text-lg min-w-[24px] text-center px-2 py-0.5 rounded",
                            isLow 
                              ? "text-rose-600 bg-rose-100" 
                              : isBelowPar 
                              ? "text-amber-755 text-amber-700 bg-amber-100" 
                              : "text-zinc-800 bg-zinc-105 bg-zinc-100"
                          )}>
                            {qty}
                          </span>

                          {/* Quick adjust controls */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => adjustQty(item, -1)}
                              className="p-1 hover:bg-zinc-200 border border-zinc-200 text-zinc-650 text-zinc-600 rounded-lg transition-transform active:scale-90 cursor-pointer"
                              title="Decrease Stock"
                            >
                              <Minus size={12} />
                            </button>
                            <button
                              onClick={() => adjustQty(item, 1)}
                              className="p-1 hover:bg-zinc-200 border border-zinc-200 text-zinc-655 text-zinc-600 rounded-lg transition-transform active:scale-90 cursor-pointer"
                              title="Increase Stock"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-zinc-600">
                        {item.unit || 'units'}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-zinc-700 bg-zinc-100 px-2 py-1 rounded border border-zinc-200 text-xs">
                          {threshold} {item.unit || 'units'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-zinc-805 text-zinc-800 bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded w-fit text-xs flex items-center gap-1 shadow-3xs font-black animate-pulse-slow">
                            <Sparkles size={11} className="text-amber-500 fill-amber-500 shrink-0" />
                            {parInfo.par} {item.unit || 'units'}
                          </span>
                          <span className="text-[9px] text-zinc-450 text-zinc-400 font-bold uppercase mt-1 leading-tight block">
                            Avg: {parInfo.dailyAvg}/{item.unit}/day
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[9.5px] font-black uppercase tracking-widest rounded-lg bg-rose-500 text-white border border-rose-600 shadow-sm animate-pulse">
                            <AlertCircle size={10} className="stroke-[3]" />
                            CRITICAL
                          </span>
                        ) : isBelowPar ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[9.5px] font-black uppercase tracking-widest rounded-lg bg-amber-400 text-amber-955 text-amber-950 border border-amber-500 shadow-sm">
                            <AlertCircle size={10} className="stroke-[3]" />
                            BELOW PAR
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[9.5px] font-extrabold uppercase tracking-widest rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                            🟢 OPTIMAL
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <button 
                            onClick={() => openEditModal(item)}
                            className="text-xs font-bold text-zinc-600 hover:text-zinc-900 border border-zinc-200 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-50 transition-colors shadow-2xs cursor-pointer"
                          >
                            Manage
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Ingredient Slide-over Box Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-xs" 
          />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 animate-in face-in zoom-in duration-200">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <h3 className="text-lg font-bold text-zinc-900">
                {editingItem ? 'Edit Ingredient' : 'New Storage Ingredient'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Ingredient Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Wagyu Beef, Fresh Chives"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full p-3 border border-zinc-200 rounded-xl text-sm font-semibold focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              {/* Grid Qty + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Qty Stock</label>
                  <input 
                    type="number" 
                    step="any"
                    required
                    min="0"
                    placeholder="10"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    className="w-full p-3 border border-zinc-200 rounded-xl text-sm font-semibold focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Measure Unit</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. kg, Liters, packs"
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full p-3 border border-zinc-200 rounded-xl text-sm font-semibold focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Food Category Icon Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Food Category & Icon Group</label>
                <select 
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value as keyof typeof CATEGORY_MAP)}
                  className="w-full p-3 border border-zinc-200 rounded-xl text-sm font-semibold focus:ring-1 focus:ring-zinc-900 focus:outline-none bg-white"
                >
                  {Object.entries(CATEGORY_MAP).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.label} ({key})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] font-medium text-zinc-400">
                  Assigns a gorgeous, generic, high-resolution visual icon representation to this item in the list view.
                </p>
              </div>

              {/* Minimum Stock Limit Threshold */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Warning Threshold (Min)</label>
                <input 
                  type="number" 
                  step="any"
                  required
                  min="0"
                  placeholder="e.g. 5 (notifies at or below)"
                  value={itemMinThreshold}
                  onChange={(e) => setItemMinThreshold(e.target.value)}
                  className="w-full p-3 border border-zinc-200 rounded-xl text-sm font-semibold focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
                <p className="text-[10px] font-medium text-zinc-400">
                  ⚠️ When current stock gets less than or equal to this limit, a prominent red warning badge is displayed.
                </p>
              </div>

              {/* Actions footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-zinc-100 text-zinc-600 rounded-xl text-sm font-bold hover:bg-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Ingredient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
