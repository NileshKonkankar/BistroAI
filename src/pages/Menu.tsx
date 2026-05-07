import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2,
  Check,
  X,
  ChefHat,
  Square,
  CheckSquare,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  writeBatch
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
  tags?: string[];
}

export default function Menu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAvailability, setSelectedAvailability] = useState('All');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'Main Course',
    available: true,
    image: '',
    tags: ''
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
      const tagsArray = newItem.tags
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag !== '');

      await addDoc(collection(db, path), {
        ...newItem,
        tags: tagsArray,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewItem({ 
        name: '', 
        description: '', 
        price: 0, 
        category: 'Main Course', 
        available: true, 
        image: '',
        tags: '' 
      });
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
    const item = items.find(i => i.id === id);
    if (item) setItemToDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const path = `menu/${itemToDelete.id}`;
    try {
      await deleteDoc(doc(db, 'menu', itemToDelete.id));
      setItemToDelete(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesAvailability = selectedAvailability === 'All' || 
                                 (selectedAvailability === 'Available' ? item.available : !item.available);
      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [items, searchTerm, selectedCategory, selectedAvailability]);

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(i => i.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedItems(next);
  };

  const bulkDelete = () => {
    setIsBulkDeleting(true);
  };

  const confirmBulkDelete = async () => {
    const batch = writeBatch(db);
    selectedItems.forEach(id => {
      batch.delete(doc(db, 'menu', id));
    });

    try {
      await batch.commit();
      setSelectedItems(new Set());
      setIsBulkDeleting(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'menu/bulk');
    }
  };

  const bulkAvailability = async (available: boolean) => {
    const batch = writeBatch(db);
    selectedItems.forEach(id => {
      batch.update(doc(db, 'menu', id), { available });
    });

    try {
      await batch.commit();
      setSelectedItems(new Set());
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'menu/bulk');
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

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleSelectAll}
            className="p-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors bg-white shadow-sm"
            title="Select All"
          >
            {selectedItems.size === filteredItems.length && filteredItems.length > 0 ? (
              <CheckSquare size={20} className="text-brand" />
            ) : (
              <Square size={20} className="text-zinc-400" />
            )}
          </button>
        </div>
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by name, category, or ingredients..."
            className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative group/select flex-1 md:flex-none">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <select 
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full appearance-none bg-white border border-zinc-200 pl-10 pr-8 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="All">All Categories</option>
              <option>Main Course</option>
              <option>Appetizers</option>
              <option>Desserts</option>
              <option>Beverages</option>
            </select>
          </div>

          <div className="relative group/select flex-1 md:flex-none">
            <select 
              value={selectedAvailability}
              onChange={e => setSelectedAvailability(e.target.value)}
              className="w-full appearance-none bg-white border border-zinc-200 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="All">All Status</option>
              <option value="Available">Available</option>
              <option value="Unavailable">Unavailable</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredItems.map((item) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={item.id}
              className={cn(
                "card group relative overflow-hidden transition-all duration-300",
                !item.available && "opacity-60 grayscale-[0.5]",
                selectedItems.has(item.id) && "ring-2 ring-brand border-brand/30 shadow-lg"
              )}
            >
              {/* Selection Checkbox Overlay */}
              <div 
                onClick={() => toggleSelectItem(item.id)}
                className={cn(
                  "absolute top-4 right-4 z-20 cursor-pointer p-1 rounded-lg transition-all",
                  selectedItems.has(item.id) ? "bg-brand text-white" : "bg-white/80 backdrop-blur-md opacity-0 group-hover:opacity-100 text-zinc-400 shadow-sm border border-zinc-200"
                )}
              >
                {selectedItems.has(item.id) ? <CheckSquare size={20} /> : <Square size={20} />}
              </div>

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

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {item.tags.map((tag, idx) => (
                      <span key={idx} className="bg-zinc-50 text-zinc-500 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-zinc-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

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

      {/* Bulk Action Toolbar */}
      <AnimatePresence>
        {selectedItems.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-8 min-w-[400px]"
          >
            <div className="flex items-center gap-3 pr-8 border-r border-zinc-800">
              <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center font-black">
                {selectedItems.size}
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-zinc-400">Selected</span>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => bulkAvailability(true)}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                  <Eye size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-500 group-hover:text-white transition-colors">Show</span>
              </button>
              
              <button 
                onClick={() => bulkAvailability(false)}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-600 transition-colors">
                  <EyeOff size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-500 group-hover:text-white transition-colors">Hide</span>
              </button>

              <div className="w-px h-8 bg-zinc-800 mx-2" />

              <button 
                onClick={bulkDelete}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center group-hover:bg-red-600 transition-colors">
                  <Trash2 size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-500 group-hover:text-white transition-colors text-red-500">Delete</span>
              </button>
            </div>

            <button 
              onClick={() => setSelectedItems(new Set())}
              className="ml-auto w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single Item Delete Confirmation */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-2">Delete Item?</h2>
              <p className="text-zinc-500 mb-8">
                Are you sure you want to permanently delete <span className="font-bold text-zinc-900">"{itemToDelete.name}"</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-3 border border-zinc-200 rounded-xl font-bold hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation */}
      <AnimatePresence>
        {isBulkDeleting && (
          <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-2">Delete {selectedItems.size} Items?</h2>
              <p className="text-zinc-500 mb-8">
                Are you sure you want to permanently delete these <span className="font-bold text-zinc-900">{selectedItems.size} items</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsBulkDeleting(false)}
                  className="flex-1 py-3 border border-zinc-200 rounded-xl font-bold hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmBulkDelete}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                <div className="space-y-1 col-span-2">
                   <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Tags (comma separated)</label>
                   <input
                    type="text"
                    value={newItem.tags}
                    onChange={e => setNewItem({...newItem, tags: e.target.value})}
                    placeholder="e.g. vegan, spicy, gluten-free"
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
