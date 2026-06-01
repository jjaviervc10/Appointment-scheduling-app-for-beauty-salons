const SESSION_EXIT_KEY = 'jl-barber-session-exited';

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function markSessionExited() {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.setItem(SESSION_EXIT_KEY, 'true');
  } catch {
    // Storage can be blocked in private modes.
  }
}

export function clearSessionExit() {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.removeItem(SESSION_EXIT_KEY);
  } catch {
    // Storage can be blocked in private modes.
  }
}

export function hasSessionExited() {
  if (!canUseSessionStorage()) return false;

  try {
    return window.sessionStorage.getItem(SESSION_EXIT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function neutralizePrivateHistoryEntry() {
  if (typeof window === 'undefined') return;

  const exitState = {
    ...(window.history.state ?? {}),
    __jlSessionExited: true,
  };

  window.history.replaceState(exitState, '', '/');
  window.history.pushState(exitState, '', '/');
}
