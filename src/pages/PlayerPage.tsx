import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { usePairingPoll } from '@/hooks/use-pairing-poll';
import { pairingService } from '@/services/pairing.service';
import { deviceStorage } from '@/lib/device-storage';

export function PlayerPage() {
  const [code, setCode] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('10:00');
  const initialized = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const initializePairing = async () => {
    setIsLoading(true);
    setIsExpired(false);
    try {
      const response = await pairingService.startPairing();
      setCode(response.code);
      setExpiresAt(response.expiresAt);
      deviceStorage.setDeviceId(response.deviceId);
    } catch (error) {
      console.error('Failed to start pairing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    console.log('[PlayerPage] Checking device connection status...')
    if (deviceStorage.isDeviceConnected()) {
      console.log('[PlayerPage] Device already connected, redirecting to /player/run');
      window.location.hash = '/player/run';
      return;
    }

    console.log('[PlayerPage] Device not connected, initializing pairing...');
    initializePairing();
  }, []);

  usePairingPoll({
    code,
    enabled: !isLoading && !isExpired,
    onAccepted: (data) => {
      if (data.deviceJwt && data.screenId) {
        deviceStorage.setDeviceJwt(data.deviceJwt);
        deviceStorage.setScreenId(data.screenId);
        window.location.hash = '/player/run';
      }
    },
    onExpired: () => {
      setIsExpired(true);
    },
  });

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      if (now > expiresAt) {
        setIsExpired(true);
        setTimeRemaining('00:00');
        return;
      }

      const diff = expiresAt - now;
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.error('Failed to play video:', error);
        setShowVideo(false);
      });
    }
  }, []);

  const handleVideoEnd = () => {
    setShowVideo(false);
  };

  const handleRegenerateCode = () => {
    initializePairing();
  };

  if (showVideo) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          src="https://zaaspdrcjlcriazvwgra.supabase.co/storage/v1/object/public/videos/annimation-logo-vysia.mp4"
          onEnded={handleVideoEnd}
          playsInline
          muted
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 relative"
      style={{
        backgroundImage: 'url(https://zaaspdrcjlcriazvwgra.supabase.co/storage/v1/object/public/media/fond-code.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex flex-col items-center max-w-3xl w-full">
        {isLoading ? (
          <div className="text-white text-xl">Génération du code...</div>
        ) : (
          <>
            <img
              src="https://zaaspdrcjlcriazvwgra.supabase.co/storage/v1/object/public/media/favicon.png"
              alt="TV Icon"
              className="w-32 h-32 mb-8 drop-shadow-2xl"
            />

          <div className="bg-black/40 backdrop-blur-xs rounded-3xl px-20 py-16 mb-8 shadow-2xl">
  <div className="flex justify-center gap-10 text-white text-9xl font-bold">
    {code.split('').map((char, i) => (
      <span key={i}>{char}</span>
    ))}
  </div>
</div>


            {!isExpired ? (
              <>
                <p className="text-white text-xl mb-4 text-center">
                  En attente de validation...
                </p>
                <p className="text-white/80 text-lg">
                  Expire dans {timeRemaining}
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <p className="text-red-400 text-xl text-center">
                  Ce code a expiré
                </p>
                <Button
                  onClick={handleRegenerateCode}
                  className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-6 text-lg rounded-2xl font-semibold"
                >
                  Régénérer un code
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
