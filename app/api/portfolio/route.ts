import { NextRequest, NextResponse } from 'next/server'

const ZERION_API = 'https://api.zerion.io/v1'
const ZERION_API_KEY = process.env.ZERION_API_KEY || process.env.NEXT_PUBLIC_ZERION_API_KEY

// Supported chains for LI.FI
const SUPPORTED_CHAIN_IDS = 'ethereum,optimism,base,arbitrum'

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60000 // 60 seconds

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    // Check cache first
    const cacheKey = `portfolio-${address}`
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
                // Cache for 60 seconds on the server
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
        console.log('[API] Got', data.data?.length || 0, 'positions')

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
