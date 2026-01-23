import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
// import { headers } from 'next/headers' // added
// import ContextProvider from '@/context'
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SplashScreen from "@/components/SplashScreen";
import AnimatedBackground from "@/components/AnimatedBackground";
import FloatingElements from "@/components/FloatingElements";
import CursorFollower from "@/components/CursorFollower";

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

  // const headersObj = await headers();
  // const cookies = headersObj.get('cookie')

  return (
    <html lang="en">
      <body className={`${inter.className} antialiased relative`}>
        {/* <ContextProvider cookies={cookies}> */}
          <AnimatedBackground />
          <FloatingElements />
          <CursorFollower />
          <div className="relative z-20">
            <SplashScreen />
            <Header />
            {children}
            <Footer />
          </div>
        {/* </ContextProvider> */}
      </body>
    </html>
  )
}