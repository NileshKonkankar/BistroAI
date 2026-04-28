import { Package, AlertCircle, Plus, Search } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

const inventoryData = [
  { id: 1, name: 'Truffle Oil', qty: 5, unit: 'Liters', min: 2, status: 'ok' },
  { id: 2, name: 'Arborio Rice', qty: 2, unit: 'kg', min: 10, status: 'low' },
  { id: 3, name: 'Parmesan Cheese', qty: 12, unit: 'kg', min: 5, status: 'ok' },
  { id: 4, name: 'Fresh Basil', qty: 0.5, unit: 'kg', min: 1, status: 'critical' },
];

export default function Inventory() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Inventory</h1>
          <p className="text-zinc-500 mt-1">Track ingredients and supplies in real-time.</p>
        </div>
        <button className="bg-zinc-900 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-zinc-800 transition-all">
          <Plus size={18} />
          Restock Order
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 bg-red-50 border-red-100">
           <div className="flex items-center gap-3 text-red-600 mb-2">
              <AlertCircle size={20} />
              <span className="font-bold uppercase tracking-wider text-xs">Action Required</span>
           </div>
           <p className="text-2xl font-bold text-red-900">2 Items Critical</p>
           <p className="text-sm text-red-700/70">Restock recommended immediately.</p>
        </div>
        <div className="card p-6">
           <p className="text-zinc-500 text-sm font-medium">Pending Orders</p>
           <p className="text-2xl font-bold text-zinc-900">3</p>
        </div>
        <div className="card p-6">
           <p className="text-zinc-500 text-sm font-medium">Monthly Spend</p>
           <p className="text-2xl font-bold text-zinc-900">$4,250</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Item</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Stock</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Unit</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Status</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {inventoryData.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-zinc-900">{item.name}</td>
                <td className="px-6 py-4 text-sm text-zinc-600">{item.qty}</td>
                <td className="px-6 py-4 text-sm text-zinc-600">{item.unit}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                    item.status === 'ok' ? 'bg-emerald-50 text-emerald-600' :
                    item.status === 'low' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                   <button className="text-xs font-bold text-brand hover:underline">Manage</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
