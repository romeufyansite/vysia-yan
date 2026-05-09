import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AddCompanyCardProps {
  onClick: () => void;
}

export function AddCompanyCard({ onClick }: AddCompanyCardProps) {
  return (
    <Card
      onClick={onClick}
      className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer rounded-2xl bg-white group"
    >
      <CardContent className="p-0">
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="h-5 w-full" />
          </div>
          <div className="relative aspect-video w-full rounded-lg bg-transparent flex flex-col items-center justify-center gap-3">
            <Plus
              className="w-20 h-20 text-gray-400 group-hover:scale-110 group-hover:text-gray-600 transition-all duration-300"
              strokeWidth={1.5}
            />
            <span className="text-gray-600 font-medium text-sm bg-gray-200/30 px-4 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Ajouter une entreprise
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
