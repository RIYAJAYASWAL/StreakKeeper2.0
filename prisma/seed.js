if (process.loadEnvFile) {
  try {
    process.loadEnvFile('.env');
  } catch {
    // Ignore if already loaded or not found
  }
}

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing records for idempotent seed...');
  // Delete in reverse dependency order
  await prisma.xpEvent.deleteMany({});
  await prisma.aiInsight.deleteMany({});
  await prisma.friendship.deleteMany({});
  await prisma.groupMember.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.journalRead.deleteMany({});
  await prisma.journal.deleteMany({});
  await prisma.freezeUse.deleteMany({});
  await prisma.checkIn.deleteMany({});
  await prisma.streak.deleteMany({});
  await prisma.habit.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding 3 users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.create({
    data: {
      email: 'maya@example.com',
      name: 'Maya Chen',
      passwordHash,
      timezone: 'America/New_York',
      xp: 450,
      level: 3,
      freezesRemaining: 2,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'alex@example.com',
      name: 'Alex Rivera',
      passwordHash,
      timezone: 'Europe/London',
      xp: 220,
      level: 2,
      freezesRemaining: 3,
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'jordan@example.com',
      name: 'Jordan Lee',
      passwordHash,
      timezone: 'Asia/Tokyo',
      xp: 850,
      level: 5,
      freezesRemaining: 1,
    },
  });

  console.log('Seeding habits and streaks...');
  const habit1 = await prisma.habit.create({
    data: {
      userId: user1.id,
      name: 'Morning Meditation',
      category: 'MINDFULNESS',
      description: '15 minutes of mindfulness breathwork',
      frequencyType: 'DAILY',
      startDate: new Date('2026-10-01T00:00:00Z'),
      streak: {
        create: {
          current: 7,
          longest: 14,
          lastCountedDate: new Date('2026-10-08T00:00:00Z'),
        },
      },
    },
  });

  const habit2 = await prisma.habit.create({
    data: {
      userId: user2.id,
      name: '5km Morning Run',
      category: 'FITNESS',
      description: 'Outdoor jog along the canal',
      frequencyType: 'DAILY',
      startDate: new Date('2026-10-01T00:00:00Z'),
      streak: {
        create: {
          current: 4,
          longest: 10,
          lastCountedDate: new Date('2026-10-08T00:00:00Z'),
        },
      },
    },
  });

  const habit3 = await prisma.habit.create({
    data: {
      userId: user3.id,
      name: 'Deep Reading',
      category: 'LEARNING',
      description: 'Read 25 pages of non-fiction literature',
      frequencyType: 'DAILY',
      startDate: new Date('2026-10-01T00:00:00Z'),
      streak: {
        create: {
          current: 12,
          longest: 21,
          lastCountedDate: new Date('2026-10-08T00:00:00Z'),
        },
      },
    },
  });

  console.log('Seeding check-ins and freeze usages...');
  await prisma.checkIn.createMany({
    data: [
      {
        habitId: habit1.id,
        userId: user1.id,
        localDate: new Date('2026-10-06T00:00:00Z'),
        status: 'COMPLETED',
        note: 'Focused on calm breathing',
      },
      {
        habitId: habit1.id,
        userId: user1.id,
        localDate: new Date('2026-10-07T00:00:00Z'),
        status: 'COMPLETED',
        note: 'Good morning energy',
      },
      {
        habitId: habit1.id,
        userId: user1.id,
        localDate: new Date('2026-10-08T00:00:00Z'),
        status: 'COMPLETED',
        note: 'Completed right after sunrise',
      },
    ],
  });

  const frozenCheckIn = await prisma.checkIn.create({
    data: {
      habitId: habit2.id,
      userId: user2.id,
      localDate: new Date('2026-10-07T00:00:00Z'),
      status: 'FROZEN',
      note: 'Took a rest day due to cold symptoms',
    },
  });

  await prisma.freezeUse.create({
    data: {
      userId: user2.id,
      habitId: habit2.id,
      checkInId: frozenCheckIn.id,
      localDate: new Date('2026-10-07T00:00:00Z'),
      reasonTag: 'SICK',
      note: 'Head cold and fever; preserved streak using streak freeze.',
    },
  });

  await prisma.checkIn.create({
    data: {
      habitId: habit2.id,
      userId: user2.id,
      localDate: new Date('2026-10-08T00:00:00Z'),
      status: 'COMPLETED',
      note: 'Felt better, steady 5k',
    },
  });

  await prisma.checkIn.createMany({
    data: [
      {
        habitId: habit3.id,
        userId: user3.id,
        localDate: new Date('2026-10-06T00:00:00Z'),
        status: 'COMPLETED',
        note: 'Read chapter 4 of Clean Architecture',
      },
      {
        habitId: habit3.id,
        userId: user3.id,
        localDate: new Date('2026-10-07T00:00:00Z'),
        status: 'COMPLETED',
        note: 'Read chapter 5',
      },
      {
        habitId: habit3.id,
        userId: user3.id,
        localDate: new Date('2026-10-08T00:00:00Z'),
        status: 'COMPLETED',
        note: 'Read chapter 6 and took notes',
      },
    ],
  });

  console.log('Seeding journals...');
  await prisma.journal.createMany({
    data: [
      {
        authorId: user1.id,
        habitId: habit1.id,
        category: 'MINDFULNESS',
        title: 'Clarity in Stillness',
        body: 'Consistency in meditation is reshaping my focus during high-pressure work sprints. Today felt peaceful.',
        visibility: 'PUBLIC',
      },
      {
        authorId: user2.id,
        habitId: habit2.id,
        category: 'FITNESS',
        title: 'Listening to My Body',
        body: 'Glad to have the streak freeze feature. Resting when sick allows me to bounce back without losing momentum.',
        visibility: 'PRIVATE',
      },
      {
        authorId: user3.id,
        habitId: habit3.id,
        category: 'LEARNING',
        title: 'System Design Insights',
        body: 'Reading technical literature daily compounds faster than cramming. 25 pages a day is sustainable.',
        visibility: 'PUBLIC',
      },
    ],
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
