import { describe, it, expect, beforeAll } from 'vitest';
import { POST as createHabitHandler, GET as getHabitsHandler } from '@app/api/habits/route';
import {
  GET as getHabitByIdHandler,
  PATCH as patchHabitHandler,
  DELETE as deleteHabitHandler,
} from '@app/api/habits/[id]/route';
import { prisma } from '@/server/lib/prisma';
import { HabitCategory, FrequencyType } from '@prisma/client';

describe('Habits API: Validation per frequencyType, Transactions, and Ownership', () => {
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    // Fetch test users created during seed
    const userA = await prisma.user.findUnique({
      where: { email: 'maya@example.com' },
    });
    const userB = await prisma.user.findUnique({
      where: { email: 'alex@example.com' },
    });

    userAId = userA!.id;
    userBId = userB!.id;
  });

  describe('Validation: DAILY Habits', () => {
    it('creates a DAILY habit without extras and verifies streak row is 0/0', async () => {
      const req = new Request('http://localhost/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${userAId}`,
        },
        body: JSON.stringify({
          name: 'Daily Flossing',
          category: HabitCategory.HEALTH,
          frequencyType: FrequencyType.DAILY,
        }),
      });

      const res = await createHabitHandler(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.habit.name).toBe('Daily Flossing');
      expect(json.data.habit.frequencyType).toBe(FrequencyType.DAILY);
      expect(json.data.habit.streak).toBeDefined();
      expect(json.data.habit.streak.current).toBe(0);
      expect(json.data.habit.streak.longest).toBe(0);
    });

    it('rejects DAILY habit with targetPerPeriod', async () => {
      const req = new Request('http://localhost/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${userAId}`,
        },
        body: JSON.stringify({
          name: 'Invalid Daily',
          category: HabitCategory.HEALTH,
          frequencyType: FrequencyType.DAILY,
          targetPerPeriod: 3,
        }),
      });

      const res = await createHabitHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Validation: WEEKLY Habits', () => {
    it('fails when WEEKLY habit has missing targetPerPeriod', async () => {
      const req = new Request('http://localhost/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${userAId}`,
        },
        body: JSON.stringify({
          name: 'Weekly Swimming',
          category: HabitCategory.FITNESS,
          frequencyType: FrequencyType.WEEKLY,
        }),
      });

      const res = await createHabitHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('targetPerPeriod');
    });

    it('fails when WEEKLY habit has targetPerPeriod outside 1-7', async () => {
      const req = new Request('http://localhost/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${userAId}`,
        },
        body: JSON.stringify({
          name: 'Weekly Swimming',
          category: HabitCategory.FITNESS,
          frequencyType: FrequencyType.WEEKLY,
          targetPerPeriod: 8,
        }),
      });

      const res = await createHabitHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('fails when WEEKLY habit specifies daysOfWeek', async () => {
      const req = new Request('http://localhost/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${userAId}`,
        },
        body: JSON.stringify({
          name: 'Weekly Gym',
          category: HabitCategory.FITNESS,
          frequencyType: FrequencyType.WEEKLY,
          targetPerPeriod: 3,
          daysOfWeek: [1, 3, 5],
        }),
      });

      const res = await createHabitHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('creates a valid WEEKLY habit with targetPerPeriod between 1 and 7', async () => {
      const req = new Request('http://localhost/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${userAId}`,
        },
        body: JSON.stringify({
          name: 'Weekly Gym Workouts',
          category: HabitCategory.FITNESS,
          frequencyType: FrequencyType.WEEKLY,
          targetPerPeriod: 4,
        }),
      });

      const res = await createHabitHandler(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.habit.name).toBe('Weekly Gym Workouts');
      expect(json.data.habit.targetPerPeriod).toBe(4);
      expect(json.data.habit.streak.current).toBe(0);
    });
  });

  describe('Validation: CUSTOM Habits', () => {
    it('fails when CUSTOM habit has neither daysOfWeek nor intervalDays', async () => {
      const req = new Request('http://localhost/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${userAId}`,
        },
        body: JSON.stringify({
          name: 'Custom Journaling',
          category: HabitCategory.MINDFULNESS,
          frequencyType: FrequencyType.CUSTOM,
        }),
      });

      const res = await createHabitHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('fails when CUSTOM habit has BOTH daysOfWeek and intervalDays', async () => {
      const req = new Request('http://localhost/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${userAId}`,
        },
        body: JSON.stringify({
          name: 'Conflicting Custom',
          category: HabitCategory.LEARNING,
          frequencyType: FrequencyType.CUSTOM,
          daysOfWeek: [1, 3],
          intervalDays: 2,
        }),
      });

      const res = await createHabitHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('fails when CUSTOM habit has daysOfWeek empty array', async () => {
      const req = new Request('http://localhost/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${userAId}`,
        },
        body: JSON.stringify({
          name: 'Empty Days',
          category: HabitCategory.LEARNING,
          frequencyType: FrequencyType.CUSTOM,
          daysOfWeek: [],
        }),
      });

      const res = await createHabitHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('fails when CUSTOM habit has intervalDays < 2', async () => {
      const req = new Request('http://localhost/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${userAId}`,
        },
        body: JSON.stringify({
          name: 'Invalid Interval',
          category: HabitCategory.PRODUCTIVITY,
          frequencyType: FrequencyType.CUSTOM,
          intervalDays: 1,
        }),
      });

      const res = await createHabitHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('creates a valid CUSTOM habit with daysOfWeek', async () => {
      const req = new Request('http://localhost/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${userAId}`,
        },
        body: JSON.stringify({
          name: 'Mon-Wed-Fri Code Review',
          category: HabitCategory.PRODUCTIVITY,
          frequencyType: FrequencyType.CUSTOM,
          daysOfWeek: [1, 3, 5],
        }),
      });

      const res = await createHabitHandler(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.habit.daysOfWeek).toEqual([1, 3, 5]);
      expect(json.data.habit.streak.current).toBe(0);
    });

    it('creates a valid CUSTOM habit with intervalDays >= 2', async () => {
      const req = new Request('http://localhost/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${userAId}`,
        },
        body: JSON.stringify({
          name: 'Water Plants Every 3 Days',
          category: HabitCategory.OTHER,
          frequencyType: FrequencyType.CUSTOM,
          intervalDays: 3,
        }),
      });

      const res = await createHabitHandler(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.habit.intervalDays).toBe(3);
      expect(json.data.habit.streak.current).toBe(0);
    });
  });

  describe('Ownership and 404 (not 403) Enforcement', () => {
    let habitOwnedByA: string;

    beforeAll(async () => {
      const req = new Request('http://localhost/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${userAId}`,
        },
        body: JSON.stringify({
          name: 'Private Habit of User A',
          category: HabitCategory.MINDFULNESS,
          frequencyType: FrequencyType.DAILY,
        }),
      });
      const res = await createHabitHandler(req);
      const json = await res.json();
      habitOwnedByA = json.data.habit.id;
    });

    it('User A can access their own habit via GET /api/habits/:id', async () => {
      const req = new Request(`http://localhost/api/habits/${habitOwnedByA}`, {
        headers: { authorization: `Bearer ${userAId}` },
      });
      const res = await getHabitByIdHandler(req, { params: { id: habitOwnedByA } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.habit.id).toBe(habitOwnedByA);
    });

    it('User B receives 404 (not 403) when requesting User A habit via GET /api/habits/:id', async () => {
      const req = new Request(`http://localhost/api/habits/${habitOwnedByA}`, {
        headers: { authorization: `Bearer ${userBId}` },
      });
      const res = await getHabitByIdHandler(req, { params: { id: habitOwnedByA } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('User B receives 404 (not 403) when attempting PATCH /api/habits/:id on User A habit', async () => {
      const req = new Request(`http://localhost/api/habits/${habitOwnedByA}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${userBId}`,
        },
        body: JSON.stringify({ name: 'Tampered Name' }),
      });
      const res = await patchHabitHandler(req, { params: { id: habitOwnedByA } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('User B receives 404 (not 403) when attempting DELETE /api/habits/:id on User A habit', async () => {
      const req = new Request(`http://localhost/api/habits/${habitOwnedByA}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${userBId}` },
      });
      const res = await deleteHabitHandler(req, { params: { id: habitOwnedByA } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('User A can successfully soft-delete habit via DELETE /api/habits/:id', async () => {
      const req = new Request(`http://localhost/api/habits/${habitOwnedByA}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${userAId}` },
      });
      const res = await deleteHabitHandler(req, { params: { id: habitOwnedByA } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.habit.archivedAt).not.toBeNull();

      // Verify GET /api/habits omits archived habit by default
      const listReq = new Request('http://localhost/api/habits', {
        headers: { authorization: `Bearer ${userAId}` },
      });
      const listRes = await getHabitsHandler(listReq);
      const listJson = await listRes.json();
      const foundInActive = listJson.data.habits.some((h: any) => h.id === habitOwnedByA);
      expect(foundInActive).toBe(false);

      // Verify GET /api/habits?archived=true includes it
      const archivedReq = new Request('http://localhost/api/habits?archived=true', {
        headers: { authorization: `Bearer ${userAId}` },
      });
      const archivedRes = await getHabitsHandler(archivedReq);
      const archivedJson = await archivedRes.json();
      const foundInArchived = archivedJson.data.habits.some((h: any) => h.id === habitOwnedByA);
      expect(foundInArchived).toBe(true);
    });
  });
});
