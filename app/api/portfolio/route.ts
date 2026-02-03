import { NextRequest, NextResponse } from 'next/server'
import { SUPPORTED_CHAINS } from '@/lib/api/lifi-tokens'
import { refreshLiFiTokenCache, isTokenSupportedByLiFi, isCacheInitialized } from '@/lib/api/lifi-cache'

const ZERION_API = 'https://api.zerion.io/v1'
const ZERION_API_KEY = process.env.ZERION_API_KEY || process.env.NEXT_PUBLIC_ZERION_API_KEY

// Supported chains for Zerion API
const SUPPORTED_CHAIN_IDS = 'ethereum,optimism,base,arbitrum,binance-smart-chain,scroll,zksync-era'

// Simple in-memory cache for portfolio data
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60000 // 60 seconds

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    const skipLifiFilter = searchParams.get('skipLifiFilter') === 'true'

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    // Ensure LI.FI token cache is populated
    if (!isCacheInitialized()) {
        await refreshLiFiTokenCache()
    }

    // Check cache first
    const cacheKey = `portfolio-${address}-${skipLifiFilter}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('[API] Returning cached portfolio for:', address)
        return NextResponse.json(cached.data)
    }

    if (!ZERION_API_KEY) {
        console.error('[API] No Zerion API key configured')
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    try {
        // Create Basic Auth header
        const authHeader = `Basic ${Buffer.from(ZERION_API_KEY + ':').toString('base64')}`

        console.log('[API] Fetching portfolio for:', address)

        const response = await fetch(
            `${ZERION_API}/wallets/${address}/positions?filter[chain_ids]=${SUPPORTED_CHAIN_IDS}&filter[trash]=only_non_trash&currency=usd&sort=value`,
            {
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                },
                next: { revalidate: 60 }
            }
        )

        if (response.status === 429) {
            console.error('[API] Rate limited by Zerion')
            return NextResponse.json(
                { error: 'Rate limited. Please try again in a minute.' },
                { status: 429 }
            )
        }

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[API] Zerion API error:', response.status, errorText)
            return NextResponse.json(
                { error: `Zerion API error: ${response.status}` },
                { status: response.status }
            )
        }

        const data = await response.json()
        console.log('[API] Got', data.data?.length || 0, 'positions from Zerion')

        // Filter positions to only include LI.FI supported tokens
        if (!skipLifiFilter && data.data) {
            const originalCount = data.data.length
            data.data = data.data.filter((position: any) => {
                const chainName = position.relationships?.chain?.data?.id
                const chainId = SUPPORTED_CHAINS[chainName as keyof typeof SUPPORTED_CHAINS]

                if (!chainId) {
                    console.log(`[API] Filtering out: unsupported chain ${chainName}`)
                    return false
                }

                // Get token address from position ID or fungible_info
                const fungibleInfo = position.attributes?.fungible_info
                const implementations = fungibleInfo?.implementations || []
                const impl = implementations.find((i: any) => i.chain_id === chainName)
                const tokenAddress = impl?.address || '0x0000000000000000000000000000000000000000'

                const isSupported = isTokenSupportedByLiFi(chainId, tokenAddress)

                if (!isSupported) {
                    const symbol = fungibleInfo?.symbol || 'UNKNOWN'
                    console.log(`[API] Filtering out: ${symbol} on ${chainName} (not LI.FI supported)`)
                }

                return isSupported
            })
            console.log(`[API] Filtered: ${originalCount} -> ${data.data.length} positions (LI.FI supported only)`)
        }

        // Cache the result
        cache.set(cacheKey, { data, timestamp: Date.now() })

        return NextResponse.json(data)
    } catch (error) {
        console.error('[API] Error fetching portfolio:', error)
        return NextResponse.json(
            { error: 'Failed to fetch portfolio' },
            { status: 500 }
        )
    }
}
