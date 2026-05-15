import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Image as ImageIcon } from 'lucide-react';
import { MediaLibraryModal } from '@/components/media-library/MediaLibraryModal';
import type { MediaAsset } from '@/types';

interface ImageAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  initialData?: any;
}

export function ImageAppModal({
  open,
  onOpenChange,
  onSave,
  initialData,
}: ImageAppModalProps) {
  const [message, setMessage] = useState('');
  const [position, setPosition] = useState('middle');
  const [align, setAlign] = useState('center');
  const [margin, setMargin] = useState('5');
  const [font, setFont] = useState('Poppins');
  const [textColor, setTextColor] = useState('#ffffff');
  const [imageTint, setImageTint] = useState('rgba(0,0,0,0.01)');
  const [imageUrl, setImageUrl] = useState('');
  const [duration, setDuration] = useState(30);
  const [title, setTitle] = useState('');
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);

  useEffect(() => {
    if (initialData) {
      setMessage(initialData.message || '');
      setPosition(initialData.position || 'middle');
      setAlign(initialData.align || 'center');
      setMargin(initialData.margin || '5');
      setFont(initialData.font || 'Poppins');
      setTextColor(initialData.textColor || '#ffffff');
      setImageTint(initialData.imageTint || 'rgba(0,0,0,0.01)');
      setImageUrl(initialData.imageUrl || '');
      setDuration(initialData.duration || 30);
      setTitle(initialData.title || '');
    } else {
      setMessage('');
      setPosition('middle');
      setAlign('center');
      setMargin('5');
      setFont('Poppins');
      setTextColor('#ffffff');
      setImageTint('rgba(0,0,0,0.01)');
      setImageUrl('');
      setDuration(30);
      setTitle('');
    }
  }, [initialData, open]);

  const handleSave = () => {
    onSave({
      message,
      position,
      align,
      margin,
      font,
      textColor,
      imageTint,
      imageUrl,
      duration,
      title: title || 'My Image',
    });
  };

  const handleSelectAsset = (asset: MediaAsset) => {
    setImageUrl(asset.file_url);
    setTitle(asset.name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] p-0">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-lg font-medium">Image</DialogTitle>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Help
              </Button>
              <Button onClick={handleSave} size="sm">
                Save
              </Button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-96 border-r overflow-auto p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  placeholder="My Image"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Durée (secondes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Placeholder"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Select value={position} onValueChange={setPosition}>
                    <SelectTrigger id="position">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="middle">Middle</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="align">Align</Label>
                  <Select value={align} onValueChange={setAlign}>
                    <SelectTrigger id="align">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="margin">Margin (%)</Label>
                <Input
                  id="margin"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="font">Font</Label>
                <div className="flex gap-2">
                  <Select value={font} onValueChange={setFont}>
                    <SelectTrigger id="font" className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Poppins">Poppins</SelectItem>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Helvetica">Helvetica</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    +
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="textColor">Text colour</Label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded border border-gray-300"
                    style={{ backgroundColor: textColor }}
                  />
                  <Input
                    id="textColor"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageTint">Image tint</Label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded border border-gray-300"
                    style={{ backgroundColor: imageTint }}
                  />
                  <Input
                    id="imageTint"
                    value={imageTint}
                    onChange={(e) => setImageTint(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 bg-gray-100 flex items-center justify-center p-8">
              <div className="text-center">
                <Button
                  variant="outline"
                  className="mb-4"
                  onClick={() => setMediaLibraryOpen(true)}
                >
                  Parcourir la médiathèque
                </Button>
                <p className="text-sm text-gray-500">
                  Sélectionnez une image ou entrez une URL
                </p>
                {imageUrl && (
                  <div className="mt-6">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="max-w-full max-h-96 rounded-lg shadow-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      <MediaLibraryModal
        open={mediaLibraryOpen}
        onOpenChange={setMediaLibraryOpen}
        onSelectAsset={handleSelectAsset}
        selectionMode={true}
      />
    </Dialog>
  );
}
