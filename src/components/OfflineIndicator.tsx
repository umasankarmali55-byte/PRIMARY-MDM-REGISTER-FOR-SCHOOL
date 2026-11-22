import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 text-white px-3.5 py-2 text-xs font-bold shadow-lg border-2 border-amber-300 noprint"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Offline Mode — Changes are saved locally on this device.</span>
    </div>
  );
};
