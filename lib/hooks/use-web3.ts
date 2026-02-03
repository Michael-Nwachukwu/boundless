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

  // Simplified wallet object for the UI
  const primaryWallet: Wallet | null = address && isConnected ? {
    address,
    chainId: 1, // We could get this from useNetwork if needed
    balance: '0', // Will be fetched by unified balance hook
    isConnected: true,
    label: `Wallet ${address.slice(0, 6)}...`,
  } : null

  return {
    // Single wallet mode: 'connectedWallets' is just an array of one
    connectedWallets: primaryWallet ? [primaryWallet] : [],
    isConnecting: wagmiConnecting,
    isConnected,
    primaryAddress: address,
    // No-op functions to keep interface compatible for now, or we can remove them
    addWallet: async () => { },
    removeWallet: () => disconnect(),
    refreshBalances: async () => { }, // React Query handles this
    disconnect,
  }
}
