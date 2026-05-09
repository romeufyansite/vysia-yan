import { useEffect, useRef, useState } from 'react';
import { pairingService } from '@/services/pairing.service';
import type { PairingStatusResponse } from '@/types/pairing';

interface UsePairingPollOptions {
  code: string;
  enabled: boolean;
  onAccepted: (data: PairingStatusResponse) => void;
  onExpired: () => void;
  interval?: number;
}

export function usePairingPoll({
  code,
  enabled,
  onAccepted,
  onExpired,
  interval = 2000,
}: UsePairingPollOptions) {
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<number>();

  useEffect(() => {
    if (!enabled || !code) {
      return;
    }

    setIsPolling(true);

    const poll = async () => {
      try {
        const status = await pairingService.checkStatus(code);
        console.log('[Pairing Poll]', { code, status });

        if (status.status === 'accepted') {
          console.log('[Pairing Poll] Status accepted! Stopping poll and calling onAccepted');
          clearInterval(intervalRef.current);
          setIsPolling(false);
          onAccepted(status);
        } else if (status.status === 'expired') {
          console.log('[Pairing Poll] Status expired! Stopping poll');
          clearInterval(intervalRef.current);
          setIsPolling(false);
          onExpired();
        }
      } catch (error) {
        console.error('[Pairing Poll] Error:', error);
      }
    };

    poll();
    intervalRef.current = window.setInterval(poll, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsPolling(false);
    };
  }, [code, enabled, interval, onAccepted, onExpired]);

  return { isPolling };
}
