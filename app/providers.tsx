'use client'

import { WagmiProvider, http, createConfig } from 'wagmi'
import { mainnet, optimism, base, arbitrum } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { type ReactNode, useState } from 'react'

// Define Lisk chain (not in wagmi defaults)
const lisk = {
    id: 1135,
    name: 'Lisk',
    nativeCurrency: {
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: { http: ['https://rpc.api.lisk.com'] },
    },
    blockExplorers: {
        default: { name: 'Lisk Explorer', url: 'https://blockscout.lisk.com' },
    },
} as const

// Wagmi configuration
// Note: You must set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local
// Get a free project ID at https://cloud.walletconnect.com/
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

if (!projectId) {
    console.warn(
        '⚠️ NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set! ' +
        'Wallet connection will not work. ' +
        'Get a free project ID at https://cloud.walletconnect.com/'
    )
}

const config = getDefaultConfig({
    appName: 'Boundless',
    projectId: projectId || '', // Fallback to empty string if missing (will warn in console)
    chains: [mainnet, optimism, base, arbitrum, lisk],
    transports: {
        [mainnet.id]: http(process.env.NEXT_PUBLIC_RPC_MAINNET),
        [optimism.id]: http(process.env.NEXT_PUBLIC_RPC_OPTIMISM),
        [base.id]: http(process.env.NEXT_PUBLIC_RPC_BASE),
        [arbitrum.id]: http(process.env.NEXT_PUBLIC_RPC_ARBITRUM),
        [lisk.id]: http(process.env.NEXT_PUBLIC_RPC_LISK || 'https://rpc.api.lisk.com'),
    },
    ssr: true,
})

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient())

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={darkTheme({
                        accentColor: '#f97316', // Orange-500 to match Boundless theme
                        accentColorForeground: 'white',
                        borderRadius: 'medium',
                        fontStack: 'system',
                    })}
                >
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    )
}
