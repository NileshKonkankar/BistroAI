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
  X
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

export default function CustomerView() {
  const [menu, setMenu] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: 'Hello! I am BistroBot. How can I help you with your order today?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ordered, setOrdered] = useState(false);

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
    if (menu.length > 0) {
      aiService.getRecommendations([], menu).then(setRecommendations);
    }
  }, [menu]);

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-600 bg-clip-text text-transparent italic serif">Bon Appétit</h1>
          <p className="text-zinc-500 mt-1">Discover artisanal dishes crafted with love.</p>
        </div>
      </div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
             <Sparkles className="text-brand" size={20} />
             <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Chef's Smart Recommendations</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
             {recommendations.map((name, idx) => {
               const item = menu.find(m => m.name === name);
               if (!item) return null;
               return (
                 <button 
                  key={idx}
                  onClick={() => addToCart(item)}
                  className="flex-shrink-0 bg-brand/5 border border-brand/20 p-4 rounded-2xl flex items-center gap-4 hover:bg-brand/10 transition-colors group"
                 >
                   <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand shadow-sm">
                      <Plus size={20} />
                   </div>
                   <div className="text-left">
                      <p className="text-xs font-bold text-brand uppercase tracking-tighter">AI Pick</p>
                      <p className="font-bold text-zinc-900 whitespace-nowrap">{name}</p>
                   </div>
                 </button>
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
        {menu.map((item) => (
          <div key={item.id} className="group cursor-pointer" onClick={() => addToCart(item)}>
            <div className="relative aspect-[4/3] rounded-3xl bg-zinc-100 overflow-hidden mb-4 border border-zinc-200">
               <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
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
        ))}
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
    </div>
  );
}
