"use client"

import { useState } from "react"
import { CheckCircle, Clock, AlertCircle, ChevronDown, RotateCw, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { ExecutionStatus, Transaction } from "@/lib/types/defi"

const MOCK_EXECUTIONS: ExecutionStatus[] = [
  {
    id: "exec-001",
    type: "pull",
    status: "completed",
    progress: 100,
    currentStep: "Completed",
    steps: [
      { id: "1", wallet: "0x123...456", action: "Approved USDC", status: "completed" },
      { id: "2", wallet: "0x123...456", action: "Executed swap", status: "completed" },
      { id: "3", wallet: "0x789...012", action: "Received funds", status: "completed" },
    ],
    startTime: Date.now() - 7200000,
    completedTime: Date.now() - 7100000,
    transactions: [
      {
        hash: "0xabc123def456",
        type: "pull",
        status: "completed",
        amount: "2.5",
        asset: { symbol: "ETH", name: "Ethereum", address: "0x0", chain: "ethereum", decimals: 18 },
        fromWallet: "0x123...456",
        toWallet: "0x789...012",
        chain: "ethereum",
        timestamp: Date.now() - 7200000,
        fee: "0.005",
      },
    ],
  },
  {
    id: "exec-002",
    type: "refuel",
    status: "executing",
    progress: 60,
    currentStep: "Bridge in progress",
    steps: [
      { id: "1", wallet: "0x123...456", action: "Approved USDC", status: "completed" },
      { id: "2", wallet: "0x123...456", action: "Bridge to Arbitrum", status: "executing" },
      { id: "3", wallet: "0x789...012", action: "Receive on Arbitrum", status: "pending" },
    ],
    startTime: Date.now() - 300000,
    transactions: [
      {
        hash: "0xdef789ghi012",
        type: "refuel",
        status: "pending",
        amount: "50",
        asset: { symbol: "USDC", name: "USD Coin", address: "0xa0b86", chain: "ethereum", decimals: 6 },
        fromWallet: "0x123...456",
        chain: "ethereum",
        timestamp: Date.now() - 300000,
      },
    ],
  },
  {
    id: "exec-003",
    type: "pull",
    status: "failed",
    progress: 33,
    currentStep: "Failed at swap step",
    steps: [
      { id: "1", wallet: "0x123...456", action: "Approved token", status: "completed" },
      { id: "2", wallet: "0x123...456", action: "Execute swap", status: "failed" },
      { id: "3", wallet: "0x789...012", action: "Receive funds", status: "pending" },
    ],
    startTime: Date.now() - 86400000,
    completedTime: Date.now() - 86340000,
    transactions: [
      {
        hash: "0xjkl345mno678",
        type: "pull",
        status: "failed",
        amount: "5000",
        asset: { symbol: "USDC", name: "USD Coin", address: "0xa0b86", chain: "ethereum", decimals: 6 },
        fromWallet: "0x123...456",
        chain: "ethereum",
        timestamp: Date.now() - 86400000,
        error: "Insufficient liquidity in swap pool",
      },
    ],
  },
]

interface ExecutionStatusProps {
  showOngoing?: boolean
}

export function ExecutionStatusPanel({ showOngoing = false }: ExecutionStatusProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredExecutions = showOngoing ? MOCK_EXECUTIONS.filter((e) => e.status === "executing") : MOCK_EXECUTIONS

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case "executing":
        return <Clock className="w-5 h-5 text-orange-400 animate-spin" />
      case "failed":
        return <AlertCircle className="w-5 h-5 text-red-400" />
      case "pending":
        return <Clock className="w-5 h-5 text-neutral-400" />
      default:
        return null
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 border-green-500/30"
      case "executing":
        return "bg-orange-500/10 border-orange-500/30"
      case "failed":
        return "bg-red-500/10 border-red-500/30"
      case "pending":
        return "bg-neutral-800 border-neutral-700"
      default:
        return "bg-neutral-800 border-neutral-700"
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "pull":
        return "Unified Pull"
      case "refuel":
        return "Gas Refuel"
      case "protection":
        return "Liquidation Protection"
      default:
        return type
    }
  }

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return "just now"
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">
        {showOngoing ? "Ongoing Executions" : "Execution History"}
      </h2>

      {filteredExecutions.length === 0 ? (
        <Card className="bg-neutral-900 border-neutral-700 p-8 text-center">
          <Clock className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-400">
            {showOngoing ? "No ongoing executions" : "No execution history"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredExecutions.map((execution) => (
            <Collapsible key={execution.id} open={expandedId === execution.id}>
              <Card className={`border transition-all ${getStatusBg(execution.status)} overflow-hidden`}>
                <CollapsibleTrigger asChild>
                  <button
                    onClick={() => setExpandedId(expandedId === execution.id ? null : execution.id)}
                    className="w-full p-4 hover:bg-black/20 transition-colors text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {getStatusIcon(execution.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-white">{getTypeLabel(execution.type)}</h3>
                            <span className={`text-xs px-2 py-1 rounded capitalize font-semibold ${
                              execution.status === "completed"
                                ? "bg-green-500/20 text-green-400"
                                : execution.status === "executing"
                                  ? "bg-orange-500/20 text-orange-400"
                                  : execution.status === "failed"
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-neutral-700 text-neutral-300"
                            }`}>
                              {execution.status}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 truncate">{execution.currentStep}</p>
                          <p className="text-xs text-neutral-500 mt-1">{formatTime(execution.startTime)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">{execution.progress}%</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${expandedId === execution.id ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2 h-1 bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          execution.status === "completed"
                            ? "bg-green-500"
                            : execution.status === "executing"
                              ? "bg-orange-500"
                              : execution.status === "failed"
                                ? "bg-red-500"
                                : "bg-neutral-500"
                        }`}
                        style={{ width: `${execution.progress}%` }}
                      />
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="border-t border-inherit p-4 bg-black/20">
                  <div className="space-y-4">
                    {/* Execution Steps */}
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-3">Steps</h4>
                      <div className="space-y-2">
                        {execution.steps.map((step, idx) => (
                          <div key={step.id} className="flex items-start gap-3">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold ${
                                step.status === "completed"
                                  ? "bg-green-500/20 text-green-400"
                                  : step.status === "executing"
                                    ? "bg-orange-500/20 text-orange-400"
                                    : "bg-neutral-700 text-neutral-400"
                              }`}
                            >
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white font-medium">{step.action}</p>
                              <p className="text-xs text-neutral-500 font-mono">{step.wallet}</p>
                              {step.txHash && (
                                <p className="text-xs text-neutral-500 font-mono truncate flex items-center gap-1 mt-1">
                                  {step.txHash}
                                  <Copy className="w-3 h-3 cursor-pointer hover:text-orange-400" />
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Transactions */}
                    {execution.transactions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-3">Transactions</h4>
                        <div className="space-y-2">
                          {execution.transactions.map((tx) => (
                            <div
                              key={tx.hash}
                              className="p-3 rounded border border-neutral-700 bg-neutral-800/30 hover:bg-neutral-800/50 transition-colors cursor-pointer"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                                  <p className="text-sm font-mono text-neutral-300 truncate">{tx.hash}</p>
                                  <Copy className="w-3 h-3 text-neutral-500 hover:text-orange-400" />
                                </div>
                                <span className={`text-xs px-2 py-1 rounded capitalize font-semibold ${
                                  tx.status === "completed"
                                    ? "bg-green-500/20 text-green-400"
                                    : tx.status === "pending"
                                      ? "bg-orange-500/20 text-orange-400"
                                      : "bg-red-500/20 text-red-400"
                                }`}>
                                  {tx.status}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
                                <div>Amount: {tx.amount} {tx.asset.symbol}</div>
                                <div>Chain: {tx.chain}</div>
                                {tx.error && <div className="col-span-2 text-red-400">Error: {tx.error}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2 border-t border-inherit">
                      {execution.status === "failed" && (
                        <Button size="sm" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs flex items-center justify-center gap-1">
                          <RotateCw className="w-3 h-3" />
                          Retry
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs bg-transparent"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  )
}
