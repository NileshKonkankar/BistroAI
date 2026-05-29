import React, { useState, useEffect } from 'react';
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
  Sparkles
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
import { formatCurrency } from '../lib/utils';

// Static fallbacks if Firestore holds no data or during loading
const INITIAL_FALLBACKS = [
  { id: '1', name: 'Truffle Oil', qty: 5, unit: 'Liters', minThreshold: 2 },
  { id: '2', name: 'Arborio Rice', qty: 2, unit: 'kg', minThreshold: 10 },
  { id: '3', name: 'Parmesan Cheese', qty: 12, unit: 'kg', minThreshold: 5 },
  { id: '4', name: 'Fresh Basil', qty: 0.5, unit: 'kg', minThreshold: 1 },
];

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  
  // Form state
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemUnit, setItemUnit] = useState('kg');
  const [itemMinThreshold, setItemMinThreshold] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sync with Firestore Real-time
  useEffect(() => {
    const q = query(collection(db, 'inventory'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setItems(INITIAL_FALLBACKS);
      } else {
        const liveItems = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setItems(liveItems);
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
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemQty(String(item.qty));
    setItemUnit(item.unit || 'kg');
    setItemMinThreshold(String(item.minThreshold !== undefined ? item.minThreshold : (item.min || 1)));
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
            minThreshold: numericMin
          } : i));
        } else {
          const itemRef = doc(db, 'inventory', editingItem.id);
          await updateDoc(itemRef, {
            name: itemName,
            qty: numericQty,
            unit: itemUnit,
            minThreshold: numericMin,
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

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            : "bg-emerald-50 border-emerald-100 text-emerald-900"
        }`}>
           <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                criticalCount > 0 ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"
              }`}>
                <AlertCircle size={18} className="stroke-[2.5]" />
              </div>
              <span className="font-extrabold uppercase tracking-widest text-xs">
                Stock Status Warning
              </span>
           </div>
           
           <div className="mt-3">
             <p className="text-3xl font-black">
               {criticalCount > 0 ? `${criticalCount} Items Low` : 'All Stock OK'}
             </p>
             <p className="text-xs font-semibold mt-1 opacity-80">
               {criticalCount > 0 
                 ? "Ingredients are currently equal to or below their threshold limit!" 
                 : "Perfect! All ingredients are above their replenishment levels."
               }
             </p>
           </div>
        </div>

        {/* Total Ingredients tracked */}
        <div className="card p-6 bg-white border border-zinc-200">
          <div className="flex items-center gap-3 mb-2 text-zinc-500">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">Tracked Ingredients</span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-zinc-900">{totalItems}</p>
            <p className="text-xs font-semibold text-zinc-400 mt-1">Unique storage formulas registered</p>
          </div>
        </div>

        {/* Supply Restock status */}
        <div className="card p-6 bg-white border border-zinc-200">
          <div className="flex items-center gap-3 mb-2 text-zinc-500">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-[#9d5b00] text-amber-600">Replenish Ratio</span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-zinc-900">
              {totalItems > 0 ? Math.round(((totalItems - criticalCount) / totalItems) * 100) : 100}%
            </p>
            <p className="text-xs font-semibold text-zinc-400 mt-1">Healthy levels relative to minimum</p>
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
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Status Status</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredItems.map((item) => {
                  const qty = item.qty || 0;
                  const threshold = item.minThreshold !== undefined ? item.minThreshold : (item.min || 0);
                  const isLow = qty <= threshold;

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-zinc-50/50 transition-colors ${
                        isLow ? "bg-red-50/20" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-900 text-sm md:text-base">{item.name}</span>
                          {isLow && (
                            <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5 font-sans">
                              ❌ Crucial order needed!
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {/* Stock level highlighting */}
                          <span className={`font-black text-base md:text-lg min-w-[24px] text-center px-2 py-0.5 rounded ${
                            isLow ? "text-red-600 bg-red-100" : "text-zinc-800"
                          }`}>
                            {qty}
                          </span>

                          {/* Quick adjust controls */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => adjustQty(item, -1)}
                              className="p-1 hover:bg-zinc-200 border border-zinc-200 text-zinc-600 rounded-lg transition-transform active:scale-90"
                              title="Decrease Stock"
                            >
                              <Minus size={12} />
                            </button>
                            <button
                              onClick={() => adjustQty(item, 1)}
                              className="p-1 hover:bg-zinc-200 border border-zinc-200 text-zinc-600 rounded-lg transition-transform active:scale-90"
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
                        <span className="font-mono font-bold text-zinc-700 bg-zinc-100 px-2 py-1 rounded">
                          {threshold} {item.unit || 'units'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-extrabold uppercase tracking-widest rounded-lg bg-red-500 text-white border border-red-600 shadow-sm animate-pulse">
                            <AlertCircle size={10} className="stroke-[3]" />
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                            🟢 OK
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <button 
                            onClick={() => openEditModal(item)}
                            className="text-xs font-bold text-zinc-600 hover:text-zinc-900 border border-zinc-200 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-50 transition-colors shadow-2xs"
                          >
                            Manage
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
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
