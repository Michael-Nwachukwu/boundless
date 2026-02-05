"use client"

import { useState } from "react"
import { Shield, AlertCircle, TrendingUp, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EarnView } from "@/components/dashboard/earn-view"
import { ZapFlow } from "@/components/flows/zap-flow"
import { SUPPORTED_EARN_MARKETS } from "@/lib/constants/aave"
import { useUnifiedBalance } from "@/lib/hooks/use-unified-balance"
import { useAccount } from 'wagmi'

interface PositionsFlowProps {
  // onRefresh passed from parent is ideal, but we can also use hook directly
}

export function PositionsFlow() {
  const { address } = useAccount()
  const { refetch } = useUnifiedBalance(address)

  const [activeTab, setActiveTab] = useState("earn")
  const [selectedZapMarket, setSelectedZapMarket] = useState<(typeof SUPPORTED_EARN_MARKETS)[0] | null>(null)

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-neutral-900 border border-neutral-800 p-1">
          <TabsTrigger value="earn" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white text-neutral-400 gap-2">
            <TrendingUp className="w-4 h-4" />
            Earn Yield
          </TabsTrigger>
          <TabsTrigger value="positions" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white text-neutral-400 gap-2">
            <Shield className="w-4 h-4" />
            My Positions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earn" className="space-y-4 focus-visible:outline-none">
          <EarnView onZap={setSelectedZapMarket} />
        </TabsContent>

        <TabsContent value="positions" className="space-y-4 focus-visible:outline-none">
          <Card className="bg-neutral-900 border-neutral-700 p-8 text-center">
            <Shield className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Active Positions</h3>
            <p className="text-neutral-400 max-w-sm mx-auto">
              Connect your wallet to view active Aave borrowing positions and health factors.
              (Coming soon: Real-time monitoring and protection setup)
            </p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Zap Flow Modal */}
      {selectedZapMarket && (
        <ZapFlow
          targetMarket={selectedZapMarket}
          onClose={() => setSelectedZapMarket(null)}
          onRefresh={() => refetch()}
        />
      )}
    </div>
  )
}

