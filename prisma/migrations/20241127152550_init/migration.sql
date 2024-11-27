-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(11) NOT NULL,
    `otp_code` INTEGER NOT NULL DEFAULT 0,
    `otp_expires` INTEGER NOT NULL DEFAULT 0,
    `password` INTEGER NULL,
    `passwordResetAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `registrationDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isSystemAdmin` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isSuspended` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `reputation` DOUBLE NOT NULL DEFAULT 0,
    `totalTransactions` INTEGER NOT NULL DEFAULT 0,
    `successRate` DOUBLE NOT NULL DEFAULT 0,
    `supplierRating` DOUBLE NULL,
    `responseTime` DOUBLE NULL,
    `qualityScore` DOUBLE NULL,
    `subscriptionStatus` ENUM('ACTIVE', 'PAST_DUE', 'CANCELED', 'PAUSED', 'TRIAL', 'REWARD') NOT NULL,
    `status` ENUM('ACTIVE', 'MORKHASI') NOT NULL DEFAULT 'ACTIVE',

    UNIQUE INDEX `User_mobile_key`(`mobile`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(50) NULL,
    `last_name` VARCHAR(50) NULL,
    `nationalIdNumber` VARCHAR(10) NULL,
    `bankAccountNumber` VARCHAR(16) NULL,
    `province` VARCHAR(20) NULL,
    `city` VARCHAR(20) NULL,
    `location` VARCHAR(191) NULL,
    `garageLat_Lng` VARCHAR(191) NULL,
    `supplierStoreLat_Lng` VARCHAR(191) NULL,
    `mechanicProjectsCount` VARCHAR(191) NULL,
    `apprenticeProjectsCount` VARCHAR(191) NULL,
    `mechanicApprenticeCity` VARCHAR(191) NULL,
    `maxReachableReviewPoint` INTEGER NOT NULL DEFAULT 0,
    `reviewPoint` INTEGER NOT NULL DEFAULT 0,
    `profileImageUrl` VARCHAR(191) NULL,
    `coverImageUrl` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `socialLinks` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserProfile_userId_key`(`userId`),
    UNIQUE INDEX `UserProfile_nationalIdNumber_bankAccountNumber_key`(`nationalIdNumber`, `bankAccountNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `mechanicPercentage` VARCHAR(191) NULL,
    `apprenticePercentage` VARCHAR(191) NULL,
    `bussinesRole` ENUM('GARAGE_OWNER', 'GARAGE_MECHANIC', 'GARAGE_APPRENTICE', 'FREELANCER_MECHANIC', 'FREELANCER_APPRENTICE', 'SUPPLIER_STORE_OWNER', 'FREELANCER_SUPPLIER', 'CLIENT', 'ADMIN') NOT NULL DEFAULT 'GARAGE_APPRENTICE',
    `expertices` ENUM('JOLOBANDI', 'ELECTRITIAN', 'ENGINEGEARBOX', 'OILAUTOSERVICE', 'BODYREPAIR', 'PDRDENT') NOT NULL DEFAULT 'ENGINEGEARBOX',
    `mechanicGarageId` VARCHAR(191) NULL,
    `apprenticeGarageId` VARCHAR(191) NULL,
    `referralCount` INTEGER NOT NULL DEFAULT 0,
    `profit` INTEGER NOT NULL DEFAULT 0,
    `league` ENUM('GOLD', 'SILVER', 'BRONZE') NOT NULL,

    UNIQUE INDEX `BusinessProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ProjectProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SocialProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `socialLinks` JSON NULL,

    UNIQUE INDEX `SocialProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `lastActiveAt` DATETIME(3) NULL,

    UNIQUE INDEX `ActivityProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InteractiveContentProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `InteractiveContentProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `id` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(50) NULL,
    `last_name` VARCHAR(50) NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `otp_code` INTEGER NOT NULL DEFAULT 0,
    `otp_expires` INTEGER NOT NULL DEFAULT 0,
    `carPlateNumber` VARCHAR(8) NULL,
    `carModel` VARCHAR(191) NULL,
    `carChassisNumber` VARCHAR(191) NULL,
    `carBuildYear` VARCHAR(191) NULL,
    `carMillage` VARCHAR(191) NULL,
    `province` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `role` ENUM('GARAGE_OWNER', 'GARAGE_MECHANIC', 'GARAGE_APPRENTICE', 'FREELANCER_MECHANIC', 'FREELANCER_APPRENTICE', 'SUPPLIER_STORE_OWNER', 'FREELANCER_SUPPLIER', 'CLIENT', 'ADMIN') NOT NULL DEFAULT 'CLIENT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isPrivileged` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Client_mobile_key`(`mobile`),
    INDEX `client_search_index`(`first_name`, `last_name`, `mobile`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Clan` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `level` INTEGER NOT NULL DEFAULT 1,
    `maxMembers` INTEGER NOT NULL DEFAULT 50,
    `isPrivate` BOOLEAN NOT NULL DEFAULT false,
    `rankingScore` DOUBLE NOT NULL DEFAULT 0,
    `weeklyScore` DOUBLE NOT NULL DEFAULT 0,
    `monthlyScore` DOUBLE NOT NULL DEFAULT 0,
    `rank` INTEGER NULL,
    `seasonRank` INTEGER NULL,
    `totalTransactions` INTEGER NOT NULL DEFAULT 0,
    `successfulDeals` INTEGER NOT NULL DEFAULT 0,
    `reputationScore` DOUBLE NOT NULL DEFAULT 0,
    `activeSuppliers` INTEGER NOT NULL DEFAULT 0,
    `activeGarages` INTEGER NOT NULL DEFAULT 0,
    `ownerId` VARCHAR(191) NOT NULL,
    `defaultConversation` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Clan_name_key`(`name`),
    UNIQUE INDEX `Clan_ownerId_key`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanMembership` (
    `id` VARCHAR(191) NOT NULL,
    `clanId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'COLEADER', 'ELDER', 'MEMBER') NOT NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `contributionScore` DOUBLE NOT NULL DEFAULT 0,
    `transactionCount` INTEGER NOT NULL DEFAULT 0,
    `reputationPoints` DOUBLE NOT NULL DEFAULT 0,
    `activityPoints` INTEGER NOT NULL DEFAULT 0,
    `lastActiveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `canCreateChannels` BOOLEAN NOT NULL DEFAULT false,
    `canPinMessages` BOOLEAN NOT NULL DEFAULT false,
    `canEditThreads` BOOLEAN NOT NULL DEFAULT false,
    `communicationRoles` ENUM('CHAT_ADMIN', 'MODERATOR', 'REGULAR_MEMBER', 'RESTRICTED') NOT NULL,
    `supplierTier` ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM') NULL,
    `dealSuccessRate` DOUBLE NULL,
    `responseRate` DOUBLE NULL,
    `qualityRating` DOUBLE NULL,

    UNIQUE INDEX `ClanMembership_clanId_userId_key`(`clanId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanRanking` (
    `id` VARCHAR(191) NOT NULL,
    `clanId` VARCHAR(191) NOT NULL,
    `season` INTEGER NOT NULL,
    `weekNumber` INTEGER NOT NULL,
    `rank` INTEGER NOT NULL,
    `score` DOUBLE NOT NULL,
    `transactionVolume` DOUBLE NOT NULL,
    `memberActivity` DOUBLE NOT NULL,
    `supplierRating` DOUBLE NOT NULL,
    `calculatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ClanRanking_clanId_season_weekNumber_key`(`clanId`, `season`, `weekNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanReward` (
    `id` VARCHAR(191) NOT NULL,
    `clanId` VARCHAR(191) NOT NULL,
    `memberId` VARCHAR(191) NOT NULL,
    `type` ENUM('CASH', 'POINTS', 'DISCOUNT', 'PRODUCT') NOT NULL,
    `amount` DOUBLE NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `claimed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `claimedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanConversation` (
    `id` VARCHAR(191) NOT NULL,
    `clanId` VARCHAR(191) NOT NULL,
    `type` ENUM('DIRECT', 'GROUP', 'PROJECT', 'SUPPORT', 'TRANSACTION') NOT NULL DEFAULT 'GROUP',
    `name` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastMessageAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PinnedClanMessage` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `pinnedBy` VARCHAR(191) NOT NULL,
    `pinnedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PinnedClanMessage_messageId_key`(`messageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanCommunication` (
    `id` VARCHAR(191) NOT NULL,
    `clanId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `type` ENUM('ANNOUNCEMENT', 'DISCUSSION', 'DEAL_OFFER', 'SUPPORT_REQUEST', 'SUPPLIER_UPDATE') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `dealValue` DOUBLE NULL,
    `validUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanCommunicationReaction` (
    `id` VARCHAR(191) NOT NULL,
    `communicationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `reaction` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ClanCommunicationReaction_communicationId_userId_key`(`communicationId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanCommunicationThread` (
    `id` VARCHAR(191) NOT NULL,
    `clanId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `category` ENUM('DEAL_NEGOTIATION', 'PROJECT_DISCUSSION', 'TECHNICAL_SUPPORT', 'NETWORKING', 'GENERAL_DISCUSSION') NOT NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL,
    `pinnedMessages` VARCHAR(191) NOT NULL,
    `lastActivityAt` DATETIME(3) NOT NULL,
    `initiatorId` VARCHAR(191) NOT NULL,
    `tags` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,

    UNIQUE INDEX `ClanCommunicationThread_clanId_key`(`clanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunicationThreadParticipant` (
    `id` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `role` ENUM('OWNER', 'ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',

    UNIQUE INDEX `CommunicationThreadParticipant_userId_key`(`userId`),
    UNIQUE INDEX `CommunicationThreadParticipant_threadId_userId_key`(`threadId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanCommunicationReply` (
    `id` VARCHAR(191) NOT NULL,
    `communicationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanInvite` (
    `id` VARCHAR(191) NOT NULL,
    `clanId` VARCHAR(191) NOT NULL,
    `fromUserId` VARCHAR(191) NOT NULL,
    `toUserId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL,
    `message` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,

    UNIQUE INDEX `ClanInvite_clanId_toUserId_key`(`clanId`, `toUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanJoinRequest` (
    `id` VARCHAR(191) NOT NULL,
    `clanId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL,
    `message` VARCHAR(191) NULL,
    `response` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ClanJoinRequest_clanId_userId_key`(`clanId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanActivity` (
    `id` VARCHAR(191) NOT NULL,
    `clanId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `activityType` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `points` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanMetric` (
    `id` VARCHAR(191) NOT NULL,
    `clanId` VARCHAR(191) NOT NULL,
    `creatorGarageId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `metricStatus` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'PENDING',
    `isPrivate` BOOLEAN NOT NULL DEFAULT false,
    `priority` ENUM('LOW', 'NORMAL', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `carModel` VARCHAR(191) NOT NULL,
    `carBuildYear` INTEGER NOT NULL,
    `currentUsage` INTEGER NOT NULL,
    `maxLifespan` INTEGER NOT NULL,
    `estimatedTotalCost` DOUBLE NULL,
    `mechanicCommissionPercentage` DOUBLE NOT NULL DEFAULT 10,
    `supplierCommissionPercentage` DOUBLE NOT NULL DEFAULT 5,
    `clanCommissionPercentage` DOUBLE NOT NULL DEFAULT 2,
    `visibilityScope` ENUM('CLAN_ONLY', 'CLAN_AND_PARTNERS', 'PUBLIC') NOT NULL DEFAULT 'CLAN_ONLY',
    `collaborationType` ENUM('SINGLE_SUPPLIER', 'MULTI_SUPPLIER', 'AUCTION') NOT NULL DEFAULT 'SINGLE_SUPPLIER',
    `minSupplierTier` ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `nextInspectionDate` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ClanMetric_creatorGarageId_key`(`creatorGarageId`),
    INDEX `ClanMetric_clanId_idx`(`clanId`),
    INDEX `ClanMetric_creatorGarageId_idx`(`creatorGarageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanPartSpecification` (
    `id` VARCHAR(191) NOT NULL,
    `clanMetricId` VARCHAR(191) NOT NULL,
    `partType` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `condition` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `estimatedCost` DOUBLE NULL,
    `urgencyLevel` ENUM('LOW', 'NORMAL', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanMetricBid` (
    `id` VARCHAR(191) NOT NULL,
    `clanMetricId` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `bidAmount` DOUBLE NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'PENDING',
    `estimatedDeliveryTime` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ClanMetricBid_supplierId_key`(`supplierId`),
    UNIQUE INDEX `ClanMetricBid_clanMetricId_supplierId_key`(`clanMetricId`, `supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanMetricAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `clanMetricId` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED') NOT NULL DEFAULT 'PENDING',
    `finalAmount` DOUBLE NOT NULL,
    `qualityRating` DOUBLE NULL,
    `deliverySpeed` DOUBLE NULL,
    `communication` DOUBLE NULL,
    `overallRating` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ClanMetricAssignment_supplierId_key`(`supplierId`),
    UNIQUE INDEX `ClanMetricAssignment_clanMetricId_supplierId_key`(`clanMetricId`, `supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanMetricCollaborator` (
    `id` VARCHAR(191) NOT NULL,
    `clanMetricId` VARCHAR(191) NOT NULL,
    `memberId` VARCHAR(191) NOT NULL,
    `role` ENUM('MANAGER', 'SUPPLIER', 'INSPECTOR', 'OBSERVER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ClanMetricCollaborator_clanMetricId_memberId_key`(`clanMetricId`, `memberId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanCoupon` (
    `id` VARCHAR(191) NOT NULL,
    `clanId` VARCHAR(191) NOT NULL,
    `publisherId` VARCHAR(191) NOT NULL,
    `supplierStoreId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `city` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED') NOT NULL DEFAULT 'PENDING',
    `requirements` JSON NULL,
    `quantity` VARCHAR(191) NOT NULL,
    `condition` ENUM('NEW', 'USED', 'REFURBISHED') NOT NULL DEFAULT 'NEW',
    `urgencyLevel` INTEGER NOT NULL DEFAULT 1,
    `notes` VARCHAR(191) NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `shareCount` INTEGER NOT NULL DEFAULT 0,
    `successCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ClanCoupon_clanId_id_key`(`clanId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanCouponMechanicAcceptor` (
    `id` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `mechanicId` VARCHAR(191) NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',

    UNIQUE INDEX `ClanCouponMechanicAcceptor_couponId_mechanicId_key`(`couponId`, `mechanicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanCouponMechanicSuccess` (
    `id` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `mechanicId` VARCHAR(191) NOT NULL,
    `succeededAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ClanCouponMechanicSuccess_couponId_mechanicId_key`(`couponId`, `mechanicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanCouponGarageAcceptor` (
    `id` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',

    UNIQUE INDEX `ClanCouponGarageAcceptor_couponId_garageId_key`(`couponId`, `garageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanCouponGarageSuccess` (
    `id` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `succeededAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ClanCouponGarageSuccess_couponId_garageId_key`(`couponId`, `garageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanCouponComment` (
    `id` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanCouponLike` (
    `id` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ClanCouponLike_couponId_userId_key`(`couponId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClanCouponBookmark` (
    `id` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ClanCouponBookmark_couponId_userId_key`(`couponId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `deviceInfo` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `isValid` BOOLEAN NOT NULL DEFAULT true,
    `lastActivity` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `sessions_userId_idx`(`userId`),
    INDEX `sessions_lastActivity_idx`(`lastActivity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `token_records` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenType` ENUM('ACCESS', 'REFRESH') NOT NULL,
    `tokenIdentifier` VARCHAR(191) NOT NULL,
    `issuedBy` VARCHAR(191) NULL,
    `isValid` BOOLEAN NOT NULL DEFAULT true,
    `revokedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `token_records_tokenIdentifier_key`(`tokenIdentifier`),
    INDEX `token_records_userId_idx`(`userId`),
    INDEX `token_records_tokenType_idx`(`tokenType`),
    INDEX `token_records_isValid_idx`(`isValid`),
    INDEX `token_records_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permission` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Permission_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserRole` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserRole_userId_roleId_key`(`userId`, `roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientRole` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ClientRole_clientId_roleId_key`(`clientId`, `roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PermissionAuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `resourceType` ENUM('GARAGE', 'SUPPLIER_STORE', 'PROJECT', 'INVENTORY', 'USER', 'CLIENT', 'REVIEW', 'COMPLAINT', 'METRIC', 'COUPON', 'NOTIFICATION', 'SUBSCRIPTION', 'SERVICE_REQUEST', 'APPOINTMENT', 'PAYMENT', 'HISTORY') NULL,
    `resourceId` VARCHAR(191) NULL,
    `oldValue` JSON NULL,
    `newValue` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` VARCHAR(191) NOT NULL,

    INDEX `PermissionAuditLog_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoleResource` (
    `id` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `resourceId` VARCHAR(191) NOT NULL,
    `resourceType` ENUM('GARAGE', 'SUPPLIER_STORE', 'PROJECT', 'INVENTORY', 'USER', 'CLIENT', 'REVIEW', 'COMPLAINT', 'METRIC', 'COUPON', 'NOTIFICATION', 'SUBSCRIPTION', 'SERVICE_REQUEST', 'APPOINTMENT', 'PAYMENT', 'HISTORY') NOT NULL,
    `permission` ENUM('CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RoleResource_roleId_resourceId_resourceType_permission_key`(`roleId`, `resourceId`, `resourceType`, `permission`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermission` (
    `id` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RolePermission_roleId_permissionId_key`(`roleId`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserMedia` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `type` ENUM('AVATAR', 'COVER_IMAGE', 'GALLERY_IMAGE', 'DOCUMENT', 'CERTIFICATE') NOT NULL,
    `metadata` JSON NULL,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserMedia_userId_idx`(`userId`),
    INDEX `UserMedia_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GarageMedia` (
    `id` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `type` ENUM('PROFILE_IMAGE', 'COVER_IMAGE', 'SHOP_EXTERIOR', 'SHOP_INTERIOR', 'WORK_AREA', 'CERTIFICATE', 'STAFF', 'COMPLETED_WORK', 'EQUIPMENT') NOT NULL,
    `metadata` JSON NULL,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GarageMedia_garageId_idx`(`garageId`),
    INDEX `GarageMedia_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplierStoreMedia` (
    `id` VARCHAR(191) NOT NULL,
    `supplierStoreId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `type` ENUM('PROFILE_IMAGE', 'COVER_IMAGE', 'STORE_EXTERIOR', 'STORE_INTERIOR', 'PRODUCT_CATALOG', 'WAREHOUSE', 'CERTIFICATE', 'STAFF') NOT NULL,
    `metadata` JSON NULL,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SupplierStoreMedia_supplierStoreId_idx`(`supplierStoreId`),
    INDEX `SupplierStoreMedia_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentMedia` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `type` ENUM('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'GIF', 'EMBEDDED') NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `noticeDivarId` VARCHAR(191) NOT NULL,
    `noticeEstId` VARCHAR(191) NOT NULL,
    `noticePartPId` VARCHAR(191) NOT NULL,
    `noticeShopSupplierId` VARCHAR(191) NOT NULL,
    `garageRequirementsRequestId` VARCHAR(191) NOT NULL,
    `autoServicesRequirementsRequestId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `caption` VARCHAR(191) NULL,
    `altText` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `metadata` JSON NULL,
    `filename` VARCHAR(191) NOT NULL,
    `fileSize` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `duration` VARCHAR(191) NULL,
    `dimensions` JSON NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContentMedia_postId_idx`(`postId`),
    INDEX `ContentMedia_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Report` (
    `id` VARCHAR(191) NOT NULL,
    `reporterId` VARCHAR(191) NOT NULL,
    `reportedUserId` VARCHAR(191) NOT NULL,
    `reason` ENUM('HARASSMENT', 'SPAM', 'INAPPROPRIATE_CONTENT', 'IMPERSONATION', 'OTHER') NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,
    `resolution` TEXT NULL,

    INDEX `Report_reporterId_idx`(`reporterId`),
    INDEX `Report_reportedUserId_idx`(`reportedUserId`),
    INDEX `Report_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserActivity` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('POST_CREATE', 'POST_UPDATE', 'POST_DELETE', 'COMMENT_CREATE', 'COMMENT_UPDATE', 'COMMENT_DELETE', 'METRIC', 'COUPON', 'DASTYARREQ', 'FAILED_LOGIN', 'PERMISSION_DENIED', 'TOKEN_REFRESH', 'TOKEN_REVOKED', 'TOKEN_CREATED', 'FOLLOW', 'UNFOLLOW', 'VOTE', 'BOOKMARK', 'SHARE', 'PROFILE_UPDATE', 'LOGIN', 'LOGOUT') NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `tokenRecordId` VARCHAR(191) NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `statusCode` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserActivity_userId_idx`(`userId`),
    INDEX `UserActivity_type_idx`(`type`),
    INDEX `UserActivity_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Post` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `postField` ENUM('mechanics', 'autoServices', 'bodyShops', 'suppliers') NOT NULL,
    `postType` ENUM('experts', 'public') NOT NULL,
    `featuredImage` VARCHAR(191) NULL,
    `isRepost` BOOLEAN NOT NULL DEFAULT false,
    `originalPostId` VARCHAR(191) NULL,
    `repostCount` INTEGER NOT NULL DEFAULT 0,
    `authorId` VARCHAR(191) NOT NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `shareCount` INTEGER NOT NULL DEFAULT 0,
    `slug` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,

    UNIQUE INDEX `Post_slug_key`(`slug`),
    INDEX `Post_authorId_idx`(`authorId`),
    INDEX `Post_slug_idx`(`slug`),
    INDEX `Post_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Repost` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `originalPosterId` VARCHAR(191) NOT NULL,
    `additionalContent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Repost_userId_idx`(`userId`),
    INDEX `Repost_postId_idx`(`postId`),
    INDEX `Repost_originalPosterId_idx`(`originalPosterId`),
    UNIQUE INDEX `Repost_userId_postId_key`(`userId`, `postId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `supplierStoreId` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 1,
    `price` DOUBLE NOT NULL,
    `discount` DOUBLE NULL,
    `inventoryCount` INTEGER NOT NULL DEFAULT 0,
    `minOrderQuantity` INTEGER NULL DEFAULT 1,
    `maxOrderQuantity` INTEGER NULL,
    `warranty` ENUM('HAS', 'HASNOT') NOT NULL,
    `warrantyPeriod` INTEGER NULL,
    `basketId` VARCHAR(191) NULL,
    `status` ENUM('BRANDNEW', 'STOCK') NOT NULL DEFAULT 'BRANDNEW',
    `sellsStatus` ENUM('SINGLE', 'BULK') NOT NULL DEFAULT 'SINGLE',
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `regionLatLng` VARCHAR(191) NOT NULL,
    `rating` DOUBLE NULL DEFAULT 0,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `featuredImage` VARCHAR(191) NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `shareCount` INTEGER NOT NULL DEFAULT 0,
    `slug` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,

    UNIQUE INDEX `Product_basketId_providerId_clientId_key`(`basketId`, `providerId`, `clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Basket` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Basket_clientId_userId_key`(`clientId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Course` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `capacity` INTEGER NOT NULL,
    `price` DOUBLE NOT NULL,
    `platformFeePercentage` DOUBLE NOT NULL DEFAULT 0.1,
    `garageId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CourseRegistration` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `registeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CourseRegistration_userId_key`(`userId`),
    UNIQUE INDEX `CourseRegistration_userId_courseId_key`(`userId`, `courseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `supplierStoreId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `billingMobile` VARCHAR(191) NULL,
    `billingName` VARCHAR(191) NULL,
    `billingAddress` JSON NULL,

    UNIQUE INDEX `Customer_userId_key`(`userId`),
    UNIQUE INDEX `Customer_supplierStoreId_key`(`supplierStoreId`),
    UNIQUE INDEX `Customer_garageId_key`(`garageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscription` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'PAST_DUE', 'CANCELED', 'PAUSED', 'TRIAL', 'REWARD') NOT NULL DEFAULT 'ACTIVE',
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endDate` DATETIME(3) NULL,
    `canceledAt` DATETIME(3) NULL,
    `currentPeriodStart` DATETIME(3) NOT NULL,
    `currentPeriodEnd` DATETIME(3) NOT NULL,
    `tierId` VARCHAR(191) NOT NULL,
    `totalRewardMonths` INTEGER NOT NULL DEFAULT 0,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubscriptionTier` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `features` JSON NOT NULL,
    `referralRequirements` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeatureLimit` (
    `id` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `featureKey` VARCHAR(191) NOT NULL,
    `monthlyLimit` VARCHAR(191) NOT NULL,
    `overage_price` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FeatureLimit_planId_featureKey_key`(`planId`, `featureKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UsageLog` (
    `id` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NOT NULL,
    `featureKey` VARCHAR(191) NOT NULL,
    `quantity` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `billingPeriodStart` DATETIME(3) NOT NULL,
    `billingPeriodEnd` DATETIME(3) NOT NULL,

    INDEX `UsageLog_subscriptionId_featureKey_billingPeriodStart_billin_idx`(`subscriptionId`, `featureKey`, `billingPeriodStart`, `billingPeriodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BillingRecord` (
    `id` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `billingDate` DATETIME(3) NOT NULL,
    `nextBillingDate` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'SUCCESSFUL', 'FAILED', 'REFUNDED') NOT NULL,
    `paymentMethodId` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubscriptionChange` (
    `id` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NOT NULL,
    `fromPlanId` VARCHAR(191) NULL,
    `toPlanId` VARCHAR(191) NOT NULL,
    `changeType` ENUM('UPGRADE', 'DOWNGRADE', 'REFERRAL_REWARD', 'CANCELLATION', 'REACTIVATION') NOT NULL,
    `reason` VARCHAR(191) NULL,
    `effectiveDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Plan` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `price` DOUBLE NOT NULL,
    `interval` ENUM('MONTHLY', 'YEARLY', 'QUARTERLY') NOT NULL,
    `tier` ENUM('BASIC', 'STANDARD', 'PRO', 'ENTERPRISE') NOT NULL,
    `tierId` VARCHAR(191) NOT NULL,
    `maxMechanics` VARCHAR(191) NOT NULL,
    `maxApprentices` VARCHAR(191) NOT NULL,
    `features` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usage` (
    `id` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NOT NULL,
    `feature` VARCHAR(191) NOT NULL,
    `quantity` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `type` ENUM('CREDIT_CARD', 'BANK_TRANSFER', 'PAYPAL') NOT NULL,
    `last4` VARCHAR(191) NULL,
    `expMonth` VARCHAR(191) NULL,
    `expYear` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `authority` VARCHAR(191) NOT NULL,
    `amount` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL DEFAULT 'بابت خرید اشتراک',
    `verify` BOOLEAN NOT NULL DEFAULT false,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `verifiedAt` DATETIME(3) NULL,
    `basketData` JSON NOT NULL,
    `refID` VARCHAR(191) NOT NULL,
    `cardHash` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Payment_authority_key`(`authority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankAccount` (
    `id` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `routingNumber` VARCHAR(191) NOT NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BankAccount_garageId_key`(`garageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `status` ENUM('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE') NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `items` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Referral` (
    `id` VARCHAR(191) NOT NULL,
    `referrerId` VARCHAR(191) NOT NULL,
    `referredId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'EXPIRED', 'INVALID') NOT NULL DEFAULT 'PENDING',
    `codeId` VARCHAR(191) NOT NULL,
    `convertedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Referral_referrerId_idx`(`referrerId`),
    INDEX `Referral_referredId_idx`(`referredId`),
    UNIQUE INDEX `Referral_referrerId_referredId_key`(`referrerId`, `referredId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferralStats` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `totalReferrals` INTEGER NOT NULL DEFAULT 0,
    `successfulReferrals` INTEGER NOT NULL DEFAULT 0,
    `currentTier` ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND') NOT NULL DEFAULT 'BRONZE',
    `freeMonthsEarned` INTEGER NOT NULL DEFAULT 0,
    `freeMonthsUsed` INTEGER NOT NULL DEFAULT 0,
    `lastMilestoneAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReferralStats_userId_key`(`userId`),
    INDEX `ReferralStats_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferralMilestone` (
    `id` VARCHAR(191) NOT NULL,
    `tier` ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND') NOT NULL,
    `minReferrals` INTEGER NOT NULL,
    `rewardMonths` INTEGER NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferralAchievement` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `milestoneId` VARCHAR(191) NOT NULL,
    `achievedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `rewardMonthsGranted` INTEGER NOT NULL,
    `rewardMonthsUsed` INTEGER NOT NULL DEFAULT 0,

    INDEX `ReferralAchievement_userId_idx`(`userId`),
    UNIQUE INDEX `ReferralAchievement_userId_milestoneId_key`(`userId`, `milestoneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubscriptionReward` (
    `id` VARCHAR(191) NOT NULL,
    `achievementId` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NOT NULL,
    `monthsApplied` INTEGER NOT NULL,
    `appliedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SubscriptionReward_achievementId_idx`(`achievementId`),
    INDEX `SubscriptionReward_subscriptionId_idx`(`subscriptionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferralCode` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `maxUses` INTEGER NULL,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReferralCode_code_key`(`code`),
    INDEX `ReferralCode_code_idx`(`code`),
    INDEX `ReferralCode_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reward` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('CASH', 'POINTS', 'DISCOUNT', 'PRODUCT') NOT NULL,
    `amount` DOUBLE NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CLAIMED') NOT NULL DEFAULT 'PENDING',
    `claimedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Reward_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Comment` (
    `id` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `depth` INTEGER NOT NULL DEFAULT 0,
    `path` VARCHAR(191) NULL,
    `replyCount` INTEGER NOT NULL DEFAULT 0,
    `postId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `upvotes` INTEGER NOT NULL DEFAULT 0,
    `downvotes` INTEGER NOT NULL DEFAULT 0,
    `isEdited` BOOLEAN NOT NULL DEFAULT false,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `isHidden` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `editedAt` DATETIME(3) NULL,
    `metricId` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `reportCount` INTEGER NOT NULL DEFAULT 0,
    `moderationStatus` ENUM('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED', 'UNDER_REVIEW') NOT NULL DEFAULT 'APPROVED',
    `moderatedBy` VARCHAR(191) NULL,
    `moderatedAt` DATETIME(3) NULL,
    `metadata` JSON NULL,

    INDEX `Comment_postId_idx`(`postId`),
    INDEX `Comment_parentId_idx`(`parentId`),
    INDEX `Comment_authorId_idx`(`authorId`),
    INDEX `Comment_createdAt_idx`(`createdAt`),
    INDEX `Comment_isPinned_createdAt_idx`(`isPinned`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommentVote` (
    `id` VARCHAR(191) NOT NULL,
    `commentId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `voteType` ENUM('UPVOTE', 'DOWNVOTE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CommentVote_commentId_idx`(`commentId`),
    INDEX `CommentVote_userId_idx`(`userId`),
    INDEX `CommentVote_voteType_commentId_idx`(`voteType`, `commentId`),
    UNIQUE INDEX `CommentVote_userId_commentId_key`(`userId`, `commentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommentReport` (
    `id` VARCHAR(191) NOT NULL,
    `commentId` VARCHAR(191) NOT NULL,
    `reporterId` VARCHAR(191) NOT NULL,
    `reason` ENUM('SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'MISINFORMATION', 'OTHER') NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,

    INDEX `CommentReport_commentId_idx`(`commentId`),
    INDEX `CommentReport_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Review` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `supplierStoreId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `metricId` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `garagePartOrderId` VARCHAR(191) NOT NULL,
    `noticeOutSourcingId` VARCHAR(191) NOT NULL,
    `noticeApprenticeId` VARCHAR(191) NOT NULL,
    `garageOilServiceProjectId` VARCHAR(191) NOT NULL,
    `noticeDastyarId` VARCHAR(191) NOT NULL,
    `rating` DOUBLE NOT NULL,
    `comment` VARCHAR(191) NULL,
    `response` VARCHAR(191) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Review_noticeOutSourcingId_key`(`noticeOutSourcingId`),
    UNIQUE INDEX `Review_noticeApprenticeId_key`(`noticeApprenticeId`),
    UNIQUE INDEX `Review_noticeDastyarId_key`(`noticeDastyarId`),
    INDEX `Review_garageId_idx`(`garageId`),
    INDEX `Review_supplierStoreId_idx`(`supplierStoreId`),
    INDEX `Review_authorId_idx`(`authorId`),
    INDEX `Review_targetId_idx`(`targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Like` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NULL,
    `metricId` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,

    INDEX `Like_userId_idx`(`userId`),
    INDEX `Like_postId_idx`(`postId`),
    UNIQUE INDEX `Like_userId_postId_key`(`userId`, `postId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dislike` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NULL,
    `metricId` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,

    INDEX `Dislike_userId_idx`(`userId`),
    INDEX `Dislike_postId_idx`(`postId`),
    UNIQUE INDEX `Dislike_userId_postId_key`(`userId`, `postId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bookmark` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `noticeDivarId` VARCHAR(191) NOT NULL,
    `noticeEstId` VARCHAR(191) NOT NULL,
    `noticePartPId` VARCHAR(191) NOT NULL,
    `noticeShopSupplierId` VARCHAR(191) NOT NULL,
    `noticeApperenticeId` VARCHAR(191) NOT NULL,
    `noticeDastyarId` VARCHAR(191) NOT NULL,
    `noticeOutSourcingId` VARCHAR(191) NOT NULL,
    `garagePartOrderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `garageRequirementsRequestId` VARCHAR(191) NOT NULL,
    `autoServicesRequirementsRequestId` VARCHAR(191) NOT NULL,
    `metricId` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Bookmark_noticeOutSourcingId_key`(`noticeOutSourcingId`),
    UNIQUE INDEX `Bookmark_garagePartOrderId_key`(`garagePartOrderId`),
    INDEX `Bookmark_userId_idx`(`userId`),
    INDEX `Bookmark_postId_idx`(`postId`),
    UNIQUE INDEX `Bookmark_userId_postId_noticeApperenticeId_key`(`userId`, `postId`, `noticeApperenticeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Share` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `noticeDivarId` VARCHAR(191) NOT NULL,
    `noticeEstId` VARCHAR(191) NOT NULL,
    `noticePartPId` VARCHAR(191) NOT NULL,
    `noticeShopSupplierId` VARCHAR(191) NOT NULL,
    `noticeApperenticeId` VARCHAR(191) NOT NULL,
    `noticeDastyarId` VARCHAR(191) NOT NULL,
    `noticeOutSourcingId` VARCHAR(191) NOT NULL,
    `garagePartOrderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `garageRequirementsRequestId` VARCHAR(191) NOT NULL,
    `autoServicesRequirementsRequestId` VARCHAR(191) NOT NULL,
    `metricId` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `platform` ENUM('TWITTER', 'FACEBOOK', 'LINKEDIN', 'EMAIL', 'WHATSAPP', 'TELEGRAM', 'COPY_LINK') NOT NULL,
    `shareUrl` VARCHAR(191) NULL,
    `customMessage` TEXT NULL,
    `clickCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastClickedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Share_noticeOutSourcingId_key`(`noticeOutSourcingId`),
    UNIQUE INDEX `Share_garagePartOrderId_key`(`garagePartOrderId`),
    INDEX `Share_userId_idx`(`userId`),
    INDEX `Share_postId_idx`(`postId`),
    INDEX `Share_platform_idx`(`platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('FOLLOW', 'MENTION', 'COMMENT', 'REPLY', 'VOTE', 'MILESTONE', 'SYSTEM', 'SECURITY') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `link` VARCHAR(191) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `readAt` DATETIME(3) NULL,
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'NORMAL',
    `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `expiresAt` DATETIME(3) NULL,
    `deviceId` VARCHAR(191) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `source` VARCHAR(191) NULL,
    `retries` INTEGER NOT NULL DEFAULT 0,

    INDEX `Notification_userId_idx`(`userId`),
    INDEX `Notification_isRead_idx`(`isRead`),
    INDEX `Notification_createdAt_idx`(`createdAt`),
    INDEX `Notification_priority_idx`(`priority`),
    INDEX `Notification_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserNotificationSettings` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `emailNotifications` BOOLEAN NOT NULL DEFAULT true,
    `pushNotifications` BOOLEAN NOT NULL DEFAULT true,
    `smsNotifications` BOOLEAN NOT NULL DEFAULT true,
    `marketingEmails` BOOLEAN NOT NULL DEFAULT true,
    `deviceTokens` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserNotificationSettings_userId_key`(`userId`),
    INDEX `UserNotificationSettings_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `parentId` VARCHAR(191) NULL,

    UNIQUE INDEX `Category_title_key`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CategoryOnPost` (
    `postId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    INDEX `CategoryOnPost_postId_idx`(`postId`),
    INDEX `CategoryOnPost_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`postId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CategoryOnNotification` (
    `notificationId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `CategoryOnNotification_notificationId_key`(`notificationId`),
    INDEX `CategoryOnNotification_notificationId_idx`(`notificationId`),
    INDEX `CategoryOnNotification_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`notificationId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CategoryOnProduct` (
    `productId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    INDEX `CategoryOnProduct_productId_idx`(`productId`),
    INDEX `CategoryOnProduct_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`productId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CategoryOnNotice` (
    `noticeDivarId` VARCHAR(191) NOT NULL,
    `noticeEstId` VARCHAR(191) NOT NULL,
    `noticePartPId` VARCHAR(191) NOT NULL,
    `noticeShopSupplierId` VARCHAR(191) NOT NULL,
    `garageRequirementsRequestId` VARCHAR(191) NOT NULL,
    `autoServicesRequirementsRequestId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    INDEX `CategoryOnNotice_noticeDivarId_idx`(`noticeDivarId`),
    INDEX `CategoryOnNotice_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`noticeDivarId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tag` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Tag_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TagOnPost` (
    `postId` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,

    INDEX `TagOnPost_postId_idx`(`postId`),
    INDEX `TagOnPost_tagId_idx`(`tagId`),
    PRIMARY KEY (`postId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TagOnNotification` (
    `notificationId` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `TagOnNotification_notificationId_key`(`notificationId`),
    INDEX `TagOnNotification_notificationId_idx`(`notificationId`),
    INDEX `TagOnNotification_tagId_idx`(`tagId`),
    PRIMARY KEY (`notificationId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TagOnProduct` (
    `productId` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,

    INDEX `TagOnProduct_productId_idx`(`productId`),
    INDEX `TagOnProduct_tagId_idx`(`tagId`),
    PRIMARY KEY (`productId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TagOnNotice` (
    `noticeDivarId` VARCHAR(191) NOT NULL,
    `noticeEstId` VARCHAR(191) NOT NULL,
    `noticePartPId` VARCHAR(191) NOT NULL,
    `noticeShopSupplierId` VARCHAR(191) NOT NULL,
    `garageRequirementsRequestId` VARCHAR(191) NOT NULL,
    `autoServicesRequirementsRequestId` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,

    INDEX `TagOnNotice_noticeDivarId_idx`(`noticeDivarId`),
    INDEX `TagOnNotice_tagId_idx`(`tagId`),
    PRIMARY KEY (`noticeDivarId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Garage` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `garage_name` VARCHAR(191) NOT NULL,
    `garageSerialNumber` VARCHAR(191) NULL,
    `garageSquadeProfit` DOUBLE NOT NULL DEFAULT 0,
    `sign` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `telephone` VARCHAR(191) NULL,
    `lat_lng` VARCHAR(191) NULL,
    `businessLicense` VARCHAR(191) NULL,
    `profit` VARCHAR(191) NULL,
    `garageMainField` ENUM('مکانیکی', 'اتوسرویس', 'صافکاری_و_نقاشی') NULL,
    `garageField` ENUM('جلوبندی_سازی', 'باطری_سازی_و_برقی_خودرو', 'موتور', 'صافکاری_نقاشی_و_بدنه') NULL,
    `acceptanceProjectCount` VARCHAR(191) NULL,
    `rating` DOUBLE NULL,
    `totalReviews` INTEGER NOT NULL DEFAULT 0,
    `totalProjects` INTEGER NOT NULL DEFAULT 0,
    `completedProjects` INTEGER NOT NULL DEFAULT 0,
    `cancelledProjects` INTEGER NOT NULL DEFAULT 0,
    `activeComplaints` INTEGER NOT NULL DEFAULT 0,
    `successRate` DOUBLE NULL,
    `averageResponseTime` DOUBLE NULL,
    `totalActivityDays` INTEGER NOT NULL DEFAULT 0,
    `currentStreak` INTEGER NOT NULL DEFAULT 0,
    `longestStreak` INTEGER NOT NULL DEFAULT 0,
    `lastActivityDate` DATETIME(3) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `verificationDate` DATETIME(3) NULL,
    `profileImageUrl` VARCHAR(191) NULL,
    `coverImageUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Garage_ownerId_key`(`ownerId`),
    INDEX `garage_search_index`(`garage_name`, `telephone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GarageActivityLog` (
    `id` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `projectCount` INTEGER NOT NULL DEFAULT 0,
    `collaborationCount` INTEGER NOT NULL DEFAULT 0,
    `partOrderCount` INTEGER NOT NULL DEFAULT 0,
    `completedProjectCount` INTEGER NOT NULL DEFAULT 0,
    `apprenticeshipCount` INTEGER NOT NULL DEFAULT 0,
    `outSourceCount` INTEGER NOT NULL DEFAULT 0,
    `activityLevel` ENUM('NONE', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH') NOT NULL DEFAULT 'NONE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GarageActivityLog_date_activityLevel_idx`(`date`, `activityLevel`),
    UNIQUE INDEX `GarageActivityLog_garageId_date_key`(`garageId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GarageWeeklyTimeline` (
    `id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GarageMechanicsMothlyPaying` (
    `id` VARCHAR(191) NOT NULL,
    `month` VARCHAR(191) NOT NULL,
    `year` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `garage` VARCHAR(191) NOT NULL,
    `mechanicId` VARCHAR(191) NOT NULL,
    `mechanic` VARCHAR(191) NOT NULL,
    `apprenticeId` VARCHAR(191) NOT NULL,
    `apprentice` VARCHAR(191) NOT NULL,
    `projectSharePercentage` DOUBLE NOT NULL,
    `outsourceSharePercentage` DOUBLE NOT NULL,
    `totalInhouseProjectsCount` VARCHAR(191) NOT NULL,
    `totalOutsourceProjectsCount` VARCHAR(191) NOT NULL,
    `totalInhouseProjectsIncome` DOUBLE NOT NULL,
    `totalOutsourceProjectsIncome` DOUBLE NOT NULL,
    `totalEarning` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Project` (
    `id` VARCHAR(191) NOT NULL,
    `requesterId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `suplierStoreId` VARCHAR(191) NOT NULL,
    `partSupplyStatus` ENUM('NOTADD', 'INPROGRESS', 'SUPPLIED') NOT NULL DEFAULT 'NOTADD',
    `invoiceFactorUrl` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `car` VARCHAR(191) NOT NULL,
    `plateNumber` VARCHAR(191) NOT NULL,
    `chassisNumber` VARCHAR(191) NOT NULL,
    `carMillage` VARCHAR(191) NOT NULL,
    `buildYear` VARCHAR(191) NOT NULL,
    `brokeReportDetails` VARCHAR(191) NOT NULL,
    `fixReportDetails` VARCHAR(191) NOT NULL,
    `clientRate` VARCHAR(191) NOT NULL,
    `suppliedParts` VARCHAR(191) NOT NULL,
    `invoiceFactor` VARCHAR(191) NOT NULL,
    `partSupplyFactor` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED') NOT NULL DEFAULT 'PENDING',
    `budget` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `priority` ENUM('LOW', 'NORMAL', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `deadline` DATETIME(3) NULL,
    `requirements` JSON NULL,

    UNIQUE INDEX `Project_requesterId_key`(`requesterId`),
    UNIQUE INDEX `Project_providerId_key`(`providerId`),
    UNIQUE INDEX `Project_clientId_key`(`clientId`),
    UNIQUE INDEX `Project_garageId_key`(`garageId`),
    UNIQUE INDEX `Project_suplierStoreId_key`(`suplierStoreId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectsMechanicWorkAt` (
    `id` VARCHAR(191) NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED') NOT NULL,
    `mechanicId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `noticeDastyarId` VARCHAR(191) NULL,
    `garageMechanicsMothlyPayingId` VARCHAR(191) NOT NULL,
    `totlalIncomeOfProject` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProjectsMechanicWorkAt_noticeDastyarId_key`(`noticeDastyarId`),
    UNIQUE INDEX `ProjectsMechanicWorkAt_garageMechanicsMothlyPayingId_key`(`garageMechanicsMothlyPayingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectsApprenticeWorkAt` (
    `id` VARCHAR(191) NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED') NOT NULL,
    `apprenticeId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `noticeDastyarId` VARCHAR(191) NULL,
    `garageApprenticeMothlyPayingId` VARCHAR(191) NOT NULL,
    `totlalIncomeOfProject` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProjectsApprenticeWorkAt_noticeDastyarId_key`(`noticeDastyarId`),
    UNIQUE INDEX `ProjectsApprenticeWorkAt_garageApprenticeMothlyPayingId_key`(`garageApprenticeMothlyPayingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `requesterConfirmedCompletion` BOOLEAN NOT NULL DEFAULT false,
    `providerConfirmedCompletion` BOOLEAN NOT NULL DEFAULT false,
    `completionConfirmedAt` DATETIME(3) NULL,
    `metricId` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `garageOilServiceProjectId` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NULL,
    `requesterConfirmedPayment` BOOLEAN NOT NULL DEFAULT false,
    `providerConfirmedPayment` BOOLEAN NOT NULL DEFAULT false,
    `paymentConfirmedAt` DATETIME(3) NULL,
    `hasDispute` BOOLEAN NOT NULL DEFAULT false,
    `disputeReason` VARCHAR(191) NULL,
    `disputeResolution` VARCHAR(191) NULL,
    `depositAmount` DOUBLE NULL,
    `depositPaid` BOOLEAN NOT NULL DEFAULT false,
    `remainingAmount` DOUBLE NULL,

    UNIQUE INDEX `Transaction_projectId_key`(`projectId`),
    UNIQUE INDEX `Transaction_metricId_key`(`metricId`),
    UNIQUE INDEX `Transaction_couponId_key`(`couponId`),
    UNIQUE INDEX `Transaction_garageOilServiceProjectId_key`(`garageOilServiceProjectId`),
    UNIQUE INDEX `Transaction_conversationId_key`(`conversationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Complaint` (
    `id` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `response` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
    `resolution` VARCHAR(191) NULL,
    `resolutionDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `assignedAdminId` VARCHAR(191) NULL,
    `adminNotes` VARCHAR(191) NULL,

    UNIQUE INDEX `Complaint_transactionId_key`(`transactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Conversation` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('DIRECT', 'GROUP', 'PROJECT', 'SUPPORT', 'TRANSACTION') NOT NULL DEFAULT 'DIRECT',
    `name` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastMessageAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `projectId` VARCHAR(191) NULL,
    `garageOilServiceProjectId` VARCHAR(191) NOT NULL,
    `garagePartOrderId` VARCHAR(191) NOT NULL,
    `noticeOutSourcingId` VARCHAR(191) NOT NULL,
    `noticeApprenticeId` VARCHAR(191) NOT NULL,
    `noticeDastyarId` VARCHAR(191) NOT NULL,
    `metricId` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `metadata` JSON NULL,

    UNIQUE INDEX `Conversation_garageOilServiceProjectId_key`(`garageOilServiceProjectId`),
    UNIQUE INDEX `Conversation_noticeOutSourcingId_key`(`noticeOutSourcingId`),
    UNIQUE INDEX `Conversation_noticeApprenticeId_key`(`noticeApprenticeId`),
    UNIQUE INDEX `Conversation_noticeDastyarId_key`(`noticeDastyarId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConversationParticipant` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `leftAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `clanConversationId` VARCHAR(191) NOT NULL,
    `lastReadMessageId` VARCHAR(191) NULL,
    `lastReadAt` DATETIME(3) NULL,
    `isMuted` BOOLEAN NOT NULL DEFAULT false,
    `mutedUntil` DATETIME(3) NULL,
    `nickName` VARCHAR(191) NULL,
    `settings` JSON NULL,

    UNIQUE INDEX `ConversationParticipant_clanConversationId_key`(`clanConversationId`),
    UNIQUE INDEX `ConversationParticipant_conversationId_userId_key`(`conversationId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `type` ENUM('TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO', 'SYSTEM') NOT NULL DEFAULT 'TEXT',
    `content` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `status` ENUM('SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED') NOT NULL DEFAULT 'SENT',
    `isEdited` BOOLEAN NOT NULL DEFAULT false,
    `editedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    `replyToId` VARCHAR(191) NULL,
    `clanConversationId` VARCHAR(191) NOT NULL,
    `complaintId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Message_clanConversationId_key`(`clanConversationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MessageReaction` (
    `id` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `emoji` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MessageReaction_messageId_userId_emoji_key`(`messageId`, `userId`, `emoji`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MessageReadReceipt` (
    `id` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `readAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MessageReadReceipt_messageId_userId_key`(`messageId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attachment` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `fileType` VARCHAR(191) NOT NULL,
    `fileSize` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `duration` VARCHAR(191) NULL,
    `dimensions` JSON NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `processingError` VARCHAR(191) NULL,
    `metricId` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `successfulSellCouponByGarage_MechanicId` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NULL,
    `projectId` VARCHAR(191) NULL,
    `garageOilServiceProjectId` VARCHAR(191) NOT NULL,
    `garagePartOrderId` VARCHAR(191) NOT NULL,
    `supplierReqForSupplyId` VARCHAR(191) NOT NULL,
    `supplierReqForMetricId` VARCHAR(191) NOT NULL,
    `noticeOutSourcingId` VARCHAR(191) NOT NULL,
    `noticeApprenticeId` VARCHAR(191) NOT NULL,
    `noticeDastyarId` VARCHAR(191) NOT NULL,
    `complaintId` VARCHAR(191) NULL,
    `correlationType` ENUM('AUTHOR', 'TARGET') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Attachment_garageOilServiceProjectId_key`(`garageOilServiceProjectId`),
    UNIQUE INDEX `Attachment_garagePartOrderId_key`(`garagePartOrderId`),
    UNIQUE INDEX `Attachment_noticeOutSourcingId_key`(`noticeOutSourcingId`),
    UNIQUE INDEX `Attachment_noticeApprenticeId_key`(`noticeApprenticeId`),
    UNIQUE INDEX `Attachment_noticeDastyarId_key`(`noticeDastyarId`),
    UNIQUE INDEX `Attachment_complaintId_key`(`complaintId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectSMAttachments` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `fileType` VARCHAR(191) NOT NULL,
    `fileSize` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `duration` VARCHAR(191) NULL,
    `dimensions` JSON NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `processingError` VARCHAR(191) NULL,
    `projectId` VARCHAR(191) NULL,
    `garageOilServiceProjectId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProjectSMAttachments_garageOilServiceProjectId_key`(`garageOilServiceProjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Milestone` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `garagePartOrderId` VARCHAR(191) NOT NULL,
    `noticeOutSourcingId` VARCHAR(191) NOT NULL,
    `noticeApprenticeId` VARCHAR(191) NOT NULL,
    `noticeDastyarId` VARCHAR(191) NOT NULL,
    `metricId` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `garageOilServiceProjectId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Milestone_noticeOutSourcingId_key`(`noticeOutSourcingId`),
    UNIQUE INDEX `Milestone_noticeApprenticeId_key`(`noticeApprenticeId`),
    UNIQUE INDEX `Milestone_noticeDastyarId_key`(`noticeDastyarId`),
    UNIQUE INDEX `Milestone_garageOilServiceProjectId_key`(`garageOilServiceProjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MilestonePayment` (
    `id` VARCHAR(191) NOT NULL,
    `milestoneId` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MilestonePayment_milestoneId_key`(`milestoneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransactionsActivityLog` (
    `id` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NULL,
    `complaintId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `details` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `garagePartOrderId` VARCHAR(191) NOT NULL,
    `metricId` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `noticeOutSourcingId` VARCHAR(191) NOT NULL,
    `noticeApprenticeId` VARCHAR(191) NOT NULL,
    `noticeDastyarId` VARCHAR(191) NOT NULL,
    `garageOilServiceProjectId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TransactionsActivityLog_transactionId_key`(`transactionId`),
    UNIQUE INDEX `TransactionsActivityLog_noticeOutSourcingId_key`(`noticeOutSourcingId`),
    UNIQUE INDEX `TransactionsActivityLog_noticeApprenticeId_key`(`noticeApprenticeId`),
    UNIQUE INDEX `TransactionsActivityLog_noticeDastyarId_key`(`noticeDastyarId`),
    UNIQUE INDEX `TransactionsActivityLog_garageOilServiceProjectId_key`(`garageOilServiceProjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Address` (
    `id` VARCHAR(191) NOT NULL,
    `province` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `avenue` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `postalCode` VARCHAR(191) NULL,
    `supplierStoreId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Address_supplierStoreId_key`(`supplierStoreId`),
    UNIQUE INDEX `Address_garageId_key`(`garageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplierStore` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `sStoreSquadeProfit` DOUBLE NOT NULL DEFAULT 0,
    `numberOfSuccedSquadeCoupon` INTEGER NOT NULL DEFAULT 0,
    `telephone` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `serialNumber` VARCHAR(191) NULL,
    `profit` VARCHAR(191) NULL,
    `field` VARCHAR(191) NOT NULL,
    `profileImageUrl` VARCHAR(191) NULL,
    `coverImageUrl` VARCHAR(191) NULL,
    `referredById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SupplierStore_ownerId_key`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItem` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `partNumber` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `price` DOUBLE NOT NULL,
    `quantity` VARCHAR(191) NOT NULL,
    `supplierStoreId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyPartPriceList` (
    `id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplierStoreWeeklyTimeline` (
    `id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GaragePartOrder` (
    `id` VARCHAR(191) NOT NULL,
    `publisherId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `suplierStoreId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `city` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED') NOT NULL DEFAULT 'PENDING',
    `budget` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `requirements` JSON NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `garageOilServiceProjectId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `GaragePartOrder_projectId_key`(`projectId`),
    UNIQUE INDEX `GaragePartOrder_garageOilServiceProjectId_key`(`garageOilServiceProjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequestedForSupply` (
    `id` VARCHAR(191) NOT NULL,
    `supplierStoreId` VARCHAR(191) NOT NULL,
    `garagePartOrderId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartOrderSupplyCollaborationHistory` (
    `id` VARCHAR(191) NOT NULL,
    `requestedGarageId` VARCHAR(191) NOT NULL,
    `supplierStoreId` VARCHAR(191) NOT NULL,
    `coWorkingCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartOrder` (
    `id` VARCHAR(191) NOT NULL,
    `garagePartOrderId` VARCHAR(191) NOT NULL,
    `quantity` VARCHAR(191) NOT NULL,
    `condition` ENUM('NEW', 'USED', 'REFURBISHED') NOT NULL DEFAULT 'NEW',
    `urgencyLevel` INTEGER NOT NULL DEFAULT 1,
    `notes` VARCHAR(191) NULL,
    `preferredBrands` VARCHAR(191) NULL,
    `maxPrice` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PartOrder_garagePartOrderId_key`(`garagePartOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplyParts` (
    `id` VARCHAR(191) NOT NULL,
    `RequestedForSupplyId` VARCHAR(191) NOT NULL,
    `quantity` VARCHAR(191) NOT NULL,
    `condition` ENUM('NEW', 'USED', 'REFURBISHED') NOT NULL,
    `brand` VARCHAR(191) NULL,
    `unitPrice` DOUBLE NOT NULL,
    `totalPrice` DOUBLE NOT NULL,
    `inStock` BOOLEAN NOT NULL DEFAULT true,
    `estimatedDeliveryDays` VARCHAR(191) NULL,
    `warrantyMonths` VARCHAR(191) NULL,
    `qualityCertification` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `manufacturingYear` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SupplyParts_RequestedForSupplyId_key`(`RequestedForSupplyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartSpecification` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` ENUM('BRAKE_SYSTEM', 'ENGINE', 'TRANSMISSION', 'SUSPENSION', 'ELECTRICAL', 'FLUID', 'BODY', 'OTHER') NOT NULL,
    `brand` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `year` VARCHAR(191) NULL,
    `details` JSON NULL,
    `supplyPartId` VARCHAR(191) NULL,
    `partOrderId` VARCHAR(191) NULL,
    `supplierReqForMetricId` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `metricId` VARCHAR(191) NOT NULL,
    `successfulSellCouponByGarage_MechanicId` VARCHAR(191) NOT NULL,
    `wasSupplierStoreMetricAssignmentSuccessfulId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GarageAwaitList` (
    `id` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `acceptancestatus` ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL,
    `acceptanceReportSheetUrl` VARCHAR(191) NULL,
    `carPlateNumber` VARCHAR(191) NOT NULL,
    `carMillage` VARCHAR(191) NOT NULL,
    `carModel` VARCHAR(191) NOT NULL,
    `carChassisNumber` VARCHAR(191) NULL,
    `requirements` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GarageOilServiceProjects` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `invoiceFactorUrl` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `lastServiceMilage` VARCHAR(191) NULL,
    `lastServiceOil` VARCHAR(191) NULL,
    `thisServiceMilage` VARCHAR(191) NULL,
    `thisServiceOil` VARCHAR(191) NULL,
    `car` VARCHAR(191) NOT NULL,
    `plateNumber` VARCHAR(191) NOT NULL,
    `chassisNumber` VARCHAR(191) NOT NULL,
    `carMillage` VARCHAR(191) NOT NULL,
    `buildYear` VARCHAR(191) NOT NULL,
    `brokeReportDetails` VARCHAR(191) NOT NULL,
    `fixReportDetails` VARCHAR(191) NOT NULL,
    `clientRate` VARCHAR(191) NOT NULL,
    `suppliedParts` VARCHAR(191) NOT NULL,
    `invoiceFactor` VARCHAR(191) NOT NULL,
    `partSupplyFactor` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED') NOT NULL DEFAULT 'PENDING',
    `budget` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `priority` ENUM('LOW', 'NORMAL', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `deadline` DATETIME(3) NULL,
    `requirements` JSON NULL,

    UNIQUE INDEX `GarageOilServiceProjects_clientId_key`(`clientId`),
    UNIQUE INDEX `GarageOilServiceProjects_garageId_key`(`garageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GarageRequirementsRequest` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `featuredImage` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `shareCount` INTEGER NOT NULL DEFAULT 0,
    `slug` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,

    UNIQUE INDEX `GarageRequirementsRequest_slug_key`(`slug`),
    INDEX `GarageRequirementsRequest_authorId_idx`(`authorId`),
    INDEX `GarageRequirementsRequest_slug_idx`(`slug`),
    INDEX `GarageRequirementsRequest_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AutoServicesRequirementsRequest` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `featuredImage` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `shareCount` INTEGER NOT NULL DEFAULT 0,
    `slug` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,

    UNIQUE INDEX `AutoServicesRequirementsRequest_slug_key`(`slug`),
    INDEX `AutoServicesRequirementsRequest_authorId_idx`(`authorId`),
    INDEX `AutoServicesRequirementsRequest_slug_idx`(`slug`),
    INDEX `AutoServicesRequirementsRequest_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NoticeDivar` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `featuredImage` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `shareCount` INTEGER NOT NULL DEFAULT 0,
    `slug` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,

    UNIQUE INDEX `NoticeDivar_slug_key`(`slug`),
    INDEX `NoticeDivar_authorId_idx`(`authorId`),
    INDEX `NoticeDivar_slug_idx`(`slug`),
    INDEX `NoticeDivar_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NoticeEstNiaz` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `featuredImage` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `shareCount` INTEGER NOT NULL DEFAULT 0,
    `slug` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,

    UNIQUE INDEX `NoticeEstNiaz_slug_key`(`slug`),
    INDEX `NoticeEstNiaz_authorId_idx`(`authorId`),
    INDEX `NoticeEstNiaz_slug_idx`(`slug`),
    INDEX `NoticeEstNiaz_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NoticeOutSourcing` (
    `id` VARCHAR(191) NOT NULL,
    `publisherId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED') NOT NULL DEFAULT 'PENDING',
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `budget` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `requirements` JSON NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `requesterGarageId` VARCHAR(191) NOT NULL,
    `acceptorGarageId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `NoticeOutSourcing_projectId_key`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GarageReqsForOutSourcingCoWork` (
    `id` VARCHAR(191) NOT NULL,
    `publisherId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `noticeOutSourcingId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GarageReqsForOutSourcingCoWork_publisherId_key`(`publisherId`),
    UNIQUE INDEX `GarageReqsForOutSourcingCoWork_garageId_key`(`garageId`),
    UNIQUE INDEX `GarageReqsForOutSourcingCoWork_noticeOutSourcingId_key`(`noticeOutSourcingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OutSourcingCollaborationHistory` (
    `id` VARCHAR(191) NOT NULL,
    `hostGarageId` VARCHAR(191) NOT NULL,
    `acceptorGarageId` VARCHAR(191) NOT NULL,
    `coWorkingCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NoticePartProviding` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `featuredImage` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `shareCount` INTEGER NOT NULL DEFAULT 0,
    `slug` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,

    UNIQUE INDEX `NoticePartProviding_slug_key`(`slug`),
    INDEX `NoticePartProviding_authorId_idx`(`authorId`),
    INDEX `NoticePartProviding_slug_idx`(`slug`),
    INDEX `NoticePartProviding_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NoticeApprenticeship` (
    `id` VARCHAR(191) NOT NULL,
    `publisherId` VARCHAR(191) NOT NULL,
    `apprenticeId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED') NOT NULL DEFAULT 'PENDING',
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `budget` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `requirements` JSON NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `requesterGarageId` VARCHAR(191) NOT NULL,
    `acceptorGarageId` VARCHAR(191) NULL,

    UNIQUE INDEX `NoticeApprenticeship_projectId_key`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShagerdReqsForApprenticeCoWork` (
    `id` VARCHAR(191) NOT NULL,
    `apprenticeId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED') NOT NULL,
    `noticeApprenticeId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ShagerdReqsForApprenticeCoWork_apprenticeId_key`(`apprenticeId`),
    UNIQUE INDEX `ShagerdReqsForApprenticeCoWork_garageId_key`(`garageId`),
    UNIQUE INDEX `ShagerdReqsForApprenticeCoWork_noticeApprenticeId_key`(`noticeApprenticeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GarageReqsForApprenticeCoWork` (
    `id` VARCHAR(191) NOT NULL,
    `garageOwnerId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `apprenticeId` VARCHAR(191) NOT NULL,
    `noticeApprenticeId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GarageReqsForApprenticeCoWork_garageOwnerId_key`(`garageOwnerId`),
    UNIQUE INDEX `GarageReqsForApprenticeCoWork_garageId_key`(`garageId`),
    UNIQUE INDEX `GarageReqsForApprenticeCoWork_apprenticeId_key`(`apprenticeId`),
    UNIQUE INDEX `GarageReqsForApprenticeCoWork_noticeApprenticeId_key`(`noticeApprenticeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NoticeDastyar` (
    `id` VARCHAR(191) NOT NULL,
    `publisherId` VARCHAR(191) NOT NULL,
    `acceptorMechanicId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED') NOT NULL DEFAULT 'PENDING',
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `budget` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `requirements` JSON NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `requesterGarageId` VARCHAR(191) NOT NULL,
    `acceptorGarageId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `NoticeDastyar_projectId_key`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MechanicReqsForDastyarCoWork` (
    `id` VARCHAR(191) NOT NULL,
    `mechanicId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NULL,
    `noticeDastyarId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MechanicReqsForDastyarCoWork_mechanicId_key`(`mechanicId`),
    UNIQUE INDEX `MechanicReqsForDastyarCoWork_garageId_key`(`garageId`),
    UNIQUE INDEX `MechanicReqsForDastyarCoWork_noticeDastyarId_key`(`noticeDastyarId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GarageReqsForDastyarCoWork` (
    `id` VARCHAR(191) NOT NULL,
    `garageOwnerId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `mechanicId` VARCHAR(191) NOT NULL,
    `noticeDastyarId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GarageReqsForDastyarCoWork_garageOwnerId_key`(`garageOwnerId`),
    UNIQUE INDEX `GarageReqsForDastyarCoWork_garageId_key`(`garageId`),
    UNIQUE INDEX `GarageReqsForDastyarCoWork_mechanicId_key`(`mechanicId`),
    UNIQUE INDEX `GarageReqsForDastyarCoWork_noticeDastyarId_key`(`noticeDastyarId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MechanicReadyToWork` (
    `id` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `mechanicId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MechanicReadyToWork_mechanicId_key`(`mechanicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Metric` (
    `id` VARCHAR(191) NOT NULL,
    `publisherId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `supplierStoreId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED') NOT NULL DEFAULT 'PENDING',
    `requirements` JSON NULL,
    `carModel` VARCHAR(191) NULL,
    `carBuildYear` VARCHAR(191) NULL,
    `quantity` VARCHAR(191) NOT NULL,
    `condition` ENUM('NEW', 'USED', 'REFURBISHED') NOT NULL DEFAULT 'NEW',
    `urgencyLevel` INTEGER NOT NULL DEFAULT 1,
    `notes` VARCHAR(191) NOT NULL,
    `metricStatus` ENUM('GOOD', 'WARNING', 'CRITICAL', 'NEEDS_REPLACEMENT') NOT NULL,
    `currentUsage` DOUBLE NOT NULL,
    `maxLifespan` DOUBLE NOT NULL,
    `estimatedReplacementCost` DOUBLE NULL,
    `inspectionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `nextInspectionDate` DATETIME(3) NULL,
    `recommendedAction` VARCHAR(191) NULL,
    `mechanicCommissionPercentage` DOUBLE NULL DEFAULT 0,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `shareCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Metric_projectId_key`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplierStoreReqsForMetricAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `publisherId` VARCHAR(191) NOT NULL,
    `supplierStoreId` VARCHAR(191) NOT NULL,
    `metricId` VARCHAR(191) NOT NULL,
    `quantity` VARCHAR(191) NOT NULL,
    `condition` ENUM('NEW', 'USED', 'REFURBISHED') NOT NULL DEFAULT 'NEW',
    `urgencyLevel` INTEGER NOT NULL DEFAULT 1,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SupplierStoreReqsForMetricAssignment_publisherId_key`(`publisherId`),
    UNIQUE INDEX `SupplierStoreReqsForMetricAssignment_supplierStoreId_key`(`supplierStoreId`),
    UNIQUE INDEX `SupplierStoreReqsForMetricAssignment_metricId_key`(`metricId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WasSupplierStoreMetricAssignmentSuccessful` (
    `id` VARCHAR(191) NOT NULL,
    `supplierStoreId` VARCHAR(191) NOT NULL,
    `metricId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `finalPrice` VARCHAR(191) NULL,
    `totalMetricAssignments` INTEGER NOT NULL DEFAULT 0,
    `successfulAssignments` INTEGER NOT NULL DEFAULT 0,
    `successRate` DOUBLE NOT NULL DEFAULT 0,
    `lastAssignmentDate` DATETIME(3) NULL,
    `quantity` VARCHAR(191) NOT NULL,
    `condition` ENUM('NEW', 'USED', 'REFURBISHED') NOT NULL DEFAULT 'NEW',
    `urgencyLevel` INTEGER NOT NULL DEFAULT 1,
    `notes` VARCHAR(191) NULL,
    `partDetails` JSON NOT NULL,
    `salePrice` DOUBLE NOT NULL,
    `mechanicCommission` DOUBLE NULL,
    `saleDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WasSupplierStoreMetricAssignmentSuccessful_supplierStoreId_key`(`supplierStoreId`),
    UNIQUE INDEX `WasSupplierStoreMetricAssignmentSuccessful_metricId_key`(`metricId`),
    UNIQUE INDEX `WasSupplierStoreMetricAssignmentSuccessful_garageId_key`(`garageId`),
    UNIQUE INDEX `WasSupplierStoreMetricAssignmentSuccessful_clientId_key`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Coupons` (
    `id` VARCHAR(191) NOT NULL,
    `publisherId` VARCHAR(191) NOT NULL,
    `supplierStoreId` VARCHAR(191) NOT NULL,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `city` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED') NOT NULL DEFAULT 'PENDING',
    `requirements` JSON NULL,
    `quantity` VARCHAR(191) NOT NULL,
    `condition` ENUM('NEW', 'USED', 'REFURBISHED') NOT NULL DEFAULT 'NEW',
    `urgencyLevel` INTEGER NOT NULL DEFAULT 1,
    `notes` VARCHAR(191) NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `shareCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CouponMechanicAcceptor` (
    `id` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `mechanicId` VARCHAR(191) NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',

    UNIQUE INDEX `CouponMechanicAcceptor_couponId_mechanicId_key`(`couponId`, `mechanicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CouponMechanicSuccess` (
    `id` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `mechanicId` VARCHAR(191) NOT NULL,
    `succeededAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CouponMechanicSuccess_couponId_mechanicId_key`(`couponId`, `mechanicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CouponGarageAcceptor` (
    `id` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',

    UNIQUE INDEX `CouponGarageAcceptor_couponId_garageId_key`(`couponId`, `garageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CouponGarageSuccess` (
    `id` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NOT NULL,
    `succeededAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CouponGarageSuccess_couponId_garageId_key`(`couponId`, `garageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mechanic_GarageReqsForCouponAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `publisherId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Mechanic_GarageReqsForCouponAssignment_publisherId_key`(`publisherId`),
    UNIQUE INDEX `Mechanic_GarageReqsForCouponAssignment_garageId_key`(`garageId`),
    UNIQUE INDEX `Mechanic_GarageReqsForCouponAssignment_couponId_key`(`couponId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SuccessfulSellCouponByGarage_Mechanic` (
    `id` VARCHAR(191) NOT NULL,
    `publisherId` VARCHAR(191) NOT NULL,
    `garageId` VARCHAR(191) NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `quantity` VARCHAR(191) NOT NULL,
    `condition` ENUM('NEW', 'USED', 'REFURBISHED') NOT NULL DEFAULT 'NEW',
    `urgencyLevel` INTEGER NOT NULL DEFAULT 1,
    `notes` VARCHAR(191) NULL,

    UNIQUE INDEX `SuccessfulSellCouponByGarage_Mechanic_publisherId_key`(`publisherId`),
    UNIQUE INDEX `SuccessfulSellCouponByGarage_Mechanic_garageId_key`(`garageId`),
    UNIQUE INDEX `SuccessfulSellCouponByGarage_Mechanic_couponId_key`(`couponId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NoticeShopSupplier` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `featuredImage` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `shareCount` INTEGER NOT NULL DEFAULT 0,
    `slug` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,

    UNIQUE INDEX `NoticeShopSupplier_slug_key`(`slug`),
    INDEX `NoticeShopSupplier_authorId_idx`(`authorId`),
    INDEX `NoticeShopSupplier_slug_idx`(`slug`),
    INDEX `NoticeShopSupplier_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SellFromSupplier` (
    `id` VARCHAR(191) NOT NULL,
    `supplierStoreId` VARCHAR(191) NOT NULL,
    `mechanicId` VARCHAR(191) NULL,
    `garageId` VARCHAR(191) NULL,
    `sellCount` INTEGER NOT NULL DEFAULT 0,
    `totalSellPrice` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `SellFromSupplier_mechanicId_key`(`mechanicId`),
    UNIQUE INDEX `SellFromSupplier_garageId_key`(`garageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sliders` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `text` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WelcomeAllert` (
    `id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Campaigns` (
    `id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_PermissionToRole` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_PermissionToRole_AB_unique`(`A`, `B`),
    INDEX `_PermissionToRole_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_AttachmentToGarageAwaitList` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_AttachmentToGarageAwaitList_AB_unique`(`A`, `B`),
    INDEX `_AttachmentToGarageAwaitList_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserProfile` ADD CONSTRAINT `UserProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessProfile` ADD CONSTRAINT `BusinessProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessProfile` ADD CONSTRAINT `mechanics` FOREIGN KEY (`mechanicGarageId`) REFERENCES `Garage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessProfile` ADD CONSTRAINT `apprentices` FOREIGN KEY (`apprenticeGarageId`) REFERENCES `Garage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectProfile` ADD CONSTRAINT `ProjectProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SocialProfile` ADD CONSTRAINT `SocialProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityProfile` ADD CONSTRAINT `ActivityProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InteractiveContentProfile` ADD CONSTRAINT `InteractiveContentProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Clan` ADD CONSTRAINT `Clan_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanMembership` ADD CONSTRAINT `ClanMembership_clanId_fkey` FOREIGN KEY (`clanId`) REFERENCES `Clan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanMembership` ADD CONSTRAINT `ClanMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanRanking` ADD CONSTRAINT `ClanRanking_clanId_fkey` FOREIGN KEY (`clanId`) REFERENCES `Clan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanReward` ADD CONSTRAINT `ClanReward_clanId_fkey` FOREIGN KEY (`clanId`) REFERENCES `Clan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanReward` ADD CONSTRAINT `ClanReward_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `ClanMembership`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanConversation` ADD CONSTRAINT `ClanConversation_clanId_fkey` FOREIGN KEY (`clanId`) REFERENCES `Clan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PinnedClanMessage` ADD CONSTRAINT `PinnedClanMessage_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `ClanConversation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PinnedClanMessage` ADD CONSTRAINT `PinnedClanMessage_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCommunication` ADD CONSTRAINT `ClanCommunication_clanId_fkey` FOREIGN KEY (`clanId`) REFERENCES `Clan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCommunication` ADD CONSTRAINT `ClanCommunication_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `ClanMembership`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCommunicationReaction` ADD CONSTRAINT `ClanCommunicationReaction_communicationId_fkey` FOREIGN KEY (`communicationId`) REFERENCES `ClanCommunication`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCommunicationReaction` ADD CONSTRAINT `ClanCommunicationReaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCommunicationThread` ADD CONSTRAINT `ClanCommunicationThread_clanId_fkey` FOREIGN KEY (`clanId`) REFERENCES `Clan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunicationThreadParticipant` ADD CONSTRAINT `CommunicationThreadParticipant_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `ClanCommunicationThread`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunicationThreadParticipant` ADD CONSTRAINT `CommunicationThreadParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCommunicationReply` ADD CONSTRAINT `ClanCommunicationReply_communicationId_fkey` FOREIGN KEY (`communicationId`) REFERENCES `ClanCommunication`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCommunicationReply` ADD CONSTRAINT `ClanCommunicationReply_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanInvite` ADD CONSTRAINT `ClanInvite_clanId_fkey` FOREIGN KEY (`clanId`) REFERENCES `Clan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanInvite` ADD CONSTRAINT `ClanInvite_fromUserId_fkey` FOREIGN KEY (`fromUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanInvite` ADD CONSTRAINT `ClanInvite_toUserId_fkey` FOREIGN KEY (`toUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanJoinRequest` ADD CONSTRAINT `ClanJoinRequest_clanId_fkey` FOREIGN KEY (`clanId`) REFERENCES `Clan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanJoinRequest` ADD CONSTRAINT `ClanJoinRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanActivity` ADD CONSTRAINT `ClanActivity_clanId_fkey` FOREIGN KEY (`clanId`) REFERENCES `Clan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanActivity` ADD CONSTRAINT `ClanActivity_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanMetric` ADD CONSTRAINT `ClanMetric_clanId_fkey` FOREIGN KEY (`clanId`) REFERENCES `Clan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanMetric` ADD CONSTRAINT `ClanMetric_creatorGarageId_fkey` FOREIGN KEY (`creatorGarageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanPartSpecification` ADD CONSTRAINT `ClanPartSpecification_clanMetricId_fkey` FOREIGN KEY (`clanMetricId`) REFERENCES `ClanMetric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanMetricBid` ADD CONSTRAINT `ClanMetricBid_clanMetricId_fkey` FOREIGN KEY (`clanMetricId`) REFERENCES `ClanMetric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanMetricBid` ADD CONSTRAINT `ClanMetricBid_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `SupplierStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanMetricAssignment` ADD CONSTRAINT `ClanMetricAssignment_clanMetricId_fkey` FOREIGN KEY (`clanMetricId`) REFERENCES `ClanMetric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanMetricAssignment` ADD CONSTRAINT `ClanMetricAssignment_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `SupplierStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanMetricCollaborator` ADD CONSTRAINT `ClanMetricCollaborator_clanMetricId_fkey` FOREIGN KEY (`clanMetricId`) REFERENCES `ClanMetric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanMetricCollaborator` ADD CONSTRAINT `ClanMetricCollaborator_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `ClanMembership`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCoupon` ADD CONSTRAINT `ClanCoupon_clanId_fkey` FOREIGN KEY (`clanId`) REFERENCES `Clan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCouponMechanicAcceptor` ADD CONSTRAINT `ClanCouponMechanicAcceptor_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `ClanCoupon`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCouponMechanicAcceptor` ADD CONSTRAINT `ClanCouponMechanicAcceptor_mechanicId_fkey` FOREIGN KEY (`mechanicId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCouponMechanicSuccess` ADD CONSTRAINT `ClanCouponMechanicSuccess_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `ClanCoupon`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCouponMechanicSuccess` ADD CONSTRAINT `ClanCouponMechanicSuccess_mechanicId_fkey` FOREIGN KEY (`mechanicId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCouponGarageAcceptor` ADD CONSTRAINT `ClanCouponGarageAcceptor_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `ClanCoupon`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCouponGarageAcceptor` ADD CONSTRAINT `ClanCouponGarageAcceptor_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCouponGarageSuccess` ADD CONSTRAINT `ClanCouponGarageSuccess_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `ClanCoupon`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCouponGarageSuccess` ADD CONSTRAINT `ClanCouponGarageSuccess_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCouponComment` ADD CONSTRAINT `ClanCouponComment_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `ClanCoupon`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCouponComment` ADD CONSTRAINT `ClanCouponComment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCouponLike` ADD CONSTRAINT `ClanCouponLike_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `ClanCoupon`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCouponLike` ADD CONSTRAINT `ClanCouponLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCouponBookmark` ADD CONSTRAINT `ClanCouponBookmark_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `ClanCoupon`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClanCouponBookmark` ADD CONSTRAINT `ClanCouponBookmark_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `ActivityProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `token_records` ADD CONSTRAINT `token_records_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `ActivityProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientRole` ADD CONSTRAINT `ClientRole_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientRole` ADD CONSTRAINT `ClientRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PermissionAuditLog` ADD CONSTRAINT `PermissionAuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `ActivityProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PermissionAuditLog` ADD CONSTRAINT `PermissionAuditLog_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoleResource` ADD CONSTRAINT `RoleResource_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserMedia` ADD CONSTRAINT `UserMedia_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `UserProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarageMedia` ADD CONSTRAINT `GarageMedia_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierStoreMedia` ADD CONSTRAINT `SupplierStoreMedia_supplierStoreId_fkey` FOREIGN KEY (`supplierStoreId`) REFERENCES `SupplierStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentMedia` ADD CONSTRAINT `ContentMedia_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentMedia` ADD CONSTRAINT `ContentMedia_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentMedia` ADD CONSTRAINT `ContentMedia_noticeDivarId_fkey` FOREIGN KEY (`noticeDivarId`) REFERENCES `NoticeDivar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentMedia` ADD CONSTRAINT `ContentMedia_noticeEstId_fkey` FOREIGN KEY (`noticeEstId`) REFERENCES `NoticeEstNiaz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentMedia` ADD CONSTRAINT `ContentMedia_noticePartPId_fkey` FOREIGN KEY (`noticePartPId`) REFERENCES `NoticePartProviding`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentMedia` ADD CONSTRAINT `ContentMedia_noticeShopSupplierId_fkey` FOREIGN KEY (`noticeShopSupplierId`) REFERENCES `NoticeShopSupplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentMedia` ADD CONSTRAINT `ContentMedia_garageRequirementsRequestId_fkey` FOREIGN KEY (`garageRequirementsRequestId`) REFERENCES `GarageRequirementsRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentMedia` ADD CONSTRAINT `ContentMedia_autoServicesRequirementsRequestId_fkey` FOREIGN KEY (`autoServicesRequirementsRequestId`) REFERENCES `AutoServicesRequirementsRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentMedia` ADD CONSTRAINT `ContentMedia_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `UserProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `BusinessProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_reportedUserId_fkey` FOREIGN KEY (`reportedUserId`) REFERENCES `BusinessProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserActivity` ADD CONSTRAINT `UserActivity_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `ActivityProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserActivity` ADD CONSTRAINT `UserActivity_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserActivity` ADD CONSTRAINT `UserActivity_tokenRecordId_fkey` FOREIGN KEY (`tokenRecordId`) REFERENCES `token_records`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_originalPostId_fkey` FOREIGN KEY (`originalPostId`) REFERENCES `Post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `SocialProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Repost` ADD CONSTRAINT `Repost_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `SocialProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Repost` ADD CONSTRAINT `Repost_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Repost` ADD CONSTRAINT `Repost_originalPosterId_fkey` FOREIGN KEY (`originalPosterId`) REFERENCES `SocialProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_supplierStoreId_fkey` FOREIGN KEY (`supplierStoreId`) REFERENCES `SupplierStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_basketId_fkey` FOREIGN KEY (`basketId`) REFERENCES `Basket`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Basket` ADD CONSTRAINT `Basket_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Basket` ADD CONSTRAINT `Basket_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Course` ADD CONSTRAINT `Course_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourseRegistration` ADD CONSTRAINT `CourseRegistration_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourseRegistration` ADD CONSTRAINT `CourseRegistration_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_supplierStoreId_fkey` FOREIGN KEY (`supplierStoreId`) REFERENCES `SupplierStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_tierId_fkey` FOREIGN KEY (`tierId`) REFERENCES `SubscriptionTier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeatureLimit` ADD CONSTRAINT `FeatureLimit_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsageLog` ADD CONSTRAINT `UsageLog_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillingRecord` ADD CONSTRAINT `BillingRecord_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillingRecord` ADD CONSTRAINT `BillingRecord_paymentMethodId_fkey` FOREIGN KEY (`paymentMethodId`) REFERENCES `Payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillingRecord` ADD CONSTRAINT `BillingRecord_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubscriptionChange` ADD CONSTRAINT `SubscriptionChange_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubscriptionChange` ADD CONSTRAINT `SubscriptionChange_fromPlanId_fkey` FOREIGN KEY (`fromPlanId`) REFERENCES `Plan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubscriptionChange` ADD CONSTRAINT `SubscriptionChange_toPlanId_fkey` FOREIGN KEY (`toPlanId`) REFERENCES `Plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Plan` ADD CONSTRAINT `Plan_tierId_fkey` FOREIGN KEY (`tierId`) REFERENCES `SubscriptionTier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Usage` ADD CONSTRAINT `Usage_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankAccount` ADD CONSTRAINT `BankAccount_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Referral` ADD CONSTRAINT `Referral_referrerId_fkey` FOREIGN KEY (`referrerId`) REFERENCES `BusinessProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Referral` ADD CONSTRAINT `Referral_referredId_fkey` FOREIGN KEY (`referredId`) REFERENCES `BusinessProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Referral` ADD CONSTRAINT `Referral_codeId_fkey` FOREIGN KEY (`codeId`) REFERENCES `ReferralCode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralStats` ADD CONSTRAINT `ReferralStats_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `BusinessProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralAchievement` ADD CONSTRAINT `ReferralAchievement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `BusinessProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralAchievement` ADD CONSTRAINT `ReferralAchievement_milestoneId_fkey` FOREIGN KEY (`milestoneId`) REFERENCES `ReferralMilestone`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubscriptionReward` ADD CONSTRAINT `SubscriptionReward_achievementId_fkey` FOREIGN KEY (`achievementId`) REFERENCES `ReferralAchievement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubscriptionReward` ADD CONSTRAINT `SubscriptionReward_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralCode` ADD CONSTRAINT `ReferralCode_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `BusinessProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reward` ADD CONSTRAINT `Reward_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `BusinessProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Comment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `SocialProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_metricId_fkey` FOREIGN KEY (`metricId`) REFERENCES `Metric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommentVote` ADD CONSTRAINT `CommentVote_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `Comment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommentVote` ADD CONSTRAINT `CommentVote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `SocialProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommentReport` ADD CONSTRAINT `CommentReport_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `Comment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommentReport` ADD CONSTRAINT `CommentReport_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `SocialProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_supplierStoreId_fkey` FOREIGN KEY (`supplierStoreId`) REFERENCES `SupplierStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `SocialProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_targetId_fkey` FOREIGN KEY (`targetId`) REFERENCES `SocialProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_metricId_fkey` FOREIGN KEY (`metricId`) REFERENCES `Metric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_garagePartOrderId_fkey` FOREIGN KEY (`garagePartOrderId`) REFERENCES `GaragePartOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_noticeOutSourcingId_fkey` FOREIGN KEY (`noticeOutSourcingId`) REFERENCES `NoticeOutSourcing`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_noticeApprenticeId_fkey` FOREIGN KEY (`noticeApprenticeId`) REFERENCES `NoticeApprenticeship`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_garageOilServiceProjectId_fkey` FOREIGN KEY (`garageOilServiceProjectId`) REFERENCES `GarageOilServiceProjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_noticeDastyarId_fkey` FOREIGN KEY (`noticeDastyarId`) REFERENCES `NoticeDastyar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Like` ADD CONSTRAINT `Like_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `SocialProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Like` ADD CONSTRAINT `Like_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Like` ADD CONSTRAINT `Like_metricId_fkey` FOREIGN KEY (`metricId`) REFERENCES `Metric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Like` ADD CONSTRAINT `Like_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dislike` ADD CONSTRAINT `Dislike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `SocialProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dislike` ADD CONSTRAINT `Dislike_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dislike` ADD CONSTRAINT `Dislike_metricId_fkey` FOREIGN KEY (`metricId`) REFERENCES `Metric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dislike` ADD CONSTRAINT `Dislike_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `SocialProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_noticeDivarId_fkey` FOREIGN KEY (`noticeDivarId`) REFERENCES `NoticeDivar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_noticeEstId_fkey` FOREIGN KEY (`noticeEstId`) REFERENCES `NoticeEstNiaz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_noticePartPId_fkey` FOREIGN KEY (`noticePartPId`) REFERENCES `NoticePartProviding`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_noticeShopSupplierId_fkey` FOREIGN KEY (`noticeShopSupplierId`) REFERENCES `NoticeShopSupplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_noticeApperenticeId_fkey` FOREIGN KEY (`noticeApperenticeId`) REFERENCES `NoticeApprenticeship`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_noticeDastyarId_fkey` FOREIGN KEY (`noticeDastyarId`) REFERENCES `NoticeDastyar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_noticeOutSourcingId_fkey` FOREIGN KEY (`noticeOutSourcingId`) REFERENCES `NoticeOutSourcing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_garagePartOrderId_fkey` FOREIGN KEY (`garagePartOrderId`) REFERENCES `GaragePartOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_garageRequirementsRequestId_fkey` FOREIGN KEY (`garageRequirementsRequestId`) REFERENCES `GarageRequirementsRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_autoServicesRequirementsRequestId_fkey` FOREIGN KEY (`autoServicesRequirementsRequestId`) REFERENCES `AutoServicesRequirementsRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_metricId_fkey` FOREIGN KEY (`metricId`) REFERENCES `Metric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmark` ADD CONSTRAINT `Bookmark_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Share` ADD CONSTRAINT `Share_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `SocialProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Share` ADD CONSTRAINT `Share_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Share` ADD CONSTRAINT `Share_noticeDivarId_fkey` FOREIGN KEY (`noticeDivarId`) REFERENCES `NoticeDivar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Share` ADD CONSTRAINT `Share_noticeEstId_fkey` FOREIGN KEY (`noticeEstId`) REFERENCES `NoticeEstNiaz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Share` ADD CONSTRAINT `Share_noticePartPId_fkey` FOREIGN KEY (`noticePartPId`) REFERENCES `NoticePartProviding`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Share` ADD CONSTRAINT `Share_noticeShopSupplierId_fkey` FOREIGN KEY (`noticeShopSupplierId`) REFERENCES `NoticeShopSupplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Share` ADD CONSTRAINT `Share_noticeApperenticeId_fkey` FOREIGN KEY (`noticeApperenticeId`) REFERENCES `NoticeApprenticeship`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Share` ADD CONSTRAINT `Share_noticeDastyarId_fkey` FOREIGN KEY (`noticeDastyarId`) REFERENCES `NoticeDastyar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Share` ADD CONSTRAINT `Share_noticeOutSourcingId_fkey` FOREIGN KEY (`noticeOutSourcingId`) REFERENCES `NoticeOutSourcing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Share` ADD CONSTRAINT `Share_garagePartOrderId_fkey` FOREIGN KEY (`garagePartOrderId`) REFERENCES `GaragePartOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Share` ADD CONSTRAINT `Share_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Share` ADD CONSTRAINT `Share_garageRequirementsRequestId_fkey` FOREIGN KEY (`garageRequirementsRequestId`) REFERENCES `GarageRequirementsRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Share` ADD CONSTRAINT `Share_autoServicesRequirementsRequestId_fkey` FOREIGN KEY (`autoServicesRequirementsRequestId`) REFERENCES `AutoServicesRequirementsRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Share` ADD CONSTRAINT `Share_metricId_fkey` FOREIGN KEY (`metricId`) REFERENCES `Metric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Share` ADD CONSTRAINT `Share_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserNotificationSettings` ADD CONSTRAINT `UserNotificationSettings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryOnPost` ADD CONSTRAINT `CategoryOnPost_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryOnPost` ADD CONSTRAINT `CategoryOnPost_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryOnNotification` ADD CONSTRAINT `CategoryOnNotification_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `Notification`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryOnNotification` ADD CONSTRAINT `CategoryOnNotification_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryOnProduct` ADD CONSTRAINT `CategoryOnProduct_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryOnProduct` ADD CONSTRAINT `CategoryOnProduct_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryOnNotice` ADD CONSTRAINT `CategoryOnNotice_noticeDivarId_fkey` FOREIGN KEY (`noticeDivarId`) REFERENCES `NoticeDivar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryOnNotice` ADD CONSTRAINT `CategoryOnNotice_noticeEstId_fkey` FOREIGN KEY (`noticeEstId`) REFERENCES `NoticeEstNiaz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryOnNotice` ADD CONSTRAINT `CategoryOnNotice_noticePartPId_fkey` FOREIGN KEY (`noticePartPId`) REFERENCES `NoticePartProviding`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryOnNotice` ADD CONSTRAINT `CategoryOnNotice_noticeShopSupplierId_fkey` FOREIGN KEY (`noticeShopSupplierId`) REFERENCES `NoticeShopSupplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryOnNotice` ADD CONSTRAINT `CategoryOnNotice_garageRequirementsRequestId_fkey` FOREIGN KEY (`garageRequirementsRequestId`) REFERENCES `GarageRequirementsRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryOnNotice` ADD CONSTRAINT `CategoryOnNotice_autoServicesRequirementsRequestId_fkey` FOREIGN KEY (`autoServicesRequirementsRequestId`) REFERENCES `AutoServicesRequirementsRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryOnNotice` ADD CONSTRAINT `CategoryOnNotice_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagOnPost` ADD CONSTRAINT `TagOnPost_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagOnPost` ADD CONSTRAINT `TagOnPost_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagOnNotification` ADD CONSTRAINT `TagOnNotification_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `Notification`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagOnNotification` ADD CONSTRAINT `TagOnNotification_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagOnProduct` ADD CONSTRAINT `TagOnProduct_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagOnProduct` ADD CONSTRAINT `TagOnProduct_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagOnNotice` ADD CONSTRAINT `TagOnNotice_noticeDivarId_fkey` FOREIGN KEY (`noticeDivarId`) REFERENCES `NoticeDivar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagOnNotice` ADD CONSTRAINT `TagOnNotice_noticeEstId_fkey` FOREIGN KEY (`noticeEstId`) REFERENCES `NoticeEstNiaz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagOnNotice` ADD CONSTRAINT `TagOnNotice_noticePartPId_fkey` FOREIGN KEY (`noticePartPId`) REFERENCES `NoticePartProviding`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagOnNotice` ADD CONSTRAINT `TagOnNotice_noticeShopSupplierId_fkey` FOREIGN KEY (`noticeShopSupplierId`) REFERENCES `NoticeShopSupplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagOnNotice` ADD CONSTRAINT `TagOnNotice_garageRequirementsRequestId_fkey` FOREIGN KEY (`garageRequirementsRequestId`) REFERENCES `GarageRequirementsRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagOnNotice` ADD CONSTRAINT `TagOnNotice_autoServicesRequirementsRequestId_fkey` FOREIGN KEY (`autoServicesRequirementsRequestId`) REFERENCES `AutoServicesRequirementsRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagOnNotice` ADD CONSTRAINT `TagOnNotice_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Garage` ADD CONSTRAINT `Garage_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `BusinessProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarageActivityLog` ADD CONSTRAINT `GarageActivityLog_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_suplierStoreId_fkey` FOREIGN KEY (`suplierStoreId`) REFERENCES `SupplierStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectsMechanicWorkAt` ADD CONSTRAINT `ProjectsMechanicWorkAt_mechanicId_fkey` FOREIGN KEY (`mechanicId`) REFERENCES `ProjectProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectsMechanicWorkAt` ADD CONSTRAINT `ProjectsMechanicWorkAt_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectsMechanicWorkAt` ADD CONSTRAINT `ProjectsMechanicWorkAt_noticeDastyarId_fkey` FOREIGN KEY (`noticeDastyarId`) REFERENCES `NoticeDastyar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectsMechanicWorkAt` ADD CONSTRAINT `ProjectsMechanicWorkAt_garageMechanicsMothlyPayingId_fkey` FOREIGN KEY (`garageMechanicsMothlyPayingId`) REFERENCES `GarageMechanicsMothlyPaying`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectsApprenticeWorkAt` ADD CONSTRAINT `ProjectsApprenticeWorkAt_apprenticeId_fkey` FOREIGN KEY (`apprenticeId`) REFERENCES `ProjectProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectsApprenticeWorkAt` ADD CONSTRAINT `ProjectsApprenticeWorkAt_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectsApprenticeWorkAt` ADD CONSTRAINT `ProjectsApprenticeWorkAt_noticeDastyarId_fkey` FOREIGN KEY (`noticeDastyarId`) REFERENCES `NoticeDastyar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectsApprenticeWorkAt` ADD CONSTRAINT `ProjectsApprenticeWorkAt_garageApprenticeMothlyPayingId_fkey` FOREIGN KEY (`garageApprenticeMothlyPayingId`) REFERENCES `GarageMechanicsMothlyPaying`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_metricId_fkey` FOREIGN KEY (`metricId`) REFERENCES `Metric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_garageOilServiceProjectId_fkey` FOREIGN KEY (`garageOilServiceProjectId`) REFERENCES `GarageOilServiceProjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Complaint` ADD CONSTRAINT `Complaint_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Complaint` ADD CONSTRAINT `Complaint_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Complaint` ADD CONSTRAINT `Complaint_targetId_fkey` FOREIGN KEY (`targetId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_garageOilServiceProjectId_fkey` FOREIGN KEY (`garageOilServiceProjectId`) REFERENCES `GarageOilServiceProjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_garagePartOrderId_fkey` FOREIGN KEY (`garagePartOrderId`) REFERENCES `GaragePartOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_noticeOutSourcingId_fkey` FOREIGN KEY (`noticeOutSourcingId`) REFERENCES `NoticeOutSourcing`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_noticeApprenticeId_fkey` FOREIGN KEY (`noticeApprenticeId`) REFERENCES `NoticeApprenticeship`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_noticeDastyarId_fkey` FOREIGN KEY (`noticeDastyarId`) REFERENCES `NoticeDastyar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_metricId_fkey` FOREIGN KEY (`metricId`) REFERENCES `Metric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConversationParticipant` ADD CONSTRAINT `ConversationParticipant_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConversationParticipant` ADD CONSTRAINT `ConversationParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `SocialProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConversationParticipant` ADD CONSTRAINT `ConversationParticipant_clanConversationId_fkey` FOREIGN KEY (`clanConversationId`) REFERENCES `ClanConversation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `ConversationParticipant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_replyToId_fkey` FOREIGN KEY (`replyToId`) REFERENCES `Message`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_clanConversationId_fkey` FOREIGN KEY (`clanConversationId`) REFERENCES `ClanConversation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_complaintId_fkey` FOREIGN KEY (`complaintId`) REFERENCES `Complaint`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MessageReaction` ADD CONSTRAINT `MessageReaction_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MessageReaction` ADD CONSTRAINT `MessageReaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `SocialProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MessageReadReceipt` ADD CONSTRAINT `MessageReadReceipt_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MessageReadReceipt` ADD CONSTRAINT `MessageReadReceipt_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `SocialProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_metricId_fkey` FOREIGN KEY (`metricId`) REFERENCES `Metric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_successfulSellCouponByGarage_MechanicId_fkey` FOREIGN KEY (`successfulSellCouponByGarage_MechanicId`) REFERENCES `SuccessfulSellCouponByGarage_Mechanic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_garageOilServiceProjectId_fkey` FOREIGN KEY (`garageOilServiceProjectId`) REFERENCES `GarageOilServiceProjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_garagePartOrderId_fkey` FOREIGN KEY (`garagePartOrderId`) REFERENCES `GaragePartOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_supplierReqForSupplyId_fkey` FOREIGN KEY (`supplierReqForSupplyId`) REFERENCES `RequestedForSupply`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_supplierReqForMetricId_fkey` FOREIGN KEY (`supplierReqForMetricId`) REFERENCES `SupplierStoreReqsForMetricAssignment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_noticeOutSourcingId_fkey` FOREIGN KEY (`noticeOutSourcingId`) REFERENCES `NoticeOutSourcing`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_noticeApprenticeId_fkey` FOREIGN KEY (`noticeApprenticeId`) REFERENCES `NoticeApprenticeship`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_noticeDastyarId_fkey` FOREIGN KEY (`noticeDastyarId`) REFERENCES `NoticeDastyar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_complaintId_fkey` FOREIGN KEY (`complaintId`) REFERENCES `Complaint`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectSMAttachments` ADD CONSTRAINT `ProjectSMAttachments_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectSMAttachments` ADD CONSTRAINT `ProjectSMAttachments_garageOilServiceProjectId_fkey` FOREIGN KEY (`garageOilServiceProjectId`) REFERENCES `GarageOilServiceProjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Milestone` ADD CONSTRAINT `Milestone_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Milestone` ADD CONSTRAINT `Milestone_garagePartOrderId_fkey` FOREIGN KEY (`garagePartOrderId`) REFERENCES `GaragePartOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Milestone` ADD CONSTRAINT `Milestone_noticeOutSourcingId_fkey` FOREIGN KEY (`noticeOutSourcingId`) REFERENCES `NoticeOutSourcing`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Milestone` ADD CONSTRAINT `Milestone_noticeApprenticeId_fkey` FOREIGN KEY (`noticeApprenticeId`) REFERENCES `NoticeApprenticeship`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Milestone` ADD CONSTRAINT `Milestone_noticeDastyarId_fkey` FOREIGN KEY (`noticeDastyarId`) REFERENCES `NoticeDastyar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Milestone` ADD CONSTRAINT `Milestone_metricId_fkey` FOREIGN KEY (`metricId`) REFERENCES `Metric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Milestone` ADD CONSTRAINT `Milestone_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Milestone` ADD CONSTRAINT `Milestone_garageOilServiceProjectId_fkey` FOREIGN KEY (`garageOilServiceProjectId`) REFERENCES `GarageOilServiceProjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MilestonePayment` ADD CONSTRAINT `MilestonePayment_milestoneId_fkey` FOREIGN KEY (`milestoneId`) REFERENCES `Milestone`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MilestonePayment` ADD CONSTRAINT `MilestonePayment_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionsActivityLog` ADD CONSTRAINT `TransactionsActivityLog_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionsActivityLog` ADD CONSTRAINT `TransactionsActivityLog_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionsActivityLog` ADD CONSTRAINT `TransactionsActivityLog_complaintId_fkey` FOREIGN KEY (`complaintId`) REFERENCES `Complaint`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionsActivityLog` ADD CONSTRAINT `TransactionsActivityLog_garagePartOrderId_fkey` FOREIGN KEY (`garagePartOrderId`) REFERENCES `GaragePartOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionsActivityLog` ADD CONSTRAINT `TransactionsActivityLog_metricId_fkey` FOREIGN KEY (`metricId`) REFERENCES `Metric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionsActivityLog` ADD CONSTRAINT `TransactionsActivityLog_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionsActivityLog` ADD CONSTRAINT `TransactionsActivityLog_noticeOutSourcingId_fkey` FOREIGN KEY (`noticeOutSourcingId`) REFERENCES `NoticeOutSourcing`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionsActivityLog` ADD CONSTRAINT `TransactionsActivityLog_noticeApprenticeId_fkey` FOREIGN KEY (`noticeApprenticeId`) REFERENCES `NoticeApprenticeship`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionsActivityLog` ADD CONSTRAINT `TransactionsActivityLog_noticeDastyarId_fkey` FOREIGN KEY (`noticeDastyarId`) REFERENCES `NoticeDastyar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionsActivityLog` ADD CONSTRAINT `TransactionsActivityLog_garageOilServiceProjectId_fkey` FOREIGN KEY (`garageOilServiceProjectId`) REFERENCES `GarageOilServiceProjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Address` ADD CONSTRAINT `Address_supplierStoreId_fkey` FOREIGN KEY (`supplierStoreId`) REFERENCES `SupplierStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Address` ADD CONSTRAINT `Address_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierStore` ADD CONSTRAINT `SupplierStore_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `BusinessProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierStore` ADD CONSTRAINT `SupplierStore_referredById_fkey` FOREIGN KEY (`referredById`) REFERENCES `SupplierStore`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_supplierStoreId_fkey` FOREIGN KEY (`supplierStoreId`) REFERENCES `SupplierStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GaragePartOrder` ADD CONSTRAINT `GaragePartOrder_publisherId_fkey` FOREIGN KEY (`publisherId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GaragePartOrder` ADD CONSTRAINT `GaragePartOrder_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GaragePartOrder` ADD CONSTRAINT `GaragePartOrder_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GaragePartOrder` ADD CONSTRAINT `GaragePartOrder_suplierStoreId_fkey` FOREIGN KEY (`suplierStoreId`) REFERENCES `SupplierStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GaragePartOrder` ADD CONSTRAINT `GaragePartOrder_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GaragePartOrder` ADD CONSTRAINT `GaragePartOrder_garageOilServiceProjectId_fkey` FOREIGN KEY (`garageOilServiceProjectId`) REFERENCES `GarageOilServiceProjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestedForSupply` ADD CONSTRAINT `RequestedForSupply_supplierStoreId_fkey` FOREIGN KEY (`supplierStoreId`) REFERENCES `SupplierStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestedForSupply` ADD CONSTRAINT `RequestedForSupply_garagePartOrderId_fkey` FOREIGN KEY (`garagePartOrderId`) REFERENCES `GaragePartOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartOrderSupplyCollaborationHistory` ADD CONSTRAINT `PartOrderSupplyCollaborationHistory_requestedGarageId_fkey` FOREIGN KEY (`requestedGarageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartOrderSupplyCollaborationHistory` ADD CONSTRAINT `PartOrderSupplyCollaborationHistory_supplierStoreId_fkey` FOREIGN KEY (`supplierStoreId`) REFERENCES `SupplierStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartOrder` ADD CONSTRAINT `PartOrder_garagePartOrderId_fkey` FOREIGN KEY (`garagePartOrderId`) REFERENCES `GaragePartOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplyParts` ADD CONSTRAINT `SupplyParts_RequestedForSupplyId_fkey` FOREIGN KEY (`RequestedForSupplyId`) REFERENCES `RequestedForSupply`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartSpecification` ADD CONSTRAINT `PartSpecification_supplyPartId_fkey` FOREIGN KEY (`supplyPartId`) REFERENCES `SupplyParts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartSpecification` ADD CONSTRAINT `PartSpecification_partOrderId_fkey` FOREIGN KEY (`partOrderId`) REFERENCES `PartOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartSpecification` ADD CONSTRAINT `PartSpecification_supplierReqForMetricId_fkey` FOREIGN KEY (`supplierReqForMetricId`) REFERENCES `SupplierStoreReqsForMetricAssignment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartSpecification` ADD CONSTRAINT `PartSpecification_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartSpecification` ADD CONSTRAINT `PartSpecification_metricId_fkey` FOREIGN KEY (`metricId`) REFERENCES `Metric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartSpecification` ADD CONSTRAINT `PartSpecification_successfulSellCouponByGarage_MechanicId_fkey` FOREIGN KEY (`successfulSellCouponByGarage_MechanicId`) REFERENCES `SuccessfulSellCouponByGarage_Mechanic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartSpecification` ADD CONSTRAINT `PartSpecification_wasSupplierStoreMetricAssignmentSuccessfu_fkey` FOREIGN KEY (`wasSupplierStoreMetricAssignmentSuccessfulId`) REFERENCES `WasSupplierStoreMetricAssignmentSuccessful`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarageAwaitList` ADD CONSTRAINT `GarageAwaitList_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarageAwaitList` ADD CONSTRAINT `GarageAwaitList_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarageOilServiceProjects` ADD CONSTRAINT `GarageOilServiceProjects_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarageOilServiceProjects` ADD CONSTRAINT `GarageOilServiceProjects_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarageRequirementsRequest` ADD CONSTRAINT `GarageRequirementsRequest_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `SocialProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutoServicesRequirementsRequest` ADD CONSTRAINT `AutoServicesRequirementsRequest_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `SocialProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoticeDivar` ADD CONSTRAINT `NoticeDivar_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `SocialProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoticeEstNiaz` ADD CONSTRAINT `NoticeEstNiaz_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `SocialProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoticeOutSourcing` ADD CONSTRAINT `NoticeOutSourcing_publisherId_fkey` FOREIGN KEY (`publisherId`) REFERENCES `SocialProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoticeOutSourcing` ADD CONSTRAINT `NoticeOutSourcing_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoticeOutSourcing` ADD CONSTRAINT `NoticeOutSourcing_requesterGarageId_fkey` FOREIGN KEY (`requesterGarageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoticeOutSourcing` ADD CONSTRAINT `NoticeOutSourcing_acceptorGarageId_fkey` FOREIGN KEY (`acceptorGarageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarageReqsForOutSourcingCoWork` ADD CONSTRAINT `GarageReqsForOutSourcingCoWork_publisherId_fkey` FOREIGN KEY (`publisherId`) REFERENCES `SocialProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarageReqsForOutSourcingCoWork` ADD CONSTRAINT `GarageReqsForOutSourcingCoWork_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarageReqsForOutSourcingCoWork` ADD CONSTRAINT `GarageReqsForOutSourcingCoWork_noticeOutSourcingId_fkey` FOREIGN KEY (`noticeOutSourcingId`) REFERENCES `NoticeOutSourcing`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OutSourcingCollaborationHistory` ADD CONSTRAINT `OutSourcingCollaborationHistory_hostGarageId_fkey` FOREIGN KEY (`hostGarageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OutSourcingCollaborationHistory` ADD CONSTRAINT `OutSourcingCollaborationHistory_acceptorGarageId_fkey` FOREIGN KEY (`acceptorGarageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoticePartProviding` ADD CONSTRAINT `NoticePartProviding_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `SocialProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoticeApprenticeship` ADD CONSTRAINT `NoticeApprenticeship_publisherId_fkey` FOREIGN KEY (`publisherId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoticeApprenticeship` ADD CONSTRAINT `NoticeApprenticeship_apprenticeId_fkey` FOREIGN KEY (`apprenticeId`) REFERENCES `ProjectProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoticeApprenticeship` ADD CONSTRAINT `NoticeApprenticeship_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoticeApprenticeship` ADD CONSTRAINT `NoticeApprenticeship_requesterGarageId_fkey` FOREIGN KEY (`requesterGarageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoticeApprenticeship` ADD CONSTRAINT `NoticeApprenticeship_acceptorGarageId_fkey` FOREIGN KEY (`acceptorGarageId`) REFERENCES `Garage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShagerdReqsForApprenticeCoWork` ADD CONSTRAINT `ShagerdReqsForApprenticeCoWork_apprenticeId_fkey` FOREIGN KEY (`apprenticeId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShagerdReqsForApprenticeCoWork` ADD CONSTRAINT `ShagerdReqsForApprenticeCoWork_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShagerdReqsForApprenticeCoWork` ADD CONSTRAINT `ShagerdReqsForApprenticeCoWork_noticeApprenticeId_fkey` FOREIGN KEY (`noticeApprenticeId`) REFERENCES `NoticeApprenticeship`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarageReqsForApprenticeCoWork` ADD CONSTRAINT `GarageReqsForApprenticeCoWork_garageOwnerId_fkey` FOREIGN KEY (`garageOwnerId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarageReqsForApprenticeCoWork` ADD CONSTRAINT `GarageReqsForApprenticeCoWork_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarageReqsForApprenticeCoWork` ADD CONSTRAINT `GarageReqsForApprenticeCoWork_apprenticeId_fkey` FOREIGN KEY (`apprenticeId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarageReqsForApprenticeCoWork` ADD CONSTRAINT `GarageReqsForApprenticeCoWork_noticeApprenticeId_fkey` FOREIGN KEY (`noticeApprenticeId`) REFERENCES `NoticeApprenticeship`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoticeDastyar` ADD CONSTRAINT `NoticeDastyar_publisherId_fkey` FOREIGN KEY (`publisherId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoticeDastyar` ADD CONSTRAINT `NoticeDastyar_acceptorMechanicId_fkey` FOREIGN KEY (`acceptorMechanicId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoticeDastyar` ADD CONSTRAINT `NoticeDastyar_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoticeDastyar` ADD CONSTRAINT `NoticeDastyar_requesterGarageId_fkey` FOREIGN KEY (`requesterGarageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoticeDastyar` ADD CONSTRAINT `NoticeDastyar_acceptorGarageId_fkey` FOREIGN KEY (`acceptorGarageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MechanicReqsForDastyarCoWork` ADD CONSTRAINT `MechanicReqsForDastyarCoWork_mechanicId_fkey` FOREIGN KEY (`mechanicId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MechanicReqsForDastyarCoWork` ADD CONSTRAINT `MechanicReqsForDastyarCoWork_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MechanicReqsForDastyarCoWork` ADD CONSTRAINT `MechanicReqsForDastyarCoWork_noticeDastyarId_fkey` FOREIGN KEY (`noticeDastyarId`) REFERENCES `NoticeDastyar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarageReqsForDastyarCoWork` ADD CONSTRAINT `GarageReqsForDastyarCoWork_garageOwnerId_fkey` FOREIGN KEY (`garageOwnerId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarageReqsForDastyarCoWork` ADD CONSTRAINT `GarageReqsForDastyarCoWork_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarageReqsForDastyarCoWork` ADD CONSTRAINT `GarageReqsForDastyarCoWork_mechanicId_fkey` FOREIGN KEY (`mechanicId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarageReqsForDastyarCoWork` ADD CONSTRAINT `GarageReqsForDastyarCoWork_noticeDastyarId_fkey` FOREIGN KEY (`noticeDastyarId`) REFERENCES `NoticeDastyar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MechanicReadyToWork` ADD CONSTRAINT `MechanicReadyToWork_mechanicId_fkey` FOREIGN KEY (`mechanicId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Metric` ADD CONSTRAINT `Metric_publisherId_fkey` FOREIGN KEY (`publisherId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Metric` ADD CONSTRAINT `Metric_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Metric` ADD CONSTRAINT `Metric_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Metric` ADD CONSTRAINT `Metric_supplierStoreId_fkey` FOREIGN KEY (`supplierStoreId`) REFERENCES `SupplierStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Metric` ADD CONSTRAINT `Metric_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierStoreReqsForMetricAssignment` ADD CONSTRAINT `SupplierStoreReqsForMetricAssignment_publisherId_fkey` FOREIGN KEY (`publisherId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierStoreReqsForMetricAssignment` ADD CONSTRAINT `SupplierStoreReqsForMetricAssignment_supplierStoreId_fkey` FOREIGN KEY (`supplierStoreId`) REFERENCES `SupplierStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierStoreReqsForMetricAssignment` ADD CONSTRAINT `SupplierStoreReqsForMetricAssignment_metricId_fkey` FOREIGN KEY (`metricId`) REFERENCES `Metric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WasSupplierStoreMetricAssignmentSuccessful` ADD CONSTRAINT `WasSupplierStoreMetricAssignmentSuccessful_supplierStoreId_fkey` FOREIGN KEY (`supplierStoreId`) REFERENCES `SupplierStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WasSupplierStoreMetricAssignmentSuccessful` ADD CONSTRAINT `WasSupplierStoreMetricAssignmentSuccessful_metricId_fkey` FOREIGN KEY (`metricId`) REFERENCES `Metric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WasSupplierStoreMetricAssignmentSuccessful` ADD CONSTRAINT `WasSupplierStoreMetricAssignmentSuccessful_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WasSupplierStoreMetricAssignmentSuccessful` ADD CONSTRAINT `WasSupplierStoreMetricAssignmentSuccessful_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Coupons` ADD CONSTRAINT `Coupons_publisherId_fkey` FOREIGN KEY (`publisherId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Coupons` ADD CONSTRAINT `Coupons_supplierStoreId_fkey` FOREIGN KEY (`supplierStoreId`) REFERENCES `SupplierStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CouponMechanicAcceptor` ADD CONSTRAINT `CouponMechanicAcceptor_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CouponMechanicAcceptor` ADD CONSTRAINT `CouponMechanicAcceptor_mechanicId_fkey` FOREIGN KEY (`mechanicId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CouponMechanicSuccess` ADD CONSTRAINT `CouponMechanicSuccess_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CouponMechanicSuccess` ADD CONSTRAINT `CouponMechanicSuccess_mechanicId_fkey` FOREIGN KEY (`mechanicId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CouponGarageAcceptor` ADD CONSTRAINT `CouponGarageAcceptor_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CouponGarageAcceptor` ADD CONSTRAINT `CouponGarageAcceptor_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CouponGarageSuccess` ADD CONSTRAINT `CouponGarageSuccess_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CouponGarageSuccess` ADD CONSTRAINT `CouponGarageSuccess_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mechanic_GarageReqsForCouponAssignment` ADD CONSTRAINT `Mechanic_GarageReqsForCouponAssignment_publisherId_fkey` FOREIGN KEY (`publisherId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mechanic_GarageReqsForCouponAssignment` ADD CONSTRAINT `Mechanic_GarageReqsForCouponAssignment_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mechanic_GarageReqsForCouponAssignment` ADD CONSTRAINT `Mechanic_GarageReqsForCouponAssignment_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuccessfulSellCouponByGarage_Mechanic` ADD CONSTRAINT `SuccessfulSellCouponByGarage_Mechanic_publisherId_fkey` FOREIGN KEY (`publisherId`) REFERENCES `ProjectProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuccessfulSellCouponByGarage_Mechanic` ADD CONSTRAINT `SuccessfulSellCouponByGarage_Mechanic_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuccessfulSellCouponByGarage_Mechanic` ADD CONSTRAINT `SuccessfulSellCouponByGarage_Mechanic_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoticeShopSupplier` ADD CONSTRAINT `NoticeShopSupplier_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `SocialProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SellFromSupplier` ADD CONSTRAINT `SellFromSupplier_supplierStoreId_fkey` FOREIGN KEY (`supplierStoreId`) REFERENCES `SupplierStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SellFromSupplier` ADD CONSTRAINT `SellFromSupplier_mechanicId_fkey` FOREIGN KEY (`mechanicId`) REFERENCES `ProjectProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SellFromSupplier` ADD CONSTRAINT `SellFromSupplier_garageId_fkey` FOREIGN KEY (`garageId`) REFERENCES `Garage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PermissionToRole` ADD CONSTRAINT `_PermissionToRole_A_fkey` FOREIGN KEY (`A`) REFERENCES `Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PermissionToRole` ADD CONSTRAINT `_PermissionToRole_B_fkey` FOREIGN KEY (`B`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AttachmentToGarageAwaitList` ADD CONSTRAINT `_AttachmentToGarageAwaitList_A_fkey` FOREIGN KEY (`A`) REFERENCES `Attachment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AttachmentToGarageAwaitList` ADD CONSTRAINT `_AttachmentToGarageAwaitList_B_fkey` FOREIGN KEY (`B`) REFERENCES `GarageAwaitList`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
