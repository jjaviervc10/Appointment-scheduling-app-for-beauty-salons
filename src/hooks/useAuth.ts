/**
 * Auth hook - manages current user session and role.
 * TODO: Replace with real Supabase auth when ready.
 */

import { useState, useCallback } from 'react';
import type { UserRole } from '../types/enums';
import type { Profile } from '../types/database';

interface AuthState {
  isAuthenticated: boolean;
  profile: Profile | null;
  role: UserRole;
}

const MOCK_OWNER_PROFILE: Profile = {
  id: 'owner1',
  role: 'owner',
  full_name: 'Jaquelina López',
  phone: '+52 1 555 0000',
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_CLIENT_PROFILE: Profile = {
  id: 'client1',
  role: 'client',
  full_name: 'María García',
  phone: '+52 1 555 1111',
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * For Phase 1 we default to owner role.
 * Toggle role with switchRole() for development.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: true,
    profile: MOCK_OWNER_PROFILE,
    role: 'owner',
  });

  const switchRole = useCallback((role: UserRole) => {
    setState({
      isAuthenticated: true,
      profile: role === 'owner' ? MOCK_OWNER_PROFILE : MOCK_CLIENT_PROFILE,
      role,
    });
  }, []);

  return { ...state, switchRole };
}
