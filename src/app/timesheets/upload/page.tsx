'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc-client';
import { Modal } from '@/components/Modal';

/** Canonical copy for support/QA (Story 3.3) — keep in sync with README.md */
const DUPLICATE_EXACT = 'Importing the same file twice will create duplicate entries.';
const TIMEZONE_EXACT = 'All times are treated as local machine time (no timezone conversion).';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export default function TimesheetUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const parseExcel = trpc.timesheet.parseExcel.useMutation({
    meta: { suppressGlobalToast: true },
  });
  const importExcel = trpc.timesheet.importExcel.useMutation({
    meta: { suppressGlobalToast: true },
  });

  const canParse = useMemo(
    () => !!file && !!fileBuffer && !parseExcel.isPending && !importExcel.isPending,
    [file, fileBuffer, parseExcel.isPending, importExcel.isPending]
  );

  const canImport =
    !!fileBuffer &&
    !!parseExcel.data &&
    parseExcel.data.errors.length === 0 &&
    !importExcel.isPending;

  async function onParse() {
    setError(null);
    setSuccess(null);

    if (!file || !fileBuffer) return;

    try {
      await parseExcel.mutateAsync({ fileBuffer });
      setPreviewOpen(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Parse failed';
      setError(message);
    }
  }

  async function onImport() {
    setError(null);
    setSuccess(null);
    if (!fileBuffer) return;

    try {
      const result = await importExcel.mutateAsync({ fileBuffer });
      setSuccess(`Imported ${result.imported} time entries.`);
      setPreviewOpen(false);
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

      <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Expected format</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Column headers are matched <span className="text-foreground font-medium">flexibly</span> and{' '}
            <span className="text-foreground font-medium">case-insensitive</span> (e.g. &quot;Dev&quot; or
            &quot;Developer name&quot;). Use the table below as a guide; aliases like &quot;Activity&quot;
            for Task are accepted.
          </p>
        </div>

        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full min-w-[640px] text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-3 font-medium">Developer</th>
                <th className="text-left py-2 pr-3 font-medium">Project</th>
                <th className="text-left py-2 pr-3 font-medium">Task</th>
                <th className="text-left py-2 pr-3 font-medium">Date</th>
                <th className="text-left py-2 pr-3 font-medium">Start Time</th>
                <th className="text-left py-2 pr-3 font-medium">End Time</th>
                <th className="text-left py-2 pr-3 font-medium">Duration (min)</th>
                <th className="text-left py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-muted-foreground">
                <td className="py-2 pr-3 align-top">Who logged the work</td>
                <td className="py-2 pr-3 align-top">Project name</td>
                <td className="py-2 pr-3 align-top">Task name</td>
                <td className="py-2 pr-3 align-top">Work date</td>
                <td className="py-2 pr-3 align-top">Optional if duration set</td>
                <td className="py-2 pr-3 align-top">Optional if duration set</td>
                <td className="py-2 pr-3 align-top">15-minute multiples</td>
                <td className="py-2 align-top">Optional</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-sm text-muted-foreground">
          Provide either <span className="text-foreground font-medium">Duration (min)</span> or both{' '}
          <span className="text-foreground font-medium">Start Time</span> and{' '}
          <span className="text-foreground font-medium">End Time</span> — the parser derives the missing
          piece. Duration must be a <span className="text-foreground font-medium">multiple of 15 minutes</span>
          .
        </p>

        <p>
          <a
            href="/timesheet-template.xlsx"
            className="text-sm font-medium text-primary hover:underline"
            download
          >
            Download blank template (.xlsx)
          </a>
        </p>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Dates &amp; times</h3>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1.5">
            <li>
              <span className="text-foreground font-medium">ISO date</span> <code className="text-xs bg-muted px-1 rounded">YYYY-MM-DD</code> — interpreted as a{' '}
              <span className="text-foreground">local calendar date</span> (midnight local).
            </li>
            <li>
              <span className="text-foreground font-medium">Excel serial dates</span> — numeric cells (days since Excel&apos;s epoch) are supported.
            </li>
            <li>
              <span className="text-foreground font-medium">Slash dates</span> —{' '}
              <code className="text-xs bg-muted px-1 rounded">M/D/YYYY</code> or{' '}
              <code className="text-xs bg-muted px-1 rounded">D/M/YYYY</code>; ambiguous day/month values default to US-style (M/D).
            </li>
            <li>
              Other date strings may parse via ISO 8601 / common formats where the cell is plain text.
            </li>
            <li>
              <span className="text-foreground font-medium">Time</span> —{' '}
              <code className="text-xs bg-muted px-1 rounded">HH:MM</code> or{' '}
              <code className="text-xs bg-muted px-1 rounded">HH:MM AM/PM</code>, or 4-digit{' '}
              <code className="text-xs bg-muted px-1 rounded">0930</code> style.
            </li>
          </ul>
        </div>

        <p className="text-sm text-muted-foreground">
          Other layouts — for example a <span className="text-foreground font-medium">weekly grid</span>{' '}
          with weekdays as columns — are also supported. Use <span className="text-foreground font-medium">Parse</span>{' '}
          to see how your file was read, or read <span className="text-foreground font-medium">VANDURA_ARCHITECTURE.md</span>{' '}
          (Excel import / weekly-grid) in the project repository.
        </p>

        <p className="text-sm text-muted-foreground">
          Short overview: <span className="text-foreground">README.md</span> § Excel Format.
        </p>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
        <div className="text-sm font-medium">Important</div>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-2">
          <li className="text-foreground">{DUPLICATE_EXACT}</li>
          <li className="text-foreground">{TIMEZONE_EXACT}</li>
        </ul>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Excel file</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={async (e) => {
              setError(null);
              setSuccess(null);
              parseExcel.reset();
              setPreviewOpen(false);

              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setFileBuffer(null);

              if (f) {
                const buffer = await f.arrayBuffer();
                setFileBuffer(arrayBufferToBase64(buffer));
              }
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
            onClick={onParse}
            disabled={!canParse}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          >
            {parseExcel.isPending ? 'Parsing…' : 'Parse'}
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

      {previewOpen && parseExcel.data ? (
        <Modal onClose={() => setPreviewOpen(false)} closeOnBackdrop showCloseButton maxWidthClassName="max-w-3xl">
          <div className="space-y-4">
            <div className="text-lg font-semibold">Parse Preview</div>

            <div className="text-sm text-muted-foreground">
              Parsed <span className="text-foreground font-medium">{parseExcel.data.entryCount}</span> entries —{' '}
              <span className={parseExcel.data.errors.length ? 'text-destructive font-medium' : ''}>
                {parseExcel.data.errors.length} errors
              </span>
              , {parseExcel.data.warnings.length} warnings
            </div>

            <div className="text-sm text-muted-foreground">
              Sheet selected:{' '}
              <span className="text-foreground font-medium">
                {parseExcel.data.sheetName ? parseExcel.data.sheetName : 'Unknown'}
              </span>
            </div>

            <div className="text-sm text-muted-foreground">
              Developer detected:{' '}
              <span className="text-foreground font-medium">
                {parseExcel.data.detectedDeveloper ? parseExcel.data.detectedDeveloper : 'Not detected'}
              </span>
            </div>

            <div className="text-sm text-muted-foreground">
              Projects on sheet:{' '}
              <span className="text-foreground font-medium">{parseExcel.data.projects.all.length}</span>
              {parseExcel.data.projects.invalid.length ? (
                <>
                  {' '}
                  — Invalid:{' '}
                  <span className="text-destructive font-medium">
                    {parseExcel.data.projects.invalid.length}
                  </span>
                  <span className="text-muted-foreground">
                    {' '}
                    ({parseExcel.data.projects.invalid.join(', ')})
                  </span>
                </>
              ) : null}
            </div>

            {parseExcel.data.preview.length ? (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left py-2 px-3">Developer</th>
                      <th className="text-left py-2 px-3">Project</th>
                      <th className="text-left py-2 px-3">Task</th>
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-right py-2 px-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseExcel.data.preview.map((r, idx) => (
                      <tr key={idx} className="border-b last:border-b-0">
                        <td className="py-2 px-3">{r.developer}</td>
                        <td className="py-2 px-3">{r.project}</td>
                        <td className="py-2 px-3">{r.task ?? ''}</td>
                        <td className="py-2 px-3">{new Date(r.startTime).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right">{r.durationMinutes}m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No valid entries found to preview.</div>
            )}

            {parseExcel.data.errors.length ? (
              <details className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
                <summary className="cursor-pointer text-sm font-medium text-destructive">
                  Errors ({parseExcel.data.errors.length}) — import is blocked
                </summary>
                <ul className="mt-2 text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  {parseExcel.data.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </details>
            ) : null}

            {parseExcel.data.warnings.length ? (
              <details className="rounded-md border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Warnings ({parseExcel.data.warnings.length})
                </summary>
                <ul className="mt-2 text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  {parseExcel.data.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </details>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                className="rounded-md border px-4 py-2"
                onClick={() => setPreviewOpen(false)}
                disabled={importExcel.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
                onClick={onImport}
                disabled={!canImport}
              >
                {importExcel.isPending ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
