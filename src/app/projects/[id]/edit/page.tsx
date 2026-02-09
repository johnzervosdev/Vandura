'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc-client';
import { ProjectForm, type ProjectFormSubmitValues } from '../../_components/ProjectForm';

function toDateInputValue(d: Date | null | undefined): string {
  if (!d) return '';
  // YYYY-MM-DD in local time
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const utils = trpc.useUtils();
  // Handle Next.js 15: params.id can be string | string[] | undefined
  const idParam = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const projectId = Number(idParam);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: project, isLoading, error } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: Number.isFinite(projectId) }
  );

  const updateProject = trpc.project.update.useMutation({
    onSuccess: async () => {
      await utils.project.list.invalidate();
      await utils.project.get.invalidate({ id: projectId });
      await utils.report.projectsSummary.invalidate();
      router.push('/projects?updated=1');
    },
    onError: (e) => setSubmitError(e.message),
  });

  async function onSubmit(values: ProjectFormSubmitValues) {
    setSubmitError(null);
    await updateProject.mutateAsync({ id: projectId, data: values });
  }

  if (!Number.isFinite(projectId)) return <div className="text-destructive">Invalid project id.</div>;
  if (isLoading) return <div>Loading…</div>;
  if (error) return <div className="text-destructive">Failed to load project: {error.message}</div>;
  if (!project) return <div className="text-muted-foreground">Project not found.</div>;

  return (
    <ProjectForm
      title={`Edit Project: ${project.name}`}
      initialValues={{
        name: project.name,
        description: project.description ?? '',
        estimatedHours: project.estimatedHours === null || project.estimatedHours === undefined ? '' : String(project.estimatedHours),
        startDate: toDateInputValue(project.startDate),
        endDate: toDateInputValue(project.endDate),
        status: project.status,
      }}
      submitLabel="Save Changes"
      isSubmitting={updateProject.isPending}
      onSubmit={onSubmit}
      submitError={submitError}
    />
  );
}

