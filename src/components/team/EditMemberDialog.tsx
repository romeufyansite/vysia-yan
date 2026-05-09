import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader as Loader2 } from 'lucide-react';
import { PermissionsEditor } from './PermissionsEditor';
import type { PermissionMap } from '@/lib/permissions';

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  email: string;
  isPending: boolean;
  initialPermissions: PermissionMap;
  onSave: (permissions: PermissionMap) => Promise<void>;
}

export function EditMemberDialog({
  open,
  onOpenChange,
  displayName,
  email,
  isPending,
  initialPermissions,
  onSave,
}: EditMemberDialogProps) {
  const [permissions, setPermissions] = useState<PermissionMap>(initialPermissions);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setPermissions(initialPermissions);
  }, [open, initialPermissions]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSave(permissions);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Droits de l'équipier</DialogTitle>
          <DialogDescription>
            {displayName ? <span className="font-medium">{displayName}</span> : null}
            {displayName ? ' — ' : ''}
            {email}
            {isPending ? ' (invitation en attente)' : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <PermissionsEditor value={permissions} onChange={setPermissions} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-xl bg-blue-600 hover:bg-blue-700"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
