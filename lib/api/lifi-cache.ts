import { SUPPORTED_CHAINS } from '@/lib/api/lifi-tokens'

const LIFI_API = 'https://li.quest/v1'

// Cache structure: Map<chainId, Set<lowercaseAddress>>
let tokenAddressCache: Map<number, Set<string>> = new Map()
let cacheTimestamp = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Fetch and cache LI.FI supported token addresses for all chains
 * Only stores addresses (not full token data) to minimize memory usage
 */
export async function refreshLiFiTokenCache(): Promise<void> {
    // Skip if cache is still fresh
    if (Date.now() - cacheTimestamp < CACHE_DURATION && tokenAddressCache.size > 0) {
        console.log('[LiFi Cache] Using existing cache')
        return
    }

    console.log('[LiFi Cache] Refreshing token cache...')
    const chainIds = Object.values(SUPPORTED_CHAINS)

    try {
        // Fetch tokens for all chains in one request
        const chainsParam = chainIds.join(',')
        const response = await fetch(`${LIFI_API}/tokens?chains=${chainsParam}`)

        if (!response.ok) {
            console.error('[LiFi Cache] Failed to fetch tokens:', response.status)
            return
        }

        const data = await response.json()
        const newCache = new Map<number, Set<string>>()

        // Extract just the addresses for each chain
        for (const chainId of chainIds) {
            const tokens = data.tokens?.[chainId] || []
            const addressSet = new Set<string>()

            for (const token of tokens) {
                if (token.address) {
                    addressSet.add(token.address.toLowerCase())
                }
            }

            newCache.set(chainId, addressSet)
            console.log(`[LiFi Cache] Chain ${chainId}: ${addressSet.size} tokens cached`)
        }

        tokenAddressCache = newCache
        cacheTimestamp = Date.now()
        console.log('[LiFi Cache] Cache refresh complete')
    } catch (error) {
        console.error('[LiFi Cache] Error refreshing cache:', error)
    }
}

/**
 * Check if a token is supported by LI.FI on a specific chain
 * Native tokens (ETH, BNB, etc.) are represented by zero address
 */
export function isTokenSupportedByLiFi(chainId: number, tokenAddress: string): boolean {
    const addressSet = tokenAddressCache.get(chainId)
    if (!addressSet) return false

    // Normalize address
    const normalizedAddress = tokenAddress.toLowerCase()

    // Check direct match
    if (addressSet.has(normalizedAddress)) return true

    // Native tokens often use special addresses
    // LI.FI uses 0x0000...0000 for native tokens
    const nativeAddress = '0x0000000000000000000000000000000000000000'
    if (normalizedAddress === nativeAddress || normalizedAddress === 'eth') {
        return addressSet.has(nativeAddress)
    }

    return false
}

/**
 * Get the count of cached tokens for a chain
 */
export function getCachedTokenCount(chainId: number): number {
    return tokenAddressCache.get(chainId)?.size || 0
}

/**
 * Check if cache is initialized
 */
export function isCacheInitialized(): boolean {
    return tokenAddressCache.size > 0
}
