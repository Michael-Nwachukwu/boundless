
// Aave V3 Pool Addresses
// Source: https://docs.aave.com/developers/deployed-contracts/v3-mainnet
export const AAVE_V3_POOL_ADDRESSES: Record<number, `0x${string}`> = {
    1: '0x87870Bca3F3f638F132C14298e9b39d798077922', // Ethereum
    10: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Optimism
    42161: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Arbitrum
    8453: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5', // Base
    56: '0x0000000000000000000000000000000000000000', // BSC (Not supported for Aave V3)
    // Add others if needed
}

// Aave V3 Data Provider Addresses (for detailed user data if needed later)
export const AAVE_V3_DATA_PROVIDER_ADDRESSES: Record<number, `0x${string}`> = {
    1: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
    10: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
    42161: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
    8453: '0x2d8A3C5677189723C4cB8873CfC9E899d6314A99',
}

// Common aToken Addresses (for Zaps)
// These are the "Vault Tokens" we route into
export const AAVE_V3_TOKENS: Record<number, Record<string, `0x${string}`>> = {
    // Base
    8453: {
        'USDC': '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB', // aBaseUSDC
        'ETH': '0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7', // aBaseWETH
    },
    // Arbitrum
    42161: {
        'USDC': '0x625E7708f30cA75bfd92586e17077590C60eb4cD', // aArbUSDC
        'ETH': '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8', // aArbWETH
    },
    // Optimism
    10: {
        'USDC': '0x625E7708f30cA75bfd92586e17077590C60eb4cD', // aOptUSDC
        'ETH': '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8', // aOptWETH
    },
    // Ethereum
    1: {
        'USDC': '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c', // aEthUSDC
        'ETH': '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8', // aEthWETH
    }
}

// ABI for getting user account data from Pool
export const AAVE_POOL_ABI = [
    {
        "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
        "name": "getUserAccountData",
        "outputs": [
            { "internalType": "uint256", "name": "totalCollateralBase", "type": "uint256" },
            { "internalType": "uint256", "name": "totalDebtBase", "type": "uint256" },
            { "internalType": "uint256", "name": "availableBorrowsBase", "type": "uint256" },
            { "internalType": "uint256", "name": "currentLiquidationThreshold", "type": "uint256" },
            { "internalType": "uint256", "name": "ltv", "type": "uint256" },
            { "internalType": "uint256", "name": "healthFactor", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "asset", "type": "address" }],
        "name": "getReserveData",
        "outputs": [
            { "internalType": "uint256", "name": "configuration", "type": "uint256" },
            { "internalType": "uint128", "name": "liquidityIndex", "type": "uint128" },
            { "internalType": "uint128", "name": "currentLiquidityRate", "type": "uint128" },
            { "internalType": "uint128", "name": "variableBorrowIndex", "type": "uint128" },
            { "internalType": "uint128", "name": "currentVariableBorrowRate", "type": "uint128" },
            { "internalType": "uint128", "name": "currentStableBorrowRate", "type": "uint128" },
            { "internalType": "uint40", "name": "lastUpdateTimestamp", "type": "uint40" },
            { "internalType": "address", "name": "aTokenAddress", "type": "address" },
            { "internalType": "address", "name": "stableDebtTokenAddress", "type": "address" },
            { "internalType": "address", "name": "variableDebtTokenAddress", "type": "address" },
            { "internalType": "address", "name": "interestRateStrategyAddress", "type": "address" },
            { "internalType": "uint128", "name": "id", "type": "uint128" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "asset", "type": "address" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" },
            { "internalType": "address", "name": "onBehalfOf", "type": "address" },
            { "internalType": "uint16", "name": "referralCode", "type": "uint16" }
        ],
        "name": "supply",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const

// Supported Markets for "Earn" Tab
export const SUPPORTED_EARN_MARKETS = [
    {
        chain: 'Base',
        chainId: 8453,
        protocol: 'Aave V3',
        asset: 'USDC',
        description: 'Supply USDC on Base',
        yieldType: 'Lending',
        risk: 'Low',
        aToken: AAVE_V3_TOKENS[8453]['USDC'],
        underlying: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // Base USDC
    },
    {
        chain: 'Base',
        chainId: 8453,
        protocol: 'Aave V3',
        asset: 'ETH',
        description: 'Supply ETH on Base',
        yieldType: 'Lending',
        risk: 'Low',
        aToken: AAVE_V3_TOKENS[8453]['ETH'],
        underlying: '0x4200000000000000000000000000000000000006' // Base WETH
    },
    {
        chain: 'Arbitrum',
        chainId: 42161,
        protocol: 'Aave V3',
        asset: 'USDC',
        description: 'Supply USDC on Arbitrum',
        yieldType: 'Lending',
        risk: 'Low',
        aToken: AAVE_V3_TOKENS[42161]['USDC'],
        underlying: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' // Arb USDC
    },
    {
        chain: 'Optimism',
        chainId: 10,
        protocol: 'Aave V3',
        asset: 'USDC',
        description: 'Supply USDC on Optimism',
        yieldType: 'Lending',
        risk: 'Low',
        aToken: AAVE_V3_TOKENS[10]['USDC'],
        underlying: '0x0b2C639c533813f4Aa9D7837CAf992c96bdB5a5f' // Opt USDC
    }
]
