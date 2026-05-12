import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare, Mic, SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  companyDescriptionAiService,
  type DescriptionStep1Message,
  type DescriptionStep1TurnResult,
} from '@/services/company-description-ai.service';
import {
  clearCompanyDescStep1Chat,
  loadCompanyDescStep1Bundle,
  saveCompanyDescStep1Bundle,
} from '@/lib/company-desc-step1-chat-storage';
import { extractWebsiteUrlFromText, normalizeWebsiteUrl } from '@/lib/normalize-website-url';
import { joinSpeechSegment, useWebSpeechDictation } from '@/hooks/use-web-speech-dictation';
import { cn } from '@/lib/utils';

export type PrefillFromWebsiteChatOutcome =
  | { status: 'applied' }
  | { status: 'needs_more_questions'; assistantMessage: string; siteContextForAi: string };

interface DescriptionStep1ChatProps {
  orgId: string;
  existingWebsite: string | null;
  onBusyChange: (busy: boolean) => void;
  onPersistWebsiteUrl?: (normalizedUrl: string) => Promise<void>;
  onConversationDraft: (draft: string) => void;
  onPrefillFromWebsite: (normalizedUrl: string) => Promise<PrefillFromWebsiteChatOutcome>;
}

/** Réponses « pas de site » avant le dernier message utilisateur courant. */
function userDeclinedWebsiteEarlier(historyUpToBeforeLastUser: DescriptionStep1Message[]): boolean {
  for (const m of historyUpToBeforeLastUser) {
    if (m.role !== 'user') continue;
    const t = m.content.trim();
    if (/^(non|nan|no)\b/i.test(t) && t.length <= 120) return true;
    if (
      /pas de site\b|sans site\b|aucun site\b|pas de site web\b|je n['']ai pas de site\b/i.test(t)
    ) {
      return true;
    }
  }
  return false;
}

function shouldPersistWebsiteAfterContinue(history: DescriptionStep1Message[]): boolean {
  let lastUserIdx = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'user') {
      lastUserIdx = i;
      break;
    }
  }
  if (lastUserIdx === -1) return false;
  const prior = history.slice(0, lastUserIdx);
  const lastUser = history[lastUserIdx];
  const t = lastUser.content.trim();

  if (/^(non|nan|no)\b/i.test(t)) return false;
  if (/pas de site|sans site|je n['']ai pas de site|aucun site|pas de site web/i.test(t)) {
    return false;
  }

  const extracted = extractWebsiteUrlFromText(t);
  if (!extracted) return false;

  const hasScheme = /https?:\/\//i.test(t);
  const declinedBefore = userDeclinedWebsiteEarlier(prior);

  if (!hasScheme && t.length > 96) return false;
  if (declinedBefore && !hasScheme) return false;
  if (declinedBefore && hasScheme && t.length > 280) return false;

  return true;
}

export function DescriptionStep1Chat({
  orgId,
  existingWebsite,
  onBusyChange,
  onPersistWebsiteUrl,
  onConversationDraft,
  onPrefillFromWebsite,
}: DescriptionStep1ChatProps) {
  const [messages, setMessagesState] = useState<DescriptionStep1Message[]>(() =>
    loadCompanyDescStep1Bundle(orgId).messages,
  );
  const messagesRef = useRef<DescriptionStep1Message[]>(messages);
  const setMessages = useCallback((next: DescriptionStep1Message[]) => {
    messagesRef.current = next;
    setMessagesState(next);
  }, []);
  const appendMessage = useCallback(
    (message: DescriptionStep1Message) => {
      setMessages([...messagesRef.current, message]);
    },
    [setMessages],
  );
  const [websiteFollowupSiteContext, setWebsiteFollowupSiteContext] = useState<string | null>(
    () => loadCompanyDescStep1Bundle(orgId).websiteFollowupSiteContext,
  );
  const websiteFollowupSiteContextRef = useRef<string | null>(
    loadCompanyDescStep1Bundle(orgId).websiteFollowupSiteContext,
  );

  const setWebsiteFollowUpCtx = useCallback((next: string | null) => {
    websiteFollowupSiteContextRef.current = next;
    setWebsiteFollowupSiteContext(next);
  }, []);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bootstrappingRef = useRef(false);
  const [storageReady, setStorageReady] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const existingPropRef = useRef(existingWebsite);
  existingPropRef.current = existingWebsite;

  const appendFinalTranscript = useCallback((segment: string) => {
    setInput((prev) => joinSpeechSegment(prev, segment));
  }, []);

  const speech = useWebSpeechDictation({
    appendFinalTranscript,
    onError: (m) => toast.error(m),
  });

  const abortSpeechListening = speech.abortListening;

  const handleClearConversation = useCallback(() => {
    if (loading) return;
    abortSpeechListening();
    setInput('');
    setBootError(null);
    setWebsiteFollowUpCtx(null);
    clearCompanyDescStep1Chat(orgId);
    setMessages([]);
  }, [abortSpeechListening, loading, orgId, setWebsiteFollowUpCtx]);

  const textareaValue =
    speech.listening && speech.interimTranscript
      ? joinSpeechSegment(input, speech.interimTranscript)
      : input;

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    setStorageReady(false);
    const b = loadCompanyDescStep1Bundle(orgId);
    setMessages(b.messages);
    setWebsiteFollowUpCtx(b.websiteFollowupSiteContext);
    setBootError(null);
    setStorageReady(true);
  }, [orgId, setMessages, setWebsiteFollowUpCtx]);

  useEffect(() => {
    if (!storageReady) return;
    saveCompanyDescStep1Bundle(orgId, {
      messages,
      websiteFollowupSiteContext,
    });
  }, [orgId, messages, storageReady, websiteFollowupSiteContext]);

  const applyTurnResult = useCallback(
    async (history: DescriptionStep1Message[], result: DescriptionStep1TurnResult) => {
      if (result.step1_phase === 'continue') {
        appendMessage({ role: 'assistant', content: result.message_for_user });
        const hadSiteOnFile = !!existingPropRef.current?.trim();
        if (
          !hadSiteOnFile &&
          onPersistWebsiteUrl &&
          shouldPersistWebsiteAfterContinue(history)
        ) {
          const lastUser = [...history].reverse().find((m) => m.role === 'user');
          if (lastUser) {
            const extracted = extractWebsiteUrlFromText(lastUser.content);
            if (extracted) {
              try {
                await onPersistWebsiteUrl(extracted);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Site non enregistré');
              }
            }
          }
        }
        return;
      }

      if (result.step1_phase === 'announce_then_complete') {
        setWebsiteFollowUpCtx(null);
        appendMessage({ role: 'assistant', content: result.message_for_user });
        onConversationDraft(result.draft_description);
        toast.success('Description proposée');
        return;
      }

      if (result.step1_phase === 'done') {
        setWebsiteFollowUpCtx(null);
        appendMessage({
          role: 'assistant',
          content: 'J’ai synthétisé vos réponses — la proposition apparaît dans le champ sous le chat.',
        });
        onConversationDraft(result.draft_description);
        toast.success('Description proposée');
        return;
      }

      const normalized = normalizeWebsiteUrl(result.website_url);
      if (!normalized) {
        toast.error('URL invalide — précisez une adresse du type https://…');
        appendMessage({
          role: 'assistant',
          content: 'Je n’ai pas pu valider l’URL du site. Pouvez-vous la donner au format https://exemple.fr ?',
        });
        return;
      }
      try {
        const prefillOutcome = await onPrefillFromWebsite(normalized);
        if (prefillOutcome.status === 'applied') {
          appendMessage({
            role: 'assistant',
            content:
              'J’ai généré une proposition à partir du site — vous pouvez l’éditer dans le champ sous le chat.',
          });
          toast.success('Texte généré depuis le site');
        } else {
          setWebsiteFollowUpCtx(prefillOutcome.siteContextForAi);
          appendMessage({ role: 'assistant', content: prefillOutcome.assistantMessage });
          toast.message(
            'Le site ne suffit pas pour tout automatiser — répondez aux questions pour compléter.',
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Génération impossible';
        toast.error(msg);
        appendMessage({
          role: 'assistant',
          content:
            'La génération depuis le site a échoué. On peut réessayer ou passer aux questions pour rédiger sans le site.',
        });
      }
    },
    [appendMessage, onConversationDraft, onPersistWebsiteUrl, onPrefillFromWebsite, setWebsiteFollowUpCtx],
  );

  const applyTurnResultRef = useRef(applyTurnResult);
  applyTurnResultRef.current = applyTurnResult;
  const onBusyChangeRef = useRef(onBusyChange);
  onBusyChangeRef.current = onBusyChange;

  const runTurn = useCallback(
    async (history: DescriptionStep1Message[]) => {
      setLoading(true);
      onBusyChange(true);
      setBootError(null);
      try {
        const existing = existingPropRef.current?.trim() || null;
        const ctx = websiteFollowupSiteContextRef.current?.trim() || null;
        const result = await companyDescriptionAiService.descriptionStep1Turn(
          orgId,
          history,
          existing,
          ctx,
        );
        await applyTurnResult(history, result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Échec de la conversation';
        setBootError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
        onBusyChange(false);
      }
    },
    [orgId, onBusyChange, applyTurnResult],
  );

  useEffect(() => {
    if (!storageReady || messagesRef.current.length > 0 || bootstrappingRef.current) return;
    let cancelled = false;
    bootstrappingRef.current = true;
    void (async () => {
      setLoading(true);
      onBusyChangeRef.current(true);
      setBootError(null);
      try {
        const existing = existingPropRef.current?.trim() || null;
        const ctx = websiteFollowupSiteContextRef.current?.trim() || null;
        const result = await companyDescriptionAiService.descriptionStep1Turn(orgId, [], existing, ctx);
        if (cancelled) return;
        await applyTurnResultRef.current([], result);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Impossible de démarrer';
        setBootError(msg);
        toast.error(msg);
      } finally {
        /** Toujours libérer le chargement : sinon Strict Mode / cleanup laisse « Réflexion… » bloqué si la requête finit après annulation. */
        setLoading(false);
        onBusyChangeRef.current(false);
        bootstrappingRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, messages.length, storageReady]);

  const flushInputForSend = (): string => {
    const merged =
      speech.listening && speech.interimTranscript
        ? joinSpeechSegment(input, speech.interimTranscript).trim()
        : input.trim();
    speech.abortListening();
    return merged;
  };

  const sendUserMessage = async () => {
    const trimmed = flushInputForSend();
    setInput('');
    if (!trimmed || loading) return;

    const nextHistory: DescriptionStep1Message[] = [
      ...messagesRef.current,
      { role: 'user', content: trimmed },
    ];
    setMessages(nextHistory);
    await runTurn(nextHistory);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendUserMessage();
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/40">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-800">
          <MessageSquare className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <span className="truncate">Assistant — étape 1</span>
        </div>
        <button
          type="button"
          onClick={handleClearConversation}
          disabled={loading}
          className="shrink-0 text-xs font-normal text-slate-500 underline decoration-slate-400/70 underline-offset-[3px] hover:text-slate-800 disabled:pointer-events-none disabled:opacity-40"
        >
          Effacer la conversation
        </button>
      </div>

      <ScrollArea className="h-[min(52vh,380px)] bg-white">
        <div className="space-y-4 px-4 py-4">
          {bootError && messages.length === 0 ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{bootError}</p>
          ) : null}

          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={cn('flex', m.role === 'assistant' ? 'justify-start' : 'justify-end')}
            >
              <div
                className={cn(
                  'max-w-[92%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm sm:max-w-[85%]',
                  m.role === 'assistant'
                    ? 'border border-slate-100 bg-white text-slate-800'
                    : 'bg-slate-900 text-white',
                )}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Réflexion…
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-slate-200/80 bg-white p-3">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Textarea
              value={textareaValue}
              onChange={(e) => {
                speech.abortListening();
                setInput(e.target.value);
              }}
              placeholder="Votre réponse…"
              disabled={loading}
              readOnly={speech.listening}
              rows={2}
              aria-label="Votre réponse"
              className={cn(
                'min-h-[44px] flex-1 resize-none rounded-xl border-slate-200 text-[15px]',
                speech.listening && 'border-violet-300 bg-violet-50/40',
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendUserMessage();
                }
              }}
            />
            {speech.supported ? (
              <Button
                type="button"
                variant={speech.listening ? 'default' : 'outline'}
                size="icon"
                disabled={loading}
                onClick={() => speech.toggleListening()}
                className={cn(
                  'h-11 w-11 shrink-0 rounded-xl',
                  speech.listening && 'bg-violet-600 text-white hover:bg-violet-700',
                )}
                aria-pressed={speech.listening}
                title={
                  speech.listening
                    ? 'Arrêter la dictée vocale'
                    : 'Dictée vocale (micro) — Chrome ou Safari recommandés pour une meilleure précision'
                }
              >
                <Mic className={cn('h-4 w-4', speech.listening && 'animate-pulse')} aria-hidden />
                <span className="sr-only">
                  {speech.listening ? 'Arrêter la dictée vocale' : 'Activer la dictée vocale'}
                </span>
              </Button>
            ) : null}
            <Button
              type="submit"
              size="icon"
              disabled={loading || !textareaValue.trim()}
              className="h-11 w-11 shrink-0 rounded-xl"
              aria-label="Envoyer"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
          {speech.listening ? (
            <p className="text-[11px] leading-snug text-slate-700 pl-4">
              Dictée active... Parler naturellement pour ajouter du texte.
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
