'use client'

import { useQuery } from '@tanstack/react-query'
import { getWalletPortfolio } from '@/lib/api/zerion'
import { SUPPORTED_CHAINS } from '@/lib/api/lifi-tokens'
import type { UnifiedBalance, Balance } from '@/lib/types/defi'

export function useUnifiedBalance(address?: string) {
    return useQuery({
        queryKey: ['unified-balance', address],
        queryFn: async () => {
            if (!address) return null

            // Fetch portfolio (LI.FI filtering happens server-side)
            const portfolio = await getWalletPortfolio(address)
            console.log('[useUnifiedBalance] Portfolio response:', portfolio)

            // Check the actual structure of the response
            const positions = portfolio.data || portfolio.positions || []
            console.log('[useUnifiedBalance] Positions array:', positions)
            console.log('[useUnifiedBalance] Number of positions:', positions.length)

            // Filter & Map assets
            const assets: Balance[] = positions
                .map((pos: any) => {
                    try {
                        // Extract chain info
                        const chainName = pos.relationships?.chain?.data?.id
                        if (!chainName) {
                            console.log('[useUnifiedBalance] Skipping position - no chain:', pos.id)
                            return null
                        }

                        // Get fungible info - structure varies
                        const fungibleInfo = pos.attributes?.fungible_info
                        if (!fungibleInfo) {
                            console.log('[useUnifiedBalance] Skipping position - no fungible_info:', pos.id)
                            return null
                        }

                        // Extract token details - handle both nested and flat structures
                        const symbol = fungibleInfo.symbol || fungibleInfo.data?.attributes?.symbol || 'UNKNOWN'
                        const name = fungibleInfo.name || fungibleInfo.data?.attributes?.name || symbol

                        // Default to 18, but sanitize known stablecoins like USDC/USDT to 6 if likely incorrect
                        let decimals = fungibleInfo.decimals ?? fungibleInfo.data?.attributes?.decimals ?? 18
                        if (['USDC', 'USDT'].includes(symbol)) {
                            decimals = 6
                        }
                        const icon = fungibleInfo.icon?.url || fungibleInfo.data?.attributes?.icon?.url

                        // Get quantity and value
                        const quantity = pos.attributes?.quantity?.numeric || '0'
                        const value = Number(pos.attributes?.value ?? 0)

                        // Get token address from implementations
                        const implementations = fungibleInfo.implementations || fungibleInfo.data?.attributes?.implementations || []
                        const impl = implementations.find((imp: any) => imp.chain_id === chainName)
                        const tokenAddress = impl?.address || pos.id.split('-')[0] || '0x0'

                        console.log(`[useUnifiedBalance] Parsed: ${symbol} on ${chainName}, value: $${value}`)

                        return {
                            asset: {
                                symbol,
                                name,
                                address: tokenAddress,
                                chain: chainName,
                                decimals,
                                logo: icon
                            },
                            amount: quantity,
                            usdValue: value,
                            wallet: address,
                            chain: chainName
                        }
                    } catch (err) {
                        console.error('[useUnifiedBalance] Error parsing position:', pos.id, err)
                        return null
                    }
                })
                .filter((item: Balance | null): item is Balance => {
                    if (!item) return false

                    const chainId = SUPPORTED_CHAINS[item.chain as keyof typeof SUPPORTED_CHAINS]
                    if (!chainId) {
                        console.log('[useUnifiedBalance] Filtered out (unsupported chain):', item.chain)
                        return false
                    }
                    return true
                })

            // Calculate totals
            const totalUsd = assets.reduce((sum: number, item: Balance) => sum + (item.usdValue || 0), 0)

            // Construct UnifiedBalance
            const balances: UnifiedBalance = {
                totalUsd,
                balances: assets,
                byWallet: {
                    [address]: { totalUsd, assets }
                },
                byChain: {}, // Compute this
            }

            // Compute byChain
            assets.forEach((asset: Balance) => {
                if (!balances.byChain[asset.chain]) {
                    balances.byChain[asset.chain] = { totalUsd: 0, assets: [] }
                }
                balances.byChain[asset.chain].totalUsd += asset.usdValue
                balances.byChain[asset.chain].assets.push(asset)
            })

            return balances
        },
        enabled: !!address,
        // Rate limit protection
        retry: 1, // Only retry once on failure
        retryDelay: 5000, // Wait 5 seconds before retrying
        staleTime: 60000, // Data is fresh for 60 seconds
        refetchInterval: 60000, // Refetch every 60 seconds (not 30)
        refetchOnWindowFocus: false, // Don't refetch when tab gains focus
    })
}
