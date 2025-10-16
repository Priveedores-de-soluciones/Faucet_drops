"use client"

import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { NetworkProvider } from "@/hooks/use-network"
import { WalletProvider } from "@/components/wallet-provider"
import { Footer } from "@/components/footer"
import { QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { wagmiAdapter, queryClient, projectId } from '@/config/appkit'

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" />
        <title>FaucetDrops</title>
        <meta name="description" content="Token Drops Made Easy 💧" />
      </head>
      <body className={inter.className}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="system" 
          enableSystem 
          disableTransitionOnChange
        >
          <WagmiProvider config={wagmiAdapter.wagmiConfig}>
            <QueryClientProvider client={queryClient}>
              <NetworkProvider>
                <WalletProvider>
                  <div className="min-h-screen flex flex-col">
                    <main className="flex-1">
                      {children}
                    </main>
                    <Footer />
                  </div>
                  <Toaster />
                </WalletProvider>
              </NetworkProvider>
            </QueryClientProvider>
          </WagmiProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}