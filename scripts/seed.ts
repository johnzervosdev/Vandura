/**
 * Database Seeding Script
 * Populates the database with sample data for development
 * Run with: npm run db:seed
 */

import { db, closeDatabase } from '../src/server/db';
import { developers, projects, tasks, timeEntries } from '../src/server/db/schema';

async function seed() {
  console.log('Seeding database...');

  try {
    // Create developers
    console.log('Creating developers...');
    const [dev1, dev2, dev3] = await db
      .insert(developers)
      .values([
        { name: 'Alice Johnson', email: 'alice@example.com', hourlyRate: 85, isActive: true },
        { name: 'Bob Smith', email: 'bob@example.com', hourlyRate: 75, isActive: true },
        { name: 'Carol Davis', email: 'carol@example.com', hourlyRate: 90, isActive: true },
      ])
      .returning();

    console.log(`Created ${3} developers`);

    // Create projects
    console.log('Creating projects...');
    const [project1, project2] = await db
      .insert(projects)
      .values([
        {
          name: 'Project Alpha',
          description: 'E-commerce platform rebuild',
          estimatedHours: 160,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-03-31'),
          status: 'active',
        },
        {
          name: 'Project Beta',
          description: 'Mobile app development',
          estimatedHours: 240,
          startDate: new Date('2026-01-15'),
          endDate: new Date('2026-04-30'),
          status: 'active',
        },
      ])
      .returning();

    console.log(`Created ${2} projects`);

    // Create tasks for Project Alpha
    console.log('Creating tasks...');
    const [task1, task2, task3, task4] = await db
      .insert(tasks)
      .values([
        {
          projectId: project1.id,
          name: 'API Development',
          estimatedHours: 60,
          status: 'in-progress',
        },
        {
          projectId: project1.id,
          name: 'Frontend UI',
          estimatedHours: 50,
          status: 'in-progress',
        },
        {
          projectId: project1.id,
          name: 'Database Design',
          estimatedHours: 30,
          status: 'completed',
        },
        {
          projectId: project2.id,
          name: 'Mobile UI/UX',
          estimatedHours: 80,
          status: 'in-progress',
        },
      ])
      .returning();

    console.log(`Created ${4} tasks`);

    // Create sample time entries (last 7 days)
    console.log('Creating time entries...');
    const entries = [];
    const today = new Date();

    for (let day = 0; day < 7; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() - day);
      date.setHours(9, 0, 0, 0);

      // Alice works on API Development (4-6 hours per day)
      const aliceHours = 4 + Math.floor(Math.random() * 3);
      for (let h = 0; h < aliceHours; h++) {
        const startTime = new Date(date);
        startTime.setHours(9 + h);
        entries.push({
          projectId: project1.id,
          taskId: task1.id,
          developerId: dev1.id,
          startTime,
          durationMinutes: 60,
          description: 'Working on REST API endpoints',
        });
      }

      // Bob works on Frontend UI (3-5 hours per day)
      const bobHours = 3 + Math.floor(Math.random() * 3);
      for (let h = 0; h < bobHours; h++) {
        const startTime = new Date(date);
        startTime.setHours(9 + h);
        entries.push({
          projectId: project1.id,
          taskId: task2.id,
          developerId: dev2.id,
          startTime,
          durationMinutes: 60,
          description: 'Building React components',
        });
      }

      // Carol works on Mobile UI/UX (4-7 hours per day)
      const carolHours = 4 + Math.floor(Math.random() * 4);
      for (let h = 0; h < carolHours; h++) {
        const startTime = new Date(date);
        startTime.setHours(10 + h);
        entries.push({
          projectId: project2.id,
          taskId: task4.id,
          developerId: dev3.id,
          startTime,
          durationMinutes: 60,
          description: 'Designing mobile screens',
        });
      }
    }

    await db.insert(timeEntries).values(entries);
    console.log(`Created ${entries.length} time entries`);

    console.log('\n✅ Database seeded successfully!');
    console.log(`\nSummary:`);
    console.log(`  - Developers: 3`);
    console.log(`  - Projects: 2`);
    console.log(`  - Tasks: 4`);
    console.log(`  - Time Entries: ${entries.length}`);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

seed();
