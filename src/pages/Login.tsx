import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Utensils, LogIn, Github } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (role: 'admin' | 'staff' | 'customer' = 'customer') => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Force role update for the demo so user can switch between roles
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        role: role,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-zinc-50">
      <div className="hidden lg:flex bg-zinc-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Decorative patterns */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand/5 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center text-white shadow-lg shadow-orange-950/50">
            <Utensils size={24} />
          </div>
          <span className="font-bold text-2xl tracking-tight text-white">BistroAI</span>
        </div>

        <div className="relative z-10">
          <h1 className="text-5xl font-bold text-white leading-tight">
            The Future of <br />
            <span className="text-brand">Restaurant</span> <br />
            Intelligence.
          </h1>
          <p className="text-zinc-400 mt-6 max-w-md text-lg leading-relaxed">
            Harness the power of Gemini AI to optimize your menu, satisfy your customers, and forecast your growth.
          </p>
        </div>

        <div className="flex items-center gap-8 relative z-10">
           <div className="flex flex-col">
              <span className="text-white font-bold text-xl">1.2M+</span>
              <span className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mt-1">Orders Processed</span>
           </div>
           <div className="w-px h-8 bg-zinc-800"></div>
           <div className="flex flex-col">
              <span className="text-white font-bold text-xl">99.9%</span>
              <span className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mt-1">Uptime SLA</span>
           </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-bold text-zinc-900">Sign In</h2>
            <p className="text-zinc-500">Access your dashboard or start ordering.</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => handleLogin('admin')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-zinc-200 py-3 rounded-xl font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <LogIn size={20} className="text-brand" />
              Sign in as Admin
            </button>
            <button
              onClick={() => handleLogin('staff')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-zinc-200 py-3 rounded-xl font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <LogIn size={20} className="text-zinc-500" />
              Sign in as Staff
            </button>
            <button
              onClick={() => handleLogin('customer')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-brand text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 active:scale-[0.98] disabled:opacity-50"
            >
              <Utensils size={20} />
              Sign in as Customer
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div className="text-center">
            <p className="text-xs text-zinc-400 font-medium">
              By signing in, you agree to our <br />
              <button className="text-zinc-900 underline underline-offset-4 decoration-zinc-200 ml-1">Terms of Service</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
