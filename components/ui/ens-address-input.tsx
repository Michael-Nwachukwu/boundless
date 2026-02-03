'use client'

import { useState, useEffect } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { createBlockies } from '@/lib/utils/blockies'
import { useEnsIdentity } from '@/lib/hooks/use-ens'

interface EnsAddressInputProps {
    value?: string
    onChange: (address: string) => void
    placeholder?: string
    disabled?: boolean
    defaultAddress?: string // Connected wallet address for auto-fill
}

export function EnsAddressInput({
    value = '',
    onChange,
    placeholder = '0x... or name.eth',
    disabled,
    defaultAddress
}: EnsAddressInputProps) {
    const [inputValue, setInputValue] = useState(value || defaultAddress || '')
    const [touched, setTouched] = useState(false)
    const [blockiesUrl, setBlockiesUrl] = useState('')

    // Initialize with default address if provided
    useEffect(() => {
        if (defaultAddress && !value && !inputValue) {
            setInputValue(defaultAddress)
        }
    }, [defaultAddress])

    // Resolve ENS
    const { address, name, avatar, isLoading, isValid } = useEnsIdentity(inputValue)

    // Update parent when we have a valid address
    useEffect(() => {
        if (address && isValid) {
            onChange(address)
            // Generate blockies if we have an address
            if (typeof window !== 'undefined') {
                setBlockiesUrl(createBlockies(address))
            }
        } else if (inputValue === '') {
            onChange('')
            setBlockiesUrl('')
        }
    }, [address, isValid, inputValue, onChange])

    // Update local state if prop changes externally
    useEffect(() => {
        if (value && value !== address) {
            setInputValue(value)
        }
    }, [value])


    const handleClear = () => {
        setInputValue('')
        onChange('')
        setBlockiesUrl('')
        setTouched(false)
    }

    const showResolved = isValid && address && touched

    return (
        <div className="relative">
            <div className="relative">
                <Input
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value)
                        setTouched(true)
                    }}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`pr-10 hover:text-white ${isValid && touched ? 'border-green-500/50 bg-green-500/5' : 'bg-neutral-800 border-neutral-700 text-white'}`}
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />}

                    {!isLoading && inputValue && (
                        <button
                            onClick={handleClear}
                            className="text-neutral-500 hover:text-neutral-300"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Compact Resolved Identity Display */}
            {showResolved && (
                <div className="mt-2 flex items-center gap-2 px-2 py-1.5 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
                    {/* Small Avatar */}
                    <div className="w-5 h-5 rounded-full overflow-hidden border border-neutral-600 bg-neutral-700 flex-shrink-0">
                        {avatar ? (
                            <img src={avatar} alt="ENS Avatar" className="w-full h-full object-cover" />
                        ) : blockiesUrl ? (
                            <img src={blockiesUrl} alt="Blockies" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500" />
                        )}
                    </div>

                    {/* Compact Details */}
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                        {name && (
                            <>
                                <span className="text-xs font-medium text-white truncate">{name}</span>
                                <span className="px-1 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-400 font-medium">ENS</span>
                            </>
                        )}
                        <span className="text-[10px] text-neutral-500 font-mono truncate">
                            {address.slice(0, 6)}...{address.slice(-4)}
                        </span>
                    </div>

                    <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                </div>
            )}
        </div>
    )
}
