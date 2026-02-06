"use client"

import { useState, useMemo } from "react"
import { Shield, TrendingUp, Wallet, ArrowDownToLine, Loader2, CheckCircle, AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EarnView } from "@/components/dashboard/earn-view"
import { ZapFlow } from "@/components/flows/zap-flow"
import { SUPPORTED_EARN_MARKETS, ATOKEN_METADATA, AAVE_V3_POOL_ADDRESSES, AAVE_POOL_ABI, isAaveToken } from "@/lib/constants/aave"
import { useUnifiedBalance } from "@/lib/hooks/use-unified-balance"
import { useAccount, useWriteContract, useSwitchChain, useConfig } from 'wagmi'
import { getPublicClient } from '@wagmi/core'
import { parseUnits, formatUnits } from 'viem'
import { formatCurrency } from "@/lib/utils"
import type { Balance } from "@/lib/types/defi"

interface VaultPosition {
  balance: Balance
  metadata: typeof ATOKEN_METADATA[string] | null
  underlyingValue: number
}

export function PositionsFlow() {
  const { address } = useAccount()
  const { data: unifiedBalance, refetch } = useUnifiedBalance(address)
  const { writeContractAsync } = useWriteContract()
  const { switchChainAsync } = useSwitchChain()
  const wagmiConfig = useConfig()

  const [activeTab, setActiveTab] = useState("earn")
  const [selectedZapMarket, setSelectedZapMarket] = useState<(typeof SUPPORTED_EARN_MARKETS)[0] | null>(null)

  // Withdraw modal state
  const [withdrawPosition, setWithdrawPosition] = useState<VaultPosition | null>(null)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [isMaxWithdraw, setIsMaxWithdraw] = useState(false)
  const [withdrawStep, setWithdrawStep] = useState<'input' | 'executing' | 'complete' | 'error'>('input')
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  // Filter balances to find aToken positions
  const vaultPositions = useMemo((): VaultPosition[] => {
    if (!unifiedBalance?.balances) return []

    return unifiedBalance.balances
      .filter(b => isAaveToken(b.asset.symbol))
      .map(balance => {
        // Try to find metadata by address (case-insensitive)
        const assetAddressLower = balance.asset.address?.toLowerCase()
        const metadata = Object.entries(ATOKEN_METADATA).find(
          ([addr]) => addr.toLowerCase() === assetAddressLower
        )?.[1] || null

        console.log('[Positions] Asset:', balance.asset.symbol, 'Address:', assetAddressLower, 'Metadata found:', !!metadata)

        return {
          balance,
          metadata,
          underlyingValue: balance.usdValue // For now, assume 1:1 (aTokens accrue value)
        }
      })
      .filter(p => p.balance.usdValue > 0.01) // Filter dust
  }, [unifiedBalance])

  const totalPositionsValue = useMemo(() =>
    vaultPositions.reduce((sum, p) => sum + p.balance.usdValue, 0)
    , [vaultPositions])

  // Handle withdraw
  const handleWithdraw = async () => {
    console.log('[Withdraw] handleWithdraw called')
    console.log('[Withdraw] withdrawPosition:', withdrawPosition)
    console.log('[Withdraw] address:', address)
    console.log('[Withdraw] withdrawAmount:', withdrawAmount)

    if (!withdrawPosition || !address || !withdrawAmount) {
      console.log('[Withdraw] Early return - missing:', {
        withdrawPosition: !!withdrawPosition,
        address: !!address,
        withdrawAmount: !!withdrawAmount
      })
      return
    }

    const { balance, metadata } = withdrawPosition
    console.log('[Withdraw] metadata:', metadata)

    if (!metadata) {
      console.log('[Withdraw] No metadata - setting error')
      setWithdrawError("Cannot withdraw: unknown aToken")
      return
    }

    setWithdrawStep('executing')
    setWithdrawError(null)

    try {
      const chainId = metadata.chainId
      const poolAddress = AAVE_V3_POOL_ADDRESSES[chainId as keyof typeof AAVE_V3_POOL_ADDRESSES]

      if (!poolAddress) {
        throw new Error(`No Aave pool for chain ${chainId}`)
      }

      // Switch to the correct chain
      console.log(`[Withdraw] Switching to chain ${chainId}`)
      await switchChainAsync({ chainId })

      // Get public client for this chain
      const publicClient = getPublicClient(wagmiConfig, { chainId })
      if (!publicClient) throw new Error('No public client')

      // Parse withdraw amount
      // For max, use a very large number that Aave interprets as "all"
      const amount = isMaxWithdraw
        ? BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")
        : parseUnits(withdrawAmount, metadata.decimals)

      console.log(`[Withdraw] Withdrawing ${isMaxWithdraw ? 'MAX' : withdrawAmount} from ${metadata.symbol}`)

      // Execute withdraw
      const tx = await writeContractAsync({
        address: poolAddress,
        abi: AAVE_POOL_ABI,
        functionName: 'withdraw',
        args: [metadata.underlying, amount, address],
      })

      console.log(`[Withdraw] Transaction: ${tx}`)
      await publicClient.waitForTransactionReceipt({ hash: tx })

      setWithdrawStep('complete')
      refetch() // Refresh balances
    } catch (err: any) {
      console.error('[Withdraw] Error:', err)
      setWithdrawError(err.message || 'Withdrawal failed')
      setWithdrawStep('error')
    }
  }

  const closeWithdrawModal = () => {
    setWithdrawPosition(null)
    setWithdrawAmount("")
    setIsMaxWithdraw(false)
    setWithdrawStep('input')
    setWithdrawError(null)
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-neutral-900 border border-neutral-800 p-1">
          <TabsTrigger value="earn" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white text-neutral-400 gap-2">
            <TrendingUp className="w-4 h-4" />
            Earn Yield
          </TabsTrigger>
          <TabsTrigger value="positions" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white text-neutral-400 gap-2">
            <Wallet className="w-4 h-4" />
            My Positions
            {vaultPositions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                {vaultPositions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earn" className="space-y-4 focus-visible:outline-none">
          <EarnView onZap={setSelectedZapMarket} />
        </TabsContent>

        <TabsContent value="positions" className="space-y-4 focus-visible:outline-none">
          {vaultPositions.length === 0 ? (
            <Card className="bg-neutral-900 border-neutral-700 p-8 text-center">
              <Shield className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">No Active Positions</h3>
              <p className="text-neutral-400 max-w-sm mx-auto mb-4">
                You don't have any Aave positions yet. Deposit assets to start earning yield.
              </p>
              <Button onClick={() => setActiveTab("earn")} variant="outline">
                <TrendingUp className="w-4 h-4 mr-2" />
                Explore Opportunities
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <Card className="bg-neutral-900 border-neutral-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-400">Total Positions Value</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totalPositionsValue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-neutral-400">Active Positions</p>
                    <p className="text-2xl font-bold text-green-400">{vaultPositions.length}</p>
                  </div>
                </div>
              </Card>

              {/* Positions List */}
              <div className="space-y-3">
                {vaultPositions.map((position, idx) => (
                  <Card key={idx} className="bg-neutral-900 border-neutral-700 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {position.metadata?.underlyingSymbol?.[0] || position.balance.asset.symbol[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">
                              {position.metadata?.underlyingSymbol || position.balance.asset.symbol}
                            </span>
                            <span className="text-xs text-neutral-500">
                              {position.balance.asset.symbol}
                            </span>
                            {position.metadata?.estimatedAPY && (
                              <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                {(position.metadata.estimatedAPY * 100).toFixed(1)}% APY
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-neutral-400">
                            {position.metadata?.chain || position.balance.chain} • Aave V3
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 mx-4">
                        {/* Yield info */}
                        {position.metadata?.estimatedAPY && (
                          <div className="text-center">
                            <div className="text-xs text-neutral-500">Est. Yield</div>
                            <div className="text-sm font-medium text-green-400">
                              +{formatCurrency(position.balance.usdValue * position.metadata.estimatedAPY / 365)}/day
                            </div>
                            <div className="text-xs text-neutral-500">
                              ~{formatCurrency(position.balance.usdValue * position.metadata.estimatedAPY / 12)}/mo
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-white">
                          {formatCurrency(position.balance.usdValue)}
                        </div>
                        <div className="text-sm text-neutral-400">
                          {parseFloat(position.balance.amount).toFixed(4)} {position.balance.asset.symbol}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-4"
                        onClick={() => setWithdrawPosition(position)}
                      >
                        <ArrowDownToLine className="w-4 h-4 mr-1" />
                        Withdraw
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Zap Flow Modal */}
      {selectedZapMarket && (
        <ZapFlow
          targetMarket={selectedZapMarket}
          onClose={() => setSelectedZapMarket(null)}
          onRefresh={() => refetch()}
        />
      )}

      {/* Withdraw Modal */}
      {withdrawPosition && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-neutral-900 border-neutral-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Withdraw</h2>
              <Button variant="ghost" size="sm" onClick={closeWithdrawModal}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {withdrawStep === 'input' && (
              <div className="space-y-4">
                <div className="p-4 bg-neutral-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-neutral-400">Position</span>
                    <span className="text-white font-medium">
                      {withdrawPosition.metadata?.underlyingSymbol || withdrawPosition.balance.asset.symbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Available</span>
                    <span className="text-white">
                      {parseFloat(withdrawPosition.balance.amount).toFixed(4)} ({formatCurrency(withdrawPosition.balance.usdValue)})
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">Amount to Withdraw</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => {
                        setWithdrawAmount(e.target.value)
                        setIsMaxWithdraw(false)
                      }}
                      className="bg-neutral-800 border-neutral-700 text-white hover:text-white"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        setWithdrawAmount(withdrawPosition.balance.amount)
                        setIsMaxWithdraw(true)
                      }}
                    >
                      Max
                    </Button>
                  </div>
                  {isMaxWithdraw && (
                    <p className="text-xs text-green-400 mt-1">Withdrawing full balance</p>
                  )}
                </div>

                <Button
                  type="button"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    console.log('[Withdraw] Button clicked, amount:', withdrawAmount)
                    handleWithdraw()
                  }}
                  disabled={!withdrawAmount || withdrawAmount.trim() === ''}
                >
                  Withdraw {withdrawPosition.metadata?.underlyingSymbol}
                </Button>
              </div>
            )}

            {withdrawStep === 'executing' && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-white font-medium">Processing Withdrawal...</p>
                <p className="text-sm text-neutral-400 mt-2">Please confirm in your wallet</p>
              </div>
            )}

            {withdrawStep === 'complete' && (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-white font-medium">Withdrawal Complete!</p>
                <p className="text-sm text-neutral-400 mt-2">
                  Your {withdrawPosition.metadata?.underlyingSymbol} has been sent to your wallet.
                </p>
                <Button className="mt-4" onClick={closeWithdrawModal}>
                  Done
                </Button>
              </div>
            )}

            {withdrawStep === 'error' && (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-white font-medium">Withdrawal Failed</p>
                <p className="text-sm text-red-400 mt-2">{withdrawError}</p>
                <Button className="mt-4" variant="outline" onClick={() => setWithdrawStep('input')}>
                  Try Again
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
