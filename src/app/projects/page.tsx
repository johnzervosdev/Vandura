'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc-client';

export default function ProjectsPage() {
  const utils = trpc.useUtils();
  const { data: projects, isLoading, error } = trpc.project.list.useQuery();
  const createProject = trpc.project.create.useMutation({
    onSuccess: async () => {
      await utils.project.list.invalidate();
    },
  });

  const [name, setName] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<string>('');
  const [description, setDescription] = useState('');

  const canCreate = name.trim().length > 0 && !createProject.isPending;

  async function onCreate() {
    if (!canCreate) return;
    await createProject.mutateAsync({
      name: name.trim(),
      description: description.trim() ? description.trim() : undefined,
      estimatedHours: estimatedHours.trim() ? Number(estimatedHours) : undefined,
      status: 'active',
    });
    setName('');
    setEstimatedHours('');
    setDescription('');
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Projects</h1>
        <p className="text-muted-foreground mt-2">Create projects and track estimated vs actual hours.</p>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create Project</h2>
          {createProject.error ? (
            <div className="text-sm text-destructive">{createProject.error.message}</div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="e.g. Project Alpha"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Estimated hours (optional)</label>
            <input
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="e.g. 120"
              inputMode="decimal"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Short note"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onCreate}
          disabled={!canCreate}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          {createProject.isPending ? 'Creating…' : 'Create'}
        </button>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">All Projects</h2>
        </div>

        <div className="p-6">
          {isLoading ? <div>Loading…</div> : null}
          {error ? <div className="text-destructive">Failed to load: {error.message}</div> : null}

          {projects && projects.length === 0 ? (
            <div className="text-muted-foreground">No projects yet. Create one above.</div>
          ) : null}

          {projects && projects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Estimated</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} className="border-b last:border-b-0">
                      <td className="py-3 px-4">
                        <a className="font-medium hover:underline" href={`/projects/${p.id}`}>
                          {p.name}
                        </a>
                      </td>
                      <td className="py-3 px-4">{p.status}</td>
                      <td className="py-3 px-4 text-right">{p.estimatedHours?.toFixed(1) ?? 'N/A'}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

