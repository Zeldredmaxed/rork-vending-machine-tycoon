CREATE TABLE `allianceMembers` (
	`id` varchar(36) NOT NULL,
	`allianceId` varchar(36) NOT NULL,
	`playerId` int NOT NULL,
	`contribution` decimal(12,2) DEFAULT '0',
	`joinDate` timestamp DEFAULT (now()),
	`isLeader` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `allianceMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `allianceMembers_allianceId_playerId_idx` UNIQUE(`allianceId`,`playerId`)
);
--> statement-breakpoint
CREATE TABLE `alliances` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`leaderPlayerId` int NOT NULL,
	`treasuryBalance` decimal(12,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alliances_id` PRIMARY KEY(`id`),
	CONSTRAINT `alliances_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `applicants` (
	`id` varchar(36) NOT NULL,
	`playerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`wagePerRestock` decimal(8,2) NOT NULL,
	`statSpeed` int DEFAULT 50,
	`statQualityControl` int DEFAULT 50,
	`statAttendance` int DEFAULT 50,
	`statDriving` int DEFAULT 50,
	`statAdaptability` int DEFAULT 50,
	`statRepairSkill` int DEFAULT 50,
	`capacityCost` int DEFAULT 5,
	`generatedAt` timestamp DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `applicants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customerComplaints` (
	`id` varchar(36) NOT NULL,
	`machineId` varchar(36) NOT NULL,
	`playerId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`refundAmount` decimal(8,2) NOT NULL,
	`customerName` varchar(255),
	`complaintDescription` text,
	`resolution` varchar(32) DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`resolvedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customerComplaints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `disputeTickets` (
	`id` varchar(36) NOT NULL,
	`playerId` int NOT NULL,
	`category` varchar(64) NOT NULL,
	`machineId` varchar(36),
	`transactionId` varchar(36),
	`description` text NOT NULL,
	`status` varchar(32) DEFAULT 'pending',
	`submittedDate` timestamp DEFAULT (now()),
	`resolvedDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `disputeTickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` varchar(36) NOT NULL,
	`playerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`wagePerTask` decimal(8,2) NOT NULL,
	`assignedMachineId` varchar(36),
	`statSpeed` int DEFAULT 50,
	`statQualityControl` int DEFAULT 50,
	`statAttendance` int DEFAULT 50,
	`statDriving` int DEFAULT 50,
	`statAdaptability` int DEFAULT 50,
	`statRepairSkill` int DEFAULT 50,
	`status` varchar(32) DEFAULT 'idle',
	`currentTaskStartTime` timestamp,
	`estimatedArrivalTime` timestamp,
	`assignmentLockUntil` timestamp,
	`capacityCost` int DEFAULT 5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `installedPowerUps` (
	`id` varchar(36) NOT NULL,
	`machineId` varchar(36) NOT NULL,
	`powerUpId` varchar(36) NOT NULL,
	`condition_status` varchar(32) DEFAULT 'active',
	`installedDate` timestamp DEFAULT (now()),
	`expirationDate` timestamp,
	`healthPercent` double DEFAULT 100,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `installedPowerUps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kycVerifications` (
	`id` varchar(36) NOT NULL,
	`playerId` int NOT NULL,
	`status` varchar(32) DEFAULT 'notStarted',
	`documentUrl` text,
	`ssn` varchar(11),
	`submittedAt` timestamp,
	`verifiedAt` timestamp,
	`rejectedAt` timestamp,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kycVerifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `kycVerifications_playerId_unique` UNIQUE(`playerId`),
	CONSTRAINT `kycVerifications_playerId_idx` UNIQUE(`playerId`)
);
--> statement-breakpoint
CREATE TABLE `machineInventory` (
	`id` varchar(36) NOT NULL,
	`machineId` varchar(36) NOT NULL,
	`warehouseItemId` varchar(36) NOT NULL,
	`productId` varchar(36) NOT NULL,
	`quantityAllocated` int DEFAULT 0,
	`priceSet` decimal(8,2) NOT NULL,
	`expirationDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machineInventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketEvents` (
	`id` varchar(36) NOT NULL,
	`eventName` varchar(255) NOT NULL,
	`description` text,
	`priceMultiplier` double DEFAULT 1,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`affectedCategories` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`brandName` varchar(255) NOT NULL,
	`brandLogoIcon` varchar(64),
	`primaryColor` varchar(7) DEFAULT '#3B82F6',
	`secondaryColor` varchar(7) DEFAULT '#1F2937',
	`tagline` text,
	`totalRevenue` decimal(12,2) DEFAULT '0',
	`totalExpenses` decimal(12,2) DEFAULT '0',
	`netWorth` decimal(12,2) DEFAULT '0',
	`reputation` double DEFAULT 0,
	`competitionWalletBalance` decimal(12,2) DEFAULT '0',
	`premiumWalletBalance` decimal(12,2) DEFAULT '0',
	`currentBusinessTier` varchar(32) DEFAULT 'startup',
	`lifetimeElo` int DEFAULT 1200,
	`bestTycoonScore` int DEFAULT 0,
	`seasonsPlayed` int DEFAULT 0,
	`bestRank` int,
	`allTimePrizeEarnings` decimal(12,2) DEFAULT '0',
	`kycStatus` varchar(32) DEFAULT 'notStarted',
	`kycVerifiedAt` timestamp,
	`geoBlockedState` varchar(2),
	`dailySpendingLimit` decimal(8,2),
	`weeklySpendingLimit` decimal(8,2),
	`monthlySpendingLimit` decimal(8,2),
	`selfExclusionUntil` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `players_id` PRIMARY KEY(`id`),
	CONSTRAINT `players_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `players_userId_idx` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `powerUps` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(32) NOT NULL,
	`costMin` int NOT NULL,
	`costMax` int NOT NULL,
	`effectDescription` text,
	`iconName` varchar(64),
	`durabilityType` varchar(32) DEFAULT 'timed',
	`durationDays` int,
	`malfunctionChancePercent` double DEFAULT 0,
	`repairCostPercent` double DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `powerUps_id` PRIMARY KEY(`id`),
	CONSTRAINT `powerUps_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `priceHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` varchar(36) NOT NULL,
	`price` decimal(8,2) NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `priceHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productMarketPrices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` varchar(36) NOT NULL,
	`currentPrice` decimal(8,2) NOT NULL,
	`priceDirection` varchar(16) DEFAULT 'stable',
	`priceChangePercent` double DEFAULT 0,
	`lastUpdatedAt` timestamp DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productMarketPrices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(32) NOT NULL,
	`baseCost` decimal(8,2) NOT NULL,
	`expirationDays` int DEFAULT 5,
	`iconName` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `restockDispatches` (
	`id` varchar(36) NOT NULL,
	`machineId` varchar(36) NOT NULL,
	`employeeId` varchar(36) NOT NULL,
	`employeeName` varchar(255) NOT NULL,
	`status` varchar(32) DEFAULT 'pending',
	`dispatchTime` timestamp DEFAULT (now()),
	`estimatedArrival` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `restockDispatches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seasonBrackets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonId` int NOT NULL,
	`playerId` int NOT NULL,
	`entryFeeAmount` decimal(8,2) NOT NULL,
	`bracketTier` varchar(64) DEFAULT 'standard',
	`startingCapital` decimal(12,2) DEFAULT '10000',
	`finalRank` int,
	`tycoonScore` int,
	`eloChange` int,
	`payoutAmount` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seasonBrackets_id` PRIMARY KEY(`id`),
	CONSTRAINT `seasonBrackets_seasonId_playerId_idx` UNIQUE(`seasonId`,`playerId`)
);
--> statement-breakpoint
CREATE TABLE `seasonLeaderboard` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonId` int NOT NULL,
	`playerId` int NOT NULL,
	`rank` int NOT NULL,
	`totalRevenue` decimal(12,2) DEFAULT '0',
	`netWorth` decimal(12,2) DEFAULT '0',
	`reputation` double DEFAULT 0,
	`tycoonScore` int DEFAULT 0,
	`eloRating` int DEFAULT 1200,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seasonLeaderboard_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonNumber` int NOT NULL,
	`state` varchar(32) DEFAULT 'preseason',
	`entryFee` decimal(8,2) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`totalPlayers` int DEFAULT 0,
	`prizePool` decimal(12,2) DEFAULT '0',
	`houseRake` decimal(12,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seasons_id` PRIMARY KEY(`id`),
	CONSTRAINT `seasons_seasonNumber_unique` UNIQUE(`seasonNumber`),
	CONSTRAINT `seasons_seasonNumber_idx` UNIQUE(`seasonNumber`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` varchar(36) NOT NULL,
	`playerId` int NOT NULL,
	`type` varchar(32) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`description` text,
	`walletType` varchar(32) NOT NULL,
	`relatedEntityId` varchar(36),
	`relatedEntityType` varchar(64),
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`),
	CONSTRAINT `users_openId_idx` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `vendingMachines` (
	`id` varchar(36) NOT NULL,
	`playerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`latitude` double NOT NULL,
	`longitude` double NOT NULL,
	`status` varchar(32) DEFAULT 'healthy',
	`dailyRevenue` decimal(10,2) DEFAULT '0',
	`totalRevenue` decimal(12,2) DEFAULT '0',
	`reputation` double DEFAULT 0,
	`turfRadius` double DEFAULT 0.5,
	`footTraffic` int DEFAULT 0,
	`customSkinName` varchar(255),
	`maintenanceLevel` double DEFAULT 100,
	`basePurchaseCost` decimal(8,2) DEFAULT '500',
	`demographicProfile` varchar(32) DEFAULT 'downtownBusiness',
	`restockState` varchar(32) DEFAULT 'idle',
	`capacity` int DEFAULT 100,
	`usedCapacity` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendingMachines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warehouseInventory` (
	`id` varchar(36) NOT NULL,
	`playerId` int NOT NULL,
	`productId` varchar(36) NOT NULL,
	`quantity` int DEFAULT 0,
	`purchasePrice` decimal(8,2) NOT NULL,
	`expirationDate` timestamp NOT NULL,
	`isExtraFresh` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `warehouseInventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `allianceMembers_allianceId_idx` ON `allianceMembers` (`allianceId`);--> statement-breakpoint
CREATE INDEX `allianceMembers_playerId_idx` ON `allianceMembers` (`playerId`);--> statement-breakpoint
CREATE INDEX `alliances_leaderPlayerId_idx` ON `alliances` (`leaderPlayerId`);--> statement-breakpoint
CREATE INDEX `applicants_playerId_idx` ON `applicants` (`playerId`);--> statement-breakpoint
CREATE INDEX `customerComplaints_machineId_idx` ON `customerComplaints` (`machineId`);--> statement-breakpoint
CREATE INDEX `customerComplaints_playerId_idx` ON `customerComplaints` (`playerId`);--> statement-breakpoint
CREATE INDEX `customerComplaints_resolution_idx` ON `customerComplaints` (`resolution`);--> statement-breakpoint
CREATE INDEX `disputeTickets_playerId_idx` ON `disputeTickets` (`playerId`);--> statement-breakpoint
CREATE INDEX `disputeTickets_status_idx` ON `disputeTickets` (`status`);--> statement-breakpoint
CREATE INDEX `employees_playerId_idx` ON `employees` (`playerId`);--> statement-breakpoint
CREATE INDEX `employees_assignedMachineId_idx` ON `employees` (`assignedMachineId`);--> statement-breakpoint
CREATE INDEX `installedPowerUps_machineId_idx` ON `installedPowerUps` (`machineId`);--> statement-breakpoint
CREATE INDEX `installedPowerUps_powerUpId_idx` ON `installedPowerUps` (`powerUpId`);--> statement-breakpoint
CREATE INDEX `machineInventory_machineId_idx` ON `machineInventory` (`machineId`);--> statement-breakpoint
CREATE INDEX `machineInventory_productId_idx` ON `machineInventory` (`productId`);--> statement-breakpoint
CREATE INDEX `marketEvents_startDate_idx` ON `marketEvents` (`startDate`);--> statement-breakpoint
CREATE INDEX `players_brandName_idx` ON `players` (`brandName`);--> statement-breakpoint
CREATE INDEX `powerUps_category_idx` ON `powerUps` (`category`);--> statement-breakpoint
CREATE INDEX `priceHistory_productId_idx` ON `priceHistory` (`productId`);--> statement-breakpoint
CREATE INDEX `priceHistory_timestamp_idx` ON `priceHistory` (`timestamp`);--> statement-breakpoint
CREATE INDEX `productMarketPrices_productId_idx` ON `productMarketPrices` (`productId`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category`);--> statement-breakpoint
CREATE INDEX `restockDispatches_machineId_idx` ON `restockDispatches` (`machineId`);--> statement-breakpoint
CREATE INDEX `restockDispatches_employeeId_idx` ON `restockDispatches` (`employeeId`);--> statement-breakpoint
CREATE INDEX `seasonBrackets_seasonId_idx` ON `seasonBrackets` (`seasonId`);--> statement-breakpoint
CREATE INDEX `seasonBrackets_playerId_idx` ON `seasonBrackets` (`playerId`);--> statement-breakpoint
CREATE INDEX `seasonLeaderboard_seasonId_idx` ON `seasonLeaderboard` (`seasonId`);--> statement-breakpoint
CREATE INDEX `seasonLeaderboard_playerId_idx` ON `seasonLeaderboard` (`playerId`);--> statement-breakpoint
CREATE INDEX `seasonLeaderboard_rank_idx` ON `seasonLeaderboard` (`rank`);--> statement-breakpoint
CREATE INDEX `seasons_state_idx` ON `seasons` (`state`);--> statement-breakpoint
CREATE INDEX `transactions_playerId_idx` ON `transactions` (`playerId`);--> statement-breakpoint
CREATE INDEX `transactions_type_idx` ON `transactions` (`type`);--> statement-breakpoint
CREATE INDEX `transactions_timestamp_idx` ON `transactions` (`timestamp`);--> statement-breakpoint
CREATE INDEX `vendingMachines_playerId_idx` ON `vendingMachines` (`playerId`);--> statement-breakpoint
CREATE INDEX `vendingMachines_coords_idx` ON `vendingMachines` (`latitude`,`longitude`);--> statement-breakpoint
CREATE INDEX `warehouseInventory_playerId_idx` ON `warehouseInventory` (`playerId`);--> statement-breakpoint
CREATE INDEX `warehouseInventory_productId_idx` ON `warehouseInventory` (`productId`);