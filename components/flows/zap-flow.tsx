"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { useAccount, useWriteContract, useSendTransaction, useSwitchChain, useConfig } from 'wagmi'
import { getPublicClient } from '@wagmi/core'
import { parseUnits, type Address, erc20Abi, encodeFunctionData } from 'viem'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useLifiConfig } from "@/lib/hooks/use-lifi-config"
import { useUnifiedBalance } from "@/lib/hooks/use-unified-balance"
import { resolveZapRoutes, type ZapResult } from "@/lib/routing/zap-resolver"
import { executeRoute, getChainId } from "@/lib/api/lifi"
import { formatCurrency } from "@/lib/utils"
import { AAVE_POOL_ABI, AAVE_V3_POOL_ADDRESSES } from "@/lib/constants/aave"
import type { Balance } from "@/lib/types/defi"

// Helper to get chainId from chain name
const getChainIdFromName = (chainName: string): number => getChainId(chainName)

interface ZapFlowProps {
    targetMarket: {
        chain: string
        chainId: number
        protocol: string
        asset: string
        aToken: string
        underlying?: string
    }
    onClose: () => void
    onRefresh?: () => void
}

type Step = 'amount' | 'preview' | 'executing' | 'complete'

export function ZapFlow({ targetMarket, onClose, onRefresh }: ZapFlowProps) {
    useLifiConfig()

    const { address: connectedAddress } = useAccount()
    const { writeContractAsync } = useWriteContract()
    const { sendTransactionAsync } = useSendTransaction()
    const { switchChainAsync } = useSwitchChain()
    const wagmiConfig = useConfig()

    const { data: unifiedBalance, isLoading: isLoadingBalances } = useUnifiedBalance(connectedAddress)
    const balances = unifiedBalance?.balances ?? []

    // State
    const [step, setStep] = useState<Step>('amount')
    const [amount, setAmount] = useState('')
    const [isResolving, setIsResolving] = useState(false)
    const [zapResult, setZapResult] = useState<ZapResult | null>(null)
    const [selectedSourceAssets, setSelectedSourceAssets] = useState<Balance[]>([])
    const [executionError, setExecutionError] = useState<string | null>(null)
    const [executionStatus, setExecutionStatus] = useState<Record<number, string>>({})

    // Prioritize assets: 1) Same chain + underlying token, 2) Same chain, 3) Cross-chain by USD value
    // Also filter out the vault's own aToken (can't deposit aTokens back into the same vault)
    const availableAssets = useMemo(() => {
        const targetChainId = targetMarket.chainId
        const underlyingToken = targetMarket.underlying?.toLowerCase()
        const aTokenAddress = targetMarket.aToken?.toLowerCase()

        return balances
            .filter(b => b.usdValue > 0.01)
            // Exclude the vault's aToken - can't deposit aTokens back into the vault
            .filter(b => {
                const assetAddress = b.asset.address.toLowerCase()
                if (aTokenAddress && assetAddress === aTokenAddress) {
                    console.log(`[ZapFlow] Excluding aToken ${b.asset.symbol} from source assets`)
                    return false
                }
                return true
            })
            .sort((a, b) => {
                const aChainId = getChainIdFromName(a.chain)
                const bChainId = getChainIdFromName(b.chain)

                const aIsSameChain = aChainId === targetChainId
                const bIsSameChain = bChainId === targetChainId

                const aIsUnderlying = aIsSameChain && underlyingToken && a.asset.address.toLowerCase() === underlyingToken
                const bIsUnderlying = bIsSameChain && underlyingToken && b.asset.address.toLowerCase() === underlyingToken

                // Priority 1: Same chain + exact underlying token (BEST for direct deposit)
                if (aIsUnderlying && !bIsUnderlying) return -1
                if (!aIsUnderlying && bIsUnderlying) return 1

                // Priority 2: Same chain assets
                if (aIsSameChain && !bIsSameChain) return -1
                if (!aIsSameChain && bIsSameChain) return 1

                // Priority 3: Deprioritize Ethereum mainnet (expensive gas)
                const aIsMainnet = aChainId === 1
                const bIsMainnet = bChainId === 1
                if (aIsMainnet && !bIsMainnet) return 1  // Push mainnet to end
                if (!aIsMainnet && bIsMainnet) return -1 // Pull non-mainnet forward

                // Priority 4: By USD value (highest first)
                return b.usdValue - a.usdValue
            })
    }, [balances, targetMarket.chainId, targetMarket.underlying, targetMarket.aToken])

    const maxUsd = useMemo(() => availableAssets.reduce((sum, b) => sum + b.usdValue, 0), [availableAssets])

    const targetAmount = parseFloat(amount || '0')
    const isAmountValid = targetAmount > 0 && targetAmount <= maxUsd

    const getSourceAssetsForAmount = (requiredUsd: number) => {
        let currentUsd = 0
        const selected: Balance[] = []

        for (const asset of availableAssets) {
            if (currentUsd >= requiredUsd) break
            const remaining = requiredUsd - currentUsd
            const safeFloatAmount = parseFloat(asset.amount || '0').toFixed(asset.asset.decimals)
            const totalAtomic = parseUnits(safeFloatAmount, asset.asset.decimals)

            if (asset.usdValue <= remaining) {
                selected.push({ ...asset, amount: totalAtomic.toString() })
                currentUsd += asset.usdValue
            } else {
                const fraction = remaining / asset.usdValue
                const fractionBn = BigInt(Math.floor(fraction * 1_000_000_000))
                const partialAtomic = (totalAtomic * fractionBn) / BigInt(1_000_000_000)
                selected.push({ ...asset, amount: partialAtomic.toString(), usdValue: remaining })
                currentUsd += remaining
            }
        }
        return selected
    }

    const handlePreview = async () => {
        if (!isAmountValid || !connectedAddress) return
        setIsResolving(true)
        setExecutionError(null)
        setZapResult(null)

        try {
            const sourceAssets = getSourceAssetsForAmount(targetAmount)
            setSelectedSourceAssets(sourceAssets)

            const result = await resolveZapRoutes({
                assets: sourceAssets,
                destinationChainId: targetMarket.chainId,
                destinationToken: targetMarket.aToken,
                destinationUnderlyingToken: targetMarket.underlying,
                destinationAddress: connectedAddress
            })

            if (result.routes.length === 0) {
                setExecutionError("No routes found for this Zap. Try a different amount.")
                return
            }

            setZapResult(result)
            setStep('preview')
        } catch (error) {
            console.error("Zap resolution failed:", error)
            setExecutionError("Failed to calculate routes. Please try again.")
        } finally {
            setIsResolving(false)
        }
    }

    const handleExecute = async () => {
        if (!zapResult) return

        setStep('executing')
        setExecutionError(null)
        setExecutionStatus({})

        let failed = false
        const errors: string[] = []

        // Sequential Execution Loop
        for (let i = 0; i < zapResult.routes.length; i++) {
            const route = zapResult.routes[i]
            setExecutionStatus(prev => ({ ...prev, [i]: 'executing' }))

            try {
                if (route.isDirect && route.directCall) {
                    // --- Direct Deposit Execution (Same Chain) ---
                    console.log('[ZapFlow] Direct Deposit detected')

                    const { chainId, token, amount, target, callData } = route.directCall

                    // 0. Switch to correct chain FIRST
                    console.log(`[ZapFlow] Switching to chain ${chainId}`)
                    await switchChainAsync({ chainId })

                    // Get fresh publicClient for the NEW chain after switching
                    const publicClient = getPublicClient(wagmiConfig, { chainId })
                    if (!publicClient) {
                        throw new Error(`No public client available for chain ${chainId}`)
                    }

                    // 1. Approve Aave Pool
                    console.log(`[ZapFlow] Approving token ${token} for ${target}`)
                    const approveHash = await writeContractAsync({
                        address: token,
                        abi: erc20Abi,
                        functionName: 'approve',
                        args: [target, amount],
                    })
                    console.log(`[ZapFlow] Waiting for approval tx: ${approveHash}`)
                    await publicClient.waitForTransactionReceipt({ hash: approveHash })

                    // 2. Execute Supply via raw transaction
                    console.log(`[ZapFlow] Executing supply to ${target}`)
                    const supplyHash = await sendTransactionAsync({
                        to: target,
                        data: callData,
                        value: BigInt(0)
                    })
                    console.log(`[ZapFlow] Waiting for supply tx: ${supplyHash}`)
                    await publicClient.waitForTransactionReceipt({ hash: supplyHash })

                } else if (route.route) {
                    // --- LI.FI Execution (Cross Chain Bridge) ---
                    console.log('[ZapFlow] Executing cross-chain bridge')
                    await executeRoute(route.route as any)

                    // --- Post-Bridge Direct Deposit ---
                    // After the bridge completes, execute a Direct Deposit to Aave
                    const destChainId = targetMarket.chainId
                    const underlyingToken = targetMarket.underlying as `0x${string}`
                    const aavePool = AAVE_V3_POOL_ADDRESSES[destChainId as keyof typeof AAVE_V3_POOL_ADDRESSES]

                    if (underlyingToken && aavePool && connectedAddress) {
                        console.log('[ZapFlow] Bridge complete, executing post-bridge Direct Deposit')

                        // Switch to destination chain
                        console.log(`[ZapFlow] Switching to destination chain ${destChainId}`)
                        await switchChainAsync({ chainId: destChainId })

                        // Get fresh public client for destination chain
                        const destPublicClient = getPublicClient(wagmiConfig, { chainId: destChainId })
                        if (!destPublicClient) {
                            throw new Error(`No public client for chain ${destChainId}`)
                        }

                        // Check balance of bridged token (wait a moment for indexing)
                        await new Promise(resolve => setTimeout(resolve, 2000))

                        const bridgedBalance = await destPublicClient.readContract({
                            address: underlyingToken,
                            abi: erc20Abi,
                            functionName: 'balanceOf',
                            args: [connectedAddress]
                        }) as bigint

                        console.log(`[ZapFlow] Bridged balance on destination: ${bridgedBalance}`)

                        if (bridgedBalance > BigInt(0)) {
                            // Encode supply call
                            const supplyCallData = encodeFunctionData({
                                abi: AAVE_POOL_ABI,
                                functionName: 'supply',
                                args: [underlyingToken, bridgedBalance, connectedAddress, 0]
                            })

                            // Approve Aave Pool
                            console.log(`[ZapFlow] Approving ${bridgedBalance} to Aave Pool`)
                            const approveHash = await writeContractAsync({
                                address: underlyingToken,
                                abi: erc20Abi,
                                functionName: 'approve',
                                args: [aavePool as `0x${string}`, bridgedBalance],
                            })
                            await destPublicClient.waitForTransactionReceipt({ hash: approveHash })

                            // Execute Supply
                            console.log(`[ZapFlow] Supplying to Aave`)
                            const supplyHash = await sendTransactionAsync({
                                to: aavePool as `0x${string}`,
                                data: supplyCallData,
                                value: BigInt(0)
                            })
                            await destPublicClient.waitForTransactionReceipt({ hash: supplyHash })
                            console.log('[ZapFlow] Post-bridge Direct Deposit complete!')
                        }
                    }
                } else {
                    throw new Error("Invalid route configuration")
                }

                setExecutionStatus(prev => ({ ...prev, [i]: 'completed' }))
            } catch (err: any) {
                console.error(`[ZapFlow] Execution failed for route ${i}:`, err)
                setExecutionStatus(prev => ({ ...prev, [i]: 'failed' }))
                failed = true
                errors.push(err.message || 'Transaction failed')
                // Stop remaining routes if one fails
                break
            }
        }

        if (failed) {
            setStep('preview')
            setExecutionError(`Execution failed: ${errors[0]}`)
            return
        }

        setStep('complete')
        if (onRefresh) onRefresh()
    }

    if (!targetMarket) return null

    if (step === 'complete') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <Card className="w-full max-w-md bg-neutral-900 border-neutral-800 p-8 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white">Zap Successful!</h2>
                        <p className="text-neutral-400">
                            Your assets have been successfully bridged and deposited into {targetMarket.protocol}.
                        </p>
                    </div>
                    <Button
                        onClick={onClose}
                        className="w-full h-12 bg-white text-black hover:bg-neutral-200"
                    >
                        Done
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <Card className="w-full max-w-md bg-neutral-900 border-neutral-800 p-6 flex flex-col h-[600px] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button onClick={step === 'preview' ? () => setStep('amount') : onClose} className="text-neutral-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-lg font-bold text-white">Zap to Earn</h2>
                    <div className="w-5" />
                </div>

                <div className="flex-1 overflow-y-auto space-y-6">
                    {/* Target Info */}
                    <div className="p-4 bg-neutral-800/50 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center font-bold text-blue-400">
                                {targetMarket.asset === 'USDC' ? '$' : 'Ξ'}
                            </div>
                            <div>
                                <h3 className="font-bold text-white">{targetMarket.asset} Yield</h3>
                                <p className="text-xs text-neutral-400">{targetMarket.protocol} on {targetMarket.chain}</p>
                            </div>
                        </div>
                    </div>

                    {step === 'amount' && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm text-neutral-400">Amount to Invest (USD)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        className="pl-8 h-14 bg-neutral-950 border-neutral-800 text-lg hover:text-white text-white"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        disabled={isResolving}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-neutral-400 px-1">
                                    <span>Available: {formatCurrency(maxUsd)}</span>
                                    {isAmountValid && <span className="text-green-400">Valid Amount</span>}
                                </div>
                            </div>

                            {executionError && (
                                <div className="space-y-4">
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        {executionError}
                                    </div>

                                    {/* Asset Preview on Error */}
                                    {selectedSourceAssets.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-xs font-semibold text-neutral-500 uppercase">Attempted Funding Sources</h3>
                                                <span className="text-xs text-neutral-600">{selectedSourceAssets.length} tokens selected</span>
                                            </div>
                                            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                                                {selectedSourceAssets.map((asset, idx) => (
                                                    <div key={idx} className="flex justify-between items-center p-2 bg-neutral-900/50 rounded border border-neutral-800 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            {asset.asset.logo && <img src={asset.asset.logo} alt={asset.asset.symbol} className="w-5 h-5 rounded-full" />}
                                                            <span className="font-medium text-neutral-300">{asset.asset.symbol}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-neutral-300">${formatCurrency(asset.usdValue)}</div>
                                                            <div className="text-xs text-neutral-500">{asset.chain}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {isLoadingBalances && (
                                <div className="flex items-center justify-center py-4 text-neutral-500 text-sm gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Updating balances...
                                </div>
                            )}
                        </div>
                    )}

                    {(step === 'preview' || step === 'executing') && zapResult && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <h3 className="text-sm text-neutral-400">Plan Summary</h3>
                                <div className="p-3 bg-neutral-950 rounded border border-neutral-800 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-neutral-500">Total Input</span>
                                        <span className="text-white font-mono">{formatCurrency(zapResult.totalInputUsd)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-neutral-500">Estimated Gas</span>
                                        <span className="text-orange-400 font-mono">~{formatCurrency(zapResult.totalGasCostUsd)}</span>
                                    </div>
                                    <div className="h-px bg-neutral-800 my-2" />
                                    <div className="flex justify-between font-bold">
                                        <span className="text-white">Est. Investment</span>
                                        <span className="text-green-400 font-mono">{formatCurrency(zapResult.totalEstimatedOutputUsd)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm text-neutral-400">Routes ({zapResult.routes.length})</h3>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                    {zapResult.routes.map((result, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 bg-neutral-800/30 rounded border border-neutral-800">
                                            <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-white">{result.asset.asset.symbol}</span>
                                                    <span className="text-neutral-500 text-xs">on {result.asset.chain}</span>
                                                    {result.isDirect ? (
                                                        <span className="ml-2 px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded uppercase font-bold tracking-wider">
                                                            Direct
                                                        </span>
                                                    ) : (
                                                        <span className="ml-2 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded uppercase font-bold tracking-wider">
                                                            Bridge
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-neutral-400 truncate">
                                                    Using {formatCurrency(result.asset.usdValue)}
                                                </div>
                                            </div>
                                            <div className="text-xs text-neutral-500">
                                                {executionStatus[idx] === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                                                {executionStatus[idx] === 'failed' && <AlertCircle className="w-5 h-5 text-red-500" />}
                                                {executionStatus[idx] === 'executing' && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
                                                {!executionStatus[idx] && 'Zap'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-neutral-800">
                    <Button
                        onClick={step === 'amount' ? handlePreview : handleExecute}
                        disabled={
                            (step === 'amount' && !isAmountValid) ||
                            isResolving ||
                            step === 'executing'
                        }
                        className="w-full h-12 bg-white text-black hover:bg-neutral-200 disabled:opacity-50 font-bold"
                    >
                        {isResolving ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Finding Best Routes...
                            </div>
                        ) : step === 'executing' ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Executing Zap...
                            </div>
                        ) : step === 'preview' ? (
                            'Execute Zap'
                        ) : (
                            'Review Amount'
                        )}
                    </Button>
                </div>
            </Card>
        </div>
    )
}
