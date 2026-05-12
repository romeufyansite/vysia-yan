import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Assemblage prudent du texte dicté : évite les espaces superflus avant ponctuation.
 */
export function joinSpeechSegment(base: string, segment: string): string {
  const s = segment.replace(/\s+/g, ' ').trim();
  if (!s) return base;
  const b = base.replace(/\s+$/u, '');
  if (!b) return s;
  const segmentStartsWithPunct = /^[.,;:!?…/%\-—]/u.test(s);
  const baseEndsWithBoundary = /[\s.:!?…\-—]$/u.test(b);
  if (segmentStartsWithPunct || baseEndsWithBoundary) return `${b}${s}`;
  return `${b} ${s}`;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: { transcript: string };
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/** Peu de reprises : chaque relance refait un handshake réseau vers les serveurs du navigateur. */
const NETWORK_RETRY_MAX = 2;
const NETWORK_RETRY_DELAYS_MS = [900, 1800] as const;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window &
    typeof globalThis & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isBrowserSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export interface UseWebSpeechDictationOptions {
  /** Ex. fr-FR — défaut : langue du navigateur ou fr-FR */
  locale?: string;
  /** Chaque segment final renvoyé par le moteur */
  appendFinalTranscript: (segment: string) => void;
  onError?: (message: string) => void;
}

export interface UseWebSpeechDictationResult {
  supported: boolean;
  listening: boolean;
  interimTranscript: string;
  toggleListening: () => void;
  abortListening: () => void;
}

/**
 * Dictée via Web Speech API (audio traité par les serveurs du navigateur — Chrome/Google, Safari/Apple).
 * Session **continue** : la parole est captée dans un flux unique ; évite les coupures avant le premier résultat.
 */
export function useWebSpeechDictation(
  options: UseWebSpeechDictationOptions,
): UseWebSpeechDictationResult {
  const { locale, appendFinalTranscript, onError } = options;

  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = useRef(false);
  const networkRetryCountRef = useRef(0);
  const pendingRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const appendFinalTranscriptRef = useRef(appendFinalTranscript);
  appendFinalTranscriptRef.current = appendFinalTranscript;

  const supported = typeof window !== 'undefined' && getSpeechRecognitionCtor() !== null;

  const clearRetryTimer = useCallback(() => {
    if (pendingRetryTimerRef.current !== null) {
      clearTimeout(pendingRetryTimerRef.current);
      pendingRetryTimerRef.current = null;
    }
  }, []);

  const detachRecognitionHandlers = useCallback((r: SpeechRecognitionLike) => {
    r.onresult = null;
    r.onerror = null;
    r.onend = null;
  }, []);

  const tearDownRecognition = useCallback(() => {
    clearRetryTimer();
    const r = recognitionRef.current;
    recognitionRef.current = null;
    if (!r) return;
    detachRecognitionHandlers(r);
    try {
      r.stop();
    } catch {
      try {
        r.abort();
      } catch {
        /* ignore */
      }
    }
  }, [clearRetryTimer, detachRecognitionHandlers]);

  const abortListening = useCallback(() => {
    clearRetryTimer();
    networkRetryCountRef.current = 0;
    listeningRef.current = false;
    setListening(false);
    setInterimTranscript('');
    tearDownRecognition();
  }, [clearRetryTimer, tearDownRecognition]);

  const scheduleNetworkRetry = useCallback(
    (openSession: () => void) => {
      if (networkRetryCountRef.current >= NETWORK_RETRY_MAX) {
        networkRetryCountRef.current = 0;
        onError?.(
          'Impossible de joindre le service de reconnaissance vocale du navigateur après plusieurs essais. ' +
            'Souvent lié à un pare-feu, un VPN, un réseau d’entreprise ou un blocage des domaines utilisés par Chrome/Safari pour la dictée. ' +
            'Essayez hors VPN, un autre réseau (partage de connexion), ou un navigateur à jour (Chrome ou Edge).',
        );
        abortListening();
        return;
      }
      const delay =
        NETWORK_RETRY_DELAYS_MS[
          Math.min(networkRetryCountRef.current, NETWORK_RETRY_DELAYS_MS.length - 1)
        ];
      networkRetryCountRef.current += 1;
      pendingRetryTimerRef.current = setTimeout(() => {
        pendingRetryTimerRef.current = null;
        if (!listeningRef.current) return;
        openSession();
      }, delay);
    },
    [abortListening, onError],
  );

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      onError?.('La dictée vocale n’est pas disponible dans ce navigateur.');
      return;
    }

    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      onError?.(
        'La dictée vocale nécessite une page servie en HTTPS (ou localhost). Ouvrez le site en sécurisé.',
      );
      return;
    }

    clearRetryTimer();
    tearDownRecognition();

    listeningRef.current = true;
    setListening(true);
    setInterimTranscript('');
    networkRetryCountRef.current = 0;

    const lang = (
      locale?.trim() ||
      (typeof navigator !== 'undefined' ? navigator.language : '') ||
      'fr-FR'
    ).trim();

    const openSession = () => {
      if (!listeningRef.current) return;

      const prev = recognitionRef.current;
      if (prev) {
        detachRecognitionHandlers(prev);
        try {
          prev.stop();
        } catch {
          try {
            prev.abort();
          } catch {
            /* ignore */
          }
        }
        recognitionRef.current = null;
      }

      const recognition = new Ctor();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = lang;

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        networkRetryCountRef.current = 0;
        let interimDisplay = '';
        for (let i = 0; i < event.results.length; i++) {
          const row = event.results[i];
          if (!row.isFinal) {
            interimDisplay += (row[0]?.transcript ?? '').replace(/\s+/g, ' ');
          }
        }
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const row = event.results[i];
          const piece = (row[0]?.transcript ?? '').replace(/\s+/g, ' ');
          if (row.isFinal && piece.trim()) {
            appendFinalTranscriptRef.current(piece.trim());
          }
        }
        setInterimTranscript(interimDisplay.replace(/\s+/g, ' ').trimStart());
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        const code = event.error;
        if (code === 'aborted') return;

        /** Silence détecté : ne pas confondre avec une panne réseau ; la session peut continuer ou se fermer. */
        if (code === 'no-speech') {
          return;
        }

        if (code === 'network') {
          tearDownRecognition();
          scheduleNetworkRetry(openSession);
          return;
        }

        networkRetryCountRef.current = 0;
        const friendly: Record<string, string> = {
          'not-allowed':
            'Microphone refusé. Autorisez l’accès au micro dans les réglages du navigateur pour ce site.',
          'audio-capture': 'Aucun microphone détecté ou microphone occupé.',
          'service-not-allowed':
            'Le navigateur n’autorise pas le service de reconnaissance vocale sur cette origine.',
        };
        onError?.(friendly[code] ?? `Dictée interrompue (${code}).`);
        abortListening();
      };

      /**
       * Fin de session côté moteur (sans clic arrêt). On désactive le micro dans l’UI pour éviter un état « actif » mort.
       * Si tearDown a déjà déréférencé cette instance, on ignore (arrêt utilisateur ou retry réseau).
       */
      recognition.onend = () => {
        setInterimTranscript('');
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;
        listeningRef.current = false;
        setListening(false);
      };

      try {
        recognition.start();
      } catch {
        scheduleNetworkRetry(openSession);
      }
    };

    openSession();
  }, [
    abortListening,
    clearRetryTimer,
    detachRecognitionHandlers,
    locale,
    onError,
    scheduleNetworkRetry,
    tearDownRecognition,
  ]);

  const toggleListening = useCallback(() => {
    if (listeningRef.current) {
      abortListening();
      return;
    }
    startListening();
  }, [abortListening, startListening]);

  useEffect(
    () => () => {
      clearRetryTimer();
      tearDownRecognition();
    },
    [clearRetryTimer, tearDownRecognition],
  );

  return {
    supported,
    listening,
    interimTranscript,
    toggleListening,
    abortListening,
  };
}
