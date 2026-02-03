"use client"

import { ArrowRight, Zap, Shield, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface HeroProps {
  onConnectWallet: () => void
  onViewDemo: () => void
}

export function Hero({ onConnectWallet, onViewDemo }: HeroProps) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid Background */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(249, 115, 22, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249, 115, 22, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }} />

        {/* Gradient Orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 md:px-8">
        <div className="max-w-4xl">
          {/* Tag */}
          <div className="inline-block mb-8">
            <div className="px-4 py-2 border border-orange-500/30 rounded-full bg-orange-500/5 flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-orange-400">Now available on 5+ blockchains</span>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Your capital,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-red-500">
              without boundaries
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-neutral-400 mb-8 max-w-2xl">
            Unify balances across multiple wallets and chains. Refuel gas. Protect against liquidation.
            All from one interface.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
              }) => {
                const ready = mounted && authenticationStatus !== 'loading';
                const connected =
                  ready &&
                  account &&
                  chain &&
                  (!authenticationStatus ||
                    authenticationStatus === 'authenticated');

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      'style': {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <Button
                            onClick={openConnectModal}
                            className="h-12 px-8 bg-orange-500 hover:bg-orange-600 text-white text-base font-semibold flex items-center justify-center gap-2"
                          >
                            Connect Wallet
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        );
                      }
                      return (
                        <Button
                          onClick={onConnectWallet} // Navigate to dashboard
                          className="h-12 px-8 bg-orange-500 hover:bg-orange-600 text-white text-base font-semibold flex items-center justify-center gap-2"
                        >
                          Go to Dashboard
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
            <Button
              onClick={onViewDemo}
              variant="outline"
              className="h-12 px-8 border-orange-500/50 text-orange-400 hover:bg-orange-500/10 text-base font-semibold bg-transparent"
            >
              View Demo Flow
            </Button>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-neutral-700">
            <div className="flex gap-4 p-4 rounded-lg bg-neutral-900/50 border border-neutral-700/50 hover:border-orange-500/30 transition-all">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 rounded border border-orange-500/30 bg-orange-500/5">
                  <Zap className="w-5 h-5 text-orange-500" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Unified Pull</h3>
                <p className="text-sm text-neutral-400">Move assets across chains with optimal routing</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-lg bg-neutral-900/50 border border-neutral-700/50 hover:border-orange-500/30 transition-all">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 rounded border border-orange-500/30 bg-orange-500/5">
                  <RefreshCw className="w-5 h-5 text-orange-500" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Gas Refuel</h3>
                <p className="text-sm text-neutral-400">Never run out of gas on any chain</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-lg bg-neutral-900/50 border border-neutral-700/50 hover:border-orange-500/30 transition-all">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 rounded border border-orange-500/30 bg-orange-500/5">
                  <Shield className="w-5 h-5 text-orange-500" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Liquidation Protection</h3>
                <p className="text-sm text-neutral-400">Auto-pull to protect your positions</p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">$2.5B+</div>
              <p className="text-sm text-neutral-400 mt-1">Total Volume</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">847K</div>
              <p className="text-sm text-neutral-400 mt-1">Active Users</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">5+</div>
              <p className="text-sm text-neutral-400 mt-1">Blockchains</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">0.5%</div>
              <p className="text-sm text-neutral-400 mt-1">Avg Fee</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
