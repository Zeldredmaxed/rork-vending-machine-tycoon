import {
  boolean,
  decimal,
  double,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

// ============================================================================
// AUTHENTICATION & USERS
// ============================================================================

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  (table) => ({
    openIdIdx: uniqueIndex("users_openId_idx").on(table.openId),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// PLAYER PROFILES & PROGRESSION
// ============================================================================

export const players = mysqlTable(
  "players",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    brandName: varchar("brandName", { length: 255 }).notNull(),
    brandLogoIcon: varchar("brandLogoIcon", { length: 64 }),
    primaryColor: varchar("primaryColor", { length: 7 }).default("#3B82F6"),
    secondaryColor: varchar("secondaryColor", { length: 7 }).default("#1F2937"),
    tagline: text("tagline"),
    totalRevenue: decimal("totalRevenue", { precision: 12, scale: 2 }).default("0"),
    totalExpenses: decimal("totalExpenses", { precision: 12, scale: 2 }).default("0"),
    netWorth: decimal("netWorth", { precision: 12, scale: 2 }).default("0"),
    reputation: double("reputation").default(0),
    competitionWalletBalance: decimal("competitionWalletBalance", {
      precision: 12,
      scale: 2,
    }).default("0"),
    premiumWalletBalance: decimal("premiumWalletBalance", {
      precision: 12,
      scale: 2,
    }).default("0"),
    currentBusinessTier: varchar("currentBusinessTier", { length: 32 }).default("startup"),
    lifetimeElo: int("lifetimeElo").default(1200),
    bestTycoonScore: int("bestTycoonScore").default(0),
    seasonsPlayed: int("seasonsPlayed").default(0),
    bestRank: int("bestRank"),
    allTimePrizeEarnings: decimal("allTimePrizeEarnings", {
      precision: 12,
      scale: 2,
    }).default("0"),
    kycStatus: varchar("kycStatus", { length: 32 }).default("notStarted"),
    kycVerifiedAt: timestamp("kycVerifiedAt"),
    geoBlockedState: varchar("geoBlockedState", { length: 2 }),
    dailySpendingLimit: decimal("dailySpendingLimit", { precision: 8, scale: 2 }),
    weeklySpendingLimit: decimal("weeklySpendingLimit", { precision: 8, scale: 2 }),
    monthlySpendingLimit: decimal("monthlySpendingLimit", { precision: 8, scale: 2 }),
    selfExclusionUntil: timestamp("selfExclusionUntil"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: uniqueIndex("players_userId_idx").on(table.userId),
    brandNameIdx: index("players_brandName_idx").on(table.brandName),
  })
);

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

// ============================================================================
// VENDING MACHINES
// ============================================================================

export const vendingMachines = mysqlTable(
  "vendingMachines",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    playerId: int("playerId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    latitude: double("latitude").notNull(),
    longitude: double("longitude").notNull(),
    status: varchar("status", { length: 32 }).default("healthy"),
    dailyRevenue: decimal("dailyRevenue", { precision: 10, scale: 2 }).default("0"),
    totalRevenue: decimal("totalRevenue", { precision: 12, scale: 2 }).default("0"),
    reputation: double("reputation").default(0),
    turfRadius: double("turfRadius").default(0.5),
    footTraffic: int("footTraffic").default(0),
    customSkinName: varchar("customSkinName", { length: 255 }),
    maintenanceLevel: double("maintenanceLevel").default(100),
    basePurchaseCost: decimal("basePurchaseCost", { precision: 8, scale: 2 }).default("500"),
    demographicProfile: varchar("demographicProfile", { length: 32 }).default("downtownBusiness"),
    restockState: varchar("restockState", { length: 32 }).default("idle"),
    capacity: int("capacity").default(100),
    usedCapacity: int("usedCapacity").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    playerIdIdx: index("vendingMachines_playerId_idx").on(table.playerId),
    coordIdx: index("vendingMachines_coords_idx").on(table.latitude, table.longitude),
  })
);

export type VendingMachine = typeof vendingMachines.$inferSelect;
export type InsertVendingMachine = typeof vendingMachines.$inferInsert;

// ============================================================================
// PRODUCTS & MARKET
// ============================================================================

export const products = mysqlTable(
  "products",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    category: varchar("category", { length: 32 }).notNull(),
    baseCost: decimal("baseCost", { precision: 8, scale: 2 }).notNull(),
    expirationDays: int("expirationDays").default(5),
    iconName: varchar("iconName", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    categoryIdx: index("products_category_idx").on(table.category),
  })
);

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export const productMarketPrices = mysqlTable(
  "productMarketPrices",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: varchar("productId", { length: 36 }).notNull(),
    currentPrice: decimal("currentPrice", { precision: 8, scale: 2 }).notNull(),
    priceDirection: varchar("priceDirection", { length: 16 }).default("stable"),
    priceChangePercent: double("priceChangePercent").default(0),
    lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    productIdIdx: index("productMarketPrices_productId_idx").on(table.productId),
  })
);

export type ProductMarketPrice = typeof productMarketPrices.$inferSelect;
export type InsertProductMarketPrice = typeof productMarketPrices.$inferInsert;

export const warehouseInventory = mysqlTable(
  "warehouseInventory",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    playerId: int("playerId").notNull(),
    productId: varchar("productId", { length: 36 }).notNull(),
    quantity: int("quantity").default(0),
    purchasePrice: decimal("purchasePrice", { precision: 8, scale: 2 }).notNull(),
    expirationDate: timestamp("expirationDate").notNull(),
    isExtraFresh: boolean("isExtraFresh").default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    playerIdIdx: index("warehouseInventory_playerId_idx").on(table.playerId),
    productIdIdx: index("warehouseInventory_productId_idx").on(table.productId),
  })
);

export type WarehouseInventory = typeof warehouseInventory.$inferSelect;
export type InsertWarehouseInventory = typeof warehouseInventory.$inferInsert;

export const machineInventory = mysqlTable(
  "machineInventory",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    machineId: varchar("machineId", { length: 36 }).notNull(),
    warehouseItemId: varchar("warehouseItemId", { length: 36 }).notNull(),
    productId: varchar("productId", { length: 36 }).notNull(),
    quantityAllocated: int("quantityAllocated").default(0),
    priceSet: decimal("priceSet", { precision: 8, scale: 2 }).notNull(),
    expirationDate: timestamp("expirationDate").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    machineIdIdx: index("machineInventory_machineId_idx").on(table.machineId),
    productIdIdx: index("machineInventory_productId_idx").on(table.productId),
  })
);

export type MachineInventory = typeof machineInventory.$inferSelect;
export type InsertMachineInventory = typeof machineInventory.$inferInsert;

// ============================================================================
// EMPLOYEES & HR
// ============================================================================

export const employees = mysqlTable(
  "employees",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    playerId: int("playerId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    wagePerTask: decimal("wagePerTask", { precision: 8, scale: 2 }).notNull(),
    assignedMachineId: varchar("assignedMachineId", { length: 36 }),
    statSpeed: int("statSpeed").default(50),
    statQualityControl: int("statQualityControl").default(50),
    statAttendance: int("statAttendance").default(50),
    statDriving: int("statDriving").default(50),
    statAdaptability: int("statAdaptability").default(50),
    statRepairSkill: int("statRepairSkill").default(50),
    status: varchar("status", { length: 32 }).default("idle"),
    currentTaskStartTime: timestamp("currentTaskStartTime"),
    estimatedArrivalTime: timestamp("estimatedArrivalTime"),
    assignmentLockUntil: timestamp("assignmentLockUntil"),
    capacityCost: int("capacityCost").default(5),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    playerIdIdx: index("employees_playerId_idx").on(table.playerId),
    assignedMachineIdx: index("employees_assignedMachineId_idx").on(table.assignedMachineId),
  })
);

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

export const applicants = mysqlTable(
  "applicants",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    playerId: int("playerId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    wagePerRestock: decimal("wagePerRestock", { precision: 8, scale: 2 }).notNull(),
    statSpeed: int("statSpeed").default(50),
    statQualityControl: int("statQualityControl").default(50),
    statAttendance: int("statAttendance").default(50),
    statDriving: int("statDriving").default(50),
    statAdaptability: int("statAdaptability").default(50),
    statRepairSkill: int("statRepairSkill").default(50),
    capacityCost: int("capacityCost").default(5),
    generatedAt: timestamp("generatedAt").defaultNow(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    playerIdIdx: index("applicants_playerId_idx").on(table.playerId),
  })
);

export type Applicant = typeof applicants.$inferSelect;
export type InsertApplicant = typeof applicants.$inferInsert;

export const restockDispatches = mysqlTable(
  "restockDispatches",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    machineId: varchar("machineId", { length: 36 }).notNull(),
    employeeId: varchar("employeeId", { length: 36 }).notNull(),
    employeeName: varchar("employeeName", { length: 255 }).notNull(),
    status: varchar("status", { length: 32 }).default("pending"),
    dispatchTime: timestamp("dispatchTime").defaultNow(),
    estimatedArrival: timestamp("estimatedArrival").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    machineIdIdx: index("restockDispatches_machineId_idx").on(table.machineId),
    employeeIdIdx: index("restockDispatches_employeeId_idx").on(table.employeeId),
  })
);

export type RestockDispatch = typeof restockDispatches.$inferSelect;
export type InsertRestockDispatch = typeof restockDispatches.$inferInsert;

// ============================================================================
// SEASONS & MATCHMAKING
// ============================================================================

export const seasons = mysqlTable(
  "seasons",
  {
    id: int("id").autoincrement().primaryKey(),
    seasonNumber: int("seasonNumber").notNull().unique(),
    state: varchar("state", { length: 32 }).default("preseason"),
    entryFee: decimal("entryFee", { precision: 8, scale: 2 }).notNull(),
    startDate: timestamp("startDate").notNull(),
    endDate: timestamp("endDate"),
    totalPlayers: int("totalPlayers").default(0),
    prizePool: decimal("prizePool", { precision: 12, scale: 2 }).default("0"),
    houseRake: decimal("houseRake", { precision: 12, scale: 2 }).default("0"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    seasonNumberIdx: uniqueIndex("seasons_seasonNumber_idx").on(table.seasonNumber),
    stateIdx: index("seasons_state_idx").on(table.state),
  })
);

export type Season = typeof seasons.$inferSelect;
export type InsertSeason = typeof seasons.$inferInsert;

export const seasonBrackets = mysqlTable(
  "seasonBrackets",
  {
    id: int("id").autoincrement().primaryKey(),
    seasonId: int("seasonId").notNull(),
    playerId: int("playerId").notNull(),
    entryFeeAmount: decimal("entryFeeAmount", { precision: 8, scale: 2 }).notNull(),
    bracketTier: varchar("bracketTier", { length: 64 }).default("standard"),
    startingCapital: decimal("startingCapital", { precision: 12, scale: 2 }).default("10000"),
    finalRank: int("finalRank"),
    tycoonScore: int("tycoonScore"),
    eloChange: int("eloChange"),
    payoutAmount: decimal("payoutAmount", { precision: 12, scale: 2 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    seasonIdIdx: index("seasonBrackets_seasonId_idx").on(table.seasonId),
    playerIdIdx: index("seasonBrackets_playerId_idx").on(table.playerId),
    uniqueSeasonPlayer: uniqueIndex("seasonBrackets_seasonId_playerId_idx").on(
      table.seasonId,
      table.playerId
    ),
  })
);

export type SeasonBracket = typeof seasonBrackets.$inferSelect;
export type InsertSeasonBracket = typeof seasonBrackets.$inferInsert;

export const seasonLeaderboard = mysqlTable(
  "seasonLeaderboard",
  {
    id: int("id").autoincrement().primaryKey(),
    seasonId: int("seasonId").notNull(),
    playerId: int("playerId").notNull(),
    rank: int("rank").notNull(),
    totalRevenue: decimal("totalRevenue", { precision: 12, scale: 2 }).default("0"),
    netWorth: decimal("netWorth", { precision: 12, scale: 2 }).default("0"),
    reputation: double("reputation").default(0),
    tycoonScore: int("tycoonScore").default(0),
    eloRating: int("eloRating").default(1200),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    seasonIdIdx: index("seasonLeaderboard_seasonId_idx").on(table.seasonId),
    playerIdIdx: index("seasonLeaderboard_playerId_idx").on(table.playerId),
    rankIdx: index("seasonLeaderboard_rank_idx").on(table.rank),
  })
);

export type SeasonLeaderboard = typeof seasonLeaderboard.$inferSelect;
export type InsertSeasonLeaderboard = typeof seasonLeaderboard.$inferInsert;

// ============================================================================
// TRANSACTIONS & WALLETS
// ============================================================================

export const transactions = mysqlTable(
  "transactions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    playerId: int("playerId").notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    description: text("description"),
    walletType: varchar("walletType", { length: 32 }).notNull(),
    relatedEntityId: varchar("relatedEntityId", { length: 36 }),
    relatedEntityType: varchar("relatedEntityType", { length: 64 }),
    status: varchar("status", { length: 32 }).default("completed"),
    stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    playerIdIdx: index("transactions_playerId_idx").on(table.playerId),
    typeIdx: index("transactions_type_idx").on(table.type),
    timestampIdx: index("transactions_timestamp_idx").on(table.timestamp),
  })
);

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ============================================================================
// ALLIANCES
// ============================================================================

export const alliances = mysqlTable(
  "alliances",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    leaderPlayerId: int("leaderPlayerId").notNull(),
    treasuryBalance: decimal("treasuryBalance", { precision: 12, scale: 2 }).default("0"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    leaderPlayerIdIdx: index("alliances_leaderPlayerId_idx").on(table.leaderPlayerId),
  })
);

export type Alliance = typeof alliances.$inferSelect;
export type InsertAlliance = typeof alliances.$inferInsert;

export const allianceMembers = mysqlTable(
  "allianceMembers",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    allianceId: varchar("allianceId", { length: 36 }).notNull(),
    playerId: int("playerId").notNull(),
    role: varchar("role", { length: 32 }).default("member").notNull(), // leader, officer, member
    contribution: decimal("contribution", { precision: 12, scale: 2 }).default("0"),
    joinDate: timestamp("joinDate").defaultNow(),
    isLeader: boolean("isLeader").default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    allianceIdIdx: index("allianceMembers_allianceId_idx").on(table.allianceId),
    playerIdIdx: index("allianceMembers_playerId_idx").on(table.playerId),
    roleIdx: index("allianceMembers_role_idx").on(table.role),
    uniqueAlliancePlayer: uniqueIndex("allianceMembers_allianceId_playerId_idx").on(
      table.allianceId,
      table.playerId
    ),
  })
);

export type AllianceMember = typeof allianceMembers.$inferSelect;
export type InsertAllianceMember = typeof allianceMembers.$inferInsert;

export const allianceMessages = mysqlTable(
  "allianceMessages",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    allianceId: varchar("allianceId", { length: 36 }).notNull(),
    senderId: int("senderId").notNull(),
    senderName: varchar("senderName", { length: 255 }).notNull(),
    senderRole: varchar("senderRole", { length: 32 }).default("member"),
    content: text("content").notNull(),
    messageType: varchar("messageType", { length: 32 }).default("chat"), // chat, system, announcement
    isDeleted: boolean("isDeleted").default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    allianceIdIdx: index("allianceMessages_allianceId_idx").on(table.allianceId),
    senderIdIdx: index("allianceMessages_senderId_idx").on(table.senderId),
    createdAtIdx: index("allianceMessages_createdAt_idx").on(table.createdAt),
  })
);

export type AllianceMessage = typeof allianceMessages.$inferSelect;
export type InsertAllianceMessage = typeof allianceMessages.$inferInsert;

export const allianceInvites = mysqlTable(
  "allianceInvites",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    allianceId: varchar("allianceId", { length: 36 }).notNull(),
    inviterId: int("inviterId").notNull(),
    inviteeId: int("inviteeId").notNull(),
    status: varchar("status", { length: 32 }).default("pending"), // pending, accepted, declined, expired
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    allianceIdIdx: index("allianceInvites_allianceId_idx").on(table.allianceId),
    inviteeIdIdx: index("allianceInvites_inviteeId_idx").on(table.inviteeId),
    statusIdx: index("allianceInvites_status_idx").on(table.status),
  })
);

export type AllianceInvite = typeof allianceInvites.$inferSelect;
export type InsertAllianceInvite = typeof allianceInvites.$inferInsert;

export const treasuryTransactions = mysqlTable(
  "treasuryTransactions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    allianceId: varchar("allianceId", { length: 36 }).notNull(),
    playerId: int("playerId").notNull(),
    playerName: varchar("playerName", { length: 255 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(), // deposit, withdrawal, payout
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    balanceAfter: decimal("balanceAfter", { precision: 12, scale: 2 }).notNull(),
    reason: varchar("reason", { length: 512 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    allianceIdIdx: index("treasuryTransactions_allianceId_idx").on(table.allianceId),
    playerIdIdx: index("treasuryTransactions_playerId_idx").on(table.playerId),
    typeIdx: index("treasuryTransactions_type_idx").on(table.type),
    createdAtIdx: index("treasuryTransactions_createdAt_idx").on(table.createdAt),
  })
);

export type TreasuryTransaction = typeof treasuryTransactions.$inferSelect;
export type InsertTreasuryTransaction = typeof treasuryTransactions.$inferInsert;

// ============================================================================
// COMPLIANCE & DISPUTES
// ============================================================================

export const customerComplaints = mysqlTable(
  "customerComplaints",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    machineId: varchar("machineId", { length: 36 }).notNull(),
    playerId: int("playerId").notNull(),
    productName: varchar("productName", { length: 255 }).notNull(),
    refundAmount: decimal("refundAmount", { precision: 8, scale: 2 }).notNull(),
    customerName: varchar("customerName", { length: 255 }),
    complaintDescription: text("complaintDescription"),
    resolution: varchar("resolution", { length: 32 }).default("pending"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    resolvedAt: timestamp("resolvedAt"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    machineIdIdx: index("customerComplaints_machineId_idx").on(table.machineId),
    playerIdIdx: index("customerComplaints_playerId_idx").on(table.playerId),
    resolutionIdx: index("customerComplaints_resolution_idx").on(table.resolution),
  })
);

export type CustomerComplaint = typeof customerComplaints.$inferSelect;
export type InsertCustomerComplaint = typeof customerComplaints.$inferInsert;

export const disputeTickets = mysqlTable(
  "disputeTickets",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    playerId: int("playerId").notNull(),
    category: varchar("category", { length: 64 }).notNull(),
    machineId: varchar("machineId", { length: 36 }),
    transactionId: varchar("transactionId", { length: 36 }),
    description: text("description").notNull(),
    status: varchar("status", { length: 32 }).default("pending"),
    submittedDate: timestamp("submittedDate").defaultNow(),
    resolvedDate: timestamp("resolvedDate"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    playerIdIdx: index("disputeTickets_playerId_idx").on(table.playerId),
    statusIdx: index("disputeTickets_status_idx").on(table.status),
  })
);

export type DisputeTicket = typeof disputeTickets.$inferSelect;
export type InsertDisputeTicket = typeof disputeTickets.$inferInsert;

export const kycVerifications = mysqlTable(
  "kycVerifications",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    playerId: int("playerId").notNull().unique(),
    status: varchar("status", { length: 32 }).default("notStarted"),
    documentUrl: text("documentUrl"),
    ssn: varchar("ssn", { length: 11 }),
    submittedAt: timestamp("submittedAt"),
    verifiedAt: timestamp("verifiedAt"),
    rejectedAt: timestamp("rejectedAt"),
    rejectionReason: text("rejectionReason"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    playerIdIdx: uniqueIndex("kycVerifications_playerId_idx").on(table.playerId),
  })
);

export type KycVerification = typeof kycVerifications.$inferSelect;
export type InsertKycVerification = typeof kycVerifications.$inferInsert;

// ============================================================================
// POWER-UPS & UPGRADES
// ============================================================================

export const powerUps = mysqlTable(
  "powerUps",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    description: text("description"),
    category: varchar("category", { length: 32 }).notNull(),
    costMin: int("costMin").notNull(),
    costMax: int("costMax").notNull(),
    effectDescription: text("effectDescription"),
    iconName: varchar("iconName", { length: 64 }),
    durabilityType: varchar("durabilityType", { length: 32 }).default("timed"),
    durationDays: int("durationDays"),
    malfunctionChancePercent: double("malfunctionChancePercent").default(0),
    repairCostPercent: double("repairCostPercent").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    categoryIdx: index("powerUps_category_idx").on(table.category),
  })
);

export type PowerUp = typeof powerUps.$inferSelect;
export type InsertPowerUp = typeof powerUps.$inferInsert;

export const installedPowerUps = mysqlTable(
  "installedPowerUps",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    machineId: varchar("machineId", { length: 36 }).notNull(),
    powerUpId: varchar("powerUpId", { length: 36 }).notNull(),
    condition: varchar("condition_status", { length: 32 }).default("active"),
    installedDate: timestamp("installedDate").defaultNow(),
    expirationDate: timestamp("expirationDate"),
    healthPercent: double("healthPercent").default(100),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    machineIdIdx: index("installedPowerUps_machineId_idx").on(table.machineId),
    powerUpIdIdx: index("installedPowerUps_powerUpId_idx").on(table.powerUpId),
  })
);

export type InstalledPowerUp = typeof installedPowerUps.$inferSelect;
export type InsertInstalledPowerUp = typeof installedPowerUps.$inferInsert;

export const machineUpgrades = mysqlTable(
  "machineUpgrades",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    machineId: varchar("machineId", { length: 36 }).notNull(),
    playerId: int("playerId").notNull(),
    upgradeType: varchar("upgradeType", { length: 64 }).notNull(), // capacity, speed, reliability, energy_efficiency, security, temperature_control
    currentTier: int("currentTier").default(0).notNull(),
    maxTier: int("maxTier").default(5).notNull(),
    statBonus: double("statBonus").default(0).notNull(), // percentage bonus at current tier
    totalInvested: decimal("totalInvested", { precision: 10, scale: 2 }).default("0").notNull(),
    lastUpgradedAt: timestamp("lastUpgradedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    machineIdIdx: index("machineUpgrades_machineId_idx").on(table.machineId),
    playerIdIdx: index("machineUpgrades_playerId_idx").on(table.playerId),
    upgradeTypeIdx: index("machineUpgrades_upgradeType_idx").on(table.upgradeType),
    machineTypeUnique: uniqueIndex("machineUpgrades_machine_type_idx").on(table.machineId, table.upgradeType),
  })
);

export type MachineUpgrade = typeof machineUpgrades.$inferSelect;
export type InsertMachineUpgrade = typeof machineUpgrades.$inferInsert;

// ============================================================================
// PLAYER MARKETPLACE (P2P Trading)
// ============================================================================

export const marketplaceListings = mysqlTable(
  "marketplaceListings",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    sellerId: int("sellerId").notNull(),
    sellerBrandName: varchar("sellerBrandName", { length: 255 }).notNull(),
    productId: varchar("productId", { length: 36 }).notNull(),
    warehouseItemId: varchar("warehouseItemId", { length: 36 }).notNull(),
    quantity: int("quantity").notNull(),
    pricePerUnit: decimal("pricePerUnit", { precision: 8, scale: 2 }).notNull(),
    originalCostPerUnit: decimal("originalCostPerUnit", { precision: 8, scale: 2 }).notNull(),
    status: varchar("status", { length: 32 }).default("active"),
    expirationDate: timestamp("expirationDate"),
    isExtraFresh: boolean("isExtraFresh").default(false),
    listedAt: timestamp("listedAt").defaultNow().notNull(),
    soldAt: timestamp("soldAt"),
    cancelledAt: timestamp("cancelledAt"),
    buyerId: int("buyerId"),
    buyerBrandName: varchar("buyerBrandName", { length: 255 }),
    platformFee: decimal("platformFee", { precision: 8, scale: 2 }).default("0"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    sellerIdIdx: index("marketplaceListings_sellerId_idx").on(table.sellerId),
    buyerIdIdx: index("marketplaceListings_buyerId_idx").on(table.buyerId),
    productIdIdx: index("marketplaceListings_productId_idx").on(table.productId),
    statusIdx: index("marketplaceListings_status_idx").on(table.status),
    priceIdx: index("marketplaceListings_price_idx").on(table.pricePerUnit),
  })
);

export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type InsertMarketplaceListing = typeof marketplaceListings.$inferInsert;

export const marketplaceTrades = mysqlTable(
  "marketplaceTrades",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    listingId: varchar("listingId", { length: 36 }).notNull(),
    sellerId: int("sellerId").notNull(),
    buyerId: int("buyerId").notNull(),
    productId: varchar("productId", { length: 36 }).notNull(),
    quantity: int("quantity").notNull(),
    pricePerUnit: decimal("pricePerUnit", { precision: 8, scale: 2 }).notNull(),
    totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
    platformFee: decimal("platformFee", { precision: 8, scale: 2 }).notNull(),
    sellerProceeds: decimal("sellerProceeds", { precision: 10, scale: 2 }).notNull(),
    sellerProfit: decimal("sellerProfit", { precision: 10, scale: 2 }).notNull(),
    completedAt: timestamp("completedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    sellerIdIdx: index("marketplaceTrades_sellerId_idx").on(table.sellerId),
    buyerIdIdx: index("marketplaceTrades_buyerId_idx").on(table.buyerId),
    listingIdIdx: index("marketplaceTrades_listingId_idx").on(table.listingId),
    completedAtIdx: index("marketplaceTrades_completedAt_idx").on(table.completedAt),
  })
);

export type MarketplaceTrade = typeof marketplaceTrades.$inferSelect;
export type InsertMarketplaceTrade = typeof marketplaceTrades.$inferInsert;

// ============================================================================
// MARKET EVENTS & PRICE HISTORY
// ============================================================================

export const marketEvents = mysqlTable(
  "marketEvents",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    eventName: varchar("eventName", { length: 255 }).notNull(),
    description: text("description"),
    priceMultiplier: double("priceMultiplier").default(1),
    startDate: timestamp("startDate").notNull(),
    endDate: timestamp("endDate"),
    affectedCategories: text("affectedCategories"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    startDateIdx: index("marketEvents_startDate_idx").on(table.startDate),
  })
);

export type MarketEvent = typeof marketEvents.$inferSelect;
export type InsertMarketEvent = typeof marketEvents.$inferInsert;

export const priceHistory = mysqlTable(
  "priceHistory",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: varchar("productId", { length: 36 }).notNull(),
    price: decimal("price", { precision: 8, scale: 2 }).notNull(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    productIdIdx: index("priceHistory_productId_idx").on(table.productId),
    timestampIdx: index("priceHistory_timestamp_idx").on(table.timestamp),
  })
);

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;
