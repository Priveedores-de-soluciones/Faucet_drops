"use client"

import type React from "react"
import { useEffect, useMemo } from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import { NetworkProvider } from "@/hooks/use-network"
import { WalletProvider } from "@/components/wallet-provider"
import { PrivyProvider } from "@privy-io/react-auth"
import { Footer } from "@/components/footer"
import { SubscriptionModalProvider } from "@/components/subscribe"
import { useVisitTracker } from "@/hooks/use-visit-tracker"
import { Providers } from "@/components/privyProvider"
// ── Solana wallet adapter ─────────────────────────────────────────────────────
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets"
import { PrivyImportModal } from "@/components/privy_import"
import { SignerBootstrap } from "@/components/signer-bootstrap"

// ─────────────────────────────────────────────────────────────────────────────

const inter = Inter({ subsets: ["latin"] })

// Solana providers are extracted into their own component so the `useMemo`
// for wallet adapters runs in a proper client component without touching the
// root layout's server-component boundary.
function SolanaProviders({ children }: { children: React.ReactNode }) {
  // Memoised so adapter instances are stable across re-renders
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  )

  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com"

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  useVisitTracker()

 

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />

        {/* Primary Meta Tags */}
        <title>FaucetDrops - The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution</title>
        <meta name="title" content="app.faucetdrops - The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution" />
        <meta
          name="description"
          content="The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution 💧. Distribute rewards effortlessly across multiple chains."
        />
        <meta
          name="talentapp:project_verification"
          content="b30a81da8fe68c308c2b4978535103484c8acb90b729ec9625b7eff07309c1fb86809ee621e63c5eedc5c592ddde2c2d2c2c0e8afa73980dcf6339e92b0839d7"
        />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://app.faucetdrops.io/" />
        <meta property="og:site_name" content="app.faucetdrops" />
        <meta property="og:title" content="app.faucetdrops - The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution" />
        <meta
          property="og:description"
          content="The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution 💧. Distribute rewards effortlessly across multiple chains."
        />
        <meta property="og:image" content="https://app.faucetdrops.io/opengraph-image" />
        <meta property="og:image:secure_url" content="https://app.faucetdrops.io/opengraph-image" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="app.faucetdrops - The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution"
        />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://app.faucetdrops.io/" />
        <meta name="twitter:title" content="app.faucetdrops - The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution" />
        <meta
          name="twitter:description"
          content="The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution 💧. Distribute rewards effortlessly across multiple chains."
        />
        <meta name="twitter:image" content="https://app.faucetdrops.io/opengraph-image" />
        <meta
          name="twitter:image:alt"
          content="app.faucetdrops - The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution"
        />

        {/* Additional SEO */}
        <meta
          name="keywords"
          content="token drops, crypto faucet, onchain rewards, web3 engagement, token distribution, blockchain rewards"
        />
        <meta name="author" content="FaucetDrops" />
        <link rel="canonical" href="https://app.faucetdrops.io/" />
        <meta name="theme-color" content="#020817" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          
          
           <PrivyProvider
              appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
              config={{
                loginMethods: ["google", "twitter", "discord", "github", "email"],
              }}
            >
            <SolanaProviders>
              <NetworkProvider>
                <WalletProvider >
                  <SignerBootstrap />
                  <PrivyImportModal
                      onDismiss={() => console.log("skipped")}
                      onComplete={({ evmAddress, solanaAddress }) => console.log(evmAddress, solanaAddress)}
                    />
                  <Providers>
                  <SubscriptionModalProvider>
                    <div className="min-h-screen flex flex-col">
                      <main className="flex-1">{children}</main>
                      <Footer />
                    </div>
                    <Toaster richColors position="top-center" closeButton />
                  </SubscriptionModalProvider>
                  </Providers>
                </WalletProvider>
              </NetworkProvider>
            </SolanaProviders>
          </PrivyProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}