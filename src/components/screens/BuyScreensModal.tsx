import { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, CreditCard } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BuyScreensModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuyScreensModal({ open, onOpenChange }: BuyScreensModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [currency] = useState('EUR');
  const [frequency, setFrequency] = useState('Mensuel');
  const pricePerScreen = 5.00;

  const handleQuantityChange = (delta: number) => {
    setQuantity(Math.max(1, quantity + delta));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] rounded-3xl p-0 bg-gray-50">
        <div className="relative">
          <div className="px-8 py-6">
            <h2 className="text-3xl font-bold text-center mb-8">Acheter des écrans</h2>

            <div className="grid grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-center mb-8">Nombre d'écrans</h3>

                <div className="flex items-center justify-center gap-3 mb-8">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleQuantityChange(-1)}
                    className="h-12 w-12 rounded-2xl bg-gray-100 hover:bg-gray-200"
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <div className="text-4xl font-bold w-20 text-center">
                    {quantity}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleQuantityChange(1)}
                    className="h-12 w-12 rounded-2xl bg-gray-100 hover:bg-gray-200"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-3 mb-6">
                  <Select value={currency} disabled>
                    <SelectTrigger className="w-24 h-12 rounded-2xl border-2 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="text-3xl font-bold">
                    {(quantity * pricePerScreen).toFixed(2)} €
                  </div>

                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger className="w-32 h-12 rounded-2xl border-2 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mensuel">Mensuel</SelectItem>
                      <SelectItem value="Annuel">Annuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Input
                  placeholder="Code promo"
                  className="h-12 rounded-2xl border-2 text-sm placeholder:text-gray-400"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-center mb-8">Payer par carte</h3>

                <div className="space-y-3">
                  <Input
                    placeholder="Nom sur la carte"
                    className="h-12 rounded-2xl border border-black-500 text-sm placeholder:text-gray-400"
                  />

                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Numéro de carte"
                      className="h-12 rounded-2xl border border-black-500 text-sm placeholder:text-gray-400 pl-10 pr-24"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">
                      MM / AA
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <Button
                      disabled
                      className="flex-1 h-12 rounded-2xl text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-200"
                    >
                      Payer {(quantity * pricePerScreen).toFixed(2)} €
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      className="flex-1 h-12 rounded-2xl text-sm font-medium border border-black-500"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-gray-500">
              En confirmant votre carte, vous autorisez Juuno.co à débiter votre carte pour les paiements futurs conformément à leurs conditions.
            </div>

            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="px-2.5 py-1 border border-gray-300 rounded text-[10px] text-gray-600 flex items-center gap-1">
                Propulsé par <span className="font-semibold">stripe</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 border border-gray-300 rounded flex items-center justify-center">
                  <div className="text-[10px]">🔒</div>
                </div>
                <div className="text-lg">💳</div>
                <div className="text-lg">💳</div>
                <div className="text-lg">💳</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
