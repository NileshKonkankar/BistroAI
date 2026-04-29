import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2,
  Check,
  X,
  ChefHat
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  image?: string;
}

export default function Menu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'Main Course',
    available: true,
    image: ''
  });

  useEffect(() => {
    const path = 'menu';
    const q = query(collection(db, path));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
      setItems(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsub();
  }, []);

  const handleAddItem = async (e: any) => {
    e.preventDefault();
    const path = 'menu';
    try {
      await addDoc(collection(db, path), {
        ...newItem,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewItem({ name: '', description: '', price: 0, category: 'Main Course', available: true, image: '' });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const toggleAvailability = async (id: string, current: boolean) => {
    const path = `menu/${id}`;
    try {
      await updateDoc(doc(db, 'menu', id), { available: !current });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const deleteItem = async (id: string) => {
    const path = `menu/${id}`;
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteDoc(doc(db, 'menu', id));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, path);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Menu Management</h1>
          <p className="text-zinc-500 mt-1">Manage your dishes, pricing, and availability.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-zinc-900 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-lg active:scale-[0.98]"
        >
          <Plus size={18} />
          Add New Item
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, category, or ingredients..."
            className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-zinc-200 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-zinc-50 transition-colors shadow-sm">
            <Filter size={18} className="text-zinc-400" />
            Categories
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={item.id}
              className={cn(
                "card group relative",
                !item.available && "opacity-60 grayscale-[0.5]"
              )}
            >
              <div className="aspect-video bg-zinc-100 flex items-center justify-center text-zinc-400 overflow-hidden relative">
                {item.image ? (
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <ChefHat size={48} className="opacity-20 translate-y-4" />
                )}
                <div className="absolute top-3 left-3">
                   <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest text-zinc-600 shadow-sm">
                      {item.category}
                   </span>
                </div>
                {!item.available && (
                   <div className="absolute inset-0 bg-zinc-900/60 flex items-center justify-center">
                      <span className="text-white font-bold text-sm tracking-widest uppercase">Unavailable</span>
                   </div>
                )}
              </div>
              
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-zinc-900 text-lg group-hover:text-brand transition-colors">{item.name}</h3>
                  <p className="font-bold text-zinc-900">{formatCurrency(item.price)}</p>
                </div>
                <p className="text-sm text-zinc-500 line-clamp-2 min-h-[40px]">
                  {item.description}
                </p>

                <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleAvailability(item.id, item.available)}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                        item.available ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                      )}
                    >
                      <Check size={16} />
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      {item.available ? 'Active' : 'Hidden'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => deleteItem(item.id)}
                      className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">New Menu Item</h2>
              <button 
                onClick={() => setIsAdding(false)}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Item Name</label>
                  <input
                    required
                    type="text"
                    value={newItem.name}
                    onChange={e => setNewItem({...newItem, name: e.target.value})}
                    placeholder="e.g. Truffle Mushroom Risotto"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Price ($)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={newItem.price}
                    onChange={e => setNewItem({...newItem, price: parseFloat(e.target.value)})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                </div>
                <div className="space-y-1">
                   <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Category</label>
                   <select 
                    value={newItem.category}
                    onChange={e => setNewItem({...newItem, category: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-brand/20 transition-all"
                   >
                     <option>Main Course</option>
                     <option>Appetizers</option>
                     <option>Desserts</option>
                     <option>Beverages</option>
                   </select>
                </div>
                <div className="space-y-1 col-span-2">
                   <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Description</label>
                   <textarea
                    rows={3}
                    value={newItem.description}
                    onChange={e => setNewItem({...newItem, description: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-brand/20 transition-all"
                   />
                </div>
                <div className="space-y-1 col-span-2">
                   <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Image URL (Optional)</label>
                   <input
                    type="url"
                    value={newItem.image}
                    onChange={e => setNewItem({...newItem, image: e.target.value})}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-brand/20 transition-all"
                   />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-3 border border-zinc-200 rounded-xl font-bold hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-brand text-white rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all"
                >
                  Add Item
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
