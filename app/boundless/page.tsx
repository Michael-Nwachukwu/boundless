"use client"

import { useState } from "react"
import Link from "next/link"
import { Wallet, LogOut, RefreshCw, ChevronDown, History, Settings as SettingsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Hero } from "@/components/landing/hero"
import { UnifiedBalanceCard } from "@/components/dashboard/unified-balance-card"
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { AssetTable } from "@/components/dashboard/asset-table"
import { PullFlow } from "@/components/flows/pull-flow"
import { RefuelFlow } from "@/components/flows/refuel-flow"
import { PositionsFlow } from "@/components/flows/positions-flow"
import { useWeb3Provider } from "@/lib/hooks/use-web3"
import { useUnifiedBalance } from "@/lib/hooks/use-unified-balance"
import type { Balance } from "@/lib/types/defi"

export default function BoundlessApp() {
  const { connectedWallets, isConnecting, isConnected, primaryAddress, addWallet, removeWallet } =
    useWeb3Provider()

  // Fetch real portfolio data
  const { data: unifiedBalance, isLoading: isBalanceLoading, refetch: refetchBalance } = useUnifiedBalance(primaryAddress)
  const isGlobalLoading = isConnecting || isBalanceLoading

  // Derived state for view
  const showHero = !isConnected && connectedWallets.length === 0

  const [activeTab, setActiveTab] = useState("overview")
  const [assetFilter, setAssetFilter] = useState<number | null>(null)
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())

  // Use real connected wallets
  const walletsToDisplay = connectedWallets

  // Use real balance or default empty structure
  const balanceToDisplay = unifiedBalance || {
    totalUsd: 0,
    balances: [],
    byWallet: {},
    byChain: {}
  }

  if (showHero) {
    return (
      <Hero
        onConnectWallet={() => { /* Handled by ConnectButton inside Hero */ }}
        onViewDemo={() => { /* Add demo logic later */ }}
      />
    )
  }

  const allAssets = balanceToDisplay?.balances ?? []
  const filteredAssets = assetFilter
    ? allAssets.filter(asset => asset.usdValue < assetFilter)
    : allAssets

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-neutral-700 bg-neutral-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-sm font-bold">
            </div>
            <h1 className="text-xl font-bold tracking-wider">BOUNDLESS</h1>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/boundless/settings">
              <Button
                variant="ghost"
                size="icon"
                className="text-neutral-400 hover:text-orange-500 hover:bg-neutral-800"
              >
                <SettingsIcon className="w-4 h-4" />
              </Button>
            </Link>

            <Link href="/boundless/execution">
              <Button
                variant="ghost"
                size="icon"
                className="text-neutral-400 hover:text-orange-500 hover:bg-neutral-800"
              >
                <History className="w-4 h-4" />
              </Button>
            </Link>

            <Button
              onClick={() => refetchBalance()}
              disabled={isGlobalLoading}
              variant="ghost"
              size="icon"
              className="text-neutral-400 hover:text-orange-500 hover:bg-neutral-800"
            >
              <RefreshCw className={`w-4 h-4 ${isGlobalLoading ? "animate-spin" : ""}`} />
            </Button>

            <div className="relative group">
              <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
          {/* Balance Card */}
          <UnifiedBalanceCard balance={balanceToDisplay} isLoading={isGlobalLoading} />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-neutral-900 border-b border-neutral-700">
              <TabsTrigger value="overview" className="text-neutral-400 data-[state=active]:text-orange-500">
                Overview
              </TabsTrigger>
              <TabsTrigger value="pull" className="text-neutral-400 data-[state=active]:text-orange-500">
                Pull
              </TabsTrigger>
              <TabsTrigger value="refuel" className="text-neutral-400 data-[state=active]:text-orange-500">
                Refuel
              </TabsTrigger>
              <TabsTrigger value="positions" className="text-neutral-400 data-[state=active]:text-orange-500">
                Positions
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Assets</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400">Filter by value:</span>
                    <Button
                      variant={assetFilter === 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAssetFilter(assetFilter === 1 ? null : 1)}
                      className={assetFilter === 1 ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" : "border-neutral-700 text-neutral-300 hover:bg-neutral-800 bg-transparent"}
                    >
                      {"< $1"}
                    </Button>
                    <Button
                      variant={assetFilter === 5 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAssetFilter(assetFilter === 5 ? null : 5)}
                      className={assetFilter === 5 ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" : "border-neutral-700 text-neutral-300 hover:bg-neutral-800 bg-transparent"}
                    >
                      {"< $5"}
                    </Button>
                    <Button
                      variant={assetFilter === 10 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAssetFilter(assetFilter === 10 ? null : 10)}
                      className={assetFilter === 10 ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" : "border-neutral-700 text-neutral-300 hover:bg-neutral-800 bg-transparent"}
                    >
                      {"< $10"}
                    </Button>
                    {assetFilter && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAssetFilter(null)}
                        className="border-neutral-600 text-neutral-300 hover:bg-neutral-800 bg-transparent ml-2"
                      >
                        Clear Filter
                      </Button>
                    )}
                  </div>
                </div>
                <AssetTable
                  assets={filteredAssets}
                  isLoading={isGlobalLoading}
                  selectedAssets={selectedAssets}
                  onSelectedAssetsChange={setSelectedAssets}
                />
              </div>
            </TabsContent>

            {/* Pull Tab */}
            <TabsContent value="pull" className="space-y-4">
              <PullFlow />
            </TabsContent>

            {/* Refuel Tab */}
            <TabsContent value="refuel" className="space-y-4">
              <RefuelFlow />
            </TabsContent>

            {/* Positions Tab */}
            <TabsContent value="positions" className="space-y-4">
              <PositionsFlow />
            </TabsContent>
          </Tabs>
        </div>
      </div>


    </div>
  )
}
