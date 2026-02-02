"use client"

import { TrendingUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { UnifiedBalance } from "@/lib/types/defi"

interface UnifiedBalanceCardProps {
  balance: UnifiedBalance | null
  isLoading?: boolean
}

export function UnifiedBalanceCard({ balance, isLoading }: UnifiedBalanceCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-neutral-900 border-neutral-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-neutral-700 rounded w-24" />
          <div className="h-8 bg-neutral-700 rounded w-32" />
        </div>
      </Card>
    )
  }

  const totalUsd = balance?.totalUsd ?? 0
  const walletCount = balance?.byWallet ? Object.keys(balance.byWallet).length : 0
  const chainCount = balance?.byChain ? Object.keys(balance.byChain).length : 0

  return (
    <Card className="bg-neutral-900 border-neutral-700 p-6 overflow-hidden relative">
      {/* Background Glow Effect */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-400 mb-2">TOTAL BALANCE</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              ${totalUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="flex items-center justify-center w-12 h-12 rounded-lg border border-orange-500/30 bg-orange-500/10">
            <TrendingUp className="w-6 h-6 text-orange-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-700">
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wide">Wallets</p>
            <p className="text-xl font-semibold text-white mt-1">{walletCount}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wide">Chains</p>
            <p className="text-xl font-semibold text-white mt-1">{chainCount}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
