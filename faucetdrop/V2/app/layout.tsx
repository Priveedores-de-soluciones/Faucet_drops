import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { WalletProvider } from "@/components/wallet-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { NetworkProvider } from "@/hooks/use-network"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FaucetDrops",
  description: "Token Drops Made Easy 💧",
    
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <link rel="icon" href="/favicon.png" /> 
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <NetworkProvider>
            <WalletProvider>
              {children}
              <Toaster />
            </WalletProvider>
          </NetworkProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
