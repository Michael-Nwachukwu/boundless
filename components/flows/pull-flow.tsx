"use client"

import { useState } from "react"
import { ArrowRight, ChevronDown, Info } from "lucide-react"
import { useAccount } from 'wagmi'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EnsAddressInput } from "@/components/ui/ens-address-input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Asset, Route, ExecutionStep } from "@/lib/types/defi"

const ASSETS: Asset[] = [
  { symbol: "ETH", name: "Ethereum", address: "0x0", chain: "ethereum", decimals: 18 },
  { symbol: "USDC", name: "USD Coin", address: "0xa0b86", chain: "ethereum", decimals: 6 },
  { symbol: "DAI", name: "Dai", address: "0x6b17", chain: "ethereum", decimals: 18 },
]

const CHAINS = ["ethereum", "polygon", "arbitrum", "optimism", "base"]

export function PullFlow() {
  const { address: connectedAddress } = useAccount()
  const [step, setStep] = useState<"config" | "preview" | "confirm">("config")
  const [amount, setAmount] = useState("")
  const [destinationAsset, setDestinationAsset] = useState<Asset | null>(ASSETS[0])
  const [destinationChain, setDestinationChain] = useState("ethereum")
  const [destinationAddress, setDestinationAddress] = useState("")

  const mockRoutes: Route[] = [
    {
      from: ASSETS[0],
      to: destinationAsset || ASSETS[0],
      amount: amount || "0",
      estimatedOutput: (parseFloat(amount || "0") * 2500).toString(),
      estimatedFee: (parseFloat(amount || "0") * 2500 * 0.005).toString(),
      feePercentage: 0.5,
      provider: "1inch",
      steps: [
        { name: "Swap ETH to USDC", description: "Bridge via 1inch DEX" },
        { name: "Bridge to Arbitrum", description: "Uses Stargate bridge" },
      ],
    },
  ]

  const mockExecutionSteps: ExecutionStep[] = [
    { id: "1", wallet: "0x123...456", action: "Approve token", status: "pending" },
    { id: "2", wallet: "0x123...456", action: "Execute swap", status: "pending" },
    { id: "3", wallet: "0x789...012", action: "Receive on destination", status: "pending" },
  ]

  const totalOutput = mockRoutes.reduce((sum, route) => sum + parseFloat(route.estimatedOutput || "0"), 0)
  const totalFees = mockRoutes.reduce((sum, route) => sum + parseFloat(route.estimatedFee || "0"), 0)

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "config" ? "bg-orange-500 text-white" : "bg-neutral-700 text-neutral-400"}`}>
          1
        </div>
        <div className="flex-1 h-px bg-neutral-700" />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "preview" ? "bg-orange-500 text-white" : step === "config" ? "bg-neutral-700 text-neutral-400" : "bg-green-500 text-white"}`}>
          2
        </div>
        <div className="flex-1 h-px bg-neutral-700" />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "confirm" ? "bg-orange-500 text-white" : step === "config" ? "bg-neutral-700 text-neutral-400" : "bg-green-500 text-white"}`}>
          3
        </div>
      </div>

      {step === "config" && (
        <Card className="bg-neutral-900 border-neutral-700 p-6 space-y-6">
          <div>
            <label className="text-sm font-semibold text-white mb-2 block">Amount</label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-neutral-800 border-neutral-700 text-white text-lg hover:text-white"
            />
            <p className="text-xs text-neutral-500 mt-2">Available: 10.5 ETH</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-white mb-2 block">Destination Asset</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full border-neutral-700 justify-between bg-transparent text-white">
                    {destinationAsset?.symbol || "Select"}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-neutral-900 border-neutral-700">
                  {ASSETS.map((asset) => (
                    <DropdownMenuItem
                      key={asset.symbol}
                      onClick={() => setDestinationAsset(asset)}
                      className="text-white hover:bg-neutral-800"
                    >
                      {asset.symbol}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div>
              <label className="text-sm font-semibold text-white mb-2 block">Destination Chain</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full border-neutral-700 justify-between bg-transparent text-white">
                    {destinationChain}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-neutral-900 border-neutral-700">
                  {CHAINS.map((chain) => (
                    <DropdownMenuItem
                      key={chain}
                      onClick={() => setDestinationChain(chain)}
                      className="text-white hover:bg-neutral-800 capitalize"
                    >
                      {chain}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-white mb-2 block">Destination Address</label>
            <EnsAddressInput
              placeholder="0x... or name.eth"
              value={destinationAddress}
              onChange={setDestinationAddress}
              defaultAddress={connectedAddress}
            />
          </div>

          <Button
            onClick={() => setStep("preview")}
            disabled={!amount || !destinationAsset || !destinationAddress}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            Review Routes
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      )}

      {step === "preview" && (
        <Card className="bg-neutral-900 border-neutral-700 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Execution Preview</h3>
            <div className="space-y-4">
              {mockRoutes.map((route, idx) => (
                <div key={idx} className="p-4 rounded border border-neutral-700 bg-neutral-800/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-sm text-white">{route.from.symbol}</div>
                      <ArrowRight className="w-4 h-4 text-orange-500" />
                      <div className="font-mono text-sm text-white">{route.to.symbol}</div>
                    </div>
                    <div className="text-sm text-neutral-400">{route.provider}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-neutral-500">Input</p>
                      <p className="text-white font-semibold">{amount} {route.from.symbol}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Output</p>
                      <p className="text-white font-semibold">~{parseFloat(route.estimatedOutput).toFixed(2)} {route.to.symbol}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Fee</p>
                      <p className="text-orange-400 font-semibold">{route.feePercentage}%</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-neutral-700 text-xs space-y-1">
                    {route.steps.map((s, i) => (
                      <p key={i} className="text-neutral-500">
                        • {s.name}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded border border-neutral-700 bg-neutral-800/30 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Total Output</span>
              <span className="text-white font-semibold">${totalOutput.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Total Fees</span>
              <span className="text-orange-400 font-semibold">${totalFees.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setStep("config")}
              variant="outline"
              className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            >
              Back
            </Button>
            <Button
              onClick={() => setStep("confirm")}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {step === "confirm" && (
        <Card className="bg-neutral-900 border-neutral-700 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Confirm & Sign</h3>
            <div className="space-y-2">
              {mockExecutionSteps.map((executionStep, idx) => (
                <div key={executionStep.id} className="flex items-start gap-3 p-3 rounded border border-neutral-700 bg-neutral-800/30">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${executionStep.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-neutral-700 text-neutral-400"
                    }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{executionStep.action}</p>
                    <p className="text-xs text-neutral-500 font-mono">{executionStep.wallet}</p>
                  </div>
                  <div className={`text-xs font-semibold ${executionStep.status === "completed" ? "text-green-400" : "text-orange-400"}`}>
                    {executionStep.status === "completed" ? "Done" : "Pending"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded bg-blue-500/10 border border-blue-500/30 flex gap-2 text-sm text-blue-300">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>You will need to approve and sign transactions in your wallet</p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setStep("preview")}
              variant="outline"
              className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            >
              Back
            </Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
              Execute Pull
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
