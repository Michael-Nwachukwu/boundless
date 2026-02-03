'use client'

import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useWalletChart, ChartPeriod } from '@/lib/hooks/use-wallet-chart'
import { useUnifiedBalance } from '@/lib/hooks/use-unified-balance'
import { formatCurrency } from '@/lib/utils'

interface WalletChartProps {
    address: string
}

export function WalletChart({ address }: WalletChartProps) {
    const [period, setPeriod] = useState<ChartPeriod>('day')
    const [isChartVisible, setIsChartVisible] = useState(true)
    const { data: chartPoints, isLoading: isChartLoading } = useWalletChart(address, period)
    const { data: balance, isLoading: isBalanceLoading } = useUnifiedBalance(address)

    const periods: { label: string; value: ChartPeriod }[] = [
        { label: '1H', value: 'hour' },
        { label: '1D', value: 'day' },
        { label: '1W', value: 'week' },
        { label: '1M', value: 'month' },
        { label: '1Y', value: 'year' },
    ]

    // Calculate change percentage
    const changePercent = useMemo(() => {
        if (!chartPoints || chartPoints.length < 2) return 0
        const first = chartPoints[0].value
        const last = chartPoints[chartPoints.length - 1].value
        if (first === 0) return 0
        return ((last - first) / first) * 100
    }, [chartPoints])

    const isPositive = changePercent >= 0

    // Calculate counts
    const walletCount = balance?.byWallet ? Object.keys(balance.byWallet).length : 0
    const networkCount = balance?.byChain ? Object.keys(balance.byChain).length : 0

    if (!address) return null

    return (
        <div className="w-full space-y-4">
            {/* Header: Balance & Change + Counts */}
            <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                    <span className="text-neutral-400 text-sm font-medium">Total Balance</span>
                    <div className="flex items-baseline gap-3">
                        <h2 className="text-4xl font-bold tracking-tight text-white">
                            {isBalanceLoading ? (
                                <div className="h-10 w-48 bg-neutral-800 animate-pulse rounded" />
                            ) : (
                                formatCurrency(balance?.totalUsd || 0)
                            )}
                        </h2>
                        {!isChartLoading && chartPoints && (
                            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${isPositive
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-red-500/10 text-red-500'
                                }`}>
                                {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                            </span>
                        )}
                    </div>
                </div>

                {/* Counts */}
                <div className="flex gap-4 pb-1">
                    <div className="text-right">
                        <div className="text-2xl font-bold text-white">{walletCount}</div>
                        <div className="text-xs text-neutral-400 font-medium">Wallets</div>
                    </div>
                    <div className="text-right pl-4 border-l border-neutral-800">
                        <div className="text-2xl font-bold text-white">{networkCount}</div>
                        <div className="text-xs text-neutral-400 font-medium">Networks</div>
                    </div>
                </div>
            </div>

            {/* Chart Area - Collapsible */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isChartVisible ? 'max-h-[320px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="h-[280px] w-full -ml-2">
                    {isChartLoading ? (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600">
                            Loading chart data...
                        </div>
                    ) : !chartPoints || chartPoints.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600">
                            No chart data available
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartPoints}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="timestamp"
                                    hide
                                />
                                <YAxis
                                    hide
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 shadow-xl">
                                                    <p className="text-sm font-bold text-white">
                                                        {formatCurrency(payload[0].value as number)}
                                                    </p>
                                                    <p className="text-xs text-neutral-400">
                                                        {new Date((payload[0].payload.timestamp) * 1000).toLocaleString()}
                                                    </p>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={isPositive ? '#22c55e' : '#ef4444'}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Period Switcher + Toggle Button */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    {periods.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => setPeriod(p.value)}
                            disabled={!isChartVisible}
                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${period === p.value
                                ? 'bg-neutral-800 text-white'
                                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
                                } ${!isChartVisible ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Chart Toggle Button */}
                <button
                    onClick={() => setIsChartVisible(!isChartVisible)}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800/50 transition-colors"
                >
                    {isChartVisible ? (
                        <>
                            <ChevronUp className="w-4 h-4" />
                            Hide Chart
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-4 h-4" />
                            Show Chart
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
