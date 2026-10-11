import { CheckInStatus } from '@prisma/client';

export const XP_RULES = {
  CHECK_IN: 10,
  READ_JOURNAL: 5,
  JOURNAL_CREATE: 10,
  MILESTONE_7_DAY: 15,
  FROZEN_DAY: 0,
} as const;

export type XpRuleType = keyof typeof XP_RULES;

/**
 * Calculates XP earned for a check-in.
 * Frozen or missed days earn 0 XP.
 * Completed check-ins earn +10 XP, plus +15 XP bonus on 7-day milestones (7, 14, 21, ...).
 */
export function calculateCheckInXp(status: CheckInStatus, streakCurrent: number = 0): {
  baseXp: number;
  milestoneXp: number;
  totalXp: number;
} {
  if (status !== CheckInStatus.COMPLETED) {
    return { baseXp: 0, milestoneXp: 0, totalXp: 0 };
  }

  const baseXp = XP_RULES.CHECK_IN;
  const isMilestone = streakCurrent > 0 && streakCurrent % 7 === 0;
  const milestoneXp = isMilestone ? XP_RULES.MILESTONE_7_DAY : 0;

  return {
    baseXp,
    milestoneXp,
    totalXp: baseXp + milestoneXp,
  };
}

/**
 * Smooth XP progression thresholds per level.
 * Calibrated against seed data:
 * - 0 XP -> Level 1
 * - 220 XP -> Level 2
 * - 450 XP -> Level 3
 * - 850 XP -> Level 5
 */
export const LEVEL_THRESHOLDS = [
  0,    // Level 1: 0 - 149
  150,  // Level 2: 150 - 349
  350,  // Level 3: 350 - 599
  600,  // Level 4: 600 - 849
  850,  // Level 5: 850 - 1149
  1150, // Level 6: 1150 - 1499
  1500, // Level 7: 1500 - 1899
  1900, // Level 8: 1900 - 2349
  2350, // Level 9: 2350 - 2849
  2850, // Level 10: 2850+
];

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[level - 1];
  }
  let xp = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  for (let l = LEVEL_THRESHOLDS.length + 1; l <= level; l++) {
    xp += 500 + (l - 10) * 100;
  }
  return xp;
}

export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  let level = 1;
  while (xpForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

export interface LevelProgress {
  level: number;
  currentXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpInLevel: number;
  xpNeeded: number;
  percentage: number;
}

export function progressToNextLevel(xp: number): LevelProgress {
  const safeXp = Math.max(0, xp);
  const currentLevel = levelFromXp(safeXp);
  const currentLevelXp = xpForLevel(currentLevel);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  const xpInLevel = safeXp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const percentage = Math.min(100, Math.floor((xpInLevel / xpNeeded) * 100));

  return {
    level: currentLevel,
    currentXp: safeXp,
    currentLevelXp,
    nextLevelXp,
    xpInLevel,
    xpNeeded,
    percentage,
  };
}
