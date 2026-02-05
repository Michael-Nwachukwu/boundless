import { getRoutes } from '@lifi/sdk'
import type { Route, RoutesRequest } from '@lifi/sdk'

// Note: LI.FI SDK is now initialized via useLifiConfig hook in components
// This allows proper integration with wagmi's wallet client for transaction execution

// Supported chain IDs (matching our lifi-tokens.ts)
export const CHAIN_IDS = {
    ethereum: 1,
    optimism: 10,
    base: 8453,
    arbitrum: 42161,
    bsc: 56,
    scroll: 534352,
    zksync: 324,
} as const

/**
 * Get optimal routes for a cross-chain swap/bridge
 */
// ... imports

export async function getOptimalRoutes(params: {
    fromChainId: number
    toChainId: number
    fromTokenAddress: string
    toTokenAddress: string
    fromAmount: string
    fromAddress: string
    toAddress?: string
    slippage?: number
    contractCalls?: any[] // Support for contract calls
}): Promise<Route[]> {
    const routesRequest: any = {
        fromChainId: params.fromChainId,
        toChainId: params.toChainId,
        fromTokenAddress: params.fromTokenAddress,
        toTokenAddress: params.toTokenAddress,
        fromAmount: params.fromAmount,
        fromAddress: params.fromAddress,
        toAddress: params.toAddress || params.fromAddress,
        options: {
            slippage: params.slippage || 0.005, // 0.5% default slippage
            order: 'RECOMMENDED',
            allowSwitchChain: true,
            // Note: fee and integrator are configured globally in use-lifi-config.ts
            // Do NOT set them here or they will double-apply and reduce fromAmount incorrectly
        },
    }

    if (params.contractCalls && params.contractCalls.length > 0) {
        routesRequest.contractCalls = params.contractCalls
    }

    try {
        const result = await getRoutes(routesRequest as RoutesRequest)
        return result.routes
    } catch (error) {
        console.error('[LI.FI] Error fetching routes:', error)
        return []
    }
}

/**
 * Execute a route using the connected wallet
 * Returns a promise that resolves when execution completes
 */
export async function executeRoute(
    route: Route,
    updateCallback?: (status: any) => void
): Promise<void> {
    const { executeRoute: executeLifiRoute } = await import('@lifi/sdk')

    try {
        await executeLifiRoute(route, {
            updateRouteHook: (updatedRoute) => {
                console.log('[LI.FI] Route update:', updatedRoute.id)
                if (updateCallback) {
                    updateCallback(updatedRoute)
                }
            },
        })
    } catch (error) {
        console.error('[LI.FI] Execution error:', error)
        throw error
    }
}

/**
 * Get a quote for a single token swap (simpler than full routing)
 */
export async function getQuote(params: {
    fromChain: number
    toChain: number
    fromToken: string
    toToken: string
    fromAmount: string
    fromAddress: string
}) {
    const { getQuote: getLifiQuote } = await import('@lifi/sdk')

    try {
        const quote = await getLifiQuote({
            fromChain: params.fromChain,
            toChain: params.toChain,
            fromToken: params.fromToken,
            toToken: params.toToken,
            fromAmount: params.fromAmount,
            fromAddress: params.fromAddress,
        })
        return quote
    } catch (error) {
        console.error('[LI.FI] Error fetching quote:', error)
        return null
    }
}

/**
 * Convert chain name to chain ID
 * Handles various naming conventions from different data sources (Zerion, LI.FI, etc.)
 */
export function getChainId(chainName: string): number {
    const normalized = chainName.toLowerCase().replace(/[\s-_]/g, '')

    const mapping: Record<string, number> = {
        // Ethereum
        ethereum: 1,
        eth: 1,
        mainnet: 1,

        // Optimism
        optimism: 10,
        op: 10,
        optimismmainnet: 10,

        // Arbitrum
        arbitrum: 42161,
        arb: 42161,
        arbitrumone: 42161,
        arbitrummainnet: 42161,

        // Base
        base: 8453,
        basemainnet: 8453,

        // BSC
        bsc: 56,
        binancesmartchain: 56,
        bnb: 56,
        bnbchain: 56,

        // Scroll
        scroll: 534352,
        scrollmainnet: 534352,

        // zkSync
        zksync: 324,
        zksyncera: 324,
        zksyncmainnet: 324,
    }

    const chainId = mapping[normalized]
    if (!chainId) {
        console.warn(`[getChainId] Unknown chain name: "${chainName}" (normalized: "${normalized}")`)
        return 0 // Return 0 instead of 1 to avoid false matches
    }
    return chainId
}

/**
 * Get native token address for a chain (LI.FI uses zero address)
 */
export function getNativeTokenAddress(): string {
    return '0x0000000000000000000000000000000000000000'
}

/**
 * Common token addresses by chain
 */
export const TOKEN_ADDRESSES = {
    ethereum: {
        USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        ETH: '0x0000000000000000000000000000000000000000',
    },
    arbitrum: {
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        ETH: '0x0000000000000000000000000000000000000000',
    },
    optimism: {
        USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
        USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
        ETH: '0x0000000000000000000000000000000000000000',
    },
    base: {
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        ETH: '0x0000000000000000000000000000000000000000',
    },
} as const
