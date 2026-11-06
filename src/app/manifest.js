// The web app manifest (served at /manifest.webmanifest)
export default function manifest() {
  return {
    name: 'Stride',
    short_name: 'Stride',
    description: 'Habits, training and an AI coach. Tell Libra what you did and it logs it for you.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#07080d',
    theme_color: '#07080d',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
