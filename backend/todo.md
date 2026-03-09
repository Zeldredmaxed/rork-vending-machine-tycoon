# VendFX Backend - Implementation TODO

## Phase 1: Frontend Analysis & API Requirements
- [x] Extract all API endpoints from frontend Views and Services
- [x] Document data models and state expectations
- [x] Identify real-time event requirements

## Phase 2: Database Schema & Architecture Design
- [x] Design complete MySQL/TiDB schema with all tables
- [x] Plan API surface and tRPC procedures
- [x] Document architecture decisions and data flows

## Phase 3: MySQL Schema Implementation
- [x] Create users and player profiles table
- [x] Create machines and locations table
- [x] Create products and inventory tables
- [x] Create employees and applicants tables
- [x] Create alliances and alliance members tables
- [x] Create seasons and brackets tables
- [x] Create transactions and wallets tables
- [x] Create complaints and disputes tables
- [x] Create power-ups and machine upgrades tables
- [x] Create market events and price history tables
- [x] Run migrations and verify schema (all 23 tables confirmed in DB)

## Phase 4: Core Game Logic - Players, Machines, Inventory
- [x] Implement player creation and profile management
- [x] Implement machine purchase and placement
- [x] Implement product purchasing and warehouse inventory
- [x] Implement machine inventory allocation
- [x] Implement product pricing and sales
- [x] Implement player balance queries
- [ ] Write tests for core operations

## Phase 5: Dual-Wallet System
- [x] Implement wallet balance queries (in queries.ts)
- [x] Implement transaction recording with audit trail (in queries.ts)
- [ ] Implement deposit/withdrawal procedures (tRPC)
- [ ] Implement balance validation and constraints
- [ ] Write tests for wallet operations

## Phase 6: Tycoon Score & ELO System
- [x] Implement Tycoon Score calculation (50% financial, 30% operational, 20% logistical)
- [x] Implement ELO calculation and updates
- [x] Implement seasonal ranking and leaderboard queries
- [x] Implement bracket seeding based on ELO
- [ ] Write tests for score calculations

## Phase 7: Season Lifecycle & Payouts
- [x] Implement season creation and lobby phase
- [x] Implement entry fee collection and bracket assignment
- [x] Implement season end detection and ranking
- [x] Implement exponential payout algorithm with 15% house rake
- [x] Implement payout distribution
- [ ] Write tests for payout calculations

## Phase 8: HR Logistics & Fleet Management
- [x] Implement employee hiring and applicant generation
- [x] Implement task assignment with 48-hour lock
- [x] Implement travel time calculation with GPS distance
- [x] Implement ETA calculation with worker stats
- [x] Implement breakdown simulation and vehicle status
- [x] Implement restock completion and failure tracking
- [x] Implement maintenance dispatch and repair requirements
- [x] Write tests for logistics calculations (58 tests, all passing)
- [x] Create tRPC routers for HR and Fleet operations

## Phase 9: Dynamic Wholesale Market
- [x] Implement product base prices and market prices
- [x] Implement daily price fluctuation cron job
- [x] Implement global events (e.g., Sugar Tax) with price multipliers
- [x] Implement demographic-based demand and affinity
- [x] Implement product expiration and freshness mechanics
- [x] Implement subscription-based price alerts
- [x] Write tests for market calculations

## Phase 10: WebSocket & Real-Time Events
- [x] Set up Socket.io server
- [x] Implement machine status update events
- [x] Implement market shift notifications
- [x] Implement competitor proximity alerts
- [x] Implement alliance chat and messaging
- [x] Implement real-time leaderboard updates
- [x] Implement connection management and authentication

## Phase 11: Stripe, KYC & Compliance
- [x] Integrate Stripe for deposits and withdrawals
- [x] Implement KYC verification (ID + SSN)
- [x] Implement geo-blocking for restricted states
- [x] Implement responsible gaming limits (daily/weekly/monthly)
- [x] Implement self-exclusion periods
- [x] Implement 1099 tax document generation
- [x] Implement GDPR data export and deletion
- [x] Implement location data purging after 30 days

## Phase 12: Cron Jobs & Scheduled Tasks
- [x] Implement daily market price update job
- [x] Implement season lifecycle check job
- [x] Implement machine status degradation job (every 5 min)
- [x] Implement daily player inactivity recap
- [x] Implement complaint expiration job
- [x] Implement location data cleanup job

## Phase 13: Testing & Documentation
- [ ] Write unit tests for all core business logic
- [ ] Write integration tests for API endpoints
- [ ] Write WebSocket event tests
- [ ] Document API endpoints and procedures
- [ ] Document database schema and relationships
- [ ] Create deployment guide
- [ ] Finalize project structure and push to GitHub

## Audit & Stabilization (Pre-1.6 Max) - COMPLETE
- [x] Fixed database dialect from PostgreSQL to MySQL/TiDB
- [x] Rewrote schema.ts using mysqlTable/mysqlEnum
- [x] Fixed db.ts to use mysql2 driver
- [x] Fixed drizzle.config.ts dialect to mysql
- [x] Replaced all .returning() calls with MySQL-compatible patterns
- [x] Replaced PostgreSQL ANY(ARRAY[...]) with MySQL IN (...) syntax
- [x] Cleaned stale migration files and pushed fresh schema
- [x] Verified all 23 tables exist in database with correct columns
- [x] Restarted server and verified no runtime errors
- [x] Confirmed only pre-existing template TS errors remain (not our code)

## Dynamic Wholesale Market Engine
- [x] Add player marketplace schema table (listings, trades)
- [x] Build market engine with price fluctuation algorithm
- [x] Implement global market events (Sugar Tax, supply disruptions, etc.)
- [x] Implement demographic-based demand and affinity scoring
- [x] Implement product expiration and freshness mechanics
- [x] Implement price history tracking
- [x] Build player marketplace engine (list surplus, buy from others, fees)
- [x] Create tRPC router for wholesale market operations
- [x] Create tRPC router for player marketplace operations
- [x] Write comprehensive tests for market calculations (102 tests, all passing)

## Socket.io Real-Time Events
- [x] Review server setup and Socket.io dependencies
- [x] Build Socket.io server with JWT authentication middleware
- [x] Implement room management (player rooms, alliance rooms, season rooms)
- [x] Implement machine status event broadcasting
- [x] Implement market shift event broadcasting
- [x] Implement competitor proximity alerts
- [x] Implement alliance chat with message validation
- [x] Implement leaderboard live updates
- [x] Create event bridge utilities for engines to broadcast updates
- [x] Create tRPC router for real-time admin/monitoring
- [x] Integrate Socket.io into Express server (_core/index.ts)
- [x] Write tests for Socket.io event logic (117 tests total, all passing)

## Cron Jobs & Scheduled Tasks
- [x] Install node-cron scheduler dependency
- [x] Build cron job scheduler with registration and health tracking
- [x] Implement daily market price fluctuation job (3 AM)
- [x] Implement season lifecycle check job (lobby → active → ended, 5 AM)
- [x] Implement machine status degradation job (every 5 min)
- [x] Implement expired inventory purge job (4 AM)
- [x] Implement marketplace listing cleanup job (every hour)
- [x] Implement complaint expiration job (every 4 hours)
- [x] Implement daily player inactivity recap job (6 AM)
- [x] Implement location data cleanup job (weekly Sunday 2 AM, 30-day purge)
- [x] Implement market event expiration job (3:30 AM)
- [x] Implement dispatch ETA check job (every 15 min)
- [x] Create tRPC admin router for cron job management
- [x] Integrate cron scheduler into Express server startup
- [x] Write tests for cron job logic (142 tests total, all passing)

## Stripe & Compliance Integration
- [x] Add Stripe feature via webdev_add_feature
- [x] Build KYC verification engine (ID + SSN validation, status tracking)
- [x] Build geo-blocking engine for 12 restricted US states
- [x] Build responsible gaming limits engine (daily/weekly/monthly caps)
- [x] Build self-exclusion engine (24h, 7d, 30d, permanent)
- [x] Build Stripe deposit flow (Checkout session creation, webhook handling)
- [x] Build Stripe withdrawal flow (pending approval workflow)
- [x] Build dual-wallet transaction management (competition vs premium)
- [x] Build GDPR data export engine (full player data download)
- [x] Build GDPR account deletion engine (anonymization + purge)
- [x] Build 1099 tax document generation for annual winnings
- [x] Create tRPC router for payment operations
- [x] Create tRPC router for compliance operations (includes GDPR)
- [x] Write tests for compliance logic (169 tests total, all passing)

## Alliance System
- [x] Review existing alliance schema tables (alliances, allianceMembers, allianceMessages)
- [x] Build alliance engine: creation with validation and limits
- [x] Build member management: invite, accept, kick, leave, promote/demote
- [x] Build role system: leader, officer, member with permissions
- [x] Build treasury management: deposits, withdrawals, contribution tracking
- [x] Build chat persistence: message storage, retrieval, pagination
- [x] Create tRPC router for all alliance operations
- [x] Write comprehensive tests for alliance logic (224 tests total, all passing)

## Power-Up & Machine Upgrade System
- [x] Review existing powerUps and machineUpgrades schema tables
- [x] Add machineUpgrades table to schema and push to DB
- [x] Build power-up catalog (12 power-ups across 5 categories: revenue, capacity, maintenance, speed, special)
- [x] Build power-up purchasing from premium wallet with tier requirements
- [x] Build power-up activation with stacking rules (maxPerMachine limits)
- [x] Build power-up duration tracking and expiration (timed, permanent, uses)
- [x] Build power-up malfunction simulation and repair system
- [x] Build machine upgrade engine with tier progression (6 upgrade types)
- [x] Build upgrade stat bonuses (capacity, speed, reliability, energy_efficiency, security, temperature_control)
- [x] Build upgrade cost scaling per tier (exponential: baseCost * multiplier^(tier-1))
- [x] Build aggregated machine stats combining power-ups and upgrades
- [x] Build player-wide power-up/upgrade summary
- [x] Create tRPC router for power-up and upgrade operations (15 procedures)
- [x] Write comprehensive tests for power-up and upgrade logic (293 tests total, all passing)

## Integration / E2E Tests
- [x] Review existing engines, routers, and test patterns for E2E planning
- [x] Write integration tests for core game flows (player lifecycle, machine operations, inventory)
- [x] Write integration tests for economy flows (dual-wallet, season entry/payout, marketplace P2P)
- [x] Write integration tests for HR/fleet dispatch, market engine, and power-up/upgrade flows
- [x] Write integration tests for compliance (KYC, geo-blocking, responsible gaming, GDPR)
- [x] Write integration tests for alliance economics (treasury contributions, member fairness)
- [x] Write integration tests for cross-system interactions (season + market + fleet + score)
- [x] Write edge case & boundary condition tests (zero stats, max stats, ELO extremes, GPS edge cases)
- [x] Run all tests and verify total count (422 tests across 13 files, all passing)
- [x] Push updated tests to GitHub

## World Map Procedural Generation System
- [x] Generate remaining sprites: city props (10 sprites: roads, streetlights, trees, benches, bus stops, claim marker, turf dome)
- [x] Generate remaining sprites: vehicles (7 sprites: HR car, van, truck, civilian cars, drones)
- [x] Generate remaining sprites: characters (11 sprites: delivery worker, mechanic, angry worker, NPCs, crowd, musician, guard)
- [x] Build seed-based procedural generation engine (deterministic from lat/lng coordinates)
- [x] Define district type system (downtown, residential, retail, industrial, transit, park)
- [x] Build building/prop placement rules per district type
- [x] Build black market alley rare spawn system (1.5% probability, 25% caught chance, $5k fine)
- [x] Build NPC density and traffic rules per district type
- [x] Build tRPC procedures for world map (10 procedures: getBlock, getViewport, getLocationSummary, getDistrictConfigs, getSupplierInfo, getVendingMachineSprites, getMachinesInArea, getMyMachines, blackMarketPurchase, analyzeLocation)
- [x] Write tests for procedural generation engine (93 tests, all passing — 516 total)
- [x] Build visual demo renderer (canvas-based isometric city block viewer with 6 layers, 10 US cities, season switching)
- [x] Upload sprite assets to CDN (59 sprites across 5 categories)
- [ ] Save checkpoint and push to GitHub
