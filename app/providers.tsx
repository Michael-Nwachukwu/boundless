'use client'

import { WagmiProvider, http, createConfig } from 'wagmi'
import { mainnet, optimism, base, arbitrum, bsc, scroll, zksync } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { type ReactNode, useState } from 'react'

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
    chains: [mainnet, optimism, base, arbitrum, bsc, scroll, zksync],
    transports: {
        [mainnet.id]: http(process.env.NEXT_PUBLIC_RPC_MAINNET),
        [optimism.id]: http(process.env.NEXT_PUBLIC_RPC_OPTIMISM),
        [base.id]: http(process.env.NEXT_PUBLIC_RPC_BASE),
        [arbitrum.id]: http(process.env.NEXT_PUBLIC_RPC_ARBITRUM),
        [bsc.id]: http(process.env.NEXT_PUBLIC_RPC_BSC || 'https://bsc-dataseed.binance.org/'),
        [scroll.id]: http(process.env.NEXT_PUBLIC_RPC_SCROLL || 'https://rpc.scroll.io'),
        [zksync.id]: http(process.env.NEXT_PUBLIC_RPC_ZKSYNC || 'https://mainnet.era.zksync.io'),
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
