import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AddPlaylistCardProps {
  onClick: () => void;
}

export function AddPlaylistCard({ onClick }: AddPlaylistCardProps) {
  return (
    <Card
      onClick={onClick}
      className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer rounded-2xl bg-white group"
    >
      <CardContent className="p-0">
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="h-7 w-full"></div>
          </div>

         


<div className="relative aspect-video bg-transparent rounded-lg flex flex-col items-center justify-center gap-4">
            <Plus className="w-24 h-24 text-gray-400 mt-6 group-hover:mt-2 transition-all duration-300 group-hover:scale-110 group-hover:text-gray-600" strokeWidth={1.5} />
            <span className="text-gray-600 font-medium text-base bg-gray-200/30 pl-4 rounded-lg pr-4 pt-1 pb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Ajouter une playlist
            </span> 
          </div> 




          

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="invisible">Modifié</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
