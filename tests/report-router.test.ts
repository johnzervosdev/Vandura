import test from 'node:test';
import assert from 'node:assert/strict';
import { reportRouter } from '../src/server/routers/report';
import { reportService } from '../src/server/services/ReportService';

test('exportCSV filename uses project name', async () => {
  const originalGet = reportService.getActualsVsEstimates;
  const originalNow = Date.now;
  const now = 1760000000000;

  try {
    reportService.getActualsVsEstimates = async () => ({
      projectId: 123,
      projectName: 'QA Project',
      totalEstimatedHours: 0,
      totalActualHours: 1,
      variance: 1,
      variancePercentage: 0,
      tasks: [],
    });
    Date.now = () => now;

    const caller = reportRouter.createCaller({ headers: new Headers() });
    const result = await caller.exportCSV({ projectId: 123 });

    assert.equal(result.filename, `actuals-report-QA Project-${now}.csv`);
  } finally {
    reportService.getActualsVsEstimates = originalGet;
    Date.now = originalNow;
  }
});
