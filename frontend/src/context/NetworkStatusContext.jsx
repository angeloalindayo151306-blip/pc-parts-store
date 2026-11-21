import { createContext, useContext, useMemo } from 'react';
import useOnlineStatus from '../hooks/useOnlineStatus';

const NetworkStatusContext = createContext({ online: true });

export function NetworkStatusProvider({ children }) {
  const online = useOnlineStatus();
  const value = useMemo(() => ({ online }), [online]);
  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus() {
  return useContext(NetworkStatusContext);
}

// Shared tooltip text for anything disabled while offline.
export const OFFLINE_HINT = 'You are offline. Reconnect to use this.';