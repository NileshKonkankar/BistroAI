import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAppStore } from './store/useAppStore';
import { handleFirestoreError, OperationType } from './lib/firestoreErrorHandler';
import RoleGuard from './components/auth/RoleGuard';

// Layout & Components
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Menu from './pages/Menu';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import Staff from './pages/Staff';
import CustomerView from './pages/CustomerView';

export default function App() {
  const { user, setUser, setInitialLoad } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const path = `users/${fbUser.uid}`;
        try {
          // Fetch custom role from Firestore
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          const userData = userDoc.data();
          
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            role: userData?.role || 'customer',
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            role: 'customer',
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      setInitialLoad(false);
    });

    return () => unsub();
  }, [setUser, setInitialLoad]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-500 font-medium animate-pulse">BistroAI is warming up...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
        
        {user ? (
          <Route element={<Layout />}>
            {/* Dashboard / Home */}
            <Route path="/" element={
              user.role === 'customer' ? <CustomerView /> : <Dashboard />
            } />
            
            {/* Staff & Admin Access */}
            <Route element={<RoleGuard allowedRoles={['admin', 'staff']} />}>
              <Route path="/menu" element={<Menu />} />
              <Route path="/orders" element={<Orders />} />
            </Route>

            {/* Admin Only Access */}
            <Route element={<RoleGuard allowedRoles={['admin']} />}>
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/staff" element={<Staff />} />
            </Route>
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}
