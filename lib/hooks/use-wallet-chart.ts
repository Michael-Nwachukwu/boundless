'use client'

import { useQuery } from '@tanstack/react-query'
import { getWalletChart } from '@/lib/api/zerion'

export type ChartPeriod = 'hour' | 'day' | 'week' | 'month' | 'year' | 'max'

export interface ChartPoint {
    timestamp: number // Unix timestamp
    value: number     // USD value
}

export function useWalletChart(address?: string, period: ChartPeriod = 'day') {
    return useQuery({
        queryKey: ['wallet-chart', address, period],
        queryFn: async () => {
            if (!address) return null

            const response = await getWalletChart(address, period)

            if (!response || !response.data) {
                return []
            }

            // Transform Zerion chart format to standard array of points
            // Zerion returns data.attributes.points as [[timestamp, value], ...]
            const points: ChartPoint[] = response.data.attributes.points.map((point: any) => ({
                timestamp: point[0],
                value: point[1]
            }))

            return points
        },
        enabled: !!address,
        retry: 1,
        staleTime: 300000, // 5 minutes
        refetchOnWindowFocus: false,
    })
}
