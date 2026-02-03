'use client'

import { useEnsName, useEnsAddress, useEnsAvatar } from 'wagmi'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'
import { isAddress } from 'viem'

/**
 * Safely normalize an ENS name, returning undefined if invalid
 */
function safeNormalize(name: string): string | undefined {
    try {
        // Check for empty labels (e.g., "vitalik." or ".eth" or ".")
        const parts = name.split('.')
        if (parts.some(part => part.length === 0)) {
            return undefined
        }
        return normalize(name)
    } catch {
        return undefined
    }
}

/**
 * Hook to resolve an input (address or ENS name)
 */
export function useEnsIdentity(input: string) {
    // Determine input type
    const isAddr = isAddress(input)
    const isPossibleEns = input.includes('.') && input.length > 3
    const normalizedName = isPossibleEns ? safeNormalize(input) : undefined

    // 1. Resolve Address -> Name (Reverse Resolution)
    const { data: nameFromAddress, isLoading: isLoadingName } = useEnsName({
        address: isAddr ? (input as `0x${string}`) : undefined,
        chainId: mainnet.id,
    })

    // 2. Resolve Name -> Address (Forward Resolution)
    const { data: addressFromName, isLoading: isLoadingAddress } = useEnsAddress({
        name: normalizedName,
        chainId: mainnet.id,
    })

    // 3. Resolve Avatar (for the resolved Name)
    const resolvedName = nameFromAddress || normalizedName
    const { data: avatar, isLoading: isLoadingAvatar } = useEnsAvatar({
        name: resolvedName,
        chainId: mainnet.id,
    })

    return {
        address: isAddr ? input : addressFromName,
        name: nameFromAddress || (normalizedName ? input : undefined),
        avatar,
        isLoading: isLoadingName || isLoadingAddress || isLoadingAvatar,
        isValid: !!(isAddr || addressFromName)
    }
}
