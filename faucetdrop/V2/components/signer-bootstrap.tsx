// components/signer-bootstrap.tsx
"use client"
import { useEffect } from "react"
import { useWallet } from "@/components/wallet-provider"
import { registerSignerGetter } from "@/lib/get-signer"

export function SignerBootstrap() {
  const { getActiveSigner } = useWallet()

  useEffect(() => {
    registerSignerGetter(getActiveSigner)
  }, [getActiveSigner])

  return null
}