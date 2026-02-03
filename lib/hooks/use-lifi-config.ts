'use client'

import { useEffect, useRef } from 'react'
import { createConfig, EVM } from '@lifi/sdk'
import { useConfig } from 'wagmi'
import { getWalletClient, switchChain } from '@wagmi/core'

// Integrator configuration
const INTEGRATOR = 'stoneplace'
const INTEGRATOR_FEE = 0.01 // 1% fee

/**
 * Hook to initialize LI.FI SDK with the current wagmi config
 * Must be called within a WagmiProvider context
 */
export function useLifiConfig() {
    const wagmiConfig = useConfig()
    const isInitialized = useRef(false)

    useEffect(() => {
        if (isInitialized.current) return
        isInitialized.current = true

        console.log('[LI.FI] Initializing SDK with wagmi EVM provider')

        try {
            createConfig({
                integrator: INTEGRATOR,
                routeOptions: {
                    fee: INTEGRATOR_FEE, // 1% fee applied to all requests
                },
                providers: [
                    EVM({
                        getWalletClient: async () => {
                            try {
                                const client = await getWalletClient(wagmiConfig)
                                return client
                            } catch (error) {
                                console.error('[LI.FI] Error getting wallet client:', error)
                                throw error
                            }
                        },
                        switchChain: async (chainId: number) => {
                            try {
                                const chain = await switchChain(wagmiConfig, { chainId })
                                const client = await getWalletClient(wagmiConfig, { chainId: chain.id })
                                return client
                            } catch (error) {
                                console.error('[LI.FI] Error switching chain:', error)
                                throw error
                            }
                        },
                    }),
                ],
            })

            console.log('[LI.FI] SDK initialized successfully')
        } catch (error) {
            console.error('[LI.FI] Failed to initialize SDK:', error)
        }
    }, [wagmiConfig])
}
