// src/app/manifest.ts — the PWA manifest at /manifest.webmanifest (v5.1, G7): replaces the static public/manifest.webmanifest
// the scaffold used to write, so the home-screen name follows the runtime company / app name (settings → env → os.yaml)
// and one image serves any client. The icons stay the generated ones in public/brand/.
import type { MetadataRoute } from 'next';
import { branding } from '@/lib/settings';
import { OS, BRAND } from '@/config/os.config';
import { THEME } from '@/config/theme';
import { LANGUAGES } from '@/config/i18n';

export const dynamic = 'force-dynamic';
// "any maskable" (one icon for both uses, as the static manifest had); Next's type lists the single keywords only
const ANY_MASKABLE = 'any maskable' as 'maskable';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { companyName, appName } = await branding();
  const name = appName || OS.name;
  return {
    name,
    short_name: (companyName || name).slice(0, 12),
    description: OS.tagline,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: (THEME as unknown as { token?: { colorBgLayout?: string } }).token?.colorBgLayout || '#FFFFFF',
    theme_color: String((BRAND as unknown as { color?: string }).color || '#000000').toUpperCase(),
    lang: (LANGUAGES as unknown as string[])[0] || 'en',
    icons: [
      { src: '/brand/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: ANY_MASKABLE },
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: ANY_MASKABLE },
    ],
  };
}
