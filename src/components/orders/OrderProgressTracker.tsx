import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { 
  ClipboardCheck, 
  ChefHat, 
  Sparkles,
  CheckCircle,
  Clock
} from 'lucide-react';

interface OrderProgressTrackerProps {
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  className?: string;
}

export default function OrderProgressTracker({ status, className }: OrderProgressTrackerProps) {
  // Map internal database status to step indices:
  // Step 0: Received (pending)
  // Step 1: Preparing (preparing)
  // Step 2: Ready (ready)
  
  const getActiveStep = () => {
    switch (status) {
      case 'pending': return 0;
      case 'preparing': return 1;
      case 'ready': return 2;
      case 'delivered': return 3; // Finished active prep
      default: return 0;
    }
  };

  const activeStep = getActiveStep();

  // If order is cancelled or delivered, we handle them carefully,
  // but for active track, Received -> Preparing -> Ready is the main focus.
  const steps = [
    {
      id: 'received',
      label: 'Received',
      description: 'Kitchen has accepted',
      icon: ClipboardCheck,
      colorClass: 'text-amber-500 bg-amber-50 border-amber-200',
      activeColorClass: 'text-amber-600 bg-amber-100 border-amber-400 ring-amber-300',
    },
    {
      id: 'preparing',
      label: 'Preparing',
      description: 'Chefs are cooking',
      icon: ChefHat,
      colorClass: 'text-blue-500 bg-blue-50 border-blue-200',
      activeColorClass: 'text-blue-600 bg-blue-100 border-blue-400 ring-blue-300',
    },
    {
      id: 'ready',
      label: 'Ready',
      description: 'At the pickup counter',
      icon: Sparkles,
      colorClass: 'text-emerald-500 bg-emerald-50 border-emerald-200',
      activeColorClass: 'text-emerald-600 bg-emerald-100 border-emerald-400 ring-emerald-300',
    }
  ];

  if (status === 'cancelled') {
    return (
      <div className={cn("p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700", className)}>
        <Clock size={16} className="animate-pulse" />
        <div className="text-left">
          <p className="text-xs font-black uppercase tracking-wider">Order Cancelled</p>
          <p className="text-[10px] text-red-500 font-medium">This order has been voided by the staff.</p>
        </div>
      </div>
    );
  }

  // Calculate percentage progress for the bridging lines
  // Step 0 -> 0%
  // Step 1 -> 50%
  // Step 2 -> 100%
  let linePercent = 0;
  if (activeStep === 1) linePercent = 50;
  if (activeStep >= 2) linePercent = 100;

  return (
    <div className={cn("w-full py-2 select-none", className)}>
      <div className="relative flex justify-between items-center w-full">
        {/* Background Track Line */}
        <div className="absolute top-5 left-8 right-8 h-[3px] bg-zinc-100 rounded-full -translate-y-1/2 z-0" />
        
        {/* Filled Track Line with smooth CSS transition */}
        <div 
          className="absolute top-5 left-8 right-8 h-[3px] bg-zinc-100 rounded-full -translate-y-1/2 z-0 overflow-hidden"
        >
          <div 
            className="h-full bg-zinc-900 transition-all duration-1000 ease-out" 
            style={{ width: `${linePercent}%` }}
          />
        </div>

        {/* Steps Nodes */}
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = index < activeStep;
          const isActive = index === activeStep;
          const isPending = index > activeStep;

          return (
            <div key={step.id} className="flex flex-col items-center flex-1 relative z-10">
              {/* Node dot with step icon */}
              <div className="relative group">
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 bg-white",
                    isCompleted && "bg-zinc-900 border-zinc-900 text-white shadow-sm",
                    isActive && cn("shadow-md ring-4 animate-in zoom-in-75", step.activeColorClass),
                    isPending && "border-zinc-200 text-zinc-300"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle size={15} className="stroke-[2.5]" />
                  ) : (
                    <StepIcon size={15} className={cn("transition-colors duration-500", !isActive && "stroke-[2]")} />
                  )}
                </div>

                {/* Ring pulsing decoration for active index */}
                {isActive && (
                  <span className="absolute -inset-1 rounded-full border-1 border-current animate-ping opacity-25" />
                )}
              </div>

              {/* Step label description */}
              <div className="text-center mt-2.5 max-w-[120px]">
                <p 
                  className={cn(
                    "text-[10px] font-black uppercase tracking-wider transition-all duration-300",
                    isCompleted && "text-zinc-650",
                    isActive && "text-zinc-900",
                    isPending && "text-zinc-400"
                  )}
                >
                  {step.label}
                </p>
                <p 
                  className={cn(
                    "text-[8.5px] font-medium leading-tight mt-0.5 transition-all duration-300 hidden sm:block",
                    isActive ? "text-zinc-500 font-bold" : "text-zinc-400"
                  )}
                >
                  {isActive ? step.description : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
