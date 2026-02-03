'use client'

import { useState } from 'react'
import { X, ArrowRight, ChevronDown, Zap, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { Balance } from '@/lib/types/defi'

// Chain options for destination
const CHAIN_OPTIONS = [
    { id: 'ethereum', name: 'Ethereum', icon: '⟠' },
    { id: 'arbitrum', name: 'Arbitrum', icon: '🔵' },
    { id: 'optimism', name: 'Optimism', icon: '🔴' },
    { id: 'base', name: 'Base', icon: '🔷' },
    { id: 'bsc', name: 'BSC', icon: '🟡' },
    { id: 'scroll', name: 'Scroll', icon: '📜' },
    { id: 'zksync-era', name: 'zkSync Era', icon: '⚡' },
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
    const [step, setStep] = useState<'review' | 'destination' | 'confirm' | 'executing'>('review')
    const [destinationChain, setDestinationChain] = useState(CHAIN_OPTIONS[0])
    const [targetToken, setTargetToken] = useState(TOKEN_OPTIONS[0])
    const [showChainDropdown, setShowChainDropdown] = useState(false)
    const [showTokenDropdown, setShowTokenDropdown] = useState(false)

    const handleContinue = () => {
        if (step === 'review') {
            setStep('destination')
        } else if (step === 'destination') {
            setStep('confirm')
        } else if (step === 'confirm') {
            setStep('executing')
            // TODO: Trigger actual LI.FI routes execution
            setTimeout(() => {
                onClose()
            }, 3000)
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
            <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-neutral-800">
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

                    {step === 'confirm' && (
                        <>
                            {/* Confirmation Summary */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                                    <p className="text-sm text-yellow-200">
                                        You are about to swap {selectedAssets.length} tokens across multiple chains. This will execute multiple transactions.
                                    </p>
                                </div>

                                <div className="bg-neutral-800/50 rounded-xl p-4 space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-neutral-400">Total Value</span>
                                        <span className="font-medium text-white">{formatCurrency(totalUsd)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-neutral-400">Destination</span>
                                        <span className="font-medium text-white">{destinationChain.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-neutral-400">Target Token</span>
                                        <span className="font-medium text-white">{targetToken.symbol}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-neutral-400">Estimated Gas</span>
                                        <span className="font-medium text-white">~$5.00</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {step === 'executing' && (
                        <div className="py-8 text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/20 flex items-center justify-center animate-pulse">
                                <Zap className="w-8 h-8 text-orange-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Squeezing Assets...</h3>
                                <p className="text-sm text-neutral-400 mt-1">
                                    Please confirm the transactions in your wallet
                                </p>
                            </div>
                            <div className="flex justify-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step !== 'executing' && (
                    <div className="p-6 border-t border-neutral-800">
                        <div className="flex gap-3">
                            {step !== 'review' && (
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(step === 'confirm' ? 'destination' : 'review')}
                                    className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                                >
                                    Back
                                </Button>
                            )}
                            <Button
                                onClick={handleContinue}
                                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold"
                            >
                                {step === 'review' && 'Continue'}
                                {step === 'destination' && 'Review'}
                                {step === 'confirm' && 'Confirm & Squeeze'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
