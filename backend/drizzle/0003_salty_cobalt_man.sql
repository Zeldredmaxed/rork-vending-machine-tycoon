CREATE TABLE `allianceInvites` (
	`id` varchar(36) NOT NULL,
	`allianceId` varchar(36) NOT NULL,
	`inviterId` int NOT NULL,
	`inviteeId` int NOT NULL,
	`status` varchar(32) DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `allianceInvites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `allianceMessages` (
	`id` varchar(36) NOT NULL,
	`allianceId` varchar(36) NOT NULL,
	`senderId` int NOT NULL,
	`senderName` varchar(255) NOT NULL,
	`senderRole` varchar(32) DEFAULT 'member',
	`content` text NOT NULL,
	`messageType` varchar(32) DEFAULT 'chat',
	`isDeleted` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `allianceMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `treasuryTransactions` (
	`id` varchar(36) NOT NULL,
	`allianceId` varchar(36) NOT NULL,
	`playerId` int NOT NULL,
	`playerName` varchar(255) NOT NULL,
	`type` varchar(32) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`balanceAfter` decimal(12,2) NOT NULL,
	`reason` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `treasuryTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `allianceMembers` ADD `role` varchar(32) DEFAULT 'member' NOT NULL;--> statement-breakpoint
CREATE INDEX `allianceInvites_allianceId_idx` ON `allianceInvites` (`allianceId`);--> statement-breakpoint
CREATE INDEX `allianceInvites_inviteeId_idx` ON `allianceInvites` (`inviteeId`);--> statement-breakpoint
CREATE INDEX `allianceInvites_status_idx` ON `allianceInvites` (`status`);--> statement-breakpoint
CREATE INDEX `allianceMessages_allianceId_idx` ON `allianceMessages` (`allianceId`);--> statement-breakpoint
CREATE INDEX `allianceMessages_senderId_idx` ON `allianceMessages` (`senderId`);--> statement-breakpoint
CREATE INDEX `allianceMessages_createdAt_idx` ON `allianceMessages` (`createdAt`);--> statement-breakpoint
CREATE INDEX `treasuryTransactions_allianceId_idx` ON `treasuryTransactions` (`allianceId`);--> statement-breakpoint
CREATE INDEX `treasuryTransactions_playerId_idx` ON `treasuryTransactions` (`playerId`);--> statement-breakpoint
CREATE INDEX `treasuryTransactions_type_idx` ON `treasuryTransactions` (`type`);--> statement-breakpoint
CREATE INDEX `treasuryTransactions_createdAt_idx` ON `treasuryTransactions` (`createdAt`);--> statement-breakpoint
CREATE INDEX `allianceMembers_role_idx` ON `allianceMembers` (`role`);