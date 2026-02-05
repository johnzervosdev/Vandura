'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc-client';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export default function TimesheetUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const importExcel = trpc.timesheet.importExcel.useMutation();

  const canSubmit = useMemo(() => !!file && !importExcel.isPending, [file, importExcel.isPending]);

  async function onImport() {
    setError(null);
    setSuccess(null);

    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const fileBuffer = arrayBufferToBase64(buffer);

      const result = await importExcel.mutateAsync({ fileBuffer });
      setSuccess(`Imported ${result.imported} time entries.`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Import failed';
      setError(message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Timesheet</h1>
        <p className="text-muted-foreground mt-2">
          Import time entries from an Excel file (.xlsx / .xls).
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="text-sm font-medium">Important</div>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
          <li>
            <span className="text-foreground font-medium">Duplicates:</span> importing the same file twice will create duplicate entries.
          </li>
          <li>
            <span className="text-foreground font-medium">Timezone:</span> all times are treated as your local machine timezone (no conversion).
          </li>
        </ul>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Excel file</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              setError(null);
              setSuccess(null);
              setFile(e.target.files?.[0] ?? null);
            }}
          />
          {file ? (
            <div className="text-sm text-muted-foreground">
              Selected: <span className="text-foreground font-medium">{file.name}</span> ({Math.round(file.size / 1024)} KB)
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Choose a file to import.</div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onImport}
            disabled={!canSubmit}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          >
            {importExcel.isPending ? 'Importing…' : 'Import'}
          </button>
          <a href="/timesheets" className="text-sm hover:underline text-muted-foreground">
            Back to Timesheets
          </a>
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <div className="font-medium text-destructive">Import failed</div>
            <div className="text-muted-foreground mt-1">{error}</div>
          </div>
        ) : null}

        {success ? (
          <div className="rounded-md border border-green-600/30 bg-green-600/10 p-3 text-sm">
            <div className="font-medium">Success</div>
            <div className="text-muted-foreground mt-1">{success}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

