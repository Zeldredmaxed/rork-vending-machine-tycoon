CREATE TABLE `machineUpgrades` (
	`id` varchar(36) NOT NULL,
	`machineId` varchar(36) NOT NULL,
	`playerId` int NOT NULL,
	`upgradeType` varchar(64) NOT NULL,
	`currentTier` int NOT NULL DEFAULT 0,
	`maxTier` int NOT NULL DEFAULT 5,
	`statBonus` double NOT NULL DEFAULT 0,
	`totalInvested` decimal(10,2) NOT NULL DEFAULT '0',
	`lastUpgradedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machineUpgrades_id` PRIMARY KEY(`id`),
	CONSTRAINT `machineUpgrades_machine_type_idx` UNIQUE(`machineId`,`upgradeType`)
);
--> statement-breakpoint
CREATE INDEX `machineUpgrades_machineId_idx` ON `machineUpgrades` (`machineId`);--> statement-breakpoint
CREATE INDEX `machineUpgrades_playerId_idx` ON `machineUpgrades` (`playerId`);--> statement-breakpoint
CREATE INDEX `machineUpgrades_upgradeType_idx` ON `machineUpgrades` (`upgradeType`);