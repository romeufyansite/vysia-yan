import { useEffect, useState, type ReactNode } from 'react';
import {
  Clock,
  Cloud,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  CloudSun,
  Image as ImageIcon,
  QrCode,
  Snowflake,
  Sun,
} from 'lucide-react';
import { weatherService, type WeatherData } from '@/services/weather.service';
import type { Overlay } from '@/types';

function WeatherIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case 'sun':
      return <Sun className={className} />;
    case 'cloud-sun':
      return <CloudSun className={className} />;
    case 'cloud':
      return <Cloud className={className} />;
    case 'cloud-rain':
      return <CloudRain className={className} />;
    case 'cloud-drizzle':
      return <CloudDrizzle className={className} />;
    case 'cloud-lightning':
      return <CloudLightning className={className} />;
    case 'snowflake':
      return <Snowflake className={className} />;
    case 'fog':
      return <Cloud className={className} />;
    default:
      return <CloudSun className={className} />;
  }
}

function QRCodeDisplay({
  content,
  size = 150,
  color = '#000000',
  bgColor = '#ffffff',
}: {
  content: string;
  size?: number;
  color?: string;
  bgColor?: string;
}) {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    if (!content) return;
    const encoded = encodeURIComponent(content);
    setQrUrl(
      `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&color=${color.replace(
        '#',
        '',
      )}&bgcolor=${bgColor.replace('#', '')}`,
    );
  }, [content, size, color, bgColor]);

  if (!content) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-white/10 text-white/50"
        style={{ width: size, height: size }}
      >
        <QrCode className="h-8 w-8" />
      </div>
    );
  }

  return (
    <img
      src={qrUrl}
      alt="QR Code"
      className="rounded-lg"
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

function CountdownDisplay({
  targetDate,
  style = 'expanded',
  showDays = true,
  showHours = true,
  showMinutes = true,
  showSeconds = true,
  label,
}: {
  targetDate?: string;
  style?: 'compact' | 'expanded' | 'boxes';
  showDays?: boolean;
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
  label?: string;
}) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!targetDate) return;

    const target = new Date(targetDate).getTime();
    const calculateTimeLeft = () => {
      const difference = target - Date.now();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    };

    calculateTimeLeft();
    const interval = window.setInterval(calculateTimeLeft, 1000);
    return () => window.clearInterval(interval);
  }, [targetDate]);

  const formatNumber = (n: number) => n.toString().padStart(2, '0');
  const items = [
    showDays && { value: timeLeft.days, label: 'jours' },
    showHours && { value: timeLeft.hours, label: 'heures' },
    showMinutes && { value: timeLeft.minutes, label: 'min' },
    showSeconds && { value: timeLeft.seconds, label: 'sec' },
  ].filter(Boolean) as { value: number; label: string }[];

  if (!targetDate) {
    return <div className="text-sm text-white/70">Compte à rebours</div>;
  }

  return (
    <div className="text-center">
      {label && <div className="mb-2 text-xs text-white/70">{label}</div>}
      {style === 'compact' ? (
        <div className="text-2xl font-bold tabular-nums text-white">
          {items.map((item, index) => (
            <span key={item.label}>
              {formatNumber(item.value)}
              {index < items.length - 1 ? ':' : ''}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {items.map((item) => (
            <div
              key={item.label}
              className={`text-center ${
                style === 'boxes' ? 'min-w-[60px] rounded-lg bg-white/10 px-3 py-2' : ''
              }`}
            >
              <div className={`font-bold tabular-nums text-white ${style === 'boxes' ? 'text-xl' : 'text-lg'}`}>
                {formatNumber(item.value)}
              </div>
              <div className={`text-white/60 ${style === 'boxes' ? 'text-[10px]' : 'text-xs'}`}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Marquee({
  children,
  direction = 'left',
  speed = 'normal',
}: {
  children: ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  speed?: 'slow' | 'normal' | 'fast';
}) {
  const duration = speed === 'slow' ? 30 : speed === 'fast' ? 10 : 20;
  const vertical = direction === 'up' || direction === 'down';

  if (vertical) {
    return (
      <div className="max-h-24 overflow-hidden">
        <div
          className="flex flex-col"
          style={{
            animation: `marquee-y ${duration}s linear infinite`,
            animationDirection: direction === 'down' ? 'reverse' : 'normal',
          }}
        >
          <div className="shrink-0">{children}</div>
          <div className="shrink-0">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden whitespace-nowrap">
      <div
        className="inline-block"
        style={{
          animation: `marquee ${duration}s linear infinite`,
          animationDirection: direction === 'right' ? 'reverse' : 'normal',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function TickerDisplay({
  items = [],
  separator = ' • ',
  speed = 'normal',
}: {
  items: string[];
  separator?: string;
  speed?: 'slow' | 'normal' | 'fast';
}) {
  const duration = speed === 'slow' ? 40 : speed === 'fast' ? 15 : 25;
  const content = items.length > 0 ? items.join(separator) : 'Information importante';

  return (
    <div className="w-full overflow-hidden whitespace-nowrap">
      <div className="inline-block" style={{ animation: `marquee ${duration}s linear infinite` }}>
        <span className="text-sm font-medium text-white">
          {content}
          {separator}
        </span>
        <span className="text-sm font-medium text-white">
          {content}
          {separator}
        </span>
      </div>
    </div>
  );
}

type OverlayFontSize = NonNullable<Overlay['config']>['fontSize'];

function getFontSize(fontSize: OverlayFontSize) {
  switch (fontSize) {
    case 'small':
      return 'text-sm';
    case 'large':
      return 'text-xl';
    default:
      return 'text-base';
  }
}

function getOverlayStyles(config: NonNullable<Overlay['config']>) {
  const bgColor = config.backgroundColor || 'rgba(0,0,0,0.7)';
  const textColor = config.textColor || '#ffffff';

  return {
    backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor,
    color: textColor,
  };
}

export function OverlayContent({ overlay }: { overlay: Overlay }) {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const { config = {} } = overlay;

  useEffect(() => {
    if (overlay.type !== 'clock' && overlay.type !== 'countdown') return;
    const interval = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, [overlay.type]);

  useEffect(() => {
    if (overlay.type !== 'weather' || !config.city) return;

    const fetchWeather = async () => {
      const data = await weatherService.getCurrentWeather(config.city || '');
      setWeather(data);
    };

    void fetchWeather();
    const interval = window.setInterval(fetchWeather, 10 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [overlay.type, config.city]);

  const fontSize = getFontSize(config.fontSize);

  if (overlay.type === 'logo') {
    const logoHeight = config.fontSize === 'small' ? 40 : config.fontSize === 'large' ? 80 : 60;

    const wantsSolid =
      config.logoBackgroundMode === 'solid' ||
      (config.logoBackgroundMode == null &&
        !!config.backgroundColor &&
        config.backgroundColor !== 'transparent');

    const backdropColor = wantsSolid
      ? config.backgroundColor && config.backgroundColor !== 'transparent'
        ? config.backgroundColor
        : '#ffffff'
      : null;

    const inner =
      config.imageUrl ? (
        <img
          src={config.imageUrl}
          alt=""
          className="block max-w-[200px] object-contain"
          style={{ height: logoHeight, width: 'auto' }}
          draggable={false}
        />
      ) : (
        <div className="flex items-center gap-2 border border-dashed border-white/35 bg-transparent px-3 py-2 text-sm text-white/50">
          <ImageIcon className="h-5 w-5 shrink-0 opacity-70" />
          <span>Logo</span>
        </div>
      );

    if (backdropColor) {
      return (
        <div
          className="inline-flex items-center justify-center rounded-xl px-3 py-2 shadow-sm"
          style={{ backgroundColor: backdropColor }}
        >
          {inner}
        </div>
      );
    }

    return inner;
  }

  return (
    <div
      className={`rounded-xl shadow-lg ${config.backgroundColor === 'transparent' ? '' : 'backdrop-blur-md'}`}
      style={getOverlayStyles(config)}
    >
      {overlay.type === 'clock' && (
        <div className={`px-5 py-3 ${fontSize}`}>
          {config.style === 'minimal' ? (
            <div className="font-medium tabular-nums">
              {time.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: config.showSeconds ? '2-digit' : undefined,
              })}
            </div>
          ) : config.style === 'classic' ? (
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 opacity-70" />
              <div>
                <div className="font-medium tabular-nums">
                  {time.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: config.showSeconds ? '2-digit' : undefined,
                  })}
                </div>
                {config.showDate !== false && (
                  <div className="text-xs opacity-70">
                    {time.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div
                className={`font-bold tabular-nums ${
                  config.fontSize === 'small'
                    ? 'text-xl'
                    : config.fontSize === 'large'
                      ? 'text-4xl'
                      : 'text-3xl'
                }`}
              >
                {time.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: config.showSeconds ? '2-digit' : undefined,
                })}
              </div>
              {config.showDate !== false && (
                <div
                  className={`mt-1 opacity-80 ${
                    config.fontSize === 'small'
                      ? 'text-xs'
                      : config.fontSize === 'large'
                        ? 'text-base'
                        : 'text-sm'
                  }`}
                >
                  {time.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {overlay.type === 'weather' && (
        <div className={`px-4 py-3 ${fontSize}`}>
          {weather ? (
            config.style === 'minimal' ? (
              <div className="flex items-center gap-2">
                <WeatherIcon icon={weather.icon} className="h-5 w-5" />
                <span className="font-medium">
                  {weatherService.convertTemperature(weather.temperature, config.unit || 'celsius')}°
                </span>
              </div>
            ) : config.style === 'classic' ? (
              <div className="flex items-center gap-3">
                <WeatherIcon icon={weather.icon} className="h-8 w-8" />
                <div>
                  <div className="font-medium">
                    {weather.city} · {weatherService.convertTemperature(weather.temperature, config.unit || 'celsius')}°
                    {config.unit === 'fahrenheit' ? 'F' : 'C'}
                  </div>
                  <div className="text-xs opacity-70">{weather.condition}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className={weather.isDay ? 'text-yellow-300' : 'text-blue-300'}>
                  <WeatherIcon
                    icon={weather.icon}
                    className={
                      config.fontSize === 'small'
                        ? 'h-8 w-8'
                        : config.fontSize === 'large'
                          ? 'h-14 w-14'
                          : 'h-10 w-10'
                    }
                  />
                </div>
                <div>
                  <div
                    className={`font-bold ${
                      config.fontSize === 'small'
                        ? 'text-xl'
                        : config.fontSize === 'large'
                          ? 'text-4xl'
                          : 'text-3xl'
                    }`}
                  >
                    {weatherService.convertTemperature(weather.temperature, config.unit || 'celsius')}°
                  </div>
                  <div className="flex items-center gap-2 text-xs opacity-80">
                    <span>{weather.city}</span>
                    <span className="opacity-50">•</span>
                    <span>{weather.condition}</span>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 opacity-70">
              <CloudSun className="h-5 w-5" />
              <span>
                {config.city || 'Paris'} · 24°{config.unit === 'fahrenheit' ? 'F' : 'C'}
              </span>
            </div>
          )}
        </div>
      )}

      {overlay.type === 'announcement' && (
        <div className={`max-w-md px-4 py-2 ${fontSize}`}>
          {config.scrollBehavior === 'static' ? (
            <div className="font-medium">{config.text || 'Votre annonce ici'}</div>
          ) : (
            <Marquee direction={config.scrollDirection} speed={config.scrollSpeed}>
              <span className="px-4 font-medium">{config.text || 'Votre annonce ici'}</span>
              <span className="px-4 opacity-50">•</span>
              <span className="px-4 font-medium">{config.text || 'Votre annonce ici'}</span>
              <span className="px-4 opacity-50">•</span>
            </Marquee>
          )}
        </div>
      )}

      {overlay.type === 'qrcode' && (
        <div className="p-3">
          <QRCodeDisplay
            content={config.qrContent || ''}
            size={config.qrSize === 'small' ? 100 : config.qrSize === 'large' ? 200 : 150}
            color={config.qrColor || '#000000'}
            bgColor={config.qrBgColor || '#ffffff'}
          />
        </div>
      )}

      {overlay.type === 'countdown' && (
        <div className="px-4 py-3">
          <CountdownDisplay
            targetDate={config.targetDate}
            style={config.countdownStyle}
            showDays={config.showDays !== false}
            showHours={config.showHours !== false}
            showMinutes={config.showMinutes !== false}
            showSeconds={config.showSeconds_countdown !== false}
            label={config.countdownLabel}
          />
        </div>
      )}

      {overlay.type === 'ticker' && (
        <div className="w-80 px-4 py-2">
          <TickerDisplay
            items={config.tickerItems || []}
            separator={config.tickerSeparator}
            speed={config.scrollSpeed}
          />
        </div>
      )}
    </div>
  );
}
