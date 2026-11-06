import { Archivo } from 'next/font/google'
import './globals.css'

// One family. The width axis gives the condensed numerals and the landing display.
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
})

export const metadata = {
  // Absolute URLs for the social preview images
  metadataBase: new URL('https://stride-ks.vercel.app'),
  applicationName: 'Stride',
  appleWebApp: { title: 'Stride', statusBarStyle: 'black-translucent' },
  openGraph: {
    siteName: 'Stride', type: 'website', url: '/',
    title: 'Stride: habits, training and an AI coach',
    description: 'Track water, sleep, protein, lifts and anything else you care about. Tell Libra what you did and it logs it for you.',
  },
  twitter: { card: 'summary_large_image' },
  title: { default: 'Stride: habits, training and an AI coach', template: '%s · Stride' },
  description: 'Track water, sleep, protein, lifts and anything else you care about. Tell Libra what you did and it logs it for you.',
}

export const viewport = {
  themeColor: '#07080d',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>
        {children}
      </body>
    </html>
  )
}
