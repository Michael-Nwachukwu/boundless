import { createPublicClient, http, getAddress, type Address } from 'viem'
import { mainnet, optimism, arbitrum, base } from 'viem/chains'
import { AAVE_V3_POOL_ADDRESSES, AAVE_POOL_ABI } from '@/lib/constants/aave'

// RPC Mapping
const CHAIN_CONFIGS = {
    1: mainnet,
    10: optimism,
    42161: arbitrum,
    8453: base,
}

// Map chainId to RPC URL from env
const getRpcUrl = (chainId: number) => {
    switch (chainId) {
        case 1: return process.env.NEXT_PUBLIC_RPC_MAINNET
        case 10: return process.env.NEXT_PUBLIC_RPC_OPTIMISM
        case 42161: return process.env.NEXT_PUBLIC_RPC_ARBITRUM
        case 8453: return process.env.NEXT_PUBLIC_RPC_BASE
        default: return undefined
    }
}

/**
 * Fetches the current Supply APY for a given asset on Aave V3
 * @param chainId Chain ID (e.g., 8453 for Base)
 * @param tokenAddress Underlying asset address (e.g., USDC address)
 * @returns APY as a percentage number (e.g., 4.5 for 4.5%)
 */
export async function getAaveSupplyAPY(chainId: number, tokenAddress: string): Promise<number> {
    try {
        const chain = CHAIN_CONFIGS[chainId as keyof typeof CHAIN_CONFIGS]
        const poolAddress = AAVE_V3_POOL_ADDRESSES[chainId]

        if (!chain || !poolAddress) {
            console.warn(`[getAaveSupplyAPY] Unsupported chain: ${chainId}`)
            return 0
        }

        const client = createPublicClient({
            chain,
            transport: http(getRpcUrl(chainId))
        })

        // Aave V3 getReserveData returns [configuration, liquidityIndex, currentLiquidityRate, ...]
        // We only need currentLiquidityRate (index 2)
        const reserveData = await client.readContract({
            address: poolAddress,
            abi: AAVE_POOL_ABI,
            functionName: 'getReserveData',
            args: [getAddress(tokenAddress)]
        }) as any // Typing strictly is complex with large tuple returns

        const currentLiquidityRate = reserveData[2] // 3rd item is currentLiquidityRate

        // Convert Ray (1e27) to Percentage
        // Rate is per second? No, Aave V3 rates are annualized in Ray.
        // 4% = 0.04 * 10^27 = 4 * 10^25
        // To get 4.0, we divide by 10^25
        const apy = Number(currentLiquidityRate) / 1e25

        return parseFloat(apy.toFixed(2))
    } catch (error) {
        console.error(`[getAaveSupplyAPY] Error fetching APY for ${tokenAddress} on ${chainId}:`, error)
        return 0
    }
}

/**
 * Validates if a token is a known Aave aToken
 */
export function isAToken(symbol: string): boolean {
    return symbol.startsWith('a') && (symbol.includes('USDC') || symbol.includes('ETH') || symbol.includes('USDT') || symbol.includes('DAI'))
}

/**
 * Validates if a token is a known Aave Debt Token
 */
export function isDebtToken(symbol: string): boolean {
    return symbol.startsWith('variableDebt') || symbol.includes('vDebt')
}
