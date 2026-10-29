import { useContext } from 'react';
import { AuthContext } from '@/shared/context/AuthContext';

/**
 * Current session: { user, status, isLoading, isAuthenticated, roles, hasRole, hasAnyRole,
 * login, logout, updateUser, refreshUser }
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return context;
}

export default useAuth;
