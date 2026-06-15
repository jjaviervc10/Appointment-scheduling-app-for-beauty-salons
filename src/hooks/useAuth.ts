/**
 * Auth hook — thin wrapper over AuthContext.
 * Kept for backwards compatibility with existing components.
 */

import { useAuthContext } from '../contexts/AuthContext';
import type { UserRole } from '../types/enums';

export function useAuth() {
  const {
    ownerToken,
    ownerProfile,
    clientToken,
    clientProfile,
    ownerLoading,
    clientLoading,
  } = useAuthContext();

  const isOwner = Boolean(ownerToken);
  const role: UserRole = isOwner ? 'owner' : 'client';
  // profile shape: expose whatever the current active session has
  const profile = isOwner ? ownerProfile : clientProfile;
  const isAuthenticated = Boolean(ownerToken) || Boolean(clientToken);

  return {
    isAuthenticated,
    profile,
    role,
    ownerToken,
    clientToken,
    ownerLoading,
    clientLoading,
  };
}

