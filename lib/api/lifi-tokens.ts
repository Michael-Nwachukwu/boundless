import axios from 'axios'

const LIFI_API = 'https://li.quest/v1'

// Supported chains for Boundless
// Keys match Zerion API chain names, values are chain IDs for LI.FI
export const SUPPORTED_CHAINS = {
    ethereum: 1,
    optimism: 10,
    base: 8453,
    arbitrum: 42161,
    'binance-smart-chain': 56,
    scroll: 534352,
    'zksync-era': 324,
    // monad: TBD when mainnet launches
} as const

export type SupportedChainName = keyof typeof SUPPORTED_CHAINS
export type SupportedChainId = (typeof SUPPORTED_CHAINS)[SupportedChainName]

export interface LiFiToken {
    address: string
    symbol: string
    decimals: number
    chainId: number
    name: string
    priceUSD?: string
    logoURI?: string
}

// In-memory cache for LI.FI tokens
let tokenCache: Map<number, LiFiToken[]> = new Map()
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch all tokens supported by LI.FI for a specific chain
 */
export async function getLiFiTokens(chainId: number): Promise<LiFiToken[]> {
    // Check cache
    if (Date.now() - cacheTimestamp < CACHE_DURATION && tokenCache.has(chainId)) {
        return tokenCache.get(chainId) || []
    }

    try {
        const response = await axios.get(`${LIFI_API}/tokens`, {
            params: { chains: chainId.toString() },
        })

        const tokens: LiFiToken[] = response.data.tokens[chainId] || []
        tokenCache.set(chainId, tokens)
        cacheTimestamp = Date.now()

        return tokens
    } catch (error) {
        console.error(`Failed to fetch LI.FI tokens for chain ${chainId}:`, error)
        return tokenCache.get(chainId) || []
    }
}

/**
 * Fetch tokens for all supported chains
 */
export async function getAllSupportedTokens(): Promise<Map<number, LiFiToken[]>> {
    const chainIds = Object.values(SUPPORTED_CHAINS)

    await Promise.all(
        chainIds.map(chainId => getLiFiTokens(chainId))
    )

    return tokenCache
}

/**
 * Check if a token is supported by LI.FI on a specific chain
 */
export function isTokenSupported(chainId: number, tokenAddress: string): boolean {
    const tokens = tokenCache.get(chainId) || []
    return tokens.some(
        t => t.address.toLowerCase() === tokenAddress.toLowerCase()
    )
}

/**
 * Get a specific token by address and chain
 */
export function getToken(chainId: number, tokenAddress: string): LiFiToken | undefined {
    const tokens = tokenCache.get(chainId) || []
    return tokens.find(
        t => t.address.toLowerCase() === tokenAddress.toLowerCase()
    )
}

/**
 * Get all cached tokens as a flat array
 */
export function getAllCachedTokens(): LiFiToken[] {
    const allTokens: LiFiToken[] = []
    tokenCache.forEach(tokens => allTokens.push(...tokens))
    return allTokens
}

/**
 * Get chain name from chain ID
 */
export function getChainName(chainId: number): string {
    const entry = Object.entries(SUPPORTED_CHAINS).find(([, id]) => id === chainId)
    return entry ? entry[0] : 'unknown'
}

/**
 * Get chain ID from chain name
 */
export function getChainId(chainName: string): number | undefined {
    return SUPPORTED_CHAINS[chainName as SupportedChainName]
}
