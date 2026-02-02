"use client"

import { ArrowLeft, Bell, Shield, Zap, Eye } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Toggle } from "@/components/ui/toggle"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    executionStarted: true,
    executionCompleted: true,
    executionFailed: true,
    liquidationWarning: true,
  })

  const [slippage, setSlippage] = useState("0.5")
  const [gasPriority, setGasPriority] = useState("standard")

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
            <h1 className="text-xl font-bold tracking-wider">SETTINGS</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-2xl">
          <div className="space-y-6">
            {/* Transaction Settings */}
            <Card className="bg-neutral-900 border-neutral-700 p-6">
              <div className="flex items-start gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Transaction Settings</h2>
                  <p className="text-sm text-neutral-400">Configure transaction behavior</p>
                </div>
              </div>

              <div className="space-y-6 border-t border-neutral-700 pt-6">
                <div>
                  <label className="text-sm font-semibold text-white block mb-2">Max Slippage</label>
                  <div className="flex items-center gap-3">
                    <Select value={slippage} onValueChange={setSlippage}>
                      <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700">
                        <SelectItem value="0.1">0.1%</SelectItem>
                        <SelectItem value="0.5">0.5%</SelectItem>
                        <SelectItem value="1">1%</SelectItem>
                        <SelectItem value="2">2%</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-neutral-500">Current: {slippage}%</p>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    Transactions will revert if price moves more than this amount
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-white block mb-2">Gas Priority</label>
                  <Select value={gasPriority} onValueChange={setGasPriority}>
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-700">
                      <SelectItem value="slow">Slow (Lower cost)</SelectItem>
                      <SelectItem value="standard">Standard (Default)</SelectItem>
                      <SelectItem value="fast">Fast (Higher cost)</SelectItem>
                      <SelectItem value="instant">Instant (Maximum speed)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-neutral-500 mt-2">
                    Default gas priority for transactions
                  </p>
                </div>
              </div>
            </Card>

            {/* Protection Settings */}
            <Card className="bg-neutral-900 border-neutral-700 p-6">
              <div className="flex items-start gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Liquidation Protection</h2>
                  <p className="text-sm text-neutral-400">Configure protection defaults</p>
                </div>
              </div>

              <div className="space-y-4 border-t border-neutral-700 pt-6">
                <div className="p-4 rounded border border-neutral-700 bg-neutral-800/30">
                  <p className="text-sm text-white font-semibold mb-2">Default Protection Settings</p>
                  <p className="text-xs text-neutral-500">
                    When you enable protection on a position, these default values will be used.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-white block mb-2">Default Trigger Threshold</label>
                  <p className="text-sm text-neutral-300 bg-neutral-800/30 p-2 rounded">1.5</p>
                  <p className="text-xs text-neutral-500 mt-2">Health factor threshold to trigger auto-pull</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-white block mb-2">Enable All New Positions</label>
                  <Toggle className="bg-neutral-800 border-neutral-700" />
                  <p className="text-xs text-neutral-500 mt-2">
                    Automatically enable protection on new borrowing positions
                  </p>
                </div>
              </div>
            </Card>

            {/* Notifications */}
            <Card className="bg-neutral-900 border-neutral-700 p-6">
              <div className="flex items-start gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Notifications</h2>
                  <p className="text-sm text-neutral-400">Manage notification preferences</p>
                </div>
              </div>

              <div className="space-y-4 border-t border-neutral-700 pt-6">
                {[
                  {
                    key: "executionStarted",
                    label: "Execution Started",
                    description: "Notify when a transaction begins",
                  },
                  {
                    key: "executionCompleted",
                    label: "Execution Completed",
                    description: "Notify when a transaction succeeds",
                  },
                  {
                    key: "executionFailed",
                    label: "Execution Failed",
                    description: "Notify when a transaction fails",
                  },
                  {
                    key: "liquidationWarning",
                    label: "Liquidation Warning",
                    description: "Notify when position health factor is low",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 rounded border border-neutral-700 bg-neutral-800/30"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      <p className="text-xs text-neutral-500">{item.description}</p>
                    </div>
                    <Toggle
                      pressed={notifications[item.key as keyof typeof notifications]}
                      onPressedChange={(pressed) =>
                        setNotifications((prev) => ({
                          ...prev,
                          [item.key]: pressed,
                        }))
                      }
                      className="bg-neutral-700 border-neutral-600"
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* Privacy Settings */}
            <Card className="bg-neutral-900 border-neutral-700 p-6">
              <div className="flex items-start gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Eye className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Privacy & Data</h2>
                  <p className="text-sm text-neutral-400">Control data visibility and analytics</p>
                </div>
              </div>

              <div className="space-y-4 border-t border-neutral-700 pt-6">
                <div className="flex items-center justify-between p-3 rounded border border-neutral-700 bg-neutral-800/30">
                  <div>
                    <p className="text-sm font-semibold text-white">Anonymous Analytics</p>
                    <p className="text-xs text-neutral-500">Help improve Boundless with usage data</p>
                  </div>
                  <Toggle defaultPressed className="bg-neutral-700 border-neutral-600" />
                </div>

                <div className="flex items-center justify-between p-3 rounded border border-neutral-700 bg-neutral-800/30">
                  <div>
                    <p className="text-sm font-semibold text-white">Hide Balance in UI</p>
                    <p className="text-xs text-neutral-500">Show **** instead of actual amounts</p>
                  </div>
                  <Toggle className="bg-neutral-700 border-neutral-600" />
                </div>
              </div>
            </Card>

            {/* Save Button */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800 bg-transparent"
              >
                Reset to Defaults
              </Button>
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
