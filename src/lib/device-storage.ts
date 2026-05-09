const DEVICE_JWT_KEY = 'device_jwt';
const SCREEN_ID_KEY = 'screen_id';
const DEVICE_ID_KEY = 'device_id';

export const deviceStorage = {
  setDeviceJwt(jwt: string): void {
    localStorage.setItem(DEVICE_JWT_KEY, jwt);
  },

  getDeviceJwt(): string | null {
    return localStorage.getItem(DEVICE_JWT_KEY);
  },

  setScreenId(screenId: string): void {
    localStorage.setItem(SCREEN_ID_KEY, screenId);
  },

  getScreenId(): string | null {
    return localStorage.getItem(SCREEN_ID_KEY);
  },

  setDeviceId(deviceId: string): void {
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  },

  getDeviceId(): string | null {
    return localStorage.getItem(DEVICE_ID_KEY);
  },

  clearAll(): void {
    localStorage.removeItem(DEVICE_JWT_KEY);
    localStorage.removeItem(SCREEN_ID_KEY);
    localStorage.removeItem(DEVICE_ID_KEY);
  },

  isDeviceConnected(): boolean {
    return !!this.getDeviceJwt() && !!this.getScreenId();
  },
};
