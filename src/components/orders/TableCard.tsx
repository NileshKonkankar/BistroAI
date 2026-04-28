import { Users2 } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { motion } from 'motion/react';

interface TableCardProps {
  key?: string | number;
  table: any;
  currentOrder?: any;
  statusConfig: any;
  onClear: (id: string) => void;
  onSetStatus: (id: string, status: 'available' | 'reserved') => void;
}

export default function TableCard({ 
  table, 
  currentOrder, 
  statusConfig, 
  onClear, 
  onSetStatus 
}: TableCardProps) {
  const StatusIcon = statusConfig.icon;
  const isOccupied = table.status === 'occupied';
  const isReserved = table.status === 'reserved';
  const isAvailable = table.status === 'available';

  return (
    <motion.div 
      layout
      className={cn(
        "group relative p-6 bg-white border border-zinc-200 rounded-[2rem] flex flex-col items-center justify-center text-center space-y-4 transition-all duration-300 shadow-sm",
        isOccupied && "border-orange-200 bg-orange-50/10 shadow-orange-100/20",
        isReserved && "border-blue-200 bg-blue-50/10 shadow-blue-100/20",
        isAvailable && "hover:border-emerald-300 hover:shadow-md hover:-translate-y-1"
      )}
    >
      {/* Dynamic Status Indicator Dot */}
      {!isAvailable && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
           <span className="flex h-2 w-2 relative">
             <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", statusConfig.accent)}></span>
             <span className={cn("relative inline-flex rounded-full h-2 w-2", statusConfig.accent)}></span>
           </span>
           <span className={cn("text-[10px] font-black uppercase tracking-tighter", statusConfig.accent.replace('bg-', 'text-'))}>
             {statusConfig.label}
           </span>
        </div>
      )}

      {/* Main Visual Icon Container */}
      <div className={cn(
        "w-20 h-20 rounded-[1.75rem] flex items-center justify-center shadow-sm border transition-all duration-500 scale-100 group-hover:scale-110",
        statusConfig.iconContainer
      )}>
        <StatusIcon size={36} strokeWidth={1.5} />
      </div>
      
      {/* Table Identity */}
      <div className="space-y-1">
        <h3 className="text-2xl font-black text-zinc-900 tracking-tight">{table.number}</h3>
        <div className="flex items-center justify-center gap-1.5 text-zinc-400">
          <Users2 size={14} className="opacity-50" />
          <span className="text-[10px] font-bold uppercase tracking-widest">{table.capacity} Seats</span>
        </div>
      </div>

      {/* Dynamic Content / Actions */}
      <div className="w-full pt-1">
        {isOccupied ? (
          <div className="space-y-4">
            {currentOrder && (
              <div className="text-left bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-orange-100 shadow-sm transform transition-all group-hover:scale-[1.02]">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-black text-orange-600 uppercase">Active Ticket</p>
                  <p className="text-[10px] text-zinc-400 font-bold">#{currentOrder.id.slice(-4).toUpperCase()}</p>
                </div>
                <p className="text-xs font-bold text-zinc-900 line-clamp-1">
                  {currentOrder.items.map((i: any) => i.name).join(', ')}
                </p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-orange-50">
                  <p className="text-[10px] font-black text-zinc-400 uppercase">{currentOrder.status}</p>
                  <p className="text-xs font-bold text-orange-600">{formatCurrency(currentOrder.totalAmount)}</p>
                </div>
              </div>
            )}
            <button 
              onClick={() => onClear(table.id)}
              className="w-full py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 border border-transparent rounded-xl transition-all"
            >
              Release Table
            </button>
          </div>
        ) : isReserved ? (
          <div className="space-y-3">
             <div className="p-3 bg-blue-50/50 rounded-2xl border border-dashed border-blue-200">
                <p className="text-[10px] font-bold text-blue-600 uppercase">Reserved</p>
                <p className="text-[9px] text-blue-400 font-medium">Reservation active</p>
             </div>
             <button 
                onClick={() => onSetStatus(table.id, 'available')}
                className="w-full py-3 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 border border-transparent rounded-xl transition-all"
              >
                Cancel
              </button>
          </div>
        ) : (
          <button 
            onClick={() => onSetStatus(table.id, 'reserved')}
            className="w-full py-4 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-blue-600 hover:bg-blue-50/50 hover:border-blue-100 border border-transparent rounded-xl transition-all"
          >
            Mark Reserved
          </button>
        )}
      </div>

      {/* Decorative Floor indicator */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-zinc-100 rounded-full opacity-50" />
    </motion.div>
  );
}
