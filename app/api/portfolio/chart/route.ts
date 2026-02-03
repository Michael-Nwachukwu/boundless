import { NextRequest, NextResponse } from 'next/server'

const ZERION_API = 'https://api.zerion.io/v1'
const ZERION_API_KEY = process.env.ZERION_API_KEY || process.env.NEXT_PUBLIC_ZERION_API_KEY

// Supported chains for Zerion API (matching what we use in portfolio)
const SUPPORTED_CHAIN_IDS = 'ethereum,optimism,base,arbitrum,binance-smart-chain,scroll,zksync-era'

// Cache configuration
const CACHE_TTL = 300000 // 5 minutes (charts change less frequently)
const cache = new Map<string, { data: any; timestamp: number }>()

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    const period = searchParams.get('period') || 'day'

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    // Validate period enum
    const validPeriods = ['hour', 'day', 'week', 'month', 'year', 'max']
    const chartPeriod = validPeriods.includes(period) ? period : 'day'

    if (!ZERION_API_KEY) {
        console.error('[API] No Zerion API key configured')
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Check cache
    const cacheKey = `chart-${address}-${chartPeriod}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[API] Returning cached chart for ${address} (${chartPeriod})`)
        return NextResponse.json(cached.data)
    }

    try {
        const authHeader = `Basic ${Buffer.from(ZERION_API_KEY + ':').toString('base64')}`

        console.log(`[API] Fetching chart for ${address} (${chartPeriod})`)

        const response = await fetch(
            `${ZERION_API}/wallets/${address}/charts/${chartPeriod}?currency=usd&filter[chain_ids]=${SUPPORTED_CHAIN_IDS}`,
            {
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                },
                next: { revalidate: 300 } // Cache for 5 minutes
            }
        )

        if (response.status === 429) {
            console.error('[API] Rate limited by Zerion (charts)')
            return NextResponse.json(
                { error: 'Rate limited' },
                { status: 429 }
            )
        }

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[API] Zerion Chart API error:', response.status, errorText)
            return NextResponse.json(
                { error: `Zerion API error: ${response.status}` },
                { status: response.status }
            )
        }

        const data = await response.json()

        // Cache successful response
        cache.set(cacheKey, { data, timestamp: Date.now() })

        return NextResponse.json(data)

    } catch (error) {
        console.error('[API] Error fetching chart:', error)
        return NextResponse.json(
            { error: 'Failed to fetch chart data' },
            { status: 500 }
        )
    }
}
