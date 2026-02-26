import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SplashScreen from "@/components/SplashScreen";
import AnimatedBackground from "@/components/AnimatedBackground";
import FloatingElements from "@/components/FloatingElements";
import ChatBot from '@/components/landingPage/ChatBot';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FaucetDrops',
  description: 'FaucetDrops - Free, Fast, Fair & Frictionless Token Distribution 💧',
  icons: '/favicon.ico'
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {

  return (
    <html lang="en">
      <body className={`${inter.className} antialiased relative`}>
          <AnimatedBackground />
          <FloatingElements />
          <div className="relative z-20">
            <SplashScreen />
            <Header />
            {children}
            <ChatBot /> 
            <Footer />
          </div>
      </body>
    </html>
  )
}