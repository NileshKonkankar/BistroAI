import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';

interface RoleGuardProps {
  allowedRoles: ('admin' | 'staff' | 'customer')[];
  redirectTo?: string;
}

export default function RoleGuard({ allowedRoles, redirectTo = "/" }: RoleGuardProps) {
  const { user } = useAppStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role as any)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
