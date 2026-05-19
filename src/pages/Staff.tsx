import { useState } from 'react';
import { Users, Clock, Star, Plus, X, TrendingUp, ShoppingBag, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

interface StaffMember {
  id: number;
  name: string;
  role: string;
  shift: string;
  rating: number;
}

const staffData: StaffMember[] = [
  { id: 1, name: 'Marco Rossi', role: 'Head Chef', shift: 'Morning', rating: 4.9 },
  { id: 2, name: 'Sarah Miller', role: 'Server', shift: 'Evening', rating: 4.8 },
  { id: 3, name: 'James Wilson', role: 'Server', shift: 'Morning', rating: 4.5 },
  { id: 4, name: 'Elena Petrova', role: 'Chef de Partie', shift: 'Evening', rating: 4.7 },
];

const getPerformanceData = (staffId: number) => {
  // Deterministic "random" data based on staffId
  return {
    avgOrderValue: 42 + (staffId * 7) % 25,
    ordersServed: 145 + (staffId * 13) % 100,
    completionRate: 94 + (staffId * 3) % 6,
    ratings: [
      { day: 'Mon', rating: 4.2 + (staffId * 0.1) % 0.5 },
      { day: 'Tue', rating: 4.0 + (staffId * 0.2) % 0.8 },
      { day: 'Wed', rating: 4.5 + (staffId * 0.15) % 0.4 },
      { day: 'Thu', rating: 4.3 + (staffId * 0.11) % 0.6 },
      { day: 'Fri', rating: 4.8 + (staffId * 0.05) % 0.2 },
      { day: 'Sat', rating: 4.9 - (staffId * 0.03) % 0.2 },
      { day: 'Sun', rating: 4.7 + (staffId * 0.08) % 0.3 },
    ]
  };
};

export default function Staff() {
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  const performance = selectedStaff ? getPerformanceData(selectedStaff.id) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Staff Management</h1>
          <p className="text-zinc-500 mt-1">Manage shifts, performance, and roles.</p>
        </div>
        <button className="bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-lg active:scale-[0.98]">
          <Plus size={18} />
          Add Staff Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {staffData.map((staff) => (
          <div key={staff.id} className="bg-white border border-zinc-200 rounded-3xl p-6 flex flex-col items-center text-center group transition-all hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-200/50">
            <div className="w-20 h-20 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 mb-4 group-hover:bg-brand/10 group-hover:text-brand transition-all duration-300 transform group-hover:rotate-3">
              <Users size={32} />
            </div>
            <h3 className="font-bold text-zinc-900 text-lg group-hover:text-brand transition-colors">{staff.name}</h3>
            <p className="text-sm text-zinc-500 font-medium">{staff.role}</p>
            
            <div className="mt-6 w-full space-y-3 pt-6 border-t border-zinc-100">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                    <Clock size={14} />
                    Shift
                  </div>
                  <span className="text-xs font-black text-zinc-900">{staff.shift}</span>
               </div>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    Rating
                  </div>
                  <span className="text-xs font-black text-zinc-900">{staff.rating} / 5.0</span>
               </div>
            </div>

            <button 
              onClick={() => setSelectedStaff(staff)}
              className="mt-6 w-full py-3 text-xs font-black uppercase tracking-widest text-zinc-500 bg-zinc-50 rounded-xl hover:bg-zinc-900 hover:text-white transition-all duration-300 shadow-sm"
            >
               View Performance
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedStaff && performance && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStaff(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl border border-zinc-200 flex items-center justify-center text-brand">
                    <Award size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">{selectedStaff.name}</h2>
                    <p className="text-sm text-zinc-500">{selectedStaff.role} • Performance Report</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStaff(null)}
                  className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-zinc-900"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8">
                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div className="flex items-center gap-2 text-zinc-400 mb-2">
                      <TrendingUp size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Avg Order</span>
                    </div>
                    <p className="text-2xl font-black text-zinc-900">${performance.avgOrderValue.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div className="flex items-center gap-2 text-zinc-400 mb-2">
                      <ShoppingBag size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Served</span>
                    </div>
                    <p className="text-2xl font-black text-zinc-900">{performance.ordersServed}</p>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div className="flex items-center gap-2 text-zinc-400 mb-2">
                       <div className="w-4 h-4 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Success</span>
                    </div>
                    <p className="text-2xl font-black text-zinc-900">{performance.completionRate}%</p>
                  </div>
                </div>

                {/* Rating Chart */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Rating Trend (Past 7 Days)</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand" />
                      <span className="text-[10px] font-bold text-zinc-600">Daily Rating</span>
                    </div>
                  </div>
                  
                  <div className="h-[240px] w-full bg-zinc-50/50 rounded-2xl p-4 border border-dashed border-zinc-200">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={performance.ratings}>
                        <defs>
                          <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                        <XAxis 
                          dataKey="day" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#71717a' }}
                          dy={10}
                        />
                        <YAxis 
                          domain={[3, 5]} 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#71717a' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="rating" 
                          stroke="#ef4444" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorRating)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-zinc-100 flex justify-end">
                   <button 
                    onClick={() => setSelectedStaff(null)}
                    className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors shadow-lg"
                   >
                    Close Report
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
