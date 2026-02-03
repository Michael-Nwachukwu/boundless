'use client'

import { useState, useEffect } from 'react'
import { X, ArrowRight, ChevronDown, Zap, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { EnsAddressInput } from '@/components/ui/ens-address-input'
import { formatCurrency } from '@/lib/utils'
import { getChainId } from '@/lib/api/lifi'
import { useLifiConfig } from '@/lib/hooks/use-lifi-config'
import { resolveSqueezeRoutes, executeSqueezeRoutes, type ResolvedRoute, type SqueezeResult } from '@/lib/routing/squeeze-resolver'
import type { Balance } from '@/lib/types/defi'

// Chain options for destination
const CHAIN_OPTIONS = [
    { id: 'ethereum', name: 'Ethereum', icon: '⟠', chainId: 1 },
    { id: 'arbitrum', name: 'Arbitrum', icon: '🔵', chainId: 42161 },
    { id: 'optimism', name: 'Optimism', icon: '🔴', chainId: 10 },
    { id: 'base', name: 'Base', icon: '🔷', chainId: 8453 },
    { id: 'bsc', name: 'BSC', icon: '🟡', chainId: 56 },
    { id: 'scroll', name: 'Scroll', icon: '📜', chainId: 534352 },
    { id: 'zksync-era', name: 'zkSync Era', icon: '⚡', chainId: 324 },
]

// Target token options
const TOKEN_OPTIONS = [
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'USDT', name: 'Tether' },
]

interface SqueezeFlowProps {
    selectedAssets: Balance[]
    totalUsd: number
    onClose: () => void
}

export function SqueezeFlow({ selectedAssets, totalUsd, onClose }: SqueezeFlowProps) {
    // Initialize LI.FI SDK with wagmi provider for transaction execution
    useLifiConfig()

    const { address: connectedAddress } = useAccount()
    const [step, setStep] = useState<'review' | 'destination' | 'routes' | 'executing' | 'complete'>('review')
    const [destinationChain, setDestinationChain] = useState(CHAIN_OPTIONS[0])
    const [targetToken, setTargetToken] = useState(TOKEN_OPTIONS[0])
    const [showChainDropdown, setShowChainDropdown] = useState(false)
    const [showTokenDropdown, setShowTokenDropdown] = useState(false)
    const [destinationAddress, setDestinationAddress] = useState('')

    // LI.FI routing state
    const [isResolvingRoutes, setIsResolvingRoutes] = useState(false)
    const [squeezeResult, setSqueezeResult] = useState<SqueezeResult | null>(null)
    const [routeStatuses, setRouteStatuses] = useState<ResolvedRoute['status'][]>([])
    const [executionError, setExecutionError] = useState<string | null>(null)
    const [executionStartTime, setExecutionStartTime] = useState<number | null>(null)
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [executionSummary, setExecutionSummary] = useState<{
        totalRoutes: number
        successfulRoutes: number
        failedRoutes: number
        errors: { index: number; message: string }[]
    } | null>(null)

    // Update elapsed time during execution
    useEffect(() => {
        if (step !== 'executing' || !executionStartTime) return

        const interval = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - executionStartTime) / 1000))
        }, 1000)

        return () => clearInterval(interval)
    }, [step, executionStartTime])

    // Fetch routes when moving to routes step
    const fetchRoutes = async () => {
        setIsResolvingRoutes(true)
        setExecutionError(null)

        try {
            const result = await resolveSqueezeRoutes({
                assets: selectedAssets,
                destinationChainId: destinationChain.chainId,
                destinationToken: targetToken.symbol,
                destinationAddress: destinationAddress,
            })

            setSqueezeResult(result)
            setRouteStatuses(result.routes.map(() => 'pending'))
        } catch (error) {
            console.error('[SqueezeFlow] Error resolving routes:', error)
            setExecutionError(error instanceof Error ? error.message : 'Failed to fetch routes')
        } finally {
            setIsResolvingRoutes(false)
        }
    }

    const handleContinue = async () => {
        if (step === 'review') {
            setStep('destination')
        } else if (step === 'destination') {
            if (!destinationAddress) return
            setStep('routes')
            fetchRoutes()
        } else if (step === 'routes') {
            if (!squeezeResult || squeezeResult.routes.length === 0) return
            setStep('executing')
            setExecutionStartTime(Date.now())
            executeRoutes()
        }
    }

    const executeRoutes = async () => {
        if (!squeezeResult) return

        try {
            const result = await executeSqueezeRoutes(
                squeezeResult.routes,
                (index, status, errorMessage) => {
                    setRouteStatuses(prev => {
                        const updated = [...prev]
                        updated[index] = status
                        return updated
                    })
                }
            )

            // Save execution summary
            setExecutionSummary({
                totalRoutes: result.totalRoutes,
                successfulRoutes: result.successfulRoutes,
                failedRoutes: result.failedRoutes,
                errors: result.errors,
            })

            // Always proceed to complete step (even with partial failures)
            setStep('complete')

            // Set error message only if there were failures
            if (result.failedRoutes > 0) {
                setExecutionError(
                    result.failedRoutes === result.totalRoutes
                        ? 'All transactions failed'
                        : `${result.failedRoutes} of ${result.totalRoutes} transactions failed`
                )
            }
        } catch (error) {
            console.error('[SqueezeFlow] Execution error:', error)
            setExecutionError(error instanceof Error ? error.message : 'Execution failed')
            setStep('complete')
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Squeeze Assets</h2>
                            <p className="text-sm text-neutral-400">
                                Consolidate {selectedAssets.length} asset{selectedAssets.length > 1 ? 's' : ''} into one
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {step === 'review' && (
                        <>
                            {/* Selected Assets Summary */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">Selected Assets</h3>
                                <div className="bg-neutral-800/50 rounded-xl p-4 max-h-64 overflow-y-auto space-y-3">
                                    {selectedAssets.map((asset, index) => (
                                        <div key={index} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold">
                                                    {asset.asset.symbol.slice(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-white">{asset.asset.symbol}</div>
                                                    <div className="text-xs text-neutral-500">{asset.chain}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-white">{formatCurrency(asset.usdValue)}</div>
                                                <div className="text-xs text-neutral-500">{Number(asset.amount).toFixed(4)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Total */}
                            <div className="flex items-center justify-between p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                                <span className="text-sm font-medium text-orange-400">Total Value</span>
                                <span className="text-xl font-bold text-white">{formatCurrency(totalUsd)}</span>
                            </div>
                        </>
                    )}

                    {step === 'destination' && (
                        <>
                            {/* Destination Chain */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">Destination Chain</h3>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowChainDropdown(!showChainDropdown)}
                                        className="w-full flex items-center justify-between p-4 bg-neutral-800 rounded-xl hover:bg-neutral-750 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">{destinationChain.icon}</span>
                                            <span className="font-medium text-white">{destinationChain.name}</span>
                                        </div>
                                        <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${showChainDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showChainDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden z-10">
                                            {CHAIN_OPTIONS.map((chain) => (
                                                <button
                                                    key={chain.id}
                                                    onClick={() => {
                                                        setDestinationChain(chain)
                                                        setShowChainDropdown(false)
                                                    }}
                                                    className="w-full flex items-center gap-3 p-4 hover:bg-neutral-700 transition-colors text-left"
                                                >
                                                    <span className="text-xl">{chain.icon}</span>
                                                    <span className="font-medium text-white">{chain.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Target Token */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">Target Token</h3>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                                        className="w-full flex items-center justify-between p-4 bg-neutral-800 rounded-xl hover:bg-neutral-750 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold">
                                                {targetToken.symbol.slice(0, 2)}
                                            </div>
                                            <span className="font-medium text-white">{targetToken.symbol}</span>
                                        </div>
                                        <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${showTokenDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showTokenDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden z-10">
                                            {TOKEN_OPTIONS.map((token) => (
                                                <button
                                                    key={token.symbol}
                                                    onClick={() => {
                                                        setTargetToken(token)
                                                        setShowTokenDropdown(false)
                                                    }}
                                                    className="w-full flex items-center gap-3 p-4 hover:bg-neutral-700 transition-colors text-left"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold">
                                                        {token.symbol.slice(0, 2)}
                                                    </div>
                                                    <span className="font-medium text-white">{token.symbol}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recipient Address */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">Recipient Address</h3>
                                <EnsAddressInput
                                    value={destinationAddress}
                                    onChange={setDestinationAddress}
                                    placeholder="Enter address or ENS name"
                                    defaultAddress={connectedAddress}
                                />
                            </div>

                            {/* Summary */}
                            <div className="flex items-center justify-center gap-3 py-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-white">{selectedAssets.length}</div>
                                    <div className="text-xs text-neutral-500">Assets</div>
                                </div>
                                <ArrowRight className="w-6 h-6 text-orange-500" />
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-white">{targetToken.symbol}</div>
                                    <div className="text-xs text-neutral-500">on {destinationChain.name}</div>
                                </div>
                            </div>
                        </>
                    )}

                    {step === 'routes' && (
                        <>
                            {isResolvingRoutes ? (
                                <div className="py-8 text-center space-y-4">
                                    <Loader2 className="w-12 h-12 mx-auto text-orange-500 animate-spin" />
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Finding Best Routes...</h3>
                                        <p className="text-sm text-neutral-400 mt-1">
                                            Comparing bridges and DEXes for optimal pricing
                                        </p>
                                    </div>
                                </div>
                            ) : squeezeResult ? (
                                <div className="space-y-4">
                                    {/* Routes List */}
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">
                                            Routes ({squeezeResult.routes.length})
                                        </h3>
                                        <div className="space-y-2">
                                            {squeezeResult.routes.map((route, index) => (
                                                <div key={index} className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg">
                                                    <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold">
                                                        {route.asset.asset.symbol.slice(0, 2)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-white">
                                                            {route.asset.asset.symbol} ({route.asset.chain})
                                                        </div>
                                                        <div className="text-xs text-neutral-500">
                                                            Gas: ~${route.estimatedGasCostUsd}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-medium text-white">
                                                            {formatCurrency(route.asset.usdValue)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Skipped Assets Warning */}
                                    {squeezeResult.skippedAssets.length > 0 && (
                                        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                                            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-yellow-200">
                                                    {squeezeResult.skippedAssets.length} asset(s) couldn't be routed
                                                </p>
                                                <ul className="mt-1 text-xs text-yellow-300/70">
                                                    {squeezeResult.skippedAssets.map((item, i) => (
                                                        <li key={i}>• {item.asset.asset.symbol}: {item.reason}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )}

                                    {/* Summary */}
                                    <div className="bg-neutral-800/50 rounded-xl p-4 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-400">Total Input</span>
                                            <span className="font-medium text-white">{formatCurrency(squeezeResult.totalInputUsd)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-400">Est. Output</span>
                                            <span className="font-medium text-white">{formatCurrency(squeezeResult.totalEstimatedOutputUsd)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-400">Total Gas</span>
                                            <span className="font-medium text-orange-400">~{formatCurrency(squeezeResult.totalGasCostUsd)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm pt-2 border-t border-neutral-700">
                                            <span className="text-neutral-400">Fee (1%)</span>
                                            <span className="font-medium text-neutral-300">{formatCurrency(squeezeResult.totalInputUsd * 0.01)}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : executionError ? (
                                <div className="py-8 text-center space-y-4">
                                    <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Route Error</h3>
                                        <p className="text-sm text-red-400 mt-1">{executionError}</p>
                                    </div>
                                </div>
                            ) : null}
                        </>
                    )}

                    {step === 'executing' && (
                        <div className="space-y-4">
                            <div className="text-center mb-4">
                                <h3 className="text-lg font-bold text-white">Executing Squeeze...</h3>
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

                            {/* Execution Progress */}
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
                                                {route.asset.asset.symbol} → {targetToken.symbol}
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

                            {executionError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                                    {executionError}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'complete' && (
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
                                        ? 'Squeeze Complete!'
                                        : executionSummary?.successfulRoutes === 0
                                            ? 'Squeeze Failed'
                                            : 'Squeeze Partially Complete'}
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
                                        ? `Assets have been consolidated to ${targetToken.symbol} on ${destinationChain.name}`
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

                            {/* Close button */}
                            <Button
                                onClick={onClose}
                                className="mt-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold"
                            >
                                Done
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step !== 'executing' && step !== 'complete' && (
                    <div className="p-6 border-t border-neutral-800 sticky bottom-0 bg-neutral-900">
                        <div className="flex gap-3">
                            {step !== 'review' && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (step === 'destination') setStep('review')
                                        if (step === 'routes') setStep('destination')
                                    }}
                                    className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                                >
                                    Back
                                </Button>
                            )}
                            <Button
                                onClick={handleContinue}
                                disabled={
                                    (step === 'destination' && !destinationAddress) ||
                                    (step === 'routes' && (!squeezeResult || squeezeResult.routes.length === 0 || isResolvingRoutes))
                                }
                                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold disabled:opacity-50"
                            >
                                {step === 'review' && 'Continue'}
                                {step === 'destination' && 'Find Routes'}
                                {step === 'routes' && 'Confirm & Squeeze'}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'complete' && (
                    <div className="p-6 border-t border-neutral-800">
                        <Button
                            onClick={onClose}
                            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold"
                        >
                            Done
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
