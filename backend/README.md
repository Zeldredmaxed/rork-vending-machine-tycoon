# VendFX Backend

Production-ready backend for VendFX, a competitive vending-machine tycoon game with seasonal tournaments, real-time multiplayer, and real-money integration.

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **API:** Express + tRPC v11 (type-safe RPC)
- **Database:** MySQL/TiDB with Drizzle ORM
- **Real-time:** Socket.io (WebSocket)
- **Payments:** Stripe (deposits, withdrawals, KYC)
- **Scheduling:** node-cron (10 automated jobs)
- **Testing:** Vitest (293 tests)

## Architecture

```
backend/
├── drizzle/              # Database schema & migrations (27 tables)
│   └── schema.ts         # Complete MySQL schema
├── server/
│   ├── engines/          # Core game logic engines
│   │   ├── alliance.ts           # Alliance system
│   │   ├── compliance.ts         # KYC, geo-blocking, responsible gaming
│   │   ├── eloMatchmaking.ts     # ELO rating & bracket seeding
│   │   ├── fleetManagement.ts    # GPS-based fleet & breakdown sim
│   │   ├── gdpr.ts               # GDPR data export & deletion
│   │   ├── hrLogistics.ts        # Employee hiring & task assignment
│   │   ├── payments.ts           # Stripe deposit/withdrawal flows
│   │   ├── playerMarketplace.ts  # P2P inventory trading
│   │   ├── powerUps.ts           # Power-ups & machine upgrades
│   │   ├── seasonLifecycle.ts    # Season phases & payout distribution
│   │   ├── tycoonScore.ts        # Tycoon Score calculation
│   │   └── wholesaleMarket.ts    # Dynamic pricing & market events
│   ├── routers/          # tRPC route handlers
│   │   ├── alliance.ts   ├── compliance.ts  ├── fleet.ts
│   │   ├── hr.ts         ├── jobs.ts        ├── market.ts
│   │   ├── marketplace.ts├── payments.ts    ├── players.ts
│   │   ├── powerups.ts   ├── realtime.ts    └── seasons.ts
│   ├── realtime/         # Socket.io server & event bridge
│   ├── jobs/             # Cron job scheduler (10 jobs)
│   ├── db.ts             # Database connection (mysql2 driver)
│   ├── gameLogic.ts      # Shared game calculations
│   ├── queries.ts        # Database query helpers
│   └── routers.ts        # Main tRPC router aggregation
└── shared/               # Shared types & constants
```

## Key Features

### Game Systems
- **Dual-Wallet Economy** — Competition wallet (seasonal play) + Premium wallet (IAP)
- **Tycoon Score** — 50% financial, 30% operational, 20% logistical
- **ELO Matchmaking** — Rating-based bracket seeding for seasons
- **Season Lifecycle** — Lobby → Active → Payout with 15% house rake
- **HR & Fleet** — Employee hiring, GPS-based travel time, vehicle breakdowns
- **Dynamic Market** — Mean-reverting prices, global events, demographic demand
- **P2P Marketplace** — Player-to-player trading with 5% platform fee
- **Alliance System** — Creation, roles, treasury, persistent chat
- **Power-Ups** — 12 types across 5 categories with malfunction simulation
- **Machine Upgrades** — 6 upgrade types with exponential tier progression

### Compliance & Payments
- **Stripe Integration** — Deposits via Checkout, withdrawal approval workflow
- **KYC Verification** — ID + SSN validation for withdrawals
- **Geo-Blocking** — 12 restricted US states (AZ, AR, CT, DE, LA, MT, SC, SD, TN, VT, WA, WI)
- **Responsible Gaming** — Daily/weekly/monthly spending limits with 72hr cooldown
- **Self-Exclusion** — 24h, 7d, 30d, permanent periods
- **GDPR** — Full data export and account deletion/anonymization
- **1099 Tax** — Annual winnings summary for tax reporting

### Real-Time Events (Socket.io)
- Machine status updates, market price shifts, competitor alerts
- Fleet dispatch tracking, wallet changes, trade notifications
- Alliance chat, leaderboard updates, season phase transitions

### Automated Jobs (10 Cron Jobs)
- Machine degradation (5min), dispatch ETA (15min), marketplace cleanup (hourly)
- Market prices (3AM), inventory purge (4AM), season lifecycle (5AM)
- Complaint expiration (4hrs), inactivity recap (6AM), location cleanup (weekly)

## Database

27 MySQL/TiDB tables covering players, machines, products, employees, seasons, transactions, alliances, KYC, marketplace, power-ups, upgrades, market events, and more.

## Testing

293 tests across 9 test files. Run with:

```bash
pnpm test
```

## Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete tRPC procedure reference, game mechanics, and system details.
