'use client'

import { useAccount, useDisconnect } from 'wagmi'
import { useEnsName, useEnsAvatar } from 'wagmi'
import { normalize } from 'viem/ens'
import { useState, useEffect, useCallback } from 'react'
import type { Wallet, UnifiedBalance } from '@/lib/types/defi'

export interface Web3ContextType {
  connectedWallets: Wallet[]
  unifiedBalance: UnifiedBalance | null
  isConnecting: boolean
  addWallet: (address: string) => Promise<void>
  removeWallet: (address: string) => void
  refreshBalances: () => Promise<void>
}

/**
 * Custom hook for ENS identity (name + avatar)
 */
export function useEnsIdentity(address: `0x${string}` | undefined) {
  const { data: ensName, isLoading: isLoadingName } = useEnsName({
    address,
    chainId: 1, // ENS is on mainnet
  })

  const { data: ensAvatar, isLoading: isLoadingAvatar } = useEnsAvatar({
    name: ensName ? normalize(ensName) : undefined,
    chainId: 1,
  })

  return {
    ensName,
    ensAvatar,
    isLoading: isLoadingName || isLoadingAvatar,
    displayName: ensName || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''),
  }
}

/**
 * Main Web3 provider hook - connects to real wallets via wagmi
 */
export function useWeb3Provider() {
  const { address, isConnected, isConnecting: wagmiConnecting } = useAccount()
  const { disconnect } = useDisconnect()

  // Track multiple wallet addresses for multi-wallet support
  const [connectedWallets, setConnectedWallets] = useState<Wallet[]>([])
  const [unifiedBalance, setUnifiedBalance] = useState<UnifiedBalance | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Sync connected wallet when wagmi state changes
  useEffect(() => {
    if (address && isConnected) {
      setConnectedWallets(prev => {
        const exists = prev.some(w => w.address.toLowerCase() === address.toLowerCase())
        if (!exists) {
          return [...prev, {
            address,
            chainId: 1,
            balance: '0',
            isConnected: true,
            label: `Wallet ${address.slice(0, 6)}...`,
          }]
        }
        return prev
      })
    }
  }, [address, isConnected])

  const addWallet = useCallback(async (newAddress: string) => {
    setIsConnecting(true)
    try {
      // Add wallet to our tracked list
      setConnectedWallets(prev => {
        const exists = prev.some(w => w.address.toLowerCase() === newAddress.toLowerCase())
        if (!exists) {
          return [...prev, {
            address: newAddress,
            chainId: 1,
            balance: '0',
            isConnected: true,
            label: `Wallet ${newAddress.slice(0, 6)}...`,
          }]
        }
        return prev
      })
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const removeWallet = useCallback((addressToRemove: string) => {
    setConnectedWallets(prev =>
      prev.filter(w => w.address.toLowerCase() !== addressToRemove.toLowerCase())
    )

    // If removing the currently connected wallet, disconnect
    if (address?.toLowerCase() === addressToRemove.toLowerCase()) {
      disconnect()
    }
  }, [address, disconnect])

  const refreshBalances = useCallback(async () => {
    if (connectedWallets.length === 0) return

    setIsConnecting(true)
    try {
      // TODO: Implement real balance fetching via Zerion API
      // This will be replaced in Phase 2
      await new Promise(resolve => setTimeout(resolve, 500))
    } finally {
      setIsConnecting(false)
    }
  }, [connectedWallets])

  return {
    connectedWallets,
    unifiedBalance,
    isConnecting: isConnecting || wagmiConnecting,
    isConnected,
    primaryAddress: address,
    addWallet,
    removeWallet,
    refreshBalances,
    disconnect,
  }
}
