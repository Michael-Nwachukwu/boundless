"use client"

import { useState, useMemo, useEffect } from "react"
import { ArrowRight, ChevronDown, Info, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { useAccount } from 'wagmi'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EnsAddressInput } from "@/components/ui/ens-address-input"
import { useLifiConfig } from "@/lib/hooks/use-lifi-config"
import { useUnifiedBalance } from "@/lib/hooks/use-unified-balance"
import { resolveSqueezeRoutes, executeSqueezeRoutes, type SqueezeResult } from "@/lib/routing/squeeze-resolver"
import { formatCurrency } from "@/lib/utils"
import type { Balance } from "@/lib/types/defi"

// Chain options for destination
const CHAIN_OPTIONS = [
  { id: 'ethereum', name: 'Ethereum', icon: '⟠', chainId: 1 },
  { id: 'arbitrum', name: 'Arbitrum', icon: '🔵', chainId: 42161 },
  { id: 'optimism', name: 'Optimism', icon: '🔴', chainId: 10 },
  { id: 'base', name: 'Base', icon: '🔷', chainId: 8453 },
]

// Token options for destination
const TOKEN_OPTIONS = [
  { symbol: 'USDC', name: 'USD Coin', icon: '💵' },
  { symbol: 'ETH', name: 'Ethereum', icon: '⟠' },
  { symbol: 'USDT', name: 'Tether', icon: '💲' },
]

type Step = 'config' | 'preview' | 'executing' | 'complete'

export function PullFlow() {
  // Initialize LI.FI SDK with wagmi provider
  useLifiConfig()

  const { address: connectedAddress } = useAccount()
  const { data: unifiedBalance, isLoading: isLoadingBalances } = useUnifiedBalance(connectedAddress)

  // Extract balances and totalUsd from the unified balance data
  const balances = unifiedBalance?.balances ?? []
  const totalUsd = unifiedBalance?.totalUsd ?? 0

  // Form state
  const [step, setStep] = useState<Step>('config')
  const [amount, setAmount] = useState('')
  const [destinationChain, setDestinationChain] = useState(CHAIN_OPTIONS[0])
  const [destinationToken, setDestinationToken] = useState(TOKEN_OPTIONS[0])
  const [destinationAddress, setDestinationAddress] = useState('')
  const [showChainDropdown, setShowChainDropdown] = useState(false)
  const [showTokenDropdown, setShowTokenDropdown] = useState(false)

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
  // Calculate available total (excluding destination chain)
  const availableForPull = useMemo(() => {
    if (!balances || balances.length === 0) return 0
    return balances
      .filter((b: Balance) => b.chain !== destinationChain.id)
      .reduce((sum: number, b: Balance) => sum + b.usdValue, 0)
  }, [balances, destinationChain])

  // Auto-select assets to meet requested amount, calculating partial amounts as needed
  const autoSelectedAssets = useMemo(() => {
    if (requestedAmount <= 0 || !balances || balances.length === 0) return []

    // Sort by value descending (use largest assets first)
    const sortedBalances = [...balances]
      .filter((b: Balance) => b.chain !== destinationChain.id && b.usdValue > 0.01) // Exclude tiny balances
      .sort((a: Balance, b: Balance) => b.usdValue - a.usdValue)

    const selected: Balance[] = []
    let remainingAmount = requestedAmount

    for (const balance of sortedBalances) {
      if (remainingAmount <= 0) break

      if (balance.usdValue <= remainingAmount) {
        // Use the full balance of this asset
        selected.push(balance)
        remainingAmount -= balance.usdValue
      } else {
        // Use only a portion of this asset (partial amount)
        // Calculate the fraction of the balance we need
        const fractionNeeded = remainingAmount / balance.usdValue
        const partialAmount = parseFloat(balance.amount) * fractionNeeded

        // Create a modified Balance with the partial amount
        const partialBalance: Balance = {
          ...balance,
          amount: partialAmount.toString(),
          usdValue: remainingAmount, // Exactly what we need
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

  // Check if we have enough balance
  const hasEnoughBalance = selectedTotal >= requestedAmount || (requestedAmount > 0 && selectedTotal > 0)
  const isRequestTooHigh = requestedAmount > availableForPull

  // Update elapsed time during execution
  useEffect(() => {
    if (step !== 'executing' || !executionStartTime) return

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - executionStartTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [step, executionStartTime])

  // Fetch routes when moving to preview
  const handlePreview = async () => {
    if (autoSelectedAssets.length === 0 || !destinationAddress) return

    setStep('preview')
    setIsResolvingRoutes(true)
    setRouteError(null)
    setSelectedAssets(autoSelectedAssets)

    try {
      const result = await resolveSqueezeRoutes({
        assets: autoSelectedAssets,
        destinationChainId: destinationChain.chainId,
        destinationToken: destinationToken.symbol,
        destinationAddress,
      })

      setSqueezeResult(result)
      setRouteStatuses(result.routes.map(() => 'pending'))

      if (result.routes.length === 0) {
        setRouteError('No routes found for the selected assets')
      }
    } catch (error) {
      console.error('[PullFlow] Route resolution error:', error)
      setRouteError(error instanceof Error ? error.message : 'Failed to find routes')
    } finally {
      setIsResolvingRoutes(false)
    }
  }

  // Execute the pull
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

      if (result.failedRoutes > 0) {
        setExecutionError(
          result.failedRoutes === result.totalRoutes
            ? 'All transactions failed'
            : `${result.failedRoutes} of ${result.totalRoutes} transactions failed`
        )
      }
    } catch (error) {
      console.error('[PullFlow] Execution error:', error)
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
          {/* Amount Input */}
          <div>
            <label className="text-sm font-semibold text-white mb-2 block">
              Amount to Pull (USD)
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
                Available to pull: {formatCurrency(availableForPull)}
              </span>
              {requestedAmount > 0 && (
                <button
                  onClick={() => setAmount(availableForPull.toFixed(2))}
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

          {/* Destination Chain & Token */}
          <div className="grid grid-cols-2 gap-4">
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
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showChainDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg z-10 overflow-hidden">
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
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-white mb-2 block">
                Destination Token
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                  className="w-full flex items-center justify-between p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white hover:bg-neutral-700"
                >
                  <span className="flex items-center gap-2">
                    <span>{destinationToken.icon}</span>
                    <span>{destinationToken.symbol}</span>
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showTokenDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg z-10 overflow-hidden">
                    {TOKEN_OPTIONS.map((token) => (
                      <button
                        key={token.symbol}
                        onClick={() => {
                          setDestinationToken(token)
                          setShowTokenDropdown(false)
                        }}
                        className="w-full flex items-center gap-2 p-3 text-white hover:bg-neutral-700 text-left"
                      >
                        <span>{token.icon}</span>
                        <span>{token.symbol}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Destination Address */}
          <div>
            <label className="text-sm font-semibold text-white mb-2 block">
              Destination Address
            </label>
            <EnsAddressInput
              placeholder="0x... or name.eth"
              value={destinationAddress}
              onChange={setDestinationAddress}
              defaultAddress={connectedAddress}
            />
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
            disabled={!amount || requestedAmount <= 0 || !destinationAddress || autoSelectedAssets.length === 0 || isLoadingBalances}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold"
          >
            {isLoadingBalances ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading balances...
              </>
            ) : (
              <>
                Review Routes
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
            <h3 className="text-lg font-semibold text-white mb-4">Route Preview</h3>

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
                {/* Routes list */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {squeezeResult.routes.map((route, idx) => (
                    <div key={idx} className="p-3 rounded border border-neutral-700 bg-neutral-800/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{route.asset.asset.symbol}</span>
                          <ArrowRight className="w-4 h-4 text-orange-500" />
                          <span className="text-white font-medium">{destinationToken.symbol}</span>
                        </div>
                        <span className="text-sm text-neutral-400">{formatCurrency(route.asset.usdValue)}</span>
                      </div>
                      <div className="text-xs text-neutral-500 mt-1">
                        {route.asset.chain} → {destinationChain.name}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Skipped assets warning */}
                {squeezeResult.skippedAssets.length > 0 && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
                    {squeezeResult.skippedAssets.length} asset(s) couldn't be routed
                  </div>
                )}

                {/* Summary */}
                <div className="p-4 rounded border border-neutral-700 bg-neutral-800/30 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Total Input</span>
                    <span className="text-white font-semibold">{formatCurrency(squeezeResult.totalInputUsd)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Estimated Output</span>
                    <span className="text-white font-semibold">~{formatCurrency(squeezeResult.totalEstimatedOutputUsd)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Est. Gas Cost</span>
                    <span className="text-orange-400 font-semibold">~{formatCurrency(squeezeResult.totalGasCostUsd)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Integrator Fee</span>
                    <span className="text-orange-400 font-semibold">1%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="p-3 rounded bg-blue-500/10 border border-blue-500/30 flex gap-2 text-sm text-blue-300">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>You will need to approve and sign transactions in your wallet for each route.</p>
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
              Execute Pull
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Executing */}
      {step === 'executing' && (
        <Card className="bg-neutral-900 border-neutral-700 p-6 space-y-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold text-white">Executing Pull...</h3>
            <p className="text-sm text-neutral-400">
              {elapsedSeconds < 10
                ? 'Waiting for wallet confirmation...'
                : elapsedSeconds < 60
                  ? 'Transaction submitted, bridging in progress...'
                  : 'Cross-chain bridge in progress...'}
            </p>
            <div className="mt-2 text-xs text-neutral-500 flex items-center justify-center gap-2">
              <span className="text-orange-400 font-mono">
                {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
              </span>
              <span>elapsed</span>
            </div>
          </div>

          {/* Bridge timing info */}
          <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="text-blue-400 text-xs">
              ⏱️ Cross-chain bridges typically take 5-20 minutes. Your transaction is being processed.
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
                    {route.asset.asset.symbol} → {destinationToken.symbol}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {route.asset.chain} → {destinationChain.name}
                    {routeStatuses[index] === 'executing' && (
                      <span className="ml-2 text-orange-400">• Bridging...</span>
                    )}
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
            {/* Success or Partial Success icon */}
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
                  ? 'Pull Complete!'
                  : executionSummary?.successfulRoutes === 0
                    ? 'Pull Failed'
                    : 'Pull Partially Complete'}
              </h3>

              {/* Summary stats */}
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
                  ? `Funds have been pulled to ${destinationToken.symbol} on ${destinationChain.name}`
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

            {/* Done button */}
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
