-- CreateEnum
CREATE TYPE "HabitCategory" AS ENUM ('HEALTH', 'FITNESS', 'LEARNING', 'MINDFULNESS', 'PRODUCTIVITY', 'QUIT_BAD_HABIT', 'OTHER');

-- CreateEnum
CREATE TYPE "FrequencyType" AS ENUM ('DAILY', 'WEEKLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CheckInStatus" AS ENUM ('COMPLETED', 'FROZEN', 'MISSED');

-- CreateEnum
CREATE TYPE "FreezeReasonTag" AS ENUM ('SICK', 'TRAVEL', 'WORK', 'POOR_SLEEP', 'FORGOT', 'STRESS', 'OTHER');

-- CreateEnum
CREATE TYPE "JournalVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('FRIENDS', 'HABIT');

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "freezesRemaining" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "freezesResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "HabitCategory" NOT NULL,
    "description" TEXT,
    "frequencyType" "FrequencyType" NOT NULL DEFAULT 'DAILY',
    "targetPerPeriod" INTEGER,
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "intervalDays" INTEGER,
    "startDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "status" "CheckInStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreezeUse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "checkInId" TEXT,
    "localDate" DATE NOT NULL,
    "reasonTag" "FreezeReasonTag" NOT NULL,
    "note" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreezeUse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Streak" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "longest" INTEGER NOT NULL DEFAULT 0,
    "lastCountedDate" DATE,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Streak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journal" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "habitId" TEXT,
    "category" "HabitCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "JournalVisibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "HabitCategory",
    "type" "GroupType" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("groupId","userId")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitId" TEXT,
    "content" TEXT NOT NULL,
    "basedOnFrom" DATE NOT NULL,
    "basedOnTo" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Habit_userId_idx" ON "Habit"("userId");

-- CreateIndex
CREATE INDEX "Habit_category_idx" ON "Habit"("category");

-- CreateIndex
CREATE INDEX "Habit_frequencyType_idx" ON "Habit"("frequencyType");

-- CreateIndex
CREATE INDEX "Habit_archivedAt_idx" ON "Habit"("archivedAt");

-- CreateIndex
CREATE INDEX "Habit_startDate_idx" ON "Habit"("startDate");

-- CreateIndex
CREATE INDEX "CheckIn_habitId_idx" ON "CheckIn"("habitId");

-- CreateIndex
CREATE INDEX "CheckIn_userId_idx" ON "CheckIn"("userId");

-- CreateIndex
CREATE INDEX "CheckIn_localDate_idx" ON "CheckIn"("localDate");

-- CreateIndex
CREATE INDEX "CheckIn_status_idx" ON "CheckIn"("status");

-- CreateIndex
CREATE INDEX "CheckIn_userId_localDate_idx" ON "CheckIn"("userId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_habitId_localDate_key" ON "CheckIn"("habitId", "localDate");

-- CreateIndex
CREATE INDEX "FreezeUse_userId_idx" ON "FreezeUse"("userId");

-- CreateIndex
CREATE INDEX "FreezeUse_habitId_idx" ON "FreezeUse"("habitId");

-- CreateIndex
CREATE INDEX "FreezeUse_checkInId_idx" ON "FreezeUse"("checkInId");

-- CreateIndex
CREATE INDEX "FreezeUse_localDate_idx" ON "FreezeUse"("localDate");

-- CreateIndex
CREATE INDEX "FreezeUse_reasonTag_idx" ON "FreezeUse"("reasonTag");

-- CreateIndex
CREATE UNIQUE INDEX "Streak_habitId_key" ON "Streak"("habitId");

-- CreateIndex
CREATE INDEX "Streak_habitId_idx" ON "Streak"("habitId");

-- CreateIndex
CREATE INDEX "Streak_current_idx" ON "Streak"("current");

-- CreateIndex
CREATE INDEX "Journal_authorId_idx" ON "Journal"("authorId");

-- CreateIndex
CREATE INDEX "Journal_habitId_idx" ON "Journal"("habitId");

-- CreateIndex
CREATE INDEX "Journal_visibility_idx" ON "Journal"("visibility");

-- CreateIndex
CREATE INDEX "Journal_category_idx" ON "Journal"("category");

-- CreateIndex
CREATE INDEX "Journal_createdAt_idx" ON "Journal"("createdAt");

-- CreateIndex
CREATE INDEX "Journal_visibility_createdAt_idx" ON "Journal"("visibility", "createdAt");

-- CreateIndex
CREATE INDEX "JournalRead_userId_idx" ON "JournalRead"("userId");

-- CreateIndex
CREATE INDEX "JournalRead_journalId_idx" ON "JournalRead"("journalId");

-- CreateIndex
CREATE INDEX "JournalRead_localDate_idx" ON "JournalRead"("localDate");

-- CreateIndex
CREATE UNIQUE INDEX "JournalRead_userId_journalId_localDate_key" ON "JournalRead"("userId", "journalId", "localDate");

-- CreateIndex
CREATE INDEX "Group_createdById_idx" ON "Group"("createdById");

-- CreateIndex
CREATE INDEX "Group_type_idx" ON "Group"("type");

-- CreateIndex
CREATE INDEX "Group_category_idx" ON "Group"("category");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_idx" ON "GroupMember"("groupId");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

-- CreateIndex
CREATE INDEX "GroupMember_role_idx" ON "GroupMember"("role");

-- CreateIndex
CREATE INDEX "Friendship_requesterId_idx" ON "Friendship"("requesterId");

-- CreateIndex
CREATE INDEX "Friendship_addresseeId_idx" ON "Friendship"("addresseeId");

-- CreateIndex
CREATE INDEX "Friendship_status_idx" ON "Friendship"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_requesterId_addresseeId_key" ON "Friendship"("requesterId", "addresseeId");

-- CreateIndex
CREATE INDEX "AiInsight_userId_idx" ON "AiInsight"("userId");

-- CreateIndex
CREATE INDEX "AiInsight_habitId_idx" ON "AiInsight"("habitId");

-- CreateIndex
CREATE INDEX "AiInsight_createdAt_idx" ON "AiInsight"("createdAt");

-- CreateIndex
CREATE INDEX "XpEvent_userId_idx" ON "XpEvent"("userId");

-- CreateIndex
CREATE INDEX "XpEvent_type_idx" ON "XpEvent"("type");

-- CreateIndex
CREATE INDEX "XpEvent_createdAt_idx" ON "XpEvent"("createdAt");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_level_idx" ON "User"("level");

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreezeUse" ADD CONSTRAINT "FreezeUse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreezeUse" ADD CONSTRAINT "FreezeUse_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreezeUse" ADD CONSTRAINT "FreezeUse_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalRead" ADD CONSTRAINT "JournalRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalRead" ADD CONSTRAINT "JournalRead_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInsight" ADD CONSTRAINT "AiInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInsight" ADD CONSTRAINT "AiInsight_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
