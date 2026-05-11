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
      <DialogContent className="overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-0 sm:max-w-[900px]">
        <div className="relative">
          <div className="px-8 py-6">
            <h2 className="text-3xl font-bold text-center mb-8">Acheter des écrans</h2>

            <div className="grid grid-cols-2 gap-5">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-center mb-8">Nombre d'écrans</h3>

                <div className="flex items-center justify-center gap-3 mb-8">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleQuantityChange(-1)}
                    className="h-12 min-h-12 w-12 rounded-2xl bg-slate-100 hover:bg-slate-200"
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
                    className="h-12 min-h-12 w-12 rounded-2xl bg-slate-100 hover:bg-slate-200"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-3 mb-6">
                  <Select value={currency} disabled>
                    <SelectTrigger className="h-12 min-h-12 w-24 rounded-2xl border-2 border-slate-200 bg-white text-sm">
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
                    <SelectTrigger className="h-12 min-h-12 w-32 rounded-2xl border-2 border-slate-200 bg-white text-sm">
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
                  className="h-12 min-h-12 rounded-2xl border-2 border-slate-200 text-sm placeholder:text-slate-400"
                />
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-center mb-8">Payer par carte</h3>

                <div className="space-y-3">
                  <Input
                    placeholder="Nom sur la carte"
                    className="h-12 min-h-12 rounded-2xl border border-slate-300 text-sm placeholder:text-slate-400"
                  />

                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-400" />
                    <Input
                      placeholder="Numéro de carte"
                      className="h-12 min-h-12 rounded-2xl border border-slate-300 pl-11 pr-24 text-sm placeholder:text-slate-400"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 transform text-xs text-slate-400">
                      MM / AA
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <Button
                      disabled
                      className="h-12 min-h-12 flex-1 rounded-2xl bg-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-200"
                    >
                      Payer {(quantity * pricePerScreen).toFixed(2)} €
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      className="h-12 min-h-12 flex-1 rounded-2xl border-slate-300 text-sm font-medium"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-slate-500">
              En confirmant votre carte, vous autorisez Juuno.co à débiter votre carte pour les paiements futurs conformément à leurs conditions.
            </div>

            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 text-[10px] text-slate-600">
                Propulsé par <span className="font-semibold">stripe</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded border border-slate-200">
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
