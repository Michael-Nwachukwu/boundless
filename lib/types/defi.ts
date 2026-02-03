export interface Wallet {
  address: string
  chainId: number
  balance: string
  isConnected: boolean
  label?: string
}

export interface Asset {
  symbol: string
  name: string
  address: string
  chain: string
  decimals: number
  logo?: string
}

export interface Balance {
  asset: Asset
  amount: string
  usdValue: number
  wallet: string
  chain: string
}

export interface UnifiedBalance {
  totalUsd: number
  balances: Balance[]
  byWallet: Record<string, { totalUsd: number; assets: Balance[] }>
  byChain: Record<string, { totalUsd: number; assets: Balance[] }>
}

export interface Route {
  from: Asset
  to: Asset
  amount: string
  estimatedOutput: string
  estimatedFee: string
  feePercentage: number
  provider: string
  steps: RouteStep[]
}

export interface RouteStep {
  name: string
  description: string
  estimatedTime?: number
}

export interface PullAction {
  sourceWallets: Wallet[]
  destinationAddress: string
  destinationChain: string
  destinationToken: Asset
  routes: Route[]
  totalOutput: string
  totalFees: string
  executionSteps: ExecutionStep[]
}

export interface ExecutionStep {
  id: string
  wallet: string
  action: string
  status: "pending" | "executing" | "completed" | "failed"
  txHash?: string
  error?: string
  timestamp?: number
}

export interface RefuelAction {
  sourceAssets: Asset[]
  targetChain: string
  targetToken: Asset
  amount: string
  estimatedCost: string
  estimatedArrivalTime: number
  route: Route
}

export interface BorrowPosition {
  id: string
  debtToken: Asset
  debtAmount: string
  collateral: Asset[]
  collateralAmount: string
  healthFactor: number
  riskLevel: "low" | "medium" | "high" | "critical"
  liquidationPrice: string
  chain: string
  protocol: string
}

export interface ProtectionRule {
  id: string
  positionId: string
  triggerThreshold: number
  maxRepayAmount: string
  preferredSourceAssets: Asset[]
  enabled: boolean
  createdAt: number
}

export interface Transaction {
  hash: string
  type: "pull" | "refuel" | "protection"
  status: "pending" | "completed" | "failed"
  amount: string
  asset: Asset
  fromWallet: string
  toWallet?: string
  chain: string
  timestamp: number
  fee?: string
  error?: string
}

export interface ExecutionStatus {
  id: string
  type: "pull" | "refuel" | "protection"
  status: "pending" | "executing" | "completed" | "failed"
  progress: number
  currentStep: string
  steps: ExecutionStep[]
  startTime: number
  estimatedCompletionTime?: number
  completedTime?: number
  transactions: Transaction[]
}
