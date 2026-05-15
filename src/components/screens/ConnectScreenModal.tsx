import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { pairingService } from '@/services/pairing.service';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Playlist, ScreenGroup } from '@/types';
import { ConnectScreenStep1 } from './ConnectScreenStep1';
import { ConnectScreenStep2 } from './ConnectScreenStep2';
import { ConnectScreenStep3 } from './ConnectScreenStep3';

interface ConnectScreenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlists: Playlist[];
  groups: ScreenGroup[];
  onConnect: () => void;
  onCreateGroup: () => void;
  onCreatePlaylist: () => void;
}

export function ConnectScreenModal({
  open,
  onOpenChange,
  playlists,
  groups,
  onConnect,
  onCreateGroup,
  onCreatePlaylist,
}: ConnectScreenModalProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [screenType, setScreenType] = useState<'smart-tv' | 'web-browser' | 'non-connected' | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [playlistId, setPlaylistId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!code || !name) return;

    setIsConnecting(true);
    try {
      console.log('[ConnectScreenModal] Claiming pairing with code:', code);
      const { data: { user } } = await supabase.auth.getUser();
      let orgId: string | undefined;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('org_id')
          .eq('id', user.id)
          .maybeSingle();
        orgId = profile?.org_id ?? undefined;
      }
      const result = await pairingService.claimPairing({
        code: code,
        screenName: name,
        playlistId: playlistId || undefined,
        groupId: groupId && groupId !== 'none' ? groupId : undefined,
        orgId,
      });
      console.log('[ConnectScreenModal] Pairing claimed successfully:', result);

      toast({
        title: 'Écran connecté avec succès',
        description: `${name} a été ajouté à vos écrans`,
      });

      handleClose();
      console.log('[ConnectScreenModal] Calling onConnect callback');
      onConnect();
    } catch (error) {
      console.error('[ConnectScreenModal] Error claiming pairing:', error);
      toast({
        title: 'Erreur de connexion',
        description: error instanceof Error ? error.message : 'Code invalide ou expiré',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setScreenType(null);
    setCode('');
    setName('');
    setPlaylistId('');
    setGroupId('');
    setCodeError(null);
    setIsVerifyingCode(false);
    onOpenChange(false);
  };

  const handleNext = async () => {
    if (currentStep === 1 && screenType === 'non-connected') {
      return;
    }
    if (currentStep === 2) {
      setIsVerifyingCode(true);
      setCodeError(null);
      try {
        const result = await pairingService.checkStatus(code);
        if (result.status === 'pending') {
          setCurrentStep(3);
        } else if (result.status === 'expired') {
          setCodeError('Ce code a expiré. Relancez l\'application sur votre écran pour en obtenir un nouveau.');
        } else {
          setCodeError('Code invalide. Vérifiez le code affiché sur votre écran.');
        }
      } catch {
        setCodeError('Code invalide ou introuvable. Vérifiez le code affiché sur votre écran.');
      } finally {
        setIsVerifyingCode(false);
      }
      return;
    }
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedStep1 = screenType !== null && screenType !== 'non-connected';
  const canProceedStep2 = code.length === 4;
  const canProceedStep3 = name.trim() !== '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] rounded-3xl p-0 border-0 bg-white">
        <div className="relative px-10 py-8">
      

          <DialogTitle className="text-2xl font-medium text-center mb-6">
            Connecter un nouvel écran
          </DialogTitle>

          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500' 
            }`}>
              1
            </div>
            <div className={`h-0.5 w-12 ${
              currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'
            }`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
            <div className={`h-0.5 w-12 ${
              currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'
            }`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              3
            </div>
          </div>

          <div className="min-h-[200px]">
            {currentStep === 1 && (
              <ConnectScreenStep1
                selectedType={screenType}
                onSelectType={setScreenType}
              />
            )}

            {currentStep === 2 && (
              <ConnectScreenStep2
                code={code}
                onCodeChange={(newCode) => { setCode(newCode); setCodeError(null); }}
                error={codeError}
                isVerifying={isVerifyingCode}
              />
            )}

            {currentStep === 3 && (
              <ConnectScreenStep3
                name={name}
                playlistId={playlistId}
                groupId={groupId}
                playlists={playlists}
                groups={groups}
                onNameChange={setName}
                onPlaylistChange={setPlaylistId}
                onGroupChange={setGroupId}
                onCreatePlaylist={onCreatePlaylist}
                onCreateGroup={onCreateGroup}
              />
            )}
          </div>

          <div className="flex gap-3 mt-8">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="px-8 h-12 rounded-xl text-base border-gray-300 hover:bg-gray-50"
              >
                Retour
              </Button>
            )}
            <div className="flex-1" />
            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !canProceedStep1) ||
                  (currentStep === 2 && (!canProceedStep2 || isVerifyingCode))
                }
                className="px-8 h-12 rounded-xl text-base bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {currentStep === 2 && isVerifyingCode ? 'Vérification...' : `Étape n°${currentStep + 1}`}
              </Button>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={!canProceedStep3 || isConnecting}
                className="px-8 h-12 rounded-xl text-base bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Connexion...' : 'Connecter l\'écran'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
