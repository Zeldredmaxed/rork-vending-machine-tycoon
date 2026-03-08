# VendFX Backend API Documentation

## Overview

VendFX is a competitive vending-machine tycoon game backend featuring seasonal tournaments, real-time multiplayer, dual-wallet economy, and real-money integration. Built with Node.js, Express, tRPC, Socket.io, and MySQL/TiDB.

## Architecture

| Component | Technology | Purpose |
|-----------|-----------|---------|
| API Layer | tRPC v11 | Type-safe RPC procedures |
| Server | Express 4 | HTTP server + middleware |
| Database | MySQL/TiDB | Persistent storage (Drizzle ORM) |
| Real-time | Socket.io | WebSocket events + chat |
| Payments | Stripe | Deposits, withdrawals, KYC |
| Scheduling | node-cron | 10 automated game jobs |
| Auth | Manus OAuth | JWT session cookies |
| Testing | Vitest | 293 unit tests |

## Database Schema (27 Tables)

### Core Game Tables
- `players` - Player profiles, wallets, ELO, tycoon scores
- `vendingMachines` - Machine placement, capacity, status, GPS coordinates
- `products` - Product catalog with pricing and categories
- `warehouseInventory` - Player inventory storage
- `employees` - Hired workers with 6 stats
- `applicants` - Available workers for hiring

### Season & Competition
- `seasons` - Season lifecycle (lobby → active → payout)
- `seasonBrackets` - ELO-based bracket assignments
- `seasonLeaderboard` - Rankings and payouts

### Financial
- `transactions` - Dual-wallet transaction audit trail
- `kycVerifications` - KYC document verification
- `responsibleGamingLimits` - Spending caps with 72hr cooldown
- `selfExclusions` - Self-exclusion periods

### Alliance System
- `alliances` - Alliance creation and treasury
- `allianceMembers` - Membership with roles
- `allianceMessages` - Persistent chat
- `allianceInvites` - Invite management
- `treasuryTransactions` - Treasury audit trail

### Marketplace
- `marketplaceListings` - P2P inventory listings
- `marketplaceTrades` - Completed trade records
- `marketEvents` - Global market events
- `priceHistory` - Product price tracking

### Power-Ups & Upgrades
- `powerUps` - Power-up catalog definitions
- `installedPowerUps` - Active power-up installations
- `machineUpgrades` - Machine upgrade tier progression

### Operations
- `restockDispatches` - Fleet dispatch tracking
- `customerComplaints` - Customer complaint management
- `disputeTickets` - Dispute resolution

---

## tRPC Router Reference

### `players` Router

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `getProfile` | Query | Yes | Get player profile by ID |
| `createProfile` | Mutation | Yes | Create new player profile |
| `updateProfile` | Mutation | Yes | Update player details |
| `getWalletBalance` | Query | Yes | Get dual-wallet balances |
| `getStats` | Query | Yes | Get player statistics |

### `seasons` Router

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `getCurrent` | Query | Yes | Get current active season |
| `enter` | Mutation | Yes | Enter a season (pay entry fee) |
| `getLeaderboard` | Query | Yes | Get season leaderboard |
| `getBracket` | Query | Yes | Get player's bracket |

### `hr` Router

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `getApplicants` | Query | Yes | Browse available applicants |
| `hire` | Mutation | Yes | Hire an applicant |
| `getEmployees` | Query | Yes | List player's employees |
| `assignTask` | Mutation | Yes | Assign employee to task (48hr lock) |
| `getEfficiency` | Query | Yes | Calculate employee efficiency |

### `fleet` Router

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `dispatch` | Mutation | Yes | Create restock dispatch |
| `getDispatches` | Query | Yes | List active dispatches |
| `getETA` | Query | Yes | Calculate dispatch ETA |
| `reportBreakdown` | Mutation | Yes | Report vehicle breakdown |
| `repairVehicle` | Mutation | Yes | Initiate vehicle repair |
| `getFleetStatus` | Query | Yes | Overview of all vehicles |

### `market` Router

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `getProducts` | Query | Yes | Browse wholesale products |
| `getCurrentPrices` | Query | Yes | Get current market prices |
| `purchaseWholesale` | Mutation | Yes | Buy products at market price |
| `getActiveEvents` | Query | Yes | List active market events |
| `getPriceHistory` | Query | Yes | Historical price data |
| `getDemandForecast` | Query | Yes | Demographic demand analysis |

### `marketplace` Router (P2P)

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `listItem` | Mutation | Yes | List inventory for sale |
| `buyItem` | Mutation | Yes | Purchase from another player |
| `cancelListing` | Mutation | Yes | Cancel active listing |
| `getListings` | Query | Yes | Browse marketplace |
| `getMyListings` | Query | Yes | View own listings |
| `getTradeHistory` | Query | Yes | Trade history and analytics |
| `getLeaderboard` | Query | Yes | Top sellers leaderboard |
| `getPriceSuggestion` | Query | Yes | AI-suggested pricing |

### `payments` Router

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `createDeposit` | Mutation | Yes | Create Stripe checkout session |
| `requestWithdrawal` | Mutation | Yes | Request withdrawal (requires KYC) |
| `getTransactionHistory` | Query | Yes | Payment transaction log |
| `transferBetweenWallets` | Mutation | Yes | Move funds between wallets |

### `compliance` Router

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `submitKYC` | Mutation | Yes | Submit KYC documents |
| `getKYCStatus` | Query | Yes | Check verification status |
| `checkGeoBlock` | Query | Yes | Check state restrictions |
| `setSpendingLimit` | Mutation | Yes | Set responsible gaming limit |
| `getSpendingLimits` | Query | Yes | View current limits |
| `selfExclude` | Mutation | Yes | Activate self-exclusion |
| `exportData` | Query | Yes | GDPR data export |
| `deleteAccount` | Mutation | Yes | GDPR account deletion |
| `getTaxSummary` | Query | Yes | 1099 tax document data |

### `alliance` Router

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `create` | Mutation | Yes | Create alliance ($500 cost) |
| `getDetails` | Query | Yes | Get alliance info |
| `list` | Query | Yes | Browse all alliances |
| `invite` | Mutation | Yes | Invite player (officer+) |
| `acceptInvite` | Mutation | Yes | Accept alliance invite |
| `declineInvite` | Mutation | Yes | Decline invite |
| `kick` | Mutation | Yes | Remove member (officer+) |
| `leave` | Mutation | Yes | Leave alliance |
| `promote` | Mutation | Yes | Promote member (leader only) |
| `demote` | Mutation | Yes | Demote member (leader only) |
| `transferLeadership` | Mutation | Yes | Transfer leader role |
| `depositTreasury` | Mutation | Yes | Deposit to treasury |
| `withdrawTreasury` | Mutation | Yes | Withdraw from treasury (leader/officer) |
| `getContributions` | Query | Yes | Contribution leaderboard |
| `sendMessage` | Mutation | Yes | Send chat message |
| `getMessages` | Query | Yes | Get chat history |
| `disband` | Mutation | Yes | Disband alliance (leader only) |

### `powerups` Router

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `getCatalog` | Query | Yes | Browse power-up catalog |
| `getUpgradeCatalog` | Query | Yes | Browse upgrade catalog |
| `seedCatalog` | Mutation | Yes | Seed power-up definitions |
| `purchase` | Mutation | Yes | Buy & install power-up |
| `uninstall` | Mutation | Yes | Remove power-up |
| `repair` | Mutation | Yes | Repair broken power-up |
| `getMachinePowerUps` | Query | Yes | List machine's power-ups |
| `simulateMalfunctions` | Mutation | Yes | Run malfunction simulation |
| `purchaseUpgrade` | Mutation | Yes | Buy machine upgrade tier |
| `getMachineUpgrades` | Query | Yes | List machine's upgrades |
| `getAggregatedStats` | Query | Yes | Full machine stat breakdown |
| `getPlayerSummary` | Query | Yes | Player-wide power-up summary |
| `calculateUpgradeCost` | Query | Yes | Preview upgrade cost |

### `jobs` Router (Admin)

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `getStatus` | Query | Yes | All cron job statuses |
| `triggerJob` | Mutation | Yes | Manually trigger a job |
| `enableJob` | Mutation | Yes | Enable a disabled job |
| `disableJob` | Mutation | Yes | Disable a job |

---

## Game Mechanics

### Dual-Wallet System

| Wallet | Source | Usage |
|--------|--------|-------|
| Competition | Season winnings, marketplace sales | Season entry, wholesale purchases, upgrades |
| Premium | Real-money deposits (Stripe) | Power-ups, premium features |

### Tycoon Score Formula

```
Score = (Financial × 0.50) + (Operational × 0.30) + (Logistical × 0.20)

Financial:  Machine revenue, profit margins, ROI
Operational: Machine uptime, restock success rate, customer satisfaction
Logistical:  Fleet efficiency, employee productivity, supply chain optimization
```

### ELO Rating System

- Starting ELO: 1200
- K-factor: 32
- Bracket seeding based on ELO ranges
- Rating updates after each season

### Season Lifecycle

```
Lobby → Active → Payout
  │        │        │
  │        │        └─ Exponential payout curve, 15% house rake
  │        └─ Players compete, scores tracked
  └─ Entry fee collected, brackets assigned
```

### Power-Up Categories

| Category | Examples | Effect Type |
|----------|----------|-------------|
| Revenue | Digital Display, Loyalty Scanner | % revenue boost |
| Capacity | Extra Shelf, Compact Stacker | +N capacity slots |
| Maintenance | Auto-Cleaner, Reinforced Mechanism | % degradation reduction |
| Speed | Turbo Dispenser, Quick-Change Module | % speed boost |
| Special | Golden Facade, Lucky Charm, Frost Guard | Mixed effects |

### Machine Upgrade Types

| Type | Max Tier | Bonus/Tier | Cost Scaling |
|------|----------|------------|--------------|
| Capacity | 5 | +20 slots | 200 × 1.8^(t-1) |
| Speed | 5 | +10% speed | 250 × 2.0^(t-1) |
| Reliability | 5 | -8% breakdown | 300 × 1.9^(t-1) |
| Energy Efficiency | 5 | -5% op cost | 350 × 1.7^(t-1) |
| Security | 3 | -15% vandalism | 400 × 2.2^(t-1) |
| Temperature Control | 4 | +12% freshness | 500 × 2.0^(t-1) |

### Geo-Blocked States

AZ, AR, CT, DE, LA, MT, SC, SD, TN, VT, WA, WI

---

## Real-Time Events (Socket.io)

| Event | Direction | Description |
|-------|-----------|-------------|
| `machine:status` | Server→Client | Machine status changes |
| `market:priceUpdate` | Server→Client | Market price fluctuations |
| `competitor:alert` | Server→Client | Nearby competitor activity |
| `dispatch:update` | Server→Client | Fleet dispatch status |
| `wallet:change` | Server→Client | Wallet balance updates |
| `marketplace:trade` | Server→Client | Trade notifications |
| `leaderboard:update` | Server→Client | Ranking changes |
| `season:phase` | Server→Client | Season phase transitions |
| `alliance:chat` | Bidirectional | Alliance chat messages |

---

## Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Machine Status Degradation | Every 5 min | Degrades machine condition |
| Dispatch ETA Check | Every 15 min | Updates dispatch statuses |
| Marketplace Cleanup | Every hour | Expires old listings |
| Complaint Expiration | Every 4 hours | Auto-resolves old complaints |
| Daily Market Prices | 3:00 AM | Recalculates market prices |
| Market Event Expiration | 3:30 AM | Removes expired events |
| Expired Inventory Purge | 4:00 AM | Removes expired products |
| Season Lifecycle Check | 5:00 AM | Manages season transitions |
| Player Inactivity Recap | 6:00 AM | Flags inactive players |
| Location Data Cleanup | Sun 2:00 AM | GDPR 30-day data purge |

---

## Testing

293 tests across 9 test files covering:
- Core game logic (players, machines, inventory)
- Tycoon Score and ELO calculations
- Season lifecycle and payouts
- HR logistics and fleet management
- Market engine and price fluctuations
- Player marketplace operations
- Socket.io event system
- Cron job scheduling
- Stripe and compliance
- Alliance system
- Power-up and upgrade mechanics

Run tests: `pnpm test`
