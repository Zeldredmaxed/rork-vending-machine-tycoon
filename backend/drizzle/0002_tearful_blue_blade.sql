ALTER TABLE `transactions` ADD `status` varchar(32) DEFAULT 'completed';--> statement-breakpoint
ALTER TABLE `transactions` ADD `stripePaymentIntentId` varchar(255);