export type PairingStatus = 'pending' | 'accepted' | 'expired' | 'invalid';

export interface PairingToken {
  code: string;
  deviceId: string;
  expiresAt: number;
  status: PairingStatus;
  screenId?: string;
  deviceJwt?: string;
}

export interface PairingStartResponse {
  code: string;
  deviceId: string;
  expiresAt: number;
}

export interface PairingStatusResponse {
  status: PairingStatus;
  screenId?: string;
  deviceJwt?: string;
}

export interface PairingClaimRequest {
  code: string;
  screenName: string;
  playlistId?: string;
  groupId?: string;
  orgId?: string;
}

export interface PairingClaimResponse {
  ok: boolean;
  screenId: string;
  deviceJwt: string;
}
