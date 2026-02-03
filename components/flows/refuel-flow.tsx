"use client"

import { useState } from "react"
import { ArrowRight, Clock, Cast as Gas, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Asset } from "@/lib/types/defi"

const CHAINS = ["ethereum", "polygon", "arbitrum", "optimism", "base"]

const GAS_ASSETS: Asset[] = [
  { symbol: "ETH", name: "Ethereum", address: "0x0", chain: "ethereum", decimals: 18 },
  { symbol: "MATIC", name: "Polygon", address: "0x0", chain: "polygon", decimals: 18 },
  { symbol: "ARB", name: "Arbitrum", address: "0x0", chain: "arbitrum", decimals: 18 },
]

export function RefuelFlow() {
  const [targetChain, setTargetChain] = useState("ethereum")
  const [amount, setAmount] = useState("")
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(GAS_ASSETS[0])

  return (
    <div className="space-y-6">
      <Card className="bg-neutral-900 border-neutral-700 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Gas className="w-5 h-5 text-orange-500" />
            Gas Refuel
          </h3>
          <p className="text-sm text-neutral-400">
            Refuel gas on any chain using your unified balance. Choose a target chain and amount.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-semibold text-white mb-2 block">Target Chain</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full border-neutral-700 justify-between capitalize bg-transparent">
                  {targetChain}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-neutral-900 border-neutral-700">
                {CHAINS.map((chain) => (
                  <DropdownMenuItem
                    key={chain}
                    onClick={() => setTargetChain(chain)}
                    className="text-white hover:bg-neutral-800 capitalize"
                  >
                    {chain}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <label className="text-sm font-semibold text-white mb-2 block">Amount</label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-neutral-800 border-neutral-700 text-white"
            />
            <p className="text-xs text-neutral-500 mt-2">Available: 50.0 USDC</p>
          </div>
        </div>

        {/* Route Preview */}
        {amount && (
          <div className="p-4 rounded border border-neutral-700 bg-neutral-800/50 space-y-3">
            <h4 className="text-sm font-semibold text-white">Route Preview</h4>

            <div className="flex items-center gap-2 text-sm">
              <div className="flex-1 h-px bg-neutral-700" />
              <span className="text-neutral-400">Source Assets</span>
              <div className="flex-1 h-px bg-neutral-700" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-neutral-700/30 text-sm">
                <span className="text-neutral-400">USDC (Ethereum)</span>
                <span className="text-white font-semibold">{amount} USDC</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <div className="flex-1 h-px bg-neutral-700" />
              <span className="text-neutral-400">Breakdown</span>
              <div className="flex-1 h-px bg-neutral-700" />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Estimated Cost</span>
                <span className="text-white font-semibold">${(parseFloat(amount || "0") * 1.05).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Bridge Fee</span>
                <span className="text-orange-400">0.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Estimated Arrival
                </span>
                <span className="text-white font-semibold">2-3 minutes</span>
              </div>
            </div>
          </div>
        )}

        <Button
          disabled={!amount || !targetChain}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        >
          Refuel Gas
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Card>

      {/* Refuel History */}
      <Card className="bg-neutral-900 border-neutral-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Refuels</h3>
        <div className="space-y-2">
          {[
            { chain: "polygon", amount: "25", time: "2 hours ago" },
            { chain: "arbitrum", amount: "10", time: "1 day ago" },
          ].map((refuel, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded border border-neutral-700 hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                  <Gas className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white capitalize">{refuel.chain}</p>
                  <p className="text-xs text-neutral-500">{refuel.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">${refuel.amount}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
