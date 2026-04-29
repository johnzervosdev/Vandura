'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc-client';
import { Modal } from '@/components/Modal';

function BugGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      aria-hidden
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="24" cy="26" rx="14" ry="12" fill="#7c3aed" />
      <ellipse cx="24" cy="26" rx="10" ry="8" fill="#a78bfa" opacity={0.35} />
      <ellipse cx="18" cy="24" rx="4" ry="5" fill="#4c1d95" />
      <ellipse cx="30" cy="24" rx="4" ry="5" fill="#4c1d95" />
      <path d="M24 14 L22 8 L20 8 Z" fill="#4c1d95" />
      <path d="M26 14 L28 8 L30 8 Z" fill="#4c1d95" />
      <path
        d="M14 28 Q10 30 8 34"
        stroke="#4c1d95"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M34 28 Q38 30 40 34"
        stroke="#4c1d95"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="24" cy="34" r="2" fill="#fde047" />
    </svg>
  );
}

export function BugReportFab() {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [titleErr, setTitleErr] = useState<string | null>(null);
  const [descErr, setDescErr] = useState<string | null>(null);
  const [closeNoteById, setCloseNoteById] = useState<Record<number, string>>({});
  const panelRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const listOpen = trpc.bugReport.listOpen.useQuery(undefined, {
    enabled: open,
    meta: { suppressGlobalError: true },
  });

  const createMut = trpc.bugReport.create.useMutation({
    onSuccess: async () => {
      setTitle('');
      setDescription('');
      setTitleErr(null);
      setDescErr(null);
      await utils.bugReport.listOpen.invalidate();
    },
  });

  const closeMut = trpc.bugReport.close.useMutation({
    onSuccess: async () => {
      await utils.bugReport.listOpen.invalidate();
    },
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open && panelRef.current) {
      const focusable = panelRef.current.querySelector<HTMLElement>(
        'input, textarea, button, [href]'
      );
      focusable?.focus();
    }
  }, [open]);

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    setTitleErr(null);
    setDescErr(null);
    const t = title.trim();
    const d = description.trim();
    if (!t) {
      setTitleErr('Title is required');
      return;
    }
    if (!d) {
      setDescErr('Description is required');
      return;
    }
    createMut.mutate({
      title: t,
      description: d,
      pagePath: pathname,
    });
  }

  function closeReport(id: number) {
    const note = closeNoteById[id]?.trim();
    closeMut.mutate(
      { id, closeNote: note || undefined },
      {
        onSuccess: () => {
          setCloseNoteById((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        },
      }
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-card shadow-lg ring-offset-background transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:bottom-6 md:right-6"
        aria-label="Report a bug or feedback"
      >
        <BugGlyph className="h-9 w-9" />
      </button>

      {open ? (
        <Modal
          onClose={() => setOpen(false)}
          closeOnBackdrop
          showCloseButton
          maxWidthClassName="max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div ref={panelRef} className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Bug reports & feedback</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Saved locally in SQLite — no external bug tracker.
              </p>
            </div>

            <form onSubmit={submitNew} className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="text-sm font-medium">New report</div>
              <div>
                <label htmlFor="bug-title" className="text-sm text-muted-foreground">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  id="bug-title"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  autoComplete="off"
                />
                {titleErr ? <p className="text-xs text-destructive mt-1">{titleErr}</p> : null}
              </div>
              <div>
                <label htmlFor="bug-desc" className="text-sm text-muted-foreground">
                  Description <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="bug-desc"
                  className="mt-1 w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={8000}
                />
                {descErr ? <p className="text-xs text-destructive mt-1">{descErr}</p> : null}
              </div>
              <p className="text-xs text-muted-foreground">Page when filed: {pathname}</p>
              <button
                type="submit"
                disabled={createMut.isPending}
                className="inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
              >
                {createMut.isPending ? 'Submitting…' : 'Submit report'}
              </button>
              {createMut.error ? (
                <p className="text-sm text-destructive">{createMut.error.message}</p>
              ) : null}
            </form>

            <div className="space-y-2">
              <div className="text-sm font-medium">Open reports</div>
              {listOpen.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : listOpen.error ? (
                <p className="text-sm text-destructive">{listOpen.error.message}</p>
              ) : !listOpen.data?.length ? (
                <p className="text-sm text-muted-foreground">No open reports.</p>
              ) : (
                <ul className="max-h-56 space-y-3 overflow-y-auto pr-1">
                  {listOpen.data.map((r) => (
                    <li key={r.id} className="rounded-md border bg-background p-3 text-sm">
                      <div className="font-medium">{r.title}</div>
                      <div className="text-muted-foreground whitespace-pre-wrap mt-1">
                        {r.description}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {r.pagePath ? <span>Page: {r.pagePath} · </span> : null}
                        <span>
                          Filed{' '}
                          {r.createdAt instanceof Date
                            ? r.createdAt.toLocaleString()
                            : String(r.createdAt)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                        <input
                          type="text"
                          className="flex-1 rounded-md border bg-background px-2 py-1 text-xs"
                          placeholder="Close note (optional)"
                          value={closeNoteById[r.id] ?? ''}
                          onChange={(e) =>
                            setCloseNoteById((prev) => ({
                              ...prev,
                              [r.id]: e.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="rounded-md border border-destructive/40 px-3 py-1 text-destructive text-xs hover:bg-destructive/10 disabled:opacity-50"
                          disabled={closeMut.isPending}
                          onClick={() => closeReport(r.id)}
                        >
                          Close
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
