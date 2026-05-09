import { Checkbox } from '@/components/ui/checkbox';
import { ALL_RESOURCES, type PermissionMap, type Resource } from '@/lib/permissions';

interface PermissionsEditorProps {
  value: PermissionMap;
  onChange: (value: PermissionMap) => void;
  disabled?: boolean;
}

export function PermissionsEditor({ value, onChange, disabled }: PermissionsEditorProps) {
  const togglePermission = (resource: Resource, key: 'view' | 'manage', checked: boolean) => {
    const current = value[resource] ?? {};
    const next: PermissionMap = { ...value, [resource]: { ...current, [key]: checked } };

    // manage implies view
    if (key === 'manage' && checked) {
      next[resource] = { ...next[resource], view: true };
    }
    // unchecking view should also uncheck manage
    if (key === 'view' && !checked) {
      next[resource] = { view: false, manage: false };
    }

    onChange(next);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="grid grid-cols-[1fr_80px_80px] items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500">
        <span>Ressource</span>
        <span className="text-center">Voir</span>
        <span className="text-center">Gérer</span>
      </div>
      <div className="divide-y divide-gray-100">
        {ALL_RESOURCES.map((res) => {
          const perms = value[res.id] ?? {};
          return (
            <div key={res.id} className="grid grid-cols-[1fr_80px_80px] items-center gap-2 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-gray-900">{res.label}</div>
                <div className="text-xs text-gray-500">{res.description}</div>
              </div>
              <div className="flex justify-center">
                <Checkbox
                  checked={!!perms.view || !!perms.manage}
                  disabled={disabled}
                  onCheckedChange={(c) => togglePermission(res.id, 'view', !!c)}
                />
              </div>
              <div className="flex justify-center">
                <Checkbox
                  checked={!!perms.manage}
                  disabled={disabled}
                  onCheckedChange={(c) => togglePermission(res.id, 'manage', !!c)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
