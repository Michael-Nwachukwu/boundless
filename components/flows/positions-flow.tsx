"use client"

import { useState } from "react"
import { Shield, AlertCircle, ChevronDown, Settings, ToggleRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import type { BorrowPosition } from "@/lib/types/defi"

const MOCK_POSITIONS: BorrowPosition[] = [
  {
    id: "1",
    debtToken: { symbol: "DAI", name: "Dai", address: "0x6b17", chain: "ethereum", decimals: 18 },
    debtAmount: "5000",
    collateral: [{ symbol: "WETH", name: "Wrapped Ether", address: "0xc02a", chain: "ethereum", decimals: 18 }],
    collateralAmount: "2.5",
    healthFactor: 1.8,
    riskLevel: "low",
    liquidationPrice: "$1200",
    chain: "ethereum",
    protocol: "Aave",
  },
  {
    id: "2",
    debtToken: { symbol: "USDC", name: "USD Coin", address: "0xa0b86", chain: "arbitrum", decimals: 6 },
    debtAmount: "25000",
    collateral: [{ symbol: "ARB", name: "Arbitrum", address: "0x912ce", chain: "arbitrum", decimals: 18 }],
    collateralAmount: "500",
    healthFactor: 1.2,
    riskLevel: "high",
    liquidationPrice: "$1.50",
    chain: "arbitrum",
    protocol: "Aave",
  },
]

export function PositionsFlow() {
  const [selectedPosition, setSelectedPosition] = useState<BorrowPosition | null>(null)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [triggerThreshold, setTriggerThreshold] = useState(1.5)
  const [maxRepay, setMaxRepay] = useState("1000")

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-green-400 bg-green-500/10"
      case "medium":
        return "text-yellow-400 bg-yellow-500/10"
      case "high":
        return "text-orange-400 bg-orange-500/10"
      case "critical":
        return "text-red-400 bg-red-500/10"
      default:
        return "text-neutral-400 bg-neutral-500/10"
    }
  }

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case "low":
        return "border-green-500/30 bg-green-500/5"
      case "medium":
        return "border-yellow-500/30 bg-yellow-500/5"
      case "high":
        return "border-orange-500/30 bg-orange-500/5"
      case "critical":
        return "border-red-500/30 bg-red-500/5"
      default:
        return "border-neutral-700 bg-neutral-800/50"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-neutral-900 border-neutral-700 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              Liquidation Protection
            </h3>
            <p className="text-sm text-neutral-400">
              Monitor and protect your borrowing positions with automated liquidation prevention.
            </p>
          </div>
        </div>
      </Card>

      {/* Positions List */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Active Positions</h3>
        {MOCK_POSITIONS.length === 0 ? (
          <Card className="bg-neutral-900 border-neutral-700 p-8 text-center">
            <Shield className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <p className="text-neutral-400">No active borrowing positions</p>
          </Card>
        ) : (
          MOCK_POSITIONS.map((position) => (
            <Card
              key={position.id}
              className={`border cursor-pointer transition-all ${getRiskBgColor(position.riskLevel)} hover:border-opacity-100`}
            >
              <div className="p-6 space-y-4">
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-xs font-bold text-white">
                        {position.protocol[0]}
                      </div>
                      <div>
                        <h4 className="text-white font-semibold capitalize">{position.protocol}</h4>
                        <p className="text-xs text-neutral-500">{position.chain}</p>
                      </div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getRiskColor(position.riskLevel)}`}>
                    {position.riskLevel}
                  </div>
                </div>

                {/* Main Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-neutral-700">
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">DEBT</p>
                    <p className="text-sm font-semibold text-white">
                      {position.debtAmount} {position.debtToken.symbol}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">COLLATERAL</p>
                    <p className="text-sm font-semibold text-white">
                      {position.collateralAmount} {position.collateral[0].symbol}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">HEALTH FACTOR</p>
                    <p className="text-sm font-semibold text-white">{position.healthFactor.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">LIQUIDATION PRICE</p>
                    <p className="text-sm font-semibold text-white">{position.liquidationPrice}</p>
                  </div>
                </div>

                {/* Health Factor Bar */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-neutral-500">Health Factor Progress</p>
                    <p className="text-xs text-white font-semibold">{(position.healthFactor * 50).toFixed(0)}%</p>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-700 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-green-500"
                      style={{ width: `${Math.min(position.healthFactor * 50, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    {position.healthFactor <= 1.3 && "⚠️ Very close to liquidation"}
                    {position.healthFactor > 1.3 && position.healthFactor <= 1.8 && "⚠️ Monitor this position"}
                    {position.healthFactor > 1.8 && "✓ Healthy position"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setSelectedPosition(position)
                      setShowRuleModal(true)
                    }}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    {position.healthFactor <= 1.3 ? "Update Protection" : "Enable Protection"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800 bg-transparent"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Details
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Rule Configuration Modal */}
      <Dialog open={showRuleModal} onOpenChange={setShowRuleModal}>
        <DialogContent className="bg-neutral-900 border-neutral-700">
          <DialogHeader>
            <DialogTitle className="text-white">Configure Protection Rule</DialogTitle>
          </DialogHeader>

          {selectedPosition && (
            <div className="space-y-6 py-4">
              <div className="p-4 rounded border border-neutral-700 bg-neutral-800/30">
                <p className="text-sm text-neutral-400 mb-2">
                  {selectedPosition.protocol} on {selectedPosition.chain}
                </p>
                <p className="text-white font-semibold">
                  {selectedPosition.debtAmount} {selectedPosition.debtToken.symbol}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-white mb-3 block flex items-center justify-between">
                  Trigger Threshold
                  <span className="text-orange-400">{triggerThreshold.toFixed(2)}</span>
                </label>
                <Slider
                  value={[triggerThreshold]}
                  onValueChange={(value) => setTriggerThreshold(value[0])}
                  min={1}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-neutral-500 mt-2">
                  Auto-pull will trigger when health factor drops below {triggerThreshold.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-white mb-2 block">Max Repay Amount</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={maxRepay}
                  onChange={(e) => setMaxRepay(e.target.value)}
                  className="bg-neutral-800 border-neutral-700 text-white"
                />
                <p className="text-xs text-neutral-500 mt-2">
                  Maximum amount to use for auto-repayment per trigger
                </p>
              </div>

              <div className="p-4 rounded border border-green-500/30 bg-green-500/5">
                <div className="flex items-start gap-2 mb-2">
                  <ToggleRight className="w-4 h-4 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-400">Auto-Pull Protection Enabled</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      When health factor drops below {triggerThreshold.toFixed(2)}, up to {maxRepay} USDC will be automatically
                      pulled and used to repay debt.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowRuleModal(false)}
                  variant="outline"
                  className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                >
                  Cancel
                </Button>
                <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                  Save Protection Rule
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
