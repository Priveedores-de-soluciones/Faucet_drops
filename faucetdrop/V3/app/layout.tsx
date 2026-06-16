import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Footer from "@/components/Footer";
import SplashScreen from "@/components/SplashScreen";
import AnimatedBackground from "@/components/AnimatedBackground";
import FloatingElements from "@/components/FloatingElements";
import ChatBot from '@/components/landingPage/ChatBot';
import ConditionalHeader from "@/components/ConditionalHeader";
import VisitTracker from '@/components/visitTracker'; // 1. Import the new wrapper
import { Suspense } from 'react';
const inter = Inter({ subsets: ['latin'] })

// Metadata works flawlessly now because this is a Server Component
export const metadata: Metadata = {
  title: {
    default: 'FaucetDrops - The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution',
    template: '%s | FaucetDrops'
  },
  description: 'The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution 💧. Quest, Quiz, and distribute rewards effortlessly across multiple chains.',
  keywords: ['token drops', 'crypto faucet', 'onchain rewards', 'web3 engagement', 'token distribution', 'blockchain rewards', 'quests', 'quizzes'],
  authors: [{ name: 'FaucetDrops' }],
  metadataBase: new URL('https://faucetdrops.io'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: 'https://faucetdrops.io/',
    siteName: 'FaucetDrops',
    title: 'FaucetDrops - The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution',
    description: 'The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution 💧. Distribute rewards and drive growth through Quests and Quizzes.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'FaucetDrops - The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FaucetDrops - The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution',
    description: 'The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution 💧. Distribute rewards and drive growth through Quests and Quizzes.',
    images: ['/opengraph-image'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="talentapp:project_verification" content="..." />
      </head>
      <body className={`${inter.className} antialiased relative`}>

        <Suspense fallback={null}>
          <VisitTracker />   {/* ← wrap in Suspense */}
        </Suspense>

        <AnimatedBackground />
        <FloatingElements />
        <div className="relative z-20">
          <SplashScreen />
          <ConditionalHeader />
          {children}
          <ChatBot />
          <Footer />
        </div>
      </body>
    </html>
  )
}