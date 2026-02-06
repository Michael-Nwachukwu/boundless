# Boundless ♾️

<div align="center">

**Your capital, without boundaries.**

*A unified DeFi management interface that abstracts away cross-chain complexity*

[Features](#-features) • [Architecture](#-architecture) • [Integrations](#-key-integrations) • [Getting Started](#-getting-started)

</div>

---

## 🎯 The Problem We Solve

Web3 users face **fragmented liquidity** - assets scattered across multiple chains and wallets make it nearly impossible to:
- Track total net worth efficiently
- Move capital where it's needed most
- Enter DeFi positions without complex multi-step processes
- Maintain sufficient gas across chains
- Consolidate dust balances that are individually worthless

**Boundless solves this.** One interface. All your chains. Intelligent routing powered by LI.FI.

Boundless is a unified DeFi management interface that abstracts away the complexities of cross-chain liquidity. Manage your positions, refuel gas, and consolidate dust—all from a single, intuitive dashboard.

---

## 📊 Application Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BOUNDLESS ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │  User Wallet │ (Connected via RainbowKit + ENS Resolution)
    └──────┬───────┘
           │
           ▼
    ┌──────────────────────────────────────────────────────────┐
    │              Unified Dashboard (Zerion API)               │
    │  ┌────────┬────────┬────────┬────────┬────────────────┐  │
    │  │ Total  │ Base   │ Arb    │ Op     │ Ethereum       │  │
    │  │ $12.4K │ $5.2K  │ $3.1K  │ $2.8K  │ $1.3K          │  │
    │  └────────┴────────┴────────┴────────┴────────────────┘  │
    └────┬─────────────────┬──────────────┬──────────────┬────┘
         │                 │              │              │
         ▼                 ▼              ▼              ▼
    ┌─────────┐      ┌──────────┐   ┌─────────┐   ┌──────────┐
    │ SQUEEZE │      │   PULL   │   │ REFUEL  │   │   ZAP    │
    └────┬────┘      └─────┬────┘   └────┬────┘   └─────┬────┘
         │                 │              │              │
         │          ┌──────┴──────────────┴──────────────┘
         │          │
         ▼          ▼
    ┌────────────────────────────────────────────────────┐
    │         ZapResolver / SqueezeResolver              │
    │  • Analyze source assets & destination             │
    │  • Calculate optimal routing strategy              │
    │  • Filter unsafe routes (aTokens, etc.)            │
    └────┬──────────────────────────────────────────┬────┘
         │                                           │
         ▼                                           ▼
    ┌─────────────────────────────────┐     ┌──────────────────┐
    │      LI.FI SDK Integration      │     │  Direct Execution│
    │  ┌───────────────────────────┐  │     │  (Same Chain)    │
    │  │  getOptimalRoutes()       │  │     │  • Approve Token │
    │  │  executeRoute()           │  │     │  • Aave Supply   │
    │  │  Contract Call Encoding   │  │     └──────────────────┘
    │  └───────────────────────────┘  │
    └────┬────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────────────┐
    │      Cross-Chain Execution Flow         │
    │                                          │
    │  1. Switch to Source Chain               │
    │  2. Approve Bridge Contract              │
    │  3. Execute Bridge Transaction           │
    │  4. Monitor Bridge Status                │
    │  5. Switch to Destination Chain          │
    │  6. Execute Final Action (Deposit/Swap)  │
    └─────────────────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────────────┐
    │         Transaction Complete             │
    │  • Refresh Balance (Zerion)              │
    │  • Update UI State                       │
    │  • Show Success with TX Link             │
    └─────────────────────────────────────────┘
```

---

## ✨ Features

### 1. 🎯 Unified Portfolio Dashboard
- **Aggregate View**: See total net worth across Ethereum, Base, Arbitrum, Optimism, and more
- **Asset Breakdown**: Drill down by chain or view consolidated token balances
- **Real-time Pricing**: Powered by Zerion's unified balance API
- **ENS Integration**: Display wallet identities with ENS names and avatars

### 2. 🔄 Squeeze (Multi-Asset Consolidation)
**The Problem**: You have $2 USDC on Optimism, $5 DAI on Arbitrum, $3 ETH on Base  
**The Solution**: Select all three → Squeeze into "USDC on Base" → One transaction flow

**Technical Implementation**:
```typescript
resolveSqueezeRoutes({
  assets: [asset1, asset2, asset3],     // Multiple source assets
  destinationChainId: 8453,              // Base
  destinationToken: 'USDC',              // Target asset
  destinationAddress: userAddress
})
```
- Fetches optimal routes from LI.FI for each asset individually
- Executes sequentially with status tracking
- Handles failures gracefully (continues if one route fails)

### 3. 💸 Pull & Refuel

#### Pull
Move liquidity from other chains to your current location
- **Smart Selection**: Auto-selects best assets to meet USD target
- **Optimal Routing**: LI.FI finds best bridge/swap path
- **ENS Support**: Send to any ENS name or address

#### Refuel
Never get stuck without gas
- **Auto-Detection**: Checks gas balance on destination chain
- **Native Token Routing**: Bridges ETH/MATIC/BNB for gas fees
- **Fallback Logic**: If primary asset fails, tries next available

### 4. ⚡ DeFi Zaps (Aave V3 Integration)

#### Same-Chain Direct Deposit
```
User selects "Zap 100 USDC on Base → aBasUSDC"
  ↓
1. Approve USDC to Aave Pool
2. Execute Pool.supply(USDC, 100, user, 0)
  ↓
Done! aBasUSDC in wallet
```

#### Cross-Chain Zap with Auto-Deposit
```
User selects "Zap 50 USDC on Arbitrum → aBasUSDC"
  ↓
1. Bridge ARB USDC → Base (LI.FI)
2. Wait for bridge completion
3. Switch to Base chain
4. Approve USDC to Aave Pool on Base
5. Execute Pool.supply(USDC, 50, user, 0)
  ↓
Done! Bridged + Deposited in one flow
```

**Key Features**:
- Filters out aTokens from source selection (can't zap vault tokens)
- Shows "Direct" vs "Bridge" badges
- Estimates fees and output amounts
- Handles chain switching automatically

### 5. 📈 My Positions & Yield Tracking

#### Position Dashboard
- **aToken Detection**: Automatically identifies Aave vault tokens
- **Live APY Display**: Shows current supply APY (e.g., "4.5% APY")
- **Yield Estimation**: Calculates daily/monthly earnings based on balance
- **Withdraw**: One-click withdrawal to underlying asset

#### Technical Details
```typescript
// Position metadata includes:
{
  chainId: 8453,
  symbol: 'aBasUSDC',
  underlyingSymbol: 'USDC',
  underlying: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  estimatedAPY: 0.045  // 4.5%
}

// Withdraw uses Aave Pool.withdraw()
Pool.withdraw(
  underlying,  // USDC address
  amount,      // Or type(uint256).max for full withdrawal
  userAddress
)
```

---

## 🔌 Key Integrations

### 1. LI.FI SDK (Core Routing Engine)

#### Deep Integration Highlights
We don't just wrap LI.FI's UI - we built custom routing logic on top of their SDK:

**Advanced Route Resolution**:
```typescript
// Multi-asset routing with custom fallback logic
export async function resolveSqueezeRoutes(request: SqueezeRequest) {
  const routePromises = request.assets.map(async (asset) => {
    try {
      const lifiRoutes = await getOptimalRoutes({
        fromChainId: getChainId(asset.chain),
        toChainId: request.destinationChainId,
        fromTokenAddress: asset.asset.address,
        toTokenAddress: destinationTokenAddress,
        fromAmount: amountInSmallestUnit,
        fromAddress: asset.wallet,
        toAddress: request.destinationAddress,
      })
      return { type: 'resolved', route: lifiRoutes[0] }
    } catch (error) {
      return { type: 'skipped', reason: error.message }
    }
  })
  
  // Handles partial failures gracefully
  const results = await Promise.all(routePromises)
}
```

**Chain Switching & Execution**:
- Automatic chain detection and switching via `wagmi.useSwitchChain()`
- Post-bridge deposit execution for cross-chain zaps
- Transaction monitoring with status callbacks

**Features We Use**:
- ✅ `getRoutes()` - Multi-chain route discovery
- ✅ `executeRoute()` - Transaction execution with monitoring
- ✅ `getChainId()` - Chain name normalization
- ✅ Custom fee configuration
- ✅ Slippage management

### 2. ENS (Ethereum Name Service)

#### Identity & Resolution
**What We Built**:
- **ENS Address Input Component**: Custom React component with real-time validation
- **Cross-Chain Resolution**: Resolve ENS names on L1 even when connected to L2
- **Avatar Display**: Fetch and display ENS avatars in wallet UI

**Implementation**:
```typescript
// components/ui/ens-address-input.tsx
const { data: ensName } = useEnsName({ address, chainId: 1 })
const { data: ensAvatar } = useEnsAvatar({ name: ensName, chainId: 1 })
const { data: resolvedAddress } = useEnsAddress({ name: inputValue, chainId: 1 })
```

**Use Cases**:
1. Pull flow: "Pull 500 USDC to michael.eth"
2. Dashboard: Show "michael.eth" instead of "0xd79F..."
3. Validation: Prevent sending to invalid addresses

### 3. Zerion API

#### Unified Portfolio Aggregation
**Why Zerion**: Multi-chain balance aggregation is hard. Zerion provides a single API to fetch holdings across all chains.

**Our Implementation**:
```typescript
// lib/hooks/use-unified-balance.ts
export function useUnifiedBalance(address?: `0x${string}`) {
  return useQuery({
    queryKey: ['unifiedBalance', address],
    queryFn: async () => {
      const response = await fetch(
        `https://api.zerion.io/v1/wallets/${address}/portfolio`,
        { headers: { 'Authorization': `Bearer ${ZERION_API_KEY}` } }
      )
      return transformZerionResponse(response)
    }
  })
}
```

**Data We Extract**:
- Asset symbols, addresses, decimals
- USD values (for sorting and display)
- Chain information
- Token metadata (icons, etc.)

---

## 🏗️ Technical Architecture

### Tech Stack

**Frontend**:
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Radix UI Components

**Web3**:
- `wagmi` v2 - React hooks for Ethereum
- `viem` - TypeScript Ethereum library
- `@rainbow-me/rainbowkit` - Wallet connection
- `@tanstack/react-query` - Async state management

**Routing & Bridging**:
- `@lifi/sdk` v3.15.4 - Cross-chain routing
- Custom resolvers for multi-asset flows

**State Management**:
- React Context for global state
- `zustand` for client-side caching
- React Query for server state

### Project Structure
```
boundless/
├── app/
│   ├── page.tsx                    # Landing page
│   └── boundless/
│       └── page.tsx                # Main dashboard
├── components/
│   ├── flows/
│   │   ├── zap-flow.tsx           # Aave deposit UI
│   │   ├── squeeze-flow.tsx       # Multi-asset consolidation
│   │   ├── pull-flow.tsx          # Cross-chain pull
│   │   ├── refuel-flow.tsx        # Gas refueling
│   │   └── positions-flow.tsx     # DeFi positions manager
│   ├── dashboard/
│   │   └── earn-view.tsx          # Yield opportunities
│   └── ui/
│       └── ens-address-input.tsx  # ENS-enabled address input
├── lib/
│   ├── api/
│   │   ├── lifi.ts                # LI.FI SDK wrapper
│   │   └── zerion.ts              # Balance aggregation
│   ├── routing/
│   │   ├── zap-resolver.ts        # Aave zap routing logic
│   │   └── squeeze-resolver.ts    # Multi-asset routing
│   ├── constants/
│   │   └── aave.ts                # Aave V3 addresses & ABIs
│   └── hooks/
│       └── use-unified-balance.ts # Portfolio data hook
└── public/
```

### Data Flow Diagram

```
┌─────────────┐
│    User     │
│  Connects   │
│   Wallet    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│   RainbowKit + Wagmi                │
│   • Address: 0xd79F...              │
│   • Chain: Base (8453)              │
│   • ENS: michael.eth                │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   useUnifiedBalance Hook            │
│   ┌─────────────────────────────┐   │
│   │  Zerion API Call            │   │
│   │  GET /wallets/{addr}/portfolio  │
│   └─────────────────────────────┘   │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   Balance Processing                │
│   • Filter by chain                 │
│   • Identify aTokens                │
│   • Calculate USD totals            │
│   • Sort by value                   │
└──────┬──────────────────────────────┘
       │
       ├─────────────────┬──────────────────┬──────────────┐
       ▼                 ▼                  ▼              ▼
   Dashboard        Squeeze/Pull         Refuel         Zap
       │                 │                  │              │
       │                 ▼                  │              │
       │          ┌─────────────┐           │              │
       │          │ZapResolver/ │           │              │
       │          │ Squeeze     │           │              │
       │          │ Resolver    │           │              │
       │          └──────┬──────┘           │              │
       │                 │                  │              │
       └─────────────────┴──────────────────┴──────────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │  LI.FI SDK  │
                  │  getRoutes()│
                  │  execute()  │
                  └──────┬──────┘
                         │
                         ▼
                  ┌─────────────┐
                  │  Blockchain │
                  │ Transaction │
                  └─────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A wallet (MetaMask, Rainbow, etc.)
- Test funds on Base/Arbitrum/Optimism

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/boundless.git
cd boundless

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_id
NEXT_PUBLIC_ZERION_API_KEY=your_zerion_api_key
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

---

## 🎨 Design Philosophy

1. **Chain Abstraction**: Users shouldn't think about chains - just assets
2. **Intent-Based**: "I want USDC on Base" not "Bridge from Arbitrum via Hop to Base then swap"
3. **Fault Tolerance**: Graceful degradation when routes fail
4. **Transparent Costs**: Always show fees, slippage, and estimates upfront

---

## 🔐 Security Considerations

- All private keys remain in user's wallet - we never custody funds
- Contract interactions use standard, audited protocols (Aave V3)
- LI.FI routes are validated before execution
- ENS resolution happens on-chain via standard resolvers

---

## 🙏 Acknowledgments

Built with:
- [LI.FI](https://li.fi) - Cross-chain routing infrastructure
- [ENS](https://ens.domains) - Decentralized naming system
- [Zerion](https://zerion.io) - Portfolio aggregation API
- [Aave](https://aave.com) - DeFi lending protocol
- [RainbowKit](https://rainbowkit.com) - Wallet connection UI

---

<div align="center">

**Made with ❤️ for the cross-chain future**

</div>
