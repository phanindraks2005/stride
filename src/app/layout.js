import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import './calendar-theme.css'
import PageTransition from '@/components/PageTransition'
import Nav from '@/components/Nav'
import { AuthProvider } from '@/lib/AuthContext'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Stride — Track it. Understand it.",
  description: "An AI-powered habit and fitness tracker with a copilot that actually acts.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Nav />
          <PageTransition>{children}</PageTransition>
        </AuthProvider>
      </body>   
     </html>
  );
}
