"use client"

import { useState, useMemo, useEffect } from "react"
import { ArrowRight, ChevronDown, Loader2, CheckCircle, AlertCircle, Fuel } from "lucide-react"
import { useAccount } from 'wagmi'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useLifiConfig } from "@/lib/hooks/use-lifi-config"
import { useUnifiedBalance } from "@/lib/hooks/use-unified-balance"
import { resolveSqueezeRoutes, executeSqueezeRoutes, type SqueezeResult } from "@/lib/routing/squeeze-resolver"
import { formatCurrency } from "@/lib/utils"
import type { Balance } from "@/lib/types/defi"

// Chain options with native gas tokens
const CHAIN_OPTIONS = [
  { id: 'ethereum', name: 'Ethereum', icon: '⟠', chainId: 1, gasToken: 'ETH' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '🔵', chainId: 42161, gasToken: 'ETH' },
  { id: 'optimism', name: 'Optimism', icon: '🔴', chainId: 10, gasToken: 'ETH' },
  { id: 'base', name: 'Base', icon: '🔷', chainId: 8453, gasToken: 'ETH' },
  { id: 'bsc', name: 'BNB Chain', icon: '🟡', chainId: 56, gasToken: 'BNB' },
  { id: 'scroll', name: 'Scroll', icon: '📜', chainId: 534352, gasToken: 'ETH' },
  { id: 'zksync-era', name: 'zkSync Era', icon: '💠', chainId: 324, gasToken: 'ETH' },
]

type Step = 'config' | 'preview' | 'executing' | 'complete'

export function RefuelFlow() {
  // Initialize LI.FI SDK with wagmi provider
  useLifiConfig()

  const { address: connectedAddress } = useAccount()
  const { data: unifiedBalance, isLoading: isLoadingBalances, refetch: refetchBalance } = useUnifiedBalance(connectedAddress)

  const balances = unifiedBalance?.balances ?? []
  const totalUsd = unifiedBalance?.totalUsd ?? 0

  // Form state
  const [step, setStep] = useState<Step>('config')
  const [amount, setAmount] = useState('')
  const [destinationChain, setDestinationChain] = useState(CHAIN_OPTIONS[0])
  const [showChainDropdown, setShowChainDropdown] = useState(false)

  // Routing state
  const [selectedAssets, setSelectedAssets] = useState<Balance[]>([])
  const [isResolvingRoutes, setIsResolvingRoutes] = useState(false)
  const [squeezeResult, setSqueezeResult] = useState<SqueezeResult | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)

  // Execution state
  const [routeStatuses, setRouteStatuses] = useState<('pending' | 'executing' | 'completed' | 'failed')[]>([])
  const [executionStartTime, setExecutionStartTime] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [executionSummary, setExecutionSummary] = useState<{
    totalRoutes: number
    successfulRoutes: number
    failedRoutes: number
    errors: { index: number; message: string }[]
  } | null>(null)
  const [executionError, setExecutionError] = useState<string | null>(null)

  // Parse requested amount
  const requestedAmount = parseFloat(amount) || 0

  // Calculate available total (excluding destination chain)
  const availableForRefuel = useMemo(() => {
    if (!balances || balances.length === 0) return 0
    return balances
      .filter((b: Balance) => b.chain !== destinationChain.id)
      .reduce((sum: number, b: Balance) => sum + b.usdValue, 0)
  }, [balances, destinationChain])

  // Auto-select assets to meet requested amount
  const autoSelectedAssets = useMemo(() => {
    if (requestedAmount <= 0 || !balances || balances.length === 0) return []

    // Sort by value descending (use largest assets first)
    const sortedBalances = [...balances]
      .filter((b: Balance) => b.chain !== destinationChain.id && b.usdValue > 0.01)
      .sort((a: Balance, b: Balance) => b.usdValue - a.usdValue)

    const selected: Balance[] = []
    let remainingAmount = requestedAmount

    for (const balance of sortedBalances) {
      if (remainingAmount <= 0) break

      if (balance.usdValue <= remainingAmount) {
        selected.push(balance)
        remainingAmount -= balance.usdValue
      } else {
        const fractionNeeded = remainingAmount / balance.usdValue
        const partialAmount = parseFloat(balance.amount) * fractionNeeded

        const partialBalance: Balance = {
          ...balance,
          amount: partialAmount.toString(),
          usdValue: remainingAmount,
        }
        selected.push(partialBalance)
        remainingAmount = 0
      }
    }

    return selected
  }, [balances, requestedAmount, destinationChain])

  // Total value of auto-selected assets
  const selectedTotal = useMemo(() => {
    return autoSelectedAssets.reduce((sum, a) => sum + a.usdValue, 0)
  }, [autoSelectedAssets])

  // Check if request exceeds available balance
  const isRequestTooHigh = requestedAmount > availableForRefuel

  // Update elapsed time during execution
  useEffect(() => {
    if (step !== 'executing' || !executionStartTime) return

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - executionStartTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [step, executionStartTime])

  // Fetch routes - refuel goes to native gas token (ETH)
  const handlePreview = async () => {
    if (autoSelectedAssets.length === 0 || !connectedAddress) return

    setStep('preview')
    setIsResolvingRoutes(true)
    setRouteError(null)
    setSelectedAssets(autoSelectedAssets)

    try {
      // For refuel, we always want the native gas token (ETH on most chains)
      const result = await resolveSqueezeRoutes({
        assets: autoSelectedAssets,
        destinationChainId: destinationChain.chainId,
        destinationToken: destinationChain.gasToken, // Native gas token
        destinationAddress: connectedAddress, // Refuel goes to same wallet
      })

      setSqueezeResult(result)
      setRouteStatuses(result.routes.map(() => 'pending'))

      if (result.routes.length === 0) {
        setRouteError('No routes found for refueling')
      }
    } catch (error) {
      console.error('[RefuelFlow] Route resolution error:', error)
      setRouteError(error instanceof Error ? error.message : 'Failed to find routes')
    } finally {
      setIsResolvingRoutes(false)
    }
  }

  // Execute the refuel
  const handleExecute = async () => {
    if (!squeezeResult || squeezeResult.routes.length === 0) return

    setStep('executing')
    setExecutionStartTime(Date.now())
    setExecutionError(null)

    try {
      const result = await executeSqueezeRoutes(
        squeezeResult.routes,
        (index, status) => {
          setRouteStatuses(prev => {
            const updated = [...prev]
            updated[index] = status
            return updated
          })
        }
      )

      setExecutionSummary({
        totalRoutes: result.totalRoutes,
        successfulRoutes: result.successfulRoutes,
        failedRoutes: result.failedRoutes,
        errors: result.errors,
      })

      setStep('complete')

      // Refresh portfolio balance after completion (even partial)
      if (result.successfulRoutes > 0) {
        // Delay slightly to allow blockchain state to update
        setTimeout(() => refetchBalance(), 3000)
      }

      if (result.failedRoutes > 0) {
        setExecutionError(
          result.failedRoutes === result.totalRoutes
            ? 'All transactions failed'
            : `${result.failedRoutes} of ${result.totalRoutes} transactions failed`
        )
      }
    } catch (error) {
      console.error('[RefuelFlow] Execution error:', error)
      setExecutionError(error instanceof Error ? error.message : 'Execution failed')
      setStep('complete')
    }
  }

  // Reset flow
  const handleReset = () => {
    setStep('config')
    setAmount('')
    setSelectedAssets([])
    setSqueezeResult(null)
    setRouteStatuses([])
    setExecutionSummary(null)
    setExecutionError(null)
    setElapsedSeconds(0)
    setExecutionStartTime(null)
  }

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'config' ? 'bg-orange-500 text-white' : 'bg-neutral-700 text-neutral-400'}`}>
          1
        </div>
        <div className="flex-1 h-px bg-neutral-700" />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'preview' ? 'bg-orange-500 text-white' : step === 'config' ? 'bg-neutral-700 text-neutral-400' : 'bg-green-500 text-white'}`}>
          2
        </div>
        <div className="flex-1 h-px bg-neutral-700" />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'executing' || step === 'complete' ? 'bg-orange-500 text-white' : 'bg-neutral-700 text-neutral-400'}`}>
          3
        </div>
      </div>

      {/* Step 1: Configuration */}
      {step === 'config' && (
        <Card className="bg-neutral-900 border-neutral-700 p-6 space-y-6">
          {/* Header */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Fuel className="w-5 h-5 text-orange-500" />
              Gas Refuel
            </h3>
            <p className="text-sm text-neutral-400">
              Get native gas tokens on any chain using your unified balance.
            </p>
          </div>

          {/* Target Chain */}
          <div>
            <label className="text-sm font-semibold text-white mb-2 block">
              Destination Chain
            </label>
            <div className="relative">
              <button
                onClick={() => setShowChainDropdown(!showChainDropdown)}
                className="w-full flex items-center justify-between p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white hover:bg-neutral-700"
              >
                <span className="flex items-center gap-2">
                  <span>{destinationChain.icon}</span>
                  <span>{destinationChain.name}</span>
                  <span className="text-neutral-500 text-sm">({destinationChain.gasToken})</span>
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showChainDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg z-10 overflow-hidden max-h-64 overflow-y-auto">
                  {CHAIN_OPTIONS.map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => {
                        setDestinationChain(chain)
                        setShowChainDropdown(false)
                      }}
                      className="w-full flex items-center gap-2 p-3 text-white hover:bg-neutral-700 text-left"
                    >
                      <span>{chain.icon}</span>
                      <span>{chain.name}</span>
                      <span className="text-neutral-500 text-sm">({chain.gasToken})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-sm font-semibold text-white mb-2 block">
              Amount (USD value)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-lg">$</span>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-neutral-800 border-neutral-700 text-white text-lg pl-8 hover:text-white"
              />
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className="text-neutral-500">
                Available: {formatCurrency(availableForRefuel)}
              </span>
              {availableForRefuel > 0 && (
                <button
                  onClick={() => setAmount(availableForRefuel.toFixed(2))}
                  className="text-orange-400 hover:text-orange-300"
                >
                  Max
                </button>
              )}
            </div>
            {isRequestTooHigh && (
              <p className="text-xs text-red-400 mt-1">
                Requested amount exceeds available balance
              </p>
            )}
          </div>
          {/* Assets to be used */}
          {requestedAmount > 0 && autoSelectedAssets.length > 0 && (
            <div className="p-4 rounded-lg border border-neutral-700 bg-neutral-800/30 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Assets to use ({autoSelectedAssets.length})</span>
                <span className="text-white font-semibold">{formatCurrency(selectedTotal)}</span>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {autoSelectedAssets.map((asset, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-neutral-400">
                      {asset.asset.symbol} on {asset.chain}
                    </span>
                    <span className="text-white">{formatCurrency(asset.usdValue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Continue Button */}
          <Button
            onClick={handlePreview}
            disabled={!amount || requestedAmount <= 0 || autoSelectedAssets.length === 0 || isLoadingBalances || isRequestTooHigh}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold"
          >
            {isLoadingBalances ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading balances...
              </>
            ) : (
              <>
                Review Refuel
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </Card>
      )}

      {/* Step 2: Preview Routes */}
      {step === 'preview' && (
        <Card className="bg-neutral-900 border-neutral-700 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Fuel className="w-5 h-5 text-orange-500" />
              Refuel Preview
            </h3>

            {isResolvingRoutes ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                <p className="text-neutral-400">Finding optimal routes...</p>
              </div>
            ) : routeError ? (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                {routeError}
              </div>
            ) : squeezeResult && (
              <div className="space-y-4">
                {/* Destination info */}
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400">
                    <span className="text-lg">{destinationChain.icon}</span>
                    <span className="font-medium">
                      Refueling {destinationChain.gasToken} on {destinationChain.name}
                    </span>
                  </div>
                </div>

                {/* Routes list */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {squeezeResult.routes.map((route, idx) => (
                    <div key={idx} className="p-3 rounded border border-neutral-700 bg-neutral-800/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{route.asset.asset.symbol}</span>
                          <ArrowRight className="w-4 h-4 text-orange-500" />
                          <span className="text-white font-medium">{destinationChain.gasToken}</span>
                        </div>
                        <span className="text-sm text-neutral-400">{formatCurrency(route.asset.usdValue)}</span>
                      </div>
                      <div className="text-xs text-neutral-500 mt-1">
                        {route.asset.chain} → {destinationChain.name}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="p-4 rounded border border-neutral-700 bg-neutral-800/30 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Total Input</span>
                    <span className="text-white font-semibold">{formatCurrency(squeezeResult.totalInputUsd)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Est. {destinationChain.gasToken} Received</span>
                    <span className="text-white font-semibold">~{formatCurrency(squeezeResult.totalEstimatedOutputUsd)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Est. Gas Cost</span>
                    <span className="text-orange-400 font-semibold">~{formatCurrency(squeezeResult.totalGasCostUsd)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => setStep('config')}
              variant="outline"
              className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            >
              Back
            </Button>
            <Button
              onClick={handleExecute}
              disabled={!squeezeResult || squeezeResult.routes.length === 0 || isResolvingRoutes}
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold"
            >
              Refuel Now
              <Fuel className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Executing */}
      {step === 'executing' && (
        <Card className="bg-neutral-900 border-neutral-700 p-6 space-y-6">
          <div className="text-center mb-4">
            <Fuel className="w-12 h-12 text-orange-500 mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-bold text-white">Refueling...</h3>
            <p className="text-sm text-neutral-400">
              {elapsedSeconds < 10
                ? 'Waiting for wallet confirmation...'
                : elapsedSeconds < 60
                  ? 'Transaction submitted, bridging gas...'
                  : 'Cross-chain bridge in progress...'}
            </p>
            <div className="mt-2 text-xs text-neutral-500 flex items-center justify-center gap-2">
              <span className="text-orange-400 font-mono">
                {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
              </span>
              <span>elapsed</span>
            </div>
          </div>

          {/* Progress list */}
          <div className="space-y-2">
            {squeezeResult?.routes.map((route, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg">
                <div className="w-8 h-8 rounded-full flex items-center justify-center">
                  {routeStatuses[index] === 'pending' && (
                    <div className="w-4 h-4 rounded-full border-2 border-neutral-600" />
                  )}
                  {routeStatuses[index] === 'executing' && (
                    <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                  )}
                  {routeStatuses[index] === 'completed' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {routeStatuses[index] === 'failed' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">
                    {route.asset.asset.symbol} → {destinationChain.gasToken}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {route.asset.chain} → {destinationChain.name}
                  </div>
                </div>
                <div className="text-sm text-neutral-400">
                  {formatCurrency(route.asset.usdValue)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && (
        <Card className="bg-neutral-900 border-neutral-700 p-6">
          <div className="py-8 text-center space-y-4">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${executionError ? 'bg-yellow-500/20' : 'bg-green-500/20'
              }`}>
              {executionError ? (
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              ) : (
                <CheckCircle className="w-8 h-8 text-green-500" />
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">
                {executionSummary?.failedRoutes === 0
                  ? 'Refuel Complete!'
                  : executionSummary?.successfulRoutes === 0
                    ? 'Refuel Failed'
                    : 'Refuel Partially Complete'}
              </h3>

              {executionSummary && (
                <div className="mt-3 flex justify-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-400">{executionSummary.successfulRoutes} successful</span>
                  </div>
                  {executionSummary.failedRoutes > 0 && (
                    <div className="flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-400">{executionSummary.failedRoutes} failed</span>
                    </div>
                  )}
                </div>
              )}

              <p className="text-sm text-neutral-400 mt-3">
                {(executionSummary?.successfulRoutes ?? 0) > 0
                  ? `${destinationChain.gasToken} has been sent to your wallet on ${destinationChain.name}`
                  : 'No transactions were successful'}
              </p>
            </div>

            {/* Failed routes details */}
            {executionSummary && executionSummary.errors.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-neutral-500">Failed transactions:</p>
                {executionSummary.errors.map((err, i) => (
                  <div key={i} className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 text-left">
                    Route {err.index + 1}: {err.message.length > 100 ? err.message.substring(0, 100) + '...' : err.message}
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleReset}
              className="mt-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold"
            >
              Done
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
