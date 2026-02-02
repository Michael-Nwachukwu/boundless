"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Wallet, Copy, Check, Trash2, Plus } from "lucide-react"
import type { Wallet as WalletType } from "@/lib/types/defi"

interface WalletConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  connectedWallets: WalletType[]
  onAddWallet: (address: string) => Promise<void>
  onRemoveWallet: (address: string) => void
  isLoading?: boolean
}

export function WalletConnectionModal({
  isOpen,
  onClose,
  connectedWallets,
  onAddWallet,
  onRemoveWallet,
  isLoading = false,
}: WalletConnectionModalProps) {
  const [newAddress, setNewAddress] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  const handleAddWallet = async () => {
    if (!newAddress.trim()) return

    setIsAdding(true)
    try {
      // Mock wallet addition for testing - just clear the input
      console.log("[v0] Mock wallet added:", newAddress.trim())
      setNewAddress("")
    } finally {
      setIsAdding(false)
    }
  }

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  const canAddMore = connectedWallets.length < 3

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border border-neutral-700">
        <DialogHeader>
          <DialogTitle className="text-white">Connect Wallets</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Connect up to 3 wallets to unify your balance across chains
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Connected Wallets List */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Connected Wallets ({connectedWallets.length}/3)</h3>

            {connectedWallets.length === 0 ? (
              <div className="p-4 rounded border border-neutral-700 bg-neutral-800/30 text-center">
                <Wallet className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">No wallets connected yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {connectedWallets.map((wallet) => (
                  <div
                    key={wallet.address}
                    className="flex items-center justify-between p-3 rounded border border-neutral-700 bg-neutral-800/30 hover:bg-neutral-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <p className="text-sm font-mono text-white truncate">{wallet.address}</p>
                      </div>
                      {wallet.label && <p className="text-xs text-neutral-500 ml-4">{wallet.label}</p>}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <button
                        onClick={() => handleCopyAddress(wallet.address)}
                        className="p-2 hover:bg-neutral-700 rounded transition-colors text-neutral-400 hover:text-orange-400"
                      >
                        {copiedAddress === wallet.address ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => onRemoveWallet(wallet.address)}
                        className="p-2 hover:bg-neutral-700 rounded transition-colors text-neutral-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Wallet */}
          {canAddMore && (
            <div className="space-y-3 p-4 rounded border border-neutral-700 bg-neutral-800/20">
              <h3 className="text-sm font-semibold text-white">Add Wallet</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="0x..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-600"
                />
                <Button
                  onClick={handleAddWallet}
                  disabled={!newAddress.trim() || isAdding || isLoading}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {isAdding ? (
                    <span className="animate-spin">⚙️</span>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {connectedWallets.length >= 3 && (
            <p className="text-xs text-neutral-500 text-center">Maximum wallets connected</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-700">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 bg-transparent"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
