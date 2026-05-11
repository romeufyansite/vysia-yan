import { useEffect, useRef } from 'react';
import { Sparkles, LayoutGrid, AppWindow, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type PlaylistAddMethod = 'ai' | 'catalog' | 'apps';

interface AddPlaylistItemMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMethod: (method: PlaylistAddMethod) => void;
}

const methods: Array<{
  id: PlaylistAddMethod;
  title: string;
  tag: string;
  icon: typeof Sparkles;
  glow: string;
  pulse: string;
  iconBg: string;
  shimmer: string;
  soon?: boolean;
}> = [
  {
    id: 'ai',
    title: 'IA',
    tag: 'Obtenez un contenu unique et professionnel',
    icon: Sparkles,
    glow: 'bg-gradient-to-br from-violet-500/20 via-fuchsia-500/15 to-amber-400/10',
    pulse: 'bg-gradient-to-br from-violet-500/50 via-fuchsia-500/40 to-orange-400/30',
    iconBg:
      'bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 shadow-[0_14px_44px_-14px_rgba(168,85,247,0.55)]',
    shimmer: 'from-violet-400/50 via-transparent to-fuchsia-400/35',
    soon: true,
  },
  {
    id: 'catalog',
    title: 'Catalogue',
    tag: 'Des modèles époustouflants prêts à être configurés',
    icon: LayoutGrid,
    glow: 'bg-gradient-to-br from-sky-500/18 via-blue-600/14 to-indigo-600/10',
    pulse: 'bg-gradient-to-br from-sky-500/45 via-blue-600/38 to-indigo-600/28',
    iconBg:
      'bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 shadow-[0_14px_44px_-14px_rgba(37,99,235,0.5)]',
    shimmer: 'from-sky-400/45 via-transparent to-indigo-400/35',
    soon: true,
  },
  {
    id: 'apps',
    title: 'Applications',
    tag: 'Intégrer des applications tierce à votre playlist',
    icon: AppWindow,
    glow: 'bg-gradient-to-br from-emerald-500/18 via-teal-500/14 to-cyan-500/10',
    pulse: 'bg-gradient-to-br from-emerald-500/45 via-teal-500/38 to-cyan-500/28',
    iconBg:
      'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-[0_14px_44px_-14px_rgba(20,184,166,0.48)]',
    shimmer: 'from-emerald-400/45 via-transparent to-cyan-400/35',
  },
];

export function AddPlaylistItemMethodDialog({
  open,
  onOpenChange,
  onSelectMethod,
}: AddPlaylistItemMethodDialogProps) {
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const reduce = () => prefersReducedMotion.current;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'w-[calc(100vw-1.5rem)] max-w-4xl gap-0 border-0 bg-transparent p-0 shadow-none sm:w-full',
          '!flex flex-col overflow-visible',
          '[&>button]:right-4 [&>button]:top-4 [&>button]:z-20 [&>button]:h-10 [&>button]:w-10 [&>button]:rounded-full [&>button]:border [&>button]:border-slate-200/80 [&>button]:bg-white/90 [&>button]:shadow-md [&>button]:backdrop-blur-md [&>button]:hover:scale-105'
        )}
      >
        <motion.div
          initial={reduce() ? false : { opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={
              reduce()
                ? { duration: 0 }
                : { type: 'spring', stiffness: 420, damping: 32, mass: 0.88 }
            }
            className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-gradient-to-b from-white via-slate-50/98 to-slate-100/88 p-6 shadow-[0_28px_90px_-28px_rgba(15,23,42,0.38),inset_0_1px_0_rgba(255,255,255,0.88)] sm:p-8"
          >
            <div
              className="pointer-events-none absolute -left-28 -top-28 h-64 w-64 rounded-full bg-gradient-to-br from-blue-400/25 via-violet-400/12 to-transparent blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-36 -right-28 h-72 w-72 rounded-full bg-gradient-to-tl from-teal-400/18 via-cyan-400/10 to-transparent blur-3xl"
              aria-hidden
            />

            <DialogHeader className="relative space-y-1 text-center sm:text-center">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.7rem]">
                Ajouter un élément
              </DialogTitle>
              <DialogDescription className="sr-only">
                Choisissez une source : intelligence artificielle, catalogue ou applications.
              </DialogDescription>
              <p className="text-[13px] font-medium tracking-wide text-slate-400">
                Comment souhaitez-vous créer votre nouveau contenu ?
              </p>
            </DialogHeader>

            <div className="relative mt-7 grid gap-4 sm:mt-8 sm:grid-cols-3 sm:gap-5">
              {methods.map((m, i) => {
                const Icon = m.icon;
                return (
                  <motion.button
                    key={m.id}
                    type="button"
                    initial={reduce() ? false : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      reduce()
                        ? { duration: 0 }
                        : {
                            delay: 0.05 + i * 0.07,
                            type: 'spring',
                            stiffness: 400,
                            damping: 30,
                          }
                    }
                    whileHover={
                      reduce()
                        ? undefined
                        : { y: -6, transition: { type: 'spring', stiffness: 440, damping: 24 } }
                    }
                    whileTap={reduce() ? undefined : { scale: 0.985 }}
                    onClick={() => onSelectMethod(m.id)}
                    className={cn(
                      'group relative flex min-h-[220px] flex-col items-center overflow-hidden rounded-3xl border border-slate-200/75 bg-white/75 px-3 pb-5 pt-9 text-center outline-none backdrop-blur-md',
                      'shadow-[0_2px_16px_-6px_rgba(15,23,42,0.1)]',
                      'hover:border-slate-300/90 hover:bg-white hover:shadow-[0_22px_56px_-22px_rgba(15,23,42,0.2)]',
                      'focus-visible:ring-2 focus-visible:ring-blue-500/45 focus-visible:ring-offset-2'
                    )}
                  >
                    <div
                      className={cn(
                        'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100',
                        m.glow
                      )}
                      aria-hidden
                    />

                    <div
                      className={cn(
                        'pointer-events-none absolute left-1/2 top-0 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100',
                        m.shimmer
                      )}
                      aria-hidden
                    />

                    <div className="relative mb-6 flex h-[5rem] w-[5rem] shrink-0 items-center justify-center">
                      <motion.div
                        className={cn(
                          'absolute inset-1 rounded-[1.35rem] opacity-50 blur-2xl',
                          m.pulse
                        )}
                        aria-hidden
                        animate={
                          reduce()
                            ? undefined
                            : {
                                scale: [1, 1.12, 1],
                                opacity: [0.42, 0.58, 0.42],
                              }
                        }
                        transition={
                          reduce()
                            ? undefined
                            : {
                                duration: 3.4,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: i * 0.35,
                              }
                        }
                      />
                      <motion.span
                        className={cn(
                          'relative flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-[1.15rem] text-white',
                          m.iconBg
                        )}
                        whileHover={
                          reduce()
                            ? undefined
                            : { rotate: [0, -5, 5, 0], transition: { duration: 0.42 } }
                        }
                      >
                        <Icon className="h-[2.1rem] w-[2.1rem]" strokeWidth={1.5} aria-hidden />
                      </motion.span>
                    </div>

                    <div className="relative flex flex-col items-center gap-1.5">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                          {m.title}
                        </span>
                        {m.soon ? (
                          <span className="rounded-full border border-slate-200/80 bg-slate-50/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            Bientôt
                          </span>
                        ) : (
                          <span
                            className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
                            aria-label="Disponible"
                          />
                        )}
                      </div>
                      <p className="max-w-[11rem] text-xs font-medium leading-snug text-slate-500">
                        {m.tag}
                      </p>
                    </div>

                    <span className="relative mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-blue-600 opacity-0 transition-all duration-200 group-hover:opacity-100">
                      Ouvrir
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
      </DialogContent>
    </Dialog>
  );
}
