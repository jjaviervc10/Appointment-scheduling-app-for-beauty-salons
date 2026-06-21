/**
 * Auth hook — thin wrapper over AuthContext.
 * Kept for backwards compatibility with existing components.
 */

import { useAuthContext } from '../contexts/AuthContext';
import type { UserRole } from '../types/enums';

export function useAuth() {
  const {
    authStatus,
    ownerToken,
    ownerExpiresAt,
    ownerProfile,
    clientToken,
    clientExpiresAt,
    clientProfile,
    ownerLoading,
    clientLoading,
  } = useAuthContext();

  const isOwner = authStatus === 'owner';
  const role: UserRole = isOwner ? 'owner' : 'client';
  // profile shape: expose whatever the current active session has
  const profile = isOwner ? ownerProfile : clientProfile;
  const isAuthenticated = authStatus === 'owner' || authStatus === 'client';

  return {
    authStatus,
    isAuthenticated,
    profile,
    role,
    ownerToken,
    ownerExpiresAt,
    clientToken,
    clientExpiresAt,
    ownerLoading,
    clientLoading,
  };
}

