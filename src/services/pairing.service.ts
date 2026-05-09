import type {
  PairingStartResponse,
  PairingStatusResponse,
  PairingClaimRequest,
  PairingClaimResponse,
} from '@/types/pairing';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const pairingService = {
  async startPairing(): Promise<PairingStartResponse> {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/pairing-start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to start pairing');
    }

    return response.json();
  },

  async checkStatus(code: string): Promise<PairingStatusResponse> {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/pairing-status?code=${code}`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to check pairing status');
    }

    return response.json();
  },

  async claimPairing(request: PairingClaimRequest): Promise<PairingClaimResponse> {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/pairing-claim`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Échec de la connexion de l\'écran');
    }

    return response.json();
  },
};
