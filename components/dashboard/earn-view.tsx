"use client"

import { useState, useEffect } from "react"
import { ArrowUpRight, Loader2, Wallet, ExternalLink } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SUPPORTED_EARN_MARKETS } from "@/lib/constants/aave"
import { getAaveSupplyAPY } from "@/lib/api/aave"
import type { Balance } from "@/lib/types/defi"

interface EarnViewProps {
    onZap: (market: typeof SUPPORTED_EARN_MARKETS[0]) => void
}

export function EarnView({ onZap }: EarnViewProps) {
    const [apys, setApys] = useState<Record<string, number>>({})
    const [loadingApys, setLoadingApys] = useState(true)

    useEffect(() => {
        async function fetchApys() {
            setLoadingApys(true)
            const results: Record<string, number> = {}

            // formatting key as chainId-asset
            await Promise.all(SUPPORTED_EARN_MARKETS.map(async (market) => {
                if (market.underlying) {
                    const apy = await getAaveSupplyAPY(market.chainId, market.underlying)
                    results[`${market.chainId}-${market.asset}`] = apy
                }
            }))

            setApys(results)
            setLoadingApys(false)
        }

        fetchApys()
    }, [])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Earn Yield</h2>
                    <p className="text-neutral-400 text-sm">One-click deposit into verified Aave V3 markets</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SUPPORTED_EARN_MARKETS.map((market, idx) => {
                    const apy = apys[`${market.chainId}-${market.asset}`]
                    const isLoading = loadingApys && apy === undefined

                    return (
                        <Card
                            key={idx}
                            className="bg-neutral-900 border-neutral-800 p-5 hover:border-orange-500/30 transition-all cursor-pointer group"
                            onClick={() => onZap(market)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-lg">
                                        {market.asset === 'USDC' ? '💵' : market.asset === 'ETH' ? '⟠' : '🪙'}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{market.asset}</h3>
                                        <p className="text-xs text-neutral-400">{market.chain} • {market.protocol}</p>
                                    </div>
                                </div>
                                {market.chain === 'Base' && <div className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/20">Base</div>}
                                {market.chain === 'Arbitrum' && <div className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-xs rounded border border-cyan-500/20">Arb</div>}
                                {market.chain === 'Optimism' && <div className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded border border-red-500/20">OP</div>}
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm text-neutral-400">Supply APY</span>
                                    {isLoading ? (
                                        <div className="h-6 w-16 bg-neutral-800 animate-pulse rounded" />
                                    ) : (
                                        <span className="text-2xl font-bold text-green-400">
                                            {apy !== undefined ? `${apy}%` : '--'}
                                        </span>
                                    )}
                                </div>

                                <Button
                                    className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium group-hover:bg-orange-600 transition-colors"
                                >
                                    Zap In
                                    <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </Button>
                            </div>
                        </Card>
                    )
                })}
            </div>

            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                <div className="p-2 bg-blue-500/10 rounded-full">
                    <Wallet className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                    <h4 className="text-sm font-semibold text-blue-200">How Zaps Work</h4>
                    <p className="text-xs text-blue-200/70 mt-1 max-w-2xl">
                        You can deposit into these markets using <strong>any token</strong> from <strong>any chain</strong> in your portfolio.
                        We automatically route, bridge, and deposit your funds in a single transaction.
                    </p>
                </div>
            </div>
        </div>
    )
}
