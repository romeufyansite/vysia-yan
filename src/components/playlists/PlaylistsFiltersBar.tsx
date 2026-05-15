import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ListFilter, Monitor, RotateCcw, Smartphone, X } from 'lucide-react';
import type { PlaylistGroup } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type PlaylistsStatusFilter = 'all' | 'assigned' | 'unassigned';
export type PlaylistsOrientationFilter = 'all' | 'landscape' | 'portrait';

export interface PlaylistsFiltersBarProps {
  UNGROUPED_KEY: string;
  totalPlaylistCount: number;
  groups: PlaylistGroup[];
  ungroupedCount: number;
  countByGroup: Map<string, number>;
  categoryActiveKeys: Set<string>;
  onCategoryToggle: (key: string) => void;
  onCategoryClearAll: () => void;
  status: PlaylistsStatusFilter;
  onStatusChange: (v: PlaylistsStatusFilter) => void;
  orientation: PlaylistsOrientationFilter;
  onOrientationChange: (v: PlaylistsOrientationFilter) => void;
  screens: { id: string; name: string }[];
  selectedScreenIds: Set<string>;
  onToggleScreen: (id: string) => void;
  onClearScreenSelection: () => void;
  /** Réinitialise statut / orientation / écrans uniquement */
  onResetAdvanced: () => void;
  showResetAdvanced: boolean;
  /** Affiche un repère sur le bouton Filtrer */
  advancedFiltersActive: boolean;
}

function CategoryChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-all',
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-medium',
          active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
        )}
      >
        {count}
      </span>
    </button>
  );
}

function ChoiceChip({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-all',
        active
          ? 'bg-slate-800 text-white'
          : 'border border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
        active && icon && '[&_svg]:text-white',
        !active && icon && '[&_svg]:text-slate-400'
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function SubLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-slate-400">
      {children}
    </span>
  );
}

export function PlaylistsFiltersBar({
  UNGROUPED_KEY,
  totalPlaylistCount,
  groups,
  ungroupedCount,
  countByGroup,
  categoryActiveKeys,
  onCategoryToggle,
  onCategoryClearAll,
  status,
  onStatusChange,
  orientation,
  onOrientationChange,
  screens,
  selectedScreenIds,
  onToggleScreen,
  onClearScreenSelection,
  onResetAdvanced,
  showResetAdvanced,
  advancedFiltersActive,
}: PlaylistsFiltersBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [screensOpen, setScreensOpen] = useState(false);
  const [screenQuery, setScreenQuery] = useState('');

  const filteredScreens = useMemo(() => {
    const q = screenQuery.trim().toLowerCase();
    if (!q) return screens;
    return screens.filter((s) => s.name.toLowerCase().includes(q));
  }, [screens, screenQuery]);

  const showCategoryRow = groups.length > 0 || ungroupedCount > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4">
        {showCategoryRow && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <CategoryChip
              active={categoryActiveKeys.size === 0}
              onClick={onCategoryClearAll}
              label="Tous"
              count={totalPlaylistCount}
            />
            {groups.map((group) => (
              <CategoryChip
                key={group.id}
                active={categoryActiveKeys.has(group.id)}
                onClick={() => onCategoryToggle(group.id)}
                label={group.name}
                count={countByGroup.get(group.id) || 0}
              />
            ))}
            {ungroupedCount > 0 && (
              <CategoryChip
                active={categoryActiveKeys.has(UNGROUPED_KEY)}
                onClick={() => onCategoryToggle(UNGROUPED_KEY)}
                label="Sans groupe"
                count={ungroupedCount}
              />
            )}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((o) => !o)}
          className={cn(
            'relative h-8 shrink-0 gap-1.5 rounded-full border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            advancedFiltersActive && 'border-slate-300 bg-slate-50/70 text-slate-800',
            !showCategoryRow && 'ml-0'
          )}
        >
          <ListFilter className="h-3.5 w-3.5" aria-hidden />
          Filtrer
          {advancedFiltersActive && (
            <span className="ml-0.5 flex h-[5px] w-[5px] rounded-full bg-slate-900" aria-hidden />
          )}
        </Button>
      </div>

      {filtersOpen && (
        <div className="animate-in fade-in-0 slide-in-from-top-1 duration-150 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-3 sm:px-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100/80 pb-2">
            <p className="text-xs text-slate-500">Filtres détaillés</p>
            {showResetAdvanced && (
              <button
                type="button"
                onClick={() => onResetAdvanced()}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 transition-colors hover:text-slate-900"
              >
                <RotateCcw className="h-3 w-3" />
                Réinitialiser
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end lg:gap-5">
            <div className="sm:col-span-1 lg:col-span-4">
              <SubLabel>Statut</SubLabel>
              <div className="flex flex-wrap gap-1.5">
                <ChoiceChip active={status === 'all'} onClick={() => onStatusChange('all')}>
                  Tous
                </ChoiceChip>
                <ChoiceChip
                  active={status === 'assigned'}
                  onClick={() => onStatusChange('assigned')}
                >
                  Affectées
                </ChoiceChip>
                <ChoiceChip
                  active={status === 'unassigned'}
                  onClick={() => onStatusChange('unassigned')}
                >
                  Non affectées
                </ChoiceChip>
              </div>
            </div>

            <div className="sm:col-span-1 lg:col-span-4">
              <SubLabel>Orientation</SubLabel>
              <div className="flex flex-wrap gap-1.5">
                <ChoiceChip
                  active={orientation === 'all'}
                  onClick={() => onOrientationChange('all')}
                >
                  Tous
                </ChoiceChip>
                <ChoiceChip
                  active={orientation === 'landscape'}
                  onClick={() => onOrientationChange('landscape')}
                  icon={<Monitor className="h-3.5 w-3.5" strokeWidth={2} />}
                >
                  Paysage
                </ChoiceChip>
                <ChoiceChip
                  active={orientation === 'portrait'}
                  onClick={() => onOrientationChange('portrait')}
                  icon={<Smartphone className="h-3.5 w-3.5" strokeWidth={2} />}
                >
                  Portrait
                </ChoiceChip>
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <SubLabel>Écrans</SubLabel>
              <Popover
                open={screensOpen}
                onOpenChange={(o) => {
                  setScreensOpen(o);
                  if (!o) setScreenQuery('');
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'h-8 w-full max-w-xs justify-between rounded-lg border-slate-200/90 bg-white px-2.5 text-[13px] font-normal text-slate-700 shadow-none hover:bg-white sm:max-w-sm lg:max-w-none',
                      selectedScreenIds.size > 0 && 'border-slate-300 bg-white text-slate-900'
                    )}
                  >
                    <span className="truncate">
                      {selectedScreenIds.size === 0
                        ? 'Tous les écrans'
                        : selectedScreenIds.size === 1
                          ? '1 écran sélectionné'
                          : `${selectedScreenIds.size} écrans sélectionnés`}
                    </span>
                    <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[min(100vw-2rem,20rem)] rounded-lg border-slate-200 p-3 shadow-md"
                  align="start"
                >
                  <div className="space-y-3">
                    <Input
                      type="search"
                      placeholder="Rechercher un écran…"
                      value={screenQuery}
                      onChange={(e) => setScreenQuery(e.target.value)}
                      className="h-9 min-h-9 rounded-lg border-slate-200 bg-white text-xs"
                    />
                    {selectedScreenIds.size > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-full justify-start gap-1.5 px-2 text-[11px] text-slate-500"
                        onClick={() => onClearScreenSelection()}
                      >
                        <X className="h-3 w-3" />
                        Effacer la sélection
                      </Button>
                    )}
                    {screens.length === 0 ? (
                      <p className="py-5 text-center text-xs text-slate-500">Aucun écran.</p>
                    ) : filteredScreens.length === 0 ? (
                      <p className="py-5 text-center text-xs text-slate-500">Aucun résultat.</p>
                    ) : (
                      <ScrollArea className="h-[min(14rem,calc(100vh-12rem))] pr-2">
                        <ul className="space-y-0">
                          {filteredScreens.map((screen) => {
                            const checked = selectedScreenIds.has(screen.id);
                            return (
                              <li key={screen.id}>
                                <label
                                  className={cn(
                                    'flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-slate-100',
                                    checked && 'bg-slate-100/80'
                                  )}
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => onToggleScreen(screen.id)}
                                    className="h-3.5 w-3.5 border-slate-400 data-[state=checked]:border-slate-800 data-[state=checked]:bg-slate-800"
                                  />
                                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800">
                                    {screen.name}
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </ScrollArea>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
