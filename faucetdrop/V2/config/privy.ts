// config/privy.ts
"use client"

import { type Chain } from 'viem'
import { arbitrum, base, lisk, celo, bsc } from 'viem/chains'

export const supportedChains: [Chain, ...Chain[]] = [
  arbitrum,
  base,
  celo,
  lisk,
  bsc
]

// Privy configuration - supports BOTH embedded and external wallets
export const privyConfig = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
  config: {
    appearance: {
      // CHANGED: Use 'system' to automatically toggle based on user's OS/Browser settings
      theme: 'system' as const, 
      accentColor: '#3b82f6',
      logo: 'https://FaucetDrops.io/favicon.png',
      landingHeader: 'Join FaucetDrops',
      loginMessage: 'Connect to start your onchain journey',
    },
    // All login methods available
    loginMethods: ['email', 'wallet', 'google', 'twitter', 'discord', 'telegram', 'farcaster', ] as const,
    embeddedWallets: {
      createOnLogin: 'all-users' as const,
      requireUserPasswordOnCreate: false,
      noPromptOnSignature: false,
    },
    defaultChain: celo,
    supportedChains,
    walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  }
}