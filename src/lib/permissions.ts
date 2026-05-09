export type Resource =
  | 'screens'
  | 'playlists'
  | 'programmation'
  | 'sequence'
  | 'media_library'
  | 'company';

export type Action = 'view' | 'manage';

// Permissions stored as { [resource]: { view?: boolean; manage?: boolean } }
export type PermissionMap = Partial<Record<Resource, Partial<Record<Action, boolean>>>>;

export const ALL_RESOURCES: { id: Resource; label: string; description: string }[] = [
  { id: 'screens', label: 'Écrans', description: 'Voir et gérer les écrans de l\'entreprise.' },
  { id: 'playlists', label: 'Playlists', description: 'Voir et gérer les playlists.' },
  { id: 'programmation', label: 'Programmation', description: 'Voir et gérer la programmation.' },
  { id: 'sequence', label: 'Séquence', description: 'Voir et gérer les séquences.' },
  { id: 'media_library', label: 'Média librairie', description: 'Accéder et gérer la bibliothèque média.' },
  { id: 'company', label: 'Entreprise', description: 'Voir et modifier les informations de l\'entreprise.' },
];

export type Role = 'manager' | 'teammate' | 'platform_admin';

export function can(role: Role, permissions: PermissionMap, resource: Resource, action: Action = 'view'): boolean {
  if (role === 'manager' || role === 'platform_admin') return true;
  const r = permissions[resource];
  if (!r) return false;
  // "manage" implies "view"
  if (action === 'view') return !!r.view || !!r.manage;
  return !!r.manage;
}

export const DEFAULT_PERMISSIONS: PermissionMap = {
  screens: { view: true },
  playlists: { view: true },
};
