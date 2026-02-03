import { getOptimalRoutes, getChainId, TOKEN_ADDRESSES, getNativeTokenAddress } from '@/lib/api/lifi'
import type { Balance } from '@/lib/types/defi'
import type { Route } from '@lifi/sdk'

export interface SqueezeRequest {
    /** Assets to consolidate */
    assets: Balance[]
    /** Target chain ID (e.g., 1 for Ethereum) */
    destinationChainId: number
    /** Target token symbol (e.g., 'USDC', 'ETH') */
    destinationToken: string
    /** Recipient address */
    destinationAddress: string
}

export interface ResolvedRoute {
    /** Original asset being swapped */
    asset: Balance
    /** Amount to use (in native token units, as string) */
    amountToUse: string
    /** LI.FI Route object */
    route: Route
    /** Estimated output in destination token */
    estimatedOutput: string
    /** Estimated gas cost in USD */
    estimatedGasCostUsd: string
    /** Status of this route */
    status: 'pending' | 'executing' | 'completed' | 'failed'
}

export interface SqueezeResult {
    routes: ResolvedRoute[]
    totalInputUsd: number
    totalEstimatedOutputUsd: number
    totalGasCostUsd: number
    /** True if all routes were successfully resolved */
    isComplete: boolean
    /** Assets that couldn't be routed (unsupported, no liquidity, etc.) */
    skippedAssets: { asset: Balance; reason: string }[]
}

/**
 * Get the token address for a destination token on a specific chain
 */
function getDestinationTokenAddress(chainId: number, tokenSymbol: string): string {
    const chainName = Object.entries({
        1: 'ethereum',
        10: 'optimism',
        42161: 'arbitrum',
        8453: 'base',
    }).find(([id]) => Number(id) === chainId)?.[1] as keyof typeof TOKEN_ADDRESSES | undefined

    if (chainName && TOKEN_ADDRESSES[chainName]) {
        const addresses = TOKEN_ADDRESSES[chainName] as Record<string, string>
        if (tokenSymbol.toUpperCase() === 'ETH') {
            return getNativeTokenAddress()
        }
        return addresses[tokenSymbol.toUpperCase()] || getNativeTokenAddress()
    }

    // Default to native token
    return getNativeTokenAddress()
}

/**
 * Resolve routes for squeezing multiple assets into a single destination
 */
export async function resolveSqueezeRoutes(request: SqueezeRequest): Promise<SqueezeResult> {
    const routes: ResolvedRoute[] = []
    const skippedAssets: { asset: Balance; reason: string }[] = []
    let totalInputUsd = 0
    let totalEstimatedOutputUsd = 0
    let totalGasCostUsd = 0

    const toTokenAddress = getDestinationTokenAddress(
        request.destinationChainId,
        request.destinationToken
    )

    console.log('[Resolver] Starting squeeze resolution for', request.assets.length, 'assets')
    console.log('[Resolver] Destination:', request.destinationChainId, request.destinationToken, toTokenAddress)

    // Process each asset in parallel (with limit)
    const routePromises = request.assets.map(async (asset) => {
        try {
            const fromChainId = getChainId(asset.chain)

            // Determine the correct "from" token address
            // Native tokens (ETH, etc.) should use the zero address
            let fromTokenAddress: string

            const isNativeToken = ['ETH', 'BNB', 'MATIC', 'AVAX'].includes(asset.asset.symbol.toUpperCase())
            const hasValidAddress = asset.asset.address &&
                asset.asset.address.startsWith('0x') &&
                asset.asset.address.length === 42

            if (isNativeToken || !hasValidAddress) {
                fromTokenAddress = getNativeTokenAddress()
            } else {
                fromTokenAddress = asset.asset.address
            }

            // Convert amount to wei/smallest unit
            // Known stablecoin decimals (fallback for when Zerion doesn't provide decimals)
            const knownDecimals: Record<string, number> = {
                'USDC': 6,
                'USDT': 6,
                'USDT0': 6,
                'DAI': 18,
                'ETH': 18,
                'WETH': 18,
                'BNB': 18,
                'MATIC': 18,
            }
            const symbolUpper = asset.asset.symbol.toUpperCase()
            const decimals = asset.asset.decimals || knownDecimals[symbolUpper] || 18

            // Parse amount carefully to avoid precision issues
            const amountFloat = parseFloat(asset.amount)
            const amountInSmallestUnit = BigInt(
                Math.floor(amountFloat * 10 ** decimals)
            ).toString()

            console.log(`[Resolver] Fetching route for ${asset.asset.symbol} on ${asset.chain}`)
            console.log(`[Resolver] From: chainId=${fromChainId}, token=${fromTokenAddress}`)
            console.log(`[Resolver] Amount: ${asset.amount} (${decimals} decimals) = ${amountInSmallestUnit} smallest units`)
            console.log(`[Resolver] To: chainId=${request.destinationChainId}, token=${toTokenAddress}`)

            const lifiRoutes = await getOptimalRoutes({
                fromChainId,
                toChainId: request.destinationChainId,
                fromTokenAddress,
                toTokenAddress,
                fromAmount: amountInSmallestUnit,
                fromAddress: asset.wallet,
                toAddress: request.destinationAddress,
            })

            if (lifiRoutes.length === 0) {
                return {
                    type: 'skipped' as const,
                    asset,
                    reason: 'No routes available',
                }
            }

            const bestRoute = lifiRoutes[0]

            // Calculate gas cost in USD
            const gasCostUsd = bestRoute.gasCostUSD
                ? parseFloat(bestRoute.gasCostUSD)
                : 0

            // Get estimated output
            const estimatedOutput = bestRoute.toAmountMin || bestRoute.toAmount || '0'

            return {
                type: 'resolved' as const,
                asset,
                route: {
                    asset,
                    amountToUse: asset.amount,
                    route: bestRoute,
                    estimatedOutput,
                    estimatedGasCostUsd: gasCostUsd.toFixed(2),
                    status: 'pending' as const,
                },
                inputUsd: asset.usdValue,
                gasCostUsd,
            }
        } catch (error) {
            console.error(`[Resolver] Error resolving route for ${asset.asset.symbol}:`, error)
            return {
                type: 'skipped' as const,
                asset,
                reason: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    })

    const results = await Promise.all(routePromises)

    for (const result of results) {
        if (result.type === 'resolved') {
            routes.push(result.route)
            totalInputUsd += result.inputUsd
            totalGasCostUsd += result.gasCostUsd

            // Estimate output USD (simplified - assumes 1:1 after fees)
            // In production, we'd use the actual quote's USD value
            totalEstimatedOutputUsd += result.inputUsd * 0.98 // Account for slippage/fees
        } else {
            skippedAssets.push({ asset: result.asset, reason: result.reason })
        }
    }

    console.log(`[Resolver] Resolved ${routes.length} routes, skipped ${skippedAssets.length}`)

    return {
        routes,
        totalInputUsd,
        totalEstimatedOutputUsd,
        totalGasCostUsd,
        isComplete: skippedAssets.length === 0,
        skippedAssets,
    }
}

/**
 * Execute all routes in sequence, continuing even if some fail
 * Returns a detailed result with success/failure counts
 */
export async function executeSqueezeRoutes(
    routes: ResolvedRoute[],
    onStatusUpdate: (routeIndex: number, status: ResolvedRoute['status'], errorMessage?: string) => void
): Promise<{
    totalRoutes: number
    successfulRoutes: number
    failedRoutes: number
    successfulIndices: number[]
    failedIndices: number[]
    errors: { index: number; message: string }[]
}> {
    const { executeRoute } = await import('@/lib/api/lifi')

    const successfulIndices: number[] = []
    const failedIndices: number[] = []
    const errors: { index: number; message: string }[] = []

    for (let i = 0; i < routes.length; i++) {
        const resolvedRoute = routes[i]

        try {
            onStatusUpdate(i, 'executing')

            await executeRoute(resolvedRoute.route, (update) => {
                console.log(`[Executor] Route ${i} update:`, update)
            })

            onStatusUpdate(i, 'completed')
            successfulIndices.push(i)
            console.log(`[Executor] Route ${i} completed successfully`)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error(`[Executor] Route ${i} failed:`, errorMessage)
            onStatusUpdate(i, 'failed', errorMessage)
            failedIndices.push(i)
            errors.push({ index: i, message: errorMessage })
            // Continue to next route instead of stopping
        }
    }

    console.log(`[Executor] Execution complete: ${successfulIndices.length}/${routes.length} successful`)

    return {
        totalRoutes: routes.length,
        successfulRoutes: successfulIndices.length,
        failedRoutes: failedIndices.length,
        successfulIndices,
        failedIndices,
        errors,
    }
}

