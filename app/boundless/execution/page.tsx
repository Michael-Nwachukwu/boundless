"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExecutionStatusPanel } from "@/components/execution/execution-status"

export default function ExecutionHistoryPage() {
  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-neutral-700 bg-neutral-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/boundless">
              <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold tracking-wider">EXECUTION HISTORY</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="bg-neutral-900 border-b border-neutral-700">
              <TabsTrigger value="all" className="text-neutral-400 data-[state=active]:text-orange-500">
                All
              </TabsTrigger>
              <TabsTrigger value="ongoing" className="text-neutral-400 data-[state=active]:text-orange-500">
                Ongoing
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-neutral-400 data-[state=active]:text-orange-500">
                Completed
              </TabsTrigger>
              <TabsTrigger value="failed" className="text-neutral-400 data-[state=active]:text-orange-500">
                Failed
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <ExecutionStatusPanel showOngoing={false} />
            </TabsContent>

            <TabsContent value="ongoing" className="space-y-4">
              <ExecutionStatusPanel showOngoing={true} />
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              <ExecutionStatusPanel showOngoing={false} />
            </TabsContent>

            <TabsContent value="failed" className="space-y-4">
              <ExecutionStatusPanel showOngoing={false} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
