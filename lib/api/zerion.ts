import axios from 'axios'
import { isTokenSupported, SUPPORTED_CHAINS } from './lifi-tokens'

const ZERION_API = 'https://api.zerion.io/v1'

const zerionClient = axios.create({
    baseURL: ZERION_API,
    headers: {
        'Authorization': `Basic ${typeof window !== 'undefined' ? window.btoa(process.env.NEXT_PUBLIC_ZERION_API_KEY + ':') : Buffer.from(process.env.NEXT_PUBLIC_ZERION_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
    },
})

// Supported chains mapping for Zerion
// Zerion uses string IDs like 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base'
const ZERION_CHAIN_IDS = Object.keys(SUPPORTED_CHAINS).join(',')

export interface ZerionAsset {
    type: string
    id: string
    attributes: {
        name: string
        symbol: string
        decimals: number
        quantity: {
            numeric: string
            decimals: string
        }
        value?: number
        price?: number
        changes?: {
            percent_1d: number
        }
    }
    relationships: {
        chain: {
            data: {
                type: string
                id: string
            }
        }
    }
}

export interface ZerionPosition {
    type: string
    id: string
    attributes: {
        protocol: string
        name: string
        position_type: string // 'deposit' | 'loan' | 'stake' | etc.
        quantity: {
            numeric: string
        }
        value: number
    }
}

export async function getWalletPortfolio(address: string) {
    try {
        console.log('[Zerion] Fetching portfolio via API route for:', address)

        // Use our internal API route which has caching and rate limit protection
        const response = await fetch(`/api/portfolio?address=${address}`)

        if (response.status === 429) {
            console.log('[Zerion] Rate limited - returning empty data')
            return { data: [] }
        }

        if (!response.ok) {
            const error = await response.json()
            console.error('[Zerion] API error:', error)
            return { data: [] }
        }

        const data = await response.json()
        console.log('[Zerion] Got positions:', data.data?.length || 0)
        return data
    } catch (error) {
        console.error('Error fetching Zerion portfolio:', error)
        return { data: [] } // Return empty instead of throwing
    }
}

export async function getWalletPositions(address: string) {
    try {
        const response = await zerionClient.get(`/wallets/${address}/positions`, {
            params: {
                'filter[chain_ids]': ZERION_CHAIN_IDS,
                'filter[trash]': 'only_non_trash',
                'currency': 'usd',
            },
        })
        return response.data
    } catch (error) {
        console.error('Error fetching Zerion positions:', error)
        throw error
    }
}
export async function getWalletChart(address: string, period: string = 'day') {
    try {
        console.log(`[Zerion] Fetching chart via API route for: ${address} (${period})`)

        // Use our internal API route
        const response = await fetch(`/api/portfolio/chart?address=${address}&period=${period}`)

        if (response.status === 429) {
            console.log('[Zerion] Chart rate limited - returning null')
            return null
        }

        if (!response.ok) {
            console.error('[Zerion] Chart API error:', response.status)
            return null
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error fetching Zerion chart:', error)
        return null
    }
}
