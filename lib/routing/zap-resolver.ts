
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
    isDirect?: boolean // New flag for same-chain direct deposit
    directCall?: {
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
 * Includes "Auto-Deposit" logic via Contract Calls if supported.
 * Includes "Direct Deposit" logic for same-chain assets.
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
            if (!fromChainId) continue

            const fromAmount = asset.amount
            const targetToken = destinationUnderlyingToken || destinationToken
            const aavePoolAddress = AAVE_V3_POOL_ADDRESSES[destinationChainId]

            // Check for Same-Chain Direct Deposit
            // Condition: Same Chain AND Asset is the Underlying Token
            if (fromChainId === destinationChainId &&
                destinationUnderlyingToken &&
                asset.asset.address.toLowerCase() === destinationUnderlyingToken.toLowerCase() &&
                aavePoolAddress) {

                // Direct Deposit Logic
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

                // Construct Direct Route
                routes.push({
                    asset,
                    estimatedOutput: fromAmount, // 1:1 conversion for direct deposit
                    gasCostUSD: 0.5, // Assume negligible gas ~$0.50
                    hasAutoDeposit: true,
                    isDirect: true,
                    directCall: {
                        target: aavePoolAddress,
                        callData: supplyCallData,
                        amount: amount,
                        token: destinationUnderlyingToken as `0x${string}`
                    }
                })

                totalInputUsd += asset.usdValue
                totalEstimatedOutputUsd += asset.usdValue // 1:1
                continue // Skip LI.FI routing
            }

            // Cross-Chain Logic (LI.FI)
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

            // Auto-Deposit Logic (Contract Call)
            if (routesResult && routesResult.length > 0 && destinationUnderlyingToken && aavePoolAddress) {
                const initialRoute = routesResult[0]
                const safeSupplyAmount = BigInt(initialRoute.toAmountMin || initialRoute.toAmount)

                try {
                    const supplyCallData = encodeFunctionData({
                        abi: AAVE_POOL_ABI,
                        functionName: 'supply',
                        args: [
                            destinationUnderlyingToken as `0x${string}`,
                            safeSupplyAmount,
                            destinationAddress as `0x${string}`,
                            0
                        ]
                    })

                    const autoDepositRoutes = await getOptimalRoutes({
                        fromChainId,
                        toChainId: destinationChainId,
                        fromTokenAddress: asset.asset.address,
                        toTokenAddress: targetToken,
                        fromAmount,
                        fromAddress: request.destinationAddress,
                        toAddress: destinationAddress,
                        slippage: 0.005,
                        contractCalls: [{
                            fromAmount: safeSupplyAmount.toString(),
                            fromTokenAddress: destinationUnderlyingToken,
                            toContractAddress: aavePoolAddress,
                            toContractCallData: supplyCallData,
                            toContractGasLimit: '500000'
                        }]
                    })

                    if (autoDepositRoutes && autoDepositRoutes.length > 0) {
                        routesResult = autoDepositRoutes
                        hasAutoDeposit = true
                        console.log(`[ZapResolver] Auto-Deposit enabled for ${asset.asset.symbol} -> Aave`)
                    } else {
                        // Fallback check: If autoDeposit failed to generate a route, do we warn?
                        console.warn(`[ZapResolver] Auto-Deposit route generation failed/empty for ${asset.asset.symbol}`)
                    }
                } catch (err) {
                    console.warn('[ZapResolver] Failed to generate Auto-Deposit route, falling back to standard bridge:', err)
                }
            }

            if (routesResult && routesResult.length > 0) {
                const bestRoute = routesResult[0]
                const gasCost = bestRoute.gasCostUSD ? parseFloat(bestRoute.gasCostUSD) : 0

                let outputValue = 0
                if (bestRoute.toToken) {
                    const decimals = bestRoute.toToken.decimals
                    const price = parseFloat(bestRoute.toToken.priceUSD || '0')
                    const amount = parseFloat(formatUnits(BigInt(bestRoute.toAmount), decimals))
                    outputValue = amount * price
                } else {
                    outputValue = parseFloat(bestRoute.toAmountUSD || '0')
                }

                if (asset.usdValue > 0 && outputValue > asset.usdValue * 2) {
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
