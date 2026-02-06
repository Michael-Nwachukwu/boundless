
import { type Route } from '@lifi/types'
import { getOptimalRoutes } from '@/lib/api/lifi'
import { executeRoute } from '@/lib/api/lifi'
import type { Balance } from '@/lib/types/defi'
import { getChainId } from '@/lib/api/lifi'
import { formatUnits, encodeFunctionData } from 'viem'
import { AAVE_V3_POOL_ADDRESSES, AAVE_POOL_ABI } from '@/lib/constants/aave'

export interface ZapRouteRequest {
    assets: Balance[] // Source assets to zap from
    destinationChainId: number
    destinationToken: string // The Protocol Token (e.g., aBaseUSDC address) - Used for metadata/final step
    destinationUnderlyingToken?: string // The underlying asset (e.g. USDC) to bridge to first
    destinationAddress: string // User's address
}

export interface ResolvedZapRoute {
    asset: Balance
    route?: Route
    estimatedOutput: string
    gasCostUSD: number
    hasAutoDeposit?: boolean
    isDirect?: boolean // Flag for same-chain direct execution
    directCall?: {
        chainId: number // Target chain for execution
        target: `0x${string}`
        callData: `0x${string}`
        amount: bigint
        token: `0x${string}`
    }
}

export interface ZapResult {
    routes: ResolvedZapRoute[]
    totalInputUsd: number
    totalEstimatedOutputUsd: number
    totalGasCostUsd: number
}

/**
 * Resolves routes for Zapping into a DeFi position.
 * Uses LI.FI for ALL routes (Same-Chain and Cross-Chain), injecting Contract Calls
 * for the deposit step.
 */
export async function resolveZapRoutes(request: ZapRouteRequest): Promise<ZapResult> {
    const { assets, destinationChainId, destinationToken, destinationUnderlyingToken, destinationAddress } = request
    const routes: ResolvedZapRoute[] = []

    let totalInputUsd = 0
    let totalEstimatedOutputUsd = 0
    let totalGasCostUsd = 0

    // Process each source asset
    for (const asset of assets) {
        try {
            const fromChainId = getChainId(asset.chain)
            if (!fromChainId) {
                console.warn(`[ZapResolver] Skipping asset ${asset.asset.symbol} - unknown chain: ${asset.chain}`)
                continue
            }

            const fromAmount = asset.amount
            const targetToken = destinationUnderlyingToken || destinationToken
            const aavePoolAddress = AAVE_V3_POOL_ADDRESSES[destinationChainId]

            // Debug logging for chain comparison
            console.log(`[ZapResolver] Processing ${asset.asset.symbol}:`, {
                fromChain: asset.chain,
                fromChainId,
                destinationChainId,
                isSameChain: fromChainId === destinationChainId,
                aavePoolAddress
            })

            // CHECK: Direct Deposit (Same Chain + Same Token)
            // If we are on the destination chain and holding the underlying asset, 
            // we should NOT use LI.FI. Just Approve + Supply directly.
            if (fromChainId === destinationChainId &&
                destinationUnderlyingToken &&
                asset.asset.address.toLowerCase() === destinationUnderlyingToken.toLowerCase() &&
                aavePoolAddress) {

                const amount = BigInt(fromAmount)

                const supplyCallData = encodeFunctionData({
                    abi: AAVE_POOL_ABI,
                    functionName: 'supply',
                    args: [
                        destinationUnderlyingToken as `0x${string}`,
                        amount,
                        destinationAddress as `0x${string}`,
                        0
                    ]
                })

                // Create a Direct Route (Bypassing LI.FI)
                routes.push({
                    asset,
                    estimatedOutput: fromAmount, // 1:1 ratio
                    gasCostUSD: 0.1, // Negligible
                    hasAutoDeposit: true,
                    isDirect: true, // Flag for ZapFlow
                    directCall: {
                        chainId: fromChainId, // Target chain for execution
                        target: aavePoolAddress,
                        callData: supplyCallData,
                        amount: amount,
                        token: destinationUnderlyingToken as `0x${string}`
                    }
                })

                totalInputUsd += asset.usdValue
                totalEstimatedOutputUsd += asset.usdValue
                continue
            }

            // Step 1: Get Initial Route (to estimate output amount)
            // We need this to encode the 'supply' call with the correct amount
            // This works for Same-Chain too (LI.FI returns a route with 0 bridge steps, just swap/transfer)
            let routesResult = await getOptimalRoutes({
                fromChainId,
                toChainId: destinationChainId,
                fromTokenAddress: asset.asset.address,
                toTokenAddress: targetToken,
                fromAmount,
                fromAddress: request.destinationAddress,
                toAddress: destinationAddress,
                slippage: 0.005,
            })

            let hasAutoDeposit = false

            // NOTE: Auto-deposit via contract calls is disabled
            // The LI.FI SDK's executeRoute fails with "Contract calls are not found" 
            // when using getContractCallsQuote + convertQuoteToRoute
            // For cross-chain, we just bridge funds to wallet
            // User can do a second same-chain Direct Deposit after bridging
            console.log(`[ZapResolver] Cross-chain bridge for ${asset.asset.symbol} (auto-deposit disabled)`)

            if (routesResult && routesResult.length > 0) {
                const bestRoute = routesResult[0]
                const gasCost = bestRoute.gasCostUSD ? parseFloat(bestRoute.gasCostUSD) : 0

                let outputValue = 0
                if (bestRoute.toToken) {
                    const decimals = bestRoute.toToken.decimals
                    const price = parseFloat(bestRoute.toToken.priceUSD || '0')
                    const amount = parseFloat(formatUnits(BigInt(bestRoute.toAmount), decimals))
                    outputValue = amount * price
                    console.log(`[ZapResolver] Route output for ${asset.asset.symbol}: amount=${amount}, price=${price}, outputValue=${outputValue}`)
                } else if (bestRoute.toAmountUSD) {
                    outputValue = parseFloat(bestRoute.toAmountUSD)
                    console.log(`[ZapResolver] Route output for ${asset.asset.symbol} from toAmountUSD: ${outputValue}`)
                } else {
                    // Fallback: use input value as estimate
                    outputValue = asset.usdValue
                    console.log(`[ZapResolver] Route output for ${asset.asset.symbol} using input as fallback: ${outputValue}`)
                }

                // Sanity check: if output is unreasonably high, cap it
                if (asset.usdValue > 0 && outputValue > asset.usdValue * 2) {
                    console.log(`[ZapResolver] Output ${outputValue} too high, capping to input ${asset.usdValue}`)
                    outputValue = asset.usdValue
                }

                routes.push({
                    asset,
                    route: bestRoute,
                    estimatedOutput: String(bestRoute.toAmount),
                    gasCostUSD: gasCost,
                    hasAutoDeposit
                })

                totalInputUsd += asset.usdValue
                totalEstimatedOutputUsd += outputValue
                totalGasCostUsd += gasCost
                console.log(`[ZapResolver] Running totals - Input: ${totalInputUsd}, Output: ${totalEstimatedOutputUsd}`)
            }
        } catch (error) {
            console.error(`[resolveZapRoutes] Error resolving route for ${asset.asset.symbol}:`, error)
        }
    }

    return {
        routes,
        totalInputUsd,
        totalEstimatedOutputUsd,
        totalGasCostUsd
    }
}
