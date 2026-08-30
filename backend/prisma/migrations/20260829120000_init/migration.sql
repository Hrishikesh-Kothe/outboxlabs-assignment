-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `googleId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `avatar` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_googleId_key`(`googleId`),
    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SlackConnection` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `accessToken` TEXT NOT NULL,
    `teamName` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SlackConnection_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sender` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `smtpHost` VARCHAR(191) NOT NULL,
    `smtpPort` INTEGER NOT NULL,
    `smtpUser` VARCHAR(191) NOT NULL,
    `smtpPass` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Sender_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Campaign` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `delayMs` INTEGER NOT NULL,
    `hourlyLimit` INTEGER NOT NULL,
    `status` ENUM('scheduled', 'completed') NOT NULL DEFAULT 'scheduled',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Campaign_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailJob` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `recipient` VARCHAR(191) NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `sentAt` DATETIME(3) NULL,
    `status` ENUM('scheduled', 'sending', 'sent', 'failed', 'delayed') NOT NULL DEFAULT 'scheduled',
    `bullmqJobId` VARCHAR(191) NULL,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EmailJob_bullmqJobId_key`(`bullmqJobId`),
    INDEX `EmailJob_status_scheduledAt_idx`(`status`, `scheduledAt`),
    UNIQUE INDEX `EmailJob_campaignId_recipient_key`(`campaignId`, `recipient`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SlackConnection` ADD CONSTRAINT `SlackConnection_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sender` ADD CONSTRAINT `Sender_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `Sender`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailJob` ADD CONSTRAINT `EmailJob_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
