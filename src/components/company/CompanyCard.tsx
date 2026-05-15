import { Building2, Menu, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Organization } from '@/services/organization.service';

interface CompanyCardProps {
  organization: Organization;
  canDelete: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CompanyCard({
  organization,
  canDelete,
  onClick,
  onEdit,
  onDelete,
}: CompanyCardProps) {
  return (
    <Card
      onClick={onClick}
      className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer rounded-2xl bg-white group"
    >
      <CardContent className="p-0">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <h3 className="truncate pr-2 text-sm font-medium text-gray-900">
              {organization.name}
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7 -mr-2 shrink-0">
                  <Menu className="h-5 w-5 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    onEdit();
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    onDelete();
                  }}
                  disabled={!canDelete}
                  className={canDelete ? 'text-red-600' : 'text-gray-400'}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Logo */}
          <div className="relative aspect-video w-full rounded-lg bg-gradient-to-b from-gray-50 to-gray-100 overflow-hidden flex items-center justify-center">
            {organization.logo_url ? (
              <img
                src={organization.logo_url}
                alt={organization.name}
                className="max-w-[70%] max-h-[70%] object-contain"
              />
            ) : (
              <Building2 className="h-14 w-14 text-gray-300" strokeWidth={1.5} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
