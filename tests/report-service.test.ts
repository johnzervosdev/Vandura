import test from 'node:test';
import assert from 'node:assert/strict';
import { reportService } from '../src/server/services/ReportService';

test('exportToCSV preserves zero estimated hours (project + task)', () => {
  const csv = reportService.exportToCSV({
    projectId: 1,
    projectName: 'QA Project',
    totalEstimatedHours: 0,
    totalActualHours: 1.25,
    variance: 1.25,
    variancePercentage: 0,
    tasks: [
      {
        taskId: 1,
        taskName: 'QA Task',
        estimatedHours: 0,
        actualHours: 1.25,
        variance: 1.25,
        variancePercentage: 0,
      },
    ],
  });

  assert.match(csv, /Total Estimated Hours,0/);
  assert.match(csv, /"QA Task",0,1\.25,1\.25,0\.0%/);
});

test('exportToCSV escapes project name containing commas', () => {
  const csv = reportService.exportToCSV({
    projectId: 2,
    projectName: 'QA, Project',
    totalEstimatedHours: 1,
    totalActualHours: 1,
    variance: 0,
    variancePercentage: 0,
    tasks: [],
  });

  assert.match(csv, /Project,"QA, Project"/);
});

test('exportToCSV escapes quotes in task names', () => {
  const csv = reportService.exportToCSV({
    projectId: 3,
    projectName: 'QA Project',
    totalEstimatedHours: 1,
    totalActualHours: 1,
    variance: 0,
    variancePercentage: 0,
    tasks: [
      {
        taskId: 1,
        taskName: 'QA "Task"',
        estimatedHours: 1,
        actualHours: 1,
        variance: 0,
        variancePercentage: 0,
      },
    ],
  });

  assert.match(csv, /"QA ""Task""",1,1\.00,0\.00,0\.0%/);
});

test('exportToCSV escapes quotes in project name', () => {
  const csv = reportService.exportToCSV({
    projectId: 4,
    projectName: 'QA "Project"',
    totalEstimatedHours: 1,
    totalActualHours: 1,
    variance: 0,
    variancePercentage: 0,
    tasks: [],
  });

  assert.match(csv, /Project,"QA ""Project"""/);
});