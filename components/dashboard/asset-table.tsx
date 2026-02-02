"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import type { Balance } from "@/lib/types/defi"

interface AssetTableProps {
  assets: Balance[]
  isLoading?: boolean
  onSelect?: (asset: Balance, selected: boolean) => void
  selectedAssets?: Set<string>
  onSelectedAssetsChange?: (selected: Set<string>) => void
}

export function AssetTable({ assets, isLoading, onSelect, selectedAssets: controlledSelected, onSelectedAssetsChange }: AssetTableProps) {
  const [internalSelected, setInternalSelected] = useState<Set<string>>(new Set())
  const selectedAssets = controlledSelected ?? internalSelected
  const setSelectedAssets = onSelectedAssetsChange ?? setInternalSelected

  const handleSelectAsset = (asset: Balance, checked: boolean) => {
    const key = `${asset.asset.symbol}-${asset.chain}`
    const newSelected = new Set(selectedAssets)
    if (checked) {
      newSelected.add(key)
    } else {
      newSelected.delete(key)
    }
    setSelectedAssets(newSelected)
    onSelect?.(asset, checked)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allKeys = new Set(assets.map(asset => `${asset.asset.symbol}-${asset.chain}`))
      setSelectedAssets(allKeys)
    } else {
      setSelectedAssets(new Set())
    }
  }

  const allAssetsSelected = assets.length > 0 && assets.every(asset => selectedAssets.has(`${asset.asset.symbol}-${asset.chain}`))
  const someAssetsSelected = assets.some(asset => selectedAssets.has(`${asset.asset.symbol}-${asset.chain}`)) && !allAssetsSelected

  if (isLoading) {
    return (
      <Card className="bg-neutral-900 border-neutral-700">
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-neutral-700 rounded" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-neutral-900 border-neutral-700 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-neutral-700 hover:bg-transparent">
            <TableHead className="w-12 text-neutral-400">
              <Checkbox 
                checked={allAssetsSelected} 
                indeterminate={someAssetsSelected}
                onCheckedChange={handleSelectAll}
                className="border-neutral-600" 
              />
            </TableHead>
            <TableHead className="text-neutral-400">ASSET</TableHead>
            <TableHead className="text-neutral-400">CHAIN</TableHead>
            <TableHead className="text-neutral-400">WALLET</TableHead>
            <TableHead className="text-right text-neutral-400">AMOUNT</TableHead>
            <TableHead className="text-right text-neutral-400">USD VALUE</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.length === 0 ? (
            <TableRow className="border-neutral-700 hover:bg-neutral-800/50">
              <TableCell colSpan={6} className="text-center text-neutral-500 py-8">
                No assets found. Connect a wallet to see your balances.
              </TableCell>
            </TableRow>
          ) : (
            assets.map((asset, idx) => {
              const key = `${asset.asset.symbol}-${asset.chain}`
              const isSelected = selectedAssets.has(key)
              return (
                <TableRow key={idx} className="border-neutral-700 hover:bg-neutral-800/50">
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectAsset(asset, checked as boolean)}
                      className="border-neutral-600"
                    />
                  </TableCell>
                  <TableCell className="font-mono text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-xs font-bold text-white">
                        {asset.asset.symbol[0]}
                      </div>
                      {asset.asset.symbol}
                    </div>
                  </TableCell>
                  <TableCell className="text-neutral-400 capitalize">{asset.chain}</TableCell>
                  <TableCell className="text-neutral-500 font-mono text-sm">{asset.wallet}</TableCell>
                  <TableCell className="text-right text-white font-mono">
                    {Number(asset.amount).toFixed(4)} {asset.asset.symbol}
                  </TableCell>
                  <TableCell className="text-right text-white font-semibold">
                    ${asset.usdValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </Card>
  )
}
