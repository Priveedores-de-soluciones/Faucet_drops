"use client"

import type React from "react"
import { useEffect } from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import { NetworkProvider } from "@/hooks/use-network"
import { WalletProvider } from "@/components/wallet-provider"
import { Footer } from "@/components/footer"
import { Providers } from "@/components/PrivyProvider" // Import your Providers component
import sdk from "@farcaster/miniapp-sdk"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  
  useEffect(() => {
    const init = async () => {
      try {
        setTimeout(() => {
          sdk.actions.ready();
        }, 300);
      } catch (error) {
        console.warn("Failed to initialize Farcaster SDK", error);
      }
    };
    init();
  }, []);

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        
        {/* Primary Meta Tags */}
        <title>FaucetDrops</title>
        <meta name="title" content="app.FaucetDrops - Automated Onchain Reward and Engagement Platform" />
        <meta name="description" content="Automated onchain reward and engagement platform 💧. Distribute tokens effortlessly across multiple chains." />
        
        {/* Open Graph / Facebook / WhatsApp / Telegram */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://app.FaucetDrops.io/" />
        <meta property="og:site_name" content="app.FaucetDrops" />
        <meta property="og:title" content="app.FaucetDrops - Automated Onchain Reward and Engagement Platform" />
        <meta property="og:description" content="Automated onchain reward and engagement platform 💧. Distribute tokens effortlessly across multiple chains." />
        <meta property="og:image" content="https://app.FaucetDrops.io/opengraph-image" />
        <meta property="og:image:secure_url" content="https://app.FaucetDrops.io/opengraph-image" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="app.FaucetDrops - Automated onchain reward and engagement platform" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://app.FaucetDrops.io/" />
        <meta name="twitter:title" content="app.FaucetDrops - Automated Onchain Reward and Engagement Platform" />
        <meta name="twitter:description" content="Automated onchain reward and engagement platform 💧. Distribute tokens effortlessly across multiple chains." />
        <meta name="twitter:image" content="https://app.FaucetDrops.io/opengraph-image" />
        <meta name="twitter:image:alt" content="app.FaucetDrops - Automated onchain reward and engagement platform" />
        
        {/* Additional SEO */}
        <meta name="keywords" content="token drops, crypto faucet, onchain rewards, web3 engagement, token distribution, blockchain rewards" />
        <meta name="author" content="FaucetDrops" />
        <link rel="canonical" href="https://app.FaucetDrops.io/" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#020817" />
      </head>
      <body className={inter.className}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="system" 
          enableSystem 
          disableTransitionOnChange
        >
          {/* SINGLE PROVIDER WRAPPER - handles Privy, Wagmi, and QueryClient */}
          <Providers>
            <NetworkProvider>
              <WalletProvider>
                <div className="min-h-screen flex flex-col">
                  <main className="flex-1">
                    {children}
                  </main>
                  <Footer />
                </div>
                <Toaster richColors position="top-center" closeButton />
              </WalletProvider>
            </NetworkProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}