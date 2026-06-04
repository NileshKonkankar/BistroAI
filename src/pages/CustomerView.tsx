import { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Sparkles, 
  MessageSquare, 
  Plus, 
  Minus, 
  Trash2,
  CheckCircle2,
  Send,
  Brain,
  X,
  User,
  Clock,
  Calendar,
  TrendingUp,
  RotateCcw,
  Star,
  ChefHat,
  Download
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  where,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { aiService } from '../services/aiService';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { generateInvoicePDF } from '../lib/invoiceGenerator';

const getDishImage = (item: any) => {
  if (item.image && item.image.trim() !== '') return item.image;
  
  const name = (item.name || '').toLowerCase();
  const category = (item.category || '').toLowerCase();
  
  if (name.includes('burger') || name.includes('slider')) {
    return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=400&h=300&auto=format&fit=crop';
  }
  if (name.includes('pizza') || name.includes('flatbread')) {
    return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=400&h=300&auto=format&fit=crop';
  }
  if (name.includes('risotto') || name.includes('rice') || name.includes('paella')) {
    return 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?q=80&w=400&h=300&auto=format&fit=crop';
  }
  if (name.includes('pasta') || name.includes('ravioli') || name.includes('spaghetti') || name.includes('noodle')) {
    return 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=400&h=300&auto=format&fit=crop';
  }
  if (name.includes('steak') || name.includes('beef') || name.includes('meat') || name.includes('ribs')) {
    return 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=400&h=300&auto=format&fit=crop';
  }
  if (name.includes('salad') || name.includes('basil') || name.includes('burrata') || name.includes('caprese')) {
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=400&h=300&auto=format&fit=crop';
  }
  if (name.includes('cake') || name.includes('dessert') || name.includes('sweet') || name.includes('chocolate') || name.includes('lava')) {
    return 'https://images.unsplash.com/photo-1621236304191-b4731474d788?q=80&w=400&h=300&auto=format&fit=crop';
  }
  if (name.includes('coffee') || name.includes('martini') || name.includes('drink') || name.includes('beverage') || name.includes('cocktail') || name.includes('tea')) {
    return 'https://images.unsplash.com/photo-1545438102-799c3991ffb2?q=80&w=400&h=300&auto=format&fit=crop';
  }
  if (name.includes('fish') || name.includes('salmon') || name.includes('sea bass') || name.includes('lobster') || name.includes('shrimp') || name.includes('seafood')) {
    return 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=400&h=300&auto=format&fit=crop';
  }
  
  if (category.includes('appetizer') || category.includes('starter')) {
    return 'https://images.unsplash.com/photo-1541525044434-601d368e7343?q=80&w=400&h=300&auto=format&fit=crop';
  }
  if (category.includes('main')) {
    return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=400&h=300&auto=format&fit=crop';
  }
  if (category.includes('dessert')) {
    return 'https://images.unsplash.com/photo-1551024506-0bccd828d307?q=80&w=400&h=300&auto=format&fit=crop';
  }
  if (category.includes('drink') || category.includes('beverage')) {
    return 'https://images.unsplash.com/photo-1497534446932-c925b458314e?q=80&w=400&h=300&auto=format&fit=crop';
  }

  return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=400&h=300&auto=format&fit=crop';
};

export default function CustomerView() {
  const [menu, setMenu] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: 'Hello! I am BistroBot. How can I help you with your order today?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [reorderedToast, setReorderedToast] = useState(false);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleReorder = (items: any[]) => {
    // Merge past items into cart
    setCart(prev => {
      const updated = [...prev];
      items.forEach(item => {
        const existingIdx = updated.findIndex(c => c.id === item.id);
        if (existingIdx > -1) {
          updated[existingIdx] = { 
            ...updated[existingIdx], 
            qty: updated[existingIdx].qty + item.qty 
          };
        } else {
          updated.push({ ...item });
        }
      });
      return updated;
    });
    setReorderedToast(true);
    setTimeout(() => setReorderedToast(false), 3000);
  };

  const totalSpent = activeOrders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);
  const averageSpent = activeOrders.length > 0 ? totalSpent / activeOrders.length : 0;

  useEffect(() => {
    const path = 'menu';
    const unsub = onSnapshot(query(collection(db, path)), (snap) => {
      setMenu(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const path = 'inventory';
    const unsub = onSnapshot(query(collection(db, path)), (snap) => {
      setInventory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const path = 'orders';
    const q = query(
      collection(db, path),
      where('customerId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setActiveOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsub();
  }, [auth.currentUser]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const path = 'reviews';
    const q = query(
      collection(db, path),
      where('customerId', '==', auth.currentUser.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      setUserReviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsub();
  }, [auth.currentUser]);

  const submitReview = async (orderId: string) => {
    if (!auth.currentUser || !reviewComment.trim()) return;
    setSubmittingReview(true);
    const path = 'reviews';
    try {
      const sentiment = await aiService.analyzeSentiment(reviewComment);
      await addDoc(collection(db, path), {
        orderId,
        customerId: auth.currentUser.uid,
        customerEmail: auth.currentUser.email || 'customer@example.com',
        rating: reviewRating,
        comment: reviewComment,
        sentiment: sentiment || 'neutral',
        createdAt: serverTimestamp()
      });
      setReviewingOrderId(null);
      setReviewComment('');
      setReviewRating(5);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    if (menu.length > 0) {
      const pastItems = activeOrders.flatMap(o => o.items || []);
      aiService.getRecommendations(pastItems, menu, inventory)
        .then(res => {
          if (Array.isArray(res)) {
            setRecommendations(res);
          }
        })
        .catch(err => {
          console.warn("Chef AI recommendations trigger failed:", err);
        });
    }
  }, [menu, activeOrders, inventory]);

  const addToCart = (item: any) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const removeFromCart = (id: string) => {
    const existing = cart.find(c => c.id === id);
    if (existing.qty > 1) {
      setCart(cart.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c));
    } else {
      setCart(cart.filter(c => c.id !== id));
    }
  };

  const total = cart.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    const path = 'orders';
    try {
      await addDoc(collection(db, path), {
        customerId: auth.currentUser?.uid,
        customerEmail: auth.currentUser?.email,
        items: cart,
        totalAmount: total,
        status: 'pending',
        type: 'dine-in', // Default for now
        createdAt: serverTimestamp(),
      });
      setCart([]);
      setOrdered(true);
      setTimeout(() => setOrdered(false), 5000);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    const userMsg = inputMessage;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputMessage('');
    
    try {
      const response = await aiService.getChatResponse(userMsg, menu, chatMessages);
      setChatMessages(prev => [...prev, { role: 'bot', text: response || "I'm sorry, I couldn't process that." }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'bot', text: "Service temporarily unavailable." }]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-600 bg-clip-text text-transparent italic serif">Bon Appétit</h1>
          <p className="text-zinc-500 mt-1">Discover artisanal dishes crafted with love.</p>
        </div>
        <button 
          onClick={() => setIsProfileOpen(true)}
          className="flex items-center gap-2.5 bg-white border border-zinc-200 px-5 py-3 rounded-2xl text-sm font-bold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-300 transition-all shadow-sm active:scale-[0.98] self-start sm:self-auto"
        >
          <User size={18} className="text-brand" />
          <span>My Profile & Order History</span>
        </button>
      </div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
               <Sparkles className="text-brand animate-pulse" size={22} />
               <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Chef's Smart Recommendations</h2>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              Live Gemini API Feedback
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             {recommendations.map((rec, idx) => {
               const name = typeof rec === 'string' ? rec : rec.name;
               const reason = typeof rec === 'string' ? 'Chef Pick' : rec.reason;
               const score = typeof rec === 'string' ? 95 : rec.matchScore;
               
               const item = menu.find(m => m.name === name);
               if (!item) return null;
               const dishImg = getDishImage(item);
               
               return (
                 <div 
                   key={idx}
                   className="bg-white border border-zinc-200/80 hover:border-brand/40 shadow-xs hover:shadow-md transition-all duration-300 rounded-3xl p-4 flex flex-col justify-between group overflow-hidden relative"
                 >
                   <div className="relative h-28 rounded-2xl overflow-hidden mb-3">
                     <img 
                       src={dishImg} 
                       alt={item.name} 
                       className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                       referrerPolicy="no-referrer"
                     />
                     <div className="absolute top-2.5 right-2.5 bg-brand/90 backdrop-blur-xs text-white text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5 shadow-sm">
                       <Sparkles size={8} /> {score}% Match
                     </div>
                   </div>

                   <div className="flex-1 select-none">
                     <h3 className="font-bold text-zinc-900 text-sm leading-snug group-hover:text-brand transition-colors">
                       {item.name}
                     </h3>
                     <p className="text-[10.5px] text-zinc-500 leading-normal font-medium mt-1 line-clamp-2 italic">
                       "{reason}"
                     </p>
                     <div className="flex items-baseline gap-1 mt-2">
                       <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Price:</span>
                       <span className="text-sm font-black text-zinc-900">{formatCurrency(item.price)}</span>
                     </div>
                   </div>

                   <button
                     onClick={() => addToCart(item)}
                     className="w-full mt-3.5 bg-zinc-900 text-white hover:bg-brand text-xs font-bold py-2 rounded-xl transition duration-150 flex items-center justify-center gap-1 bg-zinc-900 cursor-pointer shadow-2xs hover:shadow-none"
                   >
                     <Plus size={13} />
                     <span>Add Recommendation</span>
                   </button>
                 </div>
               );
             })}
          </div>
        </section>
      )}

      {/* Active Orders Tracking */}
      {activeOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
             <ShoppingBag className="text-brand" size={20} />
             <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Track Your Orders</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {activeOrders
                .filter(o => o.status !== 'delivered' && o.status !== 'cancelled')
                .map((order) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={order.id}
                    className="bg-white border border-zinc-200 p-5 rounded-3xl shadow-sm hover:border-brand/20 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                        order.status === 'pending' ? "bg-amber-50 text-amber-500" :
                        order.status === 'preparing' ? "bg-blue-50 text-blue-500" :
                        "bg-emerald-50 text-emerald-500"
                      )}>
                        {order.status === 'pending' ? <Send size={20} /> : <CheckCircle2 size={20} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-brand uppercase tracking-tighter">Order #{order.id.slice(-4).toUpperCase()}</p>
                        <h3 className="font-bold text-zinc-900 capitalize text-lg">{order.status}</h3>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {order.items.length} items • {formatCurrency(order.totalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                       {order.tableNumber && (
                         <div className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-1 rounded-lg uppercase">
                           Table {order.tableNumber}
                         </div>
                       )}
                       <div className="flex h-1.5 w-24 bg-zinc-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ 
                              width: order.status === 'pending' ? '33%' : 
                                     order.status === 'preparing' ? '66%' : '100%' 
                            }}
                            className={cn(
                              "h-full transition-all duration-1000",
                              order.status === 'pending' ? "bg-amber-400" :
                              order.status === 'preparing' ? "bg-blue-400" : "bg-emerald-400"
                            )}
                          />
                       </div>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {menu.map((item) => {
          const dishImg = getDishImage(item);
          return (
            <div key={item.id} className="group cursor-pointer" onClick={() => addToCart(item)}>
              <div className="relative aspect-[4/3] rounded-3xl bg-zinc-100 overflow-hidden mb-4 border border-zinc-200">
                 <img 
                   src={dishImg} 
                   alt={item.name} 
                   className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                   referrerPolicy="no-referrer"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"></div>
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-all duration-300">
                    <span className="bg-white text-zinc-900 px-6 py-2 rounded-full font-bold shadow-xl scale-95 group-hover:scale-100 transition-transform">
                      Add to Cart
                    </span>
                 </div>
              </div>
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="font-bold text-lg text-zinc-900">{item.name}</h3>
                    <p className="text-sm text-zinc-500 line-clamp-2">{item.description}</p>
                 </div>
                 <p className="font-bold text-brand text-lg">{formatCurrency(item.price)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Cart Panel */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-40"
          >
            <div className="bg-zinc-900 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4 border border-zinc-800">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand rounded-2xl flex items-center justify-center relative">
                    <ShoppingBag size={24} />
                    <span className="absolute -top-2 -right-2 bg-white text-zinc-900 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-zinc-900 tracking-tighter">
                      {cart.length}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Your Order</p>
                    <p className="text-xl font-bold">{formatCurrency(total)}</p>
                  </div>
               </div>
               <button 
                onClick={placeOrder}
                disabled={submitting}
                className="bg-white text-zinc-900 px-8 py-3 rounded-2xl font-bold hover:bg-zinc-100 transition-all active:scale-[0.98] disabled:opacity-50"
               >
                 {submitting ? 'Ordering...' : 'Place Order'}
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Success Toast */}
      {ordered && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-bounce">
           <div className="bg-white border border-emerald-100 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
              <p className="font-bold text-zinc-900">Order placed! Kitchen is notified.</p>
           </div>
        </div>
      )}

      {/* AI Chatbot Widget */}
      <div className="fixed bottom-8 right-8 z-50">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="absolute bottom-20 right-0 w-80 h-96 bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col"
            >
              <div className="bg-brand p-4 text-white flex items-center gap-2">
                 <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                   <Brain size={18} />
                 </div>
                 <span className="font-bold">BistroBot AI</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn(
                    "max-w-[80%] rounded-2xl p-3 text-sm",
                    msg.role === 'bot' ? "bg-zinc-100 text-zinc-800 self-start" : "bg-brand text-white ml-auto"
                  )}>
                    {msg.text}
                  </div>
                ))}
              </div>
              <div className="p-4 border-t flex gap-2">
                <input 
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask for menu help..."
                  className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                />
                <button 
                  onClick={sendMessage}
                  className="w-10 h-10 bg-brand text-white rounded-xl flex items-center justify-center hover:bg-orange-700 transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 bg-brand text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        >
          {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      </div>

      {/* Customer Profile & Past Orders Modal */}
      <AnimatePresence>
        {isProfileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileOpen(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl border border-zinc-200 flex items-center justify-center text-brand font-black text-lg shadow-sm">
                    {auth.currentUser?.email ? auth.currentUser.email[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">{auth.currentUser?.email}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs bg-zinc-100 border border-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full font-bold capitalize">
                        {auth.currentUser?.emailVerified ? 'Verified Account' : 'Customer'}
                      </span>
                      <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                      <span className="text-xs text-zinc-500 font-medium">Bistro Member</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsProfileOpen(false)}
                  className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-zinc-900"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                {/* Statistics Grid */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                    <TrendingUp size={14} className="text-zinc-400" />
                    Dining Activity Metrics
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 text-center sm:text-left">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Total Orders</span>
                      <p className="text-2xl font-black text-zinc-900">{activeOrders.length}</p>
                    </div>
                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 text-center sm:text-left">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Total Spent</span>
                      <p className="text-2xl font-black text-brand">{formatCurrency(totalSpent)}</p>
                    </div>
                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 text-center sm:text-left">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Avg Order</span>
                      <p className="text-2xl font-black text-zinc-900">{formatCurrency(averageSpent)}</p>
                    </div>
                  </div>
                </div>

                {/* Past Orders History */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Clock size={14} className="text-zinc-400" />
                    All Order History
                  </h3>
                  
                  {activeOrders.length === 0 ? (
                    <div className="text-center py-12 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200 flex flex-col items-center justify-center p-6">
                      <ShoppingBag size={32} className="text-zinc-300 mb-3" />
                      <p className="font-bold text-zinc-500">No orders placed yet</p>
                      <p className="text-xs text-zinc-400 mt-1">Order your first delicious dish from our menu!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeOrders.map((order) => {
                        const orderReview = userReviews.find(r => r.orderId === order.id);
                        return (
                          <div 
                            key={order.id} 
                            className="bg-white border border-zinc-200/80 rounded-2xl p-5 hover:border-zinc-300 hover:shadow-sm transition-all animate-in fade-in"
                          >
                            {/* Order mini-header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-black text-zinc-800 bg-zinc-100 px-2 py-1 rounded">
                                  #{order.id.slice(-4).toUpperCase()}
                                </span>
                                <span className="text-xs font-bold text-zinc-400">
                                  {formatDate(order.createdAt)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                  order.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                  order.status === 'preparing' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                  order.status === 'ready' ? "bg-purple-50 text-purple-600 border-purple-100" :
                                  order.status === 'delivered' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                  "bg-red-50 text-red-600 border-red-100"
                                )}>
                                  {order.status}
                                </span>
                                {order.type && (
                                  <span className="text-[10px] font-black uppercase tracking-wider bg-zinc-50 border border-zinc-200 text-zinc-500 px-2 py-0.5 rounded-full">
                                    {order.type}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Items List */}
                            <div className="space-y-2 mb-4">
                              {order.items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <div className="flex items-center gap-2 text-zinc-700">
                                    <span className="font-bold text-zinc-400 text-xs">{item.qty}×</span>
                                    <span className="font-medium text-zinc-800">{item.name}</span>
                                  </div>
                                  <span className="text-xs font-bold text-zinc-500">{formatCurrency(item.price * item.qty)}</span>
                                </div>
                              ))}
                            </div>

                            {/* End summary row */}
                            <div className="flex items-center justify-between pt-3 border-t border-zinc-100/50">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Total:</span>
                                <span className="text-base font-black text-zinc-900">{formatCurrency(order.totalAmount)}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => generateInvoicePDF(order)}
                                  className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 px-3 py-1.5 rounded-xl transition-all"
                                  title="Download Invoice PDF"
                                >
                                  <Download size={12} />
                                  <span>Invoice PDF</span>
                                </button>
                                
                                <button
                                  onClick={() => handleReorder(order.items)}
                                  className="flex items-center gap-1.5 text-xs font-bold text-brand bg-brand/5 border border-brand/10 hover:bg-brand/10 px-3 py-1.5 rounded-xl transition-all"
                                >
                                  <RotateCcw size={12} />
                                  <span>Quick Reorder</span>
                                </button>
                              </div>
                            </div>

                            {/* Review Display or Write Review Form */}
                            {orderReview ? (
                              <div className="mt-4 pt-3.5 border-t border-zinc-100/80 bg-zinc-50/50 p-4 rounded-xl border border-dashed border-zinc-200">
                                <div className="flex items-center justify-between mb-1.5 animate-in fade-in duration-300">
                                  <div className="flex items-center gap-0.5 text-amber-500">
                                    {[...Array(5)].map((_, i) => (
                                      <Star 
                                        key={i} 
                                        size={14} 
                                        className={i < orderReview.rating ? "fill-amber-500 stroke-amber-500" : "text-zinc-300"} 
                                      />
                                    ))}
                                  </div>
                                  <div className={cn(
                                    "flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider",
                                    orderReview.sentiment === 'positive' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                    orderReview.sentiment === 'negative' ? "bg-red-50 text-red-600 border-red-100" :
                                    "bg-zinc-50/85 text-zinc-500 border-zinc-200"
                                  )}>
                                    {orderReview.sentiment === 'positive' && "😊 Positive"}
                                    {orderReview.sentiment === 'neutral' && "😐 Neutral"}
                                    {orderReview.sentiment === 'negative' && "😞 Negative"}
                                  </div>
                                </div>
                                <p className="text-xs font-semibold text-zinc-600 italic">"{orderReview.comment}"</p>
                              </div>
                            ) : reviewingOrderId === order.id ? (
                              <div className="mt-4 pt-4 border-t border-zinc-100 space-y-3 p-4 bg-zinc-50/50 rounded-2xl border border-zinc-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-zinc-700 uppercase tracking-wider">How was your meal?</span>
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        type="button"
                                        onClick={() => setReviewRating(star)}
                                        className="p-0.5 focus:outline-none transition-transform hover:scale-110"
                                      >
                                        <Star 
                                          size={18} 
                                          className={star <= reviewRating ? "fill-amber-500 text-amber-500" : "text-zinc-300"} 
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                
                                <textarea
                                  placeholder="Leave a short comment (AI will analyze sentiment)..."
                                  value={reviewComment}
                                  onChange={(e) => setReviewComment(e.target.value)}
                                  className="w-full text-xs p-3 bg-white border border-zinc-200 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand focus:outline-none placeholder-zinc-400 font-medium text-zinc-800"
                                  rows={2}
                                  maxLength={300}
                                />
                                
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setReviewingOrderId(null)}
                                    disabled={submittingReview}
                                    className="px-3 py-1.5 text-[11px] font-bold text-zinc-500 hover:bg-zinc-100 rounded-xl transition-all"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => submitReview(order.id)}
                                    disabled={submittingReview || !reviewComment.trim()}
                                    className="px-4 py-2 text-[11px] font-bold bg-zinc-950 text-white hover:bg-zinc-800 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    {submittingReview ? (
                                      <>
                                        <motion.div 
                                          animate={{ rotate: 360 }} 
                                          transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}
                                          className="w-3 h-3 hover:border-zinc-300 border-2 border-white border-t-transparent rounded-full"
                                        />
                                        <span>Analyzing...</span>
                                      </>
                                    ) : (
                                      <span>Submit Review</span>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 pt-3 border-t border-zinc-100/50 flex justify-end">
                                <button
                                  onClick={() => {
                                    setReviewingOrderId(order.id);
                                    setReviewRating(5);
                                    setReviewComment('');
                                  }}
                                  className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 hover:text-zinc-900 bg-zinc-50 border border-zinc-200 hover:border-zinc-300 px-3 py-1.5 rounded-xl transition-all shadow-2xs"
                                >
                                  <MessageSquare size={12} className="text-zinc-400" />
                                  <span>Review This Order</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-zinc-100 flex justify-end bg-zinc-50/50">
                <button 
                  onClick={() => setIsProfileOpen(false)}
                  className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors shadow-lg"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reorder Toast */}
      {reorderedToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-bounce">
           <div className="bg-white border border-zinc-100 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3">
              <div className="w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
              <p className="font-bold text-zinc-900">Items added to your cart!</p>
           </div>
        </div>
      )}
    </div>
  );
}
