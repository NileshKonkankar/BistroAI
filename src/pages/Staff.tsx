import { Users, Clock, Star, Plus } from 'lucide-react';

const staffData = [
  { id: 1, name: 'Marco Rossi', role: 'Head Chef', shift: 'Morning', rating: 4.9 },
  { id: 2, name: 'Sarah Miller', role: 'Server', shift: 'Evening', rating: 4.8 },
  { id: 3, name: 'James Wilson', role: 'Server', shift: 'Morning', rating: 4.5 },
  { id: 4, name: 'Elena Petrova', role: 'Chef de Partie', shift: 'Evening', rating: 4.7 },
];

export default function Staff() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Staff Management</h1>
          <p className="text-zinc-500 mt-1">Manage shifts, performance, and roles.</p>
        </div>
        <button className="bg-zinc-900 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-lg active:scale-[0.98]">
          <Plus size={18} />
          Add Staff Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {staffData.map((staff) => (
          <div key={staff.id} className="card p-6 flex flex-col items-center text-center group transition-all hover:border-zinc-300">
            <div className="w-20 h-20 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-300 mb-4 group-hover:bg-brand/5 group-hover:text-brand transition-colors">
              <Users size={32} />
            </div>
            <h3 className="font-bold text-zinc-900 text-lg">{staff.name}</h3>
            <p className="text-sm text-brand font-medium">{staff.role}</p>
            
            <div className="mt-6 w-full space-y-3 pt-6 border-t border-zinc-100">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium">
                    <Clock size={14} />
                    Shift
                  </div>
                  <span className="text-xs font-bold text-zinc-900">{staff.shift}</span>
               </div>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium">
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    Rating
                  </div>
                  <span className="text-xs font-bold text-zinc-900">{staff.rating} / 5.0</span>
               </div>
            </div>

            <button className="mt-6 w-full py-2 text-sm font-bold text-zinc-600 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors">
               View Performance
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
