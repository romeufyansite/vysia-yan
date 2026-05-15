import { fileURLToPath } from 'node:url';
import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Proxies Edge Function requests in dev so the browser talks to localhost (no cross-origin),
 * bypassing gateway CORS / OPTIONS quirks when JWT verification blocks preflight on Supabase.
 */
export default defineConfig(({ mode }) => {
  const root = __dirname;
  const env = loadEnv(mode, root, 'VITE_');
  const supabaseUrl = (env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
  const devEdgeOrigin = (env.VITE_DEV_EDGE_FUNCTIONS_ORIGIN ?? '').replace(/\/$/, '');

  /** En dev : proxy vers la stack locale `supabase functions serve` si défini, sinon vers le projet distant. */
  const functionsProxyTarget =
    mode === 'development' && devEdgeOrigin ? devEdgeOrigin : supabaseUrl;

  if (mode === 'development' && !functionsProxyTarget) {
    console.warn(
      '[vite] Aucune cible pour le proxy /functions/v1 : renseignez VITE_SUPABASE_URL et/ou VITE_DEV_EDGE_FUNCTIONS_ORIGIN dans .env',
    );
  } else if (mode === 'development' && devEdgeOrigin) {
    console.info(`[vite] Proxy /functions/v1 → ${devEdgeOrigin} (Edge Functions locales)`);
  }

  return {
    envDir: root,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(root, './src'),
      },
    },
    server: functionsProxyTarget
      ? {
          proxy: {
            '/functions/v1': {
              target: functionsProxyTarget,
              changeOrigin: true,
              secure: true,
            },
          },
        }
      : undefined,
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
