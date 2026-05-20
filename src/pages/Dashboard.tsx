import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Clock, 
  Brain,
  ArrowUpRight,
  ArrowDownRight,
  Database,
  Star,
  Smile,
  Meh,
  Frown,
  MessageSquare
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { aiService } from '../services/aiService';
import { seedDatabase } from '../services/seedService';
import { formatCurrency, cn } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';

const data = [
  { name: 'Mon', sales: 4000, orders: 24 },
  { name: 'Tue', sales: 3000, orders: 18 },
  { name: 'Wed', sales: 2000, orders: 12 },
  { name: 'Thu', sales: 2780, orders: 22 },
  { name: 'Fri', sales: 1890, orders: 15 },
  { name: 'Sat', sales: 2390, orders: 30 },
  { name: 'Sun', sales: 3490, orders: 28 },
];

export default function Dashboard() {
  const { user } = useAppStore();
  const [forecast, setForecast] = useState<any>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setReviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error loading reviews: ", error);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    async function getForecast() {
      setLoadingForecast(true);
      try {
        const res = await aiService.forecastSales(data);
        setForecast(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingForecast(false);
      }
    }
    getForecast();
  }, []);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedDatabase();
      alert('Sample data added successfully! Go to Menu or Inventory to see it.');
    } catch (e) {
      alert('Error seeding data. It might already be seeded.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-zinc-500 mt-1">Welcome back. Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2">
           {(user?.role === 'admin' || user?.email === 'KonkankarNilesh@gmail.com') && (
             <button 
              onClick={handleSeed}
              disabled={isSeeding}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50 shadow-sm"
             >
                <Database size={16} />
                {isSeeding ? 'Seeding...' : 'Seed Sample Data'}
             </button>
           )}
           <span className="text-xs font-mono bg-zinc-900 text-white px-2 py-1 rounded uppercase tracking-wider">Live View</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Revenue" 
          value={formatCurrency(12450)} 
          change="+12.5%" 
          positive={true} 
          icon={TrendingUp} 
        />
        <StatCard 
          label="Active Orders" 
          value="18" 
          change="+3" 
          positive={true} 
          icon={ShoppingBag} 
        />
        <StatCard 
          label="New Customers" 
          value="42" 
          change="-5%" 
          positive={false} 
          icon={Users} 
        />
        <StatCard 
          label="Avg. Prep Time" 
          value="14m" 
          change="-2m" 
          positive={true} 
          icon={Clock} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold">Revenue Insights</h2>
            <select className="bg-zinc-50 border border-zinc-200 text-sm rounded-lg p-1.5 focus:outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#71717a' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#71717a' }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '8px', 
                    border: '1px solid #e4e4e7',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#ea580c" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insight Section */}
        <div className="card bg-zinc-900 border-zinc-800 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-brand/20 rounded-lg text-brand">
              <Brain size={20} />
            </div>
            <h2 className="text-lg font-bold text-white">AI Forecasting</h2>
          </div>

          {loadingForecast ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
              <p className="text-zinc-400 text-sm">Analyzing historical data...</p>
            </div>
          ) : forecast ? (
            <div className="space-y-6">
              <div>
                <p className="text-zinc-400 text-sm uppercase tracking-wider font-semibold">Predicted Next 7 Days</p>
                <p className="text-4xl font-bold text-white mt-1">{formatCurrency(forecast.prediction || 0)}</p>
              </div>

              <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                <p className="text-zinc-300 text-sm leading-relaxed italic">
                  "{forecast.reasoning}"
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 font-mono">
                  Confidence Score: 94.2%
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-center text-sm p-4">
              Connect sales data to generate AI revenue predictions.
            </div>
          )}
        </div>
      </div>

      {/* Customer Sentiment Hub */}
      <div className="card p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <MessageSquare className="text-brand" size={20} />
              AI Customer Feedback & Sentiment Hub
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Real-time monitoring and AI semantic classification of customer dining experiences
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-zinc-500">
            <span>Total Reviews: {reviews.length}</span>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200 flex flex-col items-center justify-center p-6">
            <MessageSquare size={36} className="text-zinc-350 mb-3" />
            <p className="font-bold text-zinc-500">No customer reviews recorded yet</p>
            <p className="text-xs text-zinc-400 mt-0.5">Reviews submitted by customers will show up here along with their automatic AI-analyzed sentiment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sentiment KPI block */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-405 text-zinc-400 font-bold">Semantic Sentiment</h3>
              <div className="space-y-3.5 bg-zinc-50/70 border border-zinc-200/50 p-5 rounded-2xl">
                {/* Positive */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-emerald-700 mb-1.5 items-center">
                    <span className="flex items-center gap-1">😊 Positive</span>
                    <span>
                      {reviews.filter(r => r.sentiment === 'positive').length} ({reviews.length > 0 ? Math.round((reviews.filter(r => r.sentiment === 'positive').length / reviews.length) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-200/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: `${reviews.length > 0 ? (reviews.filter(r => r.sentiment === 'positive').length / reviews.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Neutral */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-zinc-650 text-zinc-600 mb-1.5 items-center">
                    <span className="flex items-center gap-1">😐 Neutral</span>
                    <span>
                      {reviews.filter(r => r.sentiment === 'neutral').length} ({reviews.length > 0 ? Math.round((reviews.filter(r => r.sentiment === 'neutral').length / reviews.length) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-200/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-zinc-400 rounded-full transition-all duration-500" 
                      style={{ width: `${reviews.length > 0 ? (reviews.filter(r => r.sentiment === 'neutral').length / reviews.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Negative */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-rose-700 mb-1.5 items-center">
                    <span className="flex items-center gap-1">😞 Negative</span>
                    <span>
                      {reviews.filter(r => r.sentiment === 'negative').length} ({reviews.length > 0 ? Math.round((reviews.filter(r => r.sentiment === 'negative').length / reviews.length) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-200/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                      style={{ width: `${reviews.length > 0 ? (reviews.filter(r => r.sentiment === 'negative').length / reviews.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Summary Sentiment Rating Card */}
              <div className="p-4 bg-brand/5 border border-brand/10 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-zinc-500 tracking-wide uppercase">Average Rating</p>
                  <p className="text-3xl font-black text-zinc-900 mt-1">
                    {(reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1)} <span className="text-sm font-bold text-zinc-400">/ 5.0</span>
                  </p>
                </div>
                <div className="flex items-center text-amber-500">
                  <Star size={32} className="fill-amber-500 text-amber-500" />
                </div>
              </div>
            </div>

            {/* List of Latest Reviews with Sentiments */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-405 text-zinc-400 font-bold">Latest Customer reviews</h3>
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 divide-y divide-zinc-100">
                {reviews.slice(0, 10).map((review, idx) => (
                  <div key={review.id || idx} className="pt-4 first:pt-0 animate-in fade-in">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-800">{review.customerEmail}</span>
                        <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                        <span className="text-[10px] font-bold text-zinc-400">
                          {review.createdAt ? (review.createdAt.toDate ? review.createdAt.toDate() : new Date(review.createdAt)).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={12} 
                            className={i < (review.rating || 0) ? "fill-amber-500 stroke-amber-500" : "text-zinc-200"} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm font-medium text-zinc-700 italic">"{review.comment}"</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border",
                        review.sentiment === 'positive' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        review.sentiment === 'negative' ? "bg-rose-50 text-rose-600 border-rose-100" :
                        "bg-zinc-50 text-zinc-500 border-zinc-200"
                      )}>
                        {review.sentiment === 'positive' && "😊 Positive"}
                        {review.sentiment === 'neutral' && "😐 Neutral"}
                        {review.sentiment === 'negative' && "😞 Negative"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, change, positive, icon: Icon }: any) {
  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-100 text-zinc-600">
          <Icon size={20} />
        </div>
        <div className={cn(
          "flex items-center text-xs font-bold px-2 py-1 rounded-full",
          positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
        )}>
          {positive ? <ArrowUpRight size={14} className="mr-0.5" /> : <ArrowDownRight size={14} className="mr-0.5" />}
          {change}
        </div>
      </div>
      <div>
        <h3 className="text-zinc-500 text-sm font-medium">{label}</h3>
        <p className="text-2xl font-bold text-zinc-900">{value}</p>
      </div>
    </div>
  );
}
