CREATE TABLE `marketplaceListings` (
	`id` varchar(36) NOT NULL,
	`sellerId` int NOT NULL,
	`sellerBrandName` varchar(255) NOT NULL,
	`productId` varchar(36) NOT NULL,
	`warehouseItemId` varchar(36) NOT NULL,
	`quantity` int NOT NULL,
	`pricePerUnit` decimal(8,2) NOT NULL,
	`originalCostPerUnit` decimal(8,2) NOT NULL,
	`status` varchar(32) DEFAULT 'active',
	`expirationDate` timestamp,
	`isExtraFresh` boolean DEFAULT false,
	`listedAt` timestamp NOT NULL DEFAULT (now()),
	`soldAt` timestamp,
	`cancelledAt` timestamp,
	`buyerId` int,
	`buyerBrandName` varchar(255),
	`platformFee` decimal(8,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplaceListings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplaceTrades` (
	`id` varchar(36) NOT NULL,
	`listingId` varchar(36) NOT NULL,
	`sellerId` int NOT NULL,
	`buyerId` int NOT NULL,
	`productId` varchar(36) NOT NULL,
	`quantity` int NOT NULL,
	`pricePerUnit` decimal(8,2) NOT NULL,
	`totalPrice` decimal(10,2) NOT NULL,
	`platformFee` decimal(8,2) NOT NULL,
	`sellerProceeds` decimal(10,2) NOT NULL,
	`sellerProfit` decimal(10,2) NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketplaceTrades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `marketplaceListings_sellerId_idx` ON `marketplaceListings` (`sellerId`);--> statement-breakpoint
CREATE INDEX `marketplaceListings_buyerId_idx` ON `marketplaceListings` (`buyerId`);--> statement-breakpoint
CREATE INDEX `marketplaceListings_productId_idx` ON `marketplaceListings` (`productId`);--> statement-breakpoint
CREATE INDEX `marketplaceListings_status_idx` ON `marketplaceListings` (`status`);--> statement-breakpoint
CREATE INDEX `marketplaceListings_price_idx` ON `marketplaceListings` (`pricePerUnit`);--> statement-breakpoint
CREATE INDEX `marketplaceTrades_sellerId_idx` ON `marketplaceTrades` (`sellerId`);--> statement-breakpoint
CREATE INDEX `marketplaceTrades_buyerId_idx` ON `marketplaceTrades` (`buyerId`);--> statement-breakpoint
CREATE INDEX `marketplaceTrades_listingId_idx` ON `marketplaceTrades` (`listingId`);--> statement-breakpoint
CREATE INDEX `marketplaceTrades_completedAt_idx` ON `marketplaceTrades` (`completedAt`);