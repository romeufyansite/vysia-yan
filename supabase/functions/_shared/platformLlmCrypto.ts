/** AES-256-GCM using PLATFORM_LLM_MASTER_KEY_HEX (64 hex chars = 32 bytes). */

const ALGO = 'AES-GCM' as const;
const IV_LENGTH = 12;

function hexToKeyBytes(masterKeyHex: string): Uint8Array {
  const clean = masterKeyHex.replace(/^0x/i, '').trim();
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error('PLATFORM_LLM_MASTER_KEY_HEX must be exactly 64 hexadecimal characters (32 bytes)');
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encryptLlmApiKey(
  plaintext: string,
  masterKeyHex: string,
): Promise<{ nonceB64: string; ciphertextB64: string }> {
  const rawKey = hexToKeyBytes(masterKeyHex);
  const key = await crypto.subtle.importKey('raw', rawKey, ALGO, false, ['encrypt']);
  const iv = new Uint8Array(IV_LENGTH);
  crypto.getRandomValues(iv);
  const encoded = new TextEncoder().encode(plaintext);
  const buf = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded);
  const ciphertext = new Uint8Array(buf);
  return {
    nonceB64: bytesToB64(iv),
    ciphertextB64: bytesToB64(ciphertext),
  };
}

/** For future Edge Functions that call providers (never expose via HTTP to browsers). */
export async function decryptLlmApiKey(
  nonceB64: string,
  ciphertextB64: string,
  masterKeyHex: string,
): Promise<string> {
  const rawKey = hexToKeyBytes(masterKeyHex);
  const key = await crypto.subtle.importKey('raw', rawKey, ALGO, false, ['decrypt']);
  const iv = b64ToBytes(nonceB64);
  const ciphertext = b64ToBytes(ciphertextB64);
  if (iv.length !== IV_LENGTH) throw new Error('invalid_nonce_length');
  const buf = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext);
  return new TextDecoder().decode(buf);
}
