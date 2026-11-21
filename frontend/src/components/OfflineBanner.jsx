import { useNetworkStatus } from '../context/NetworkStatusContext';
import './OfflineBanner.css';

export default function OfflineBanner() {
  const { online } = useNetworkStatus();
  if (online) return null;

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <span aria-hidden="true">📡</span>
      <span>
        You're offline. Showing saved items. Checkout, payment, AI and login are
        paused.
      </span>
    </div>
  );
}