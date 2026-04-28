import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Clock, 
  Brain,
  ArrowUpRight,
  ArrowDownRight,
  Database
} from 'lucide-react';
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
