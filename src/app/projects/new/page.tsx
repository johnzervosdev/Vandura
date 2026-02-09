'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc-client';
import { ProjectForm, type ProjectFormSubmitValues } from '../_components/ProjectForm';

export default function NewProjectPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createProject = trpc.project.create.useMutation({
    onSuccess: async () => {
      await utils.project.list.invalidate();
      await utils.report.projectsSummary.invalidate();
      router.push('/projects?created=1');
    },
    onError: (e) => {
      setSubmitError(e.message);
    },
  });

  async function onSubmit(values: ProjectFormSubmitValues) {
    setSubmitError(null);
    await createProject.mutateAsync(values);
  }

  return (
    <ProjectForm
      title="New Project"
      initialValues={{
        name: '',
        description: '',
        estimatedHours: '',
        startDate: '',
        endDate: '',
        status: 'active',
      }}
      submitLabel="Create Project"
      isSubmitting={createProject.isPending}
      onSubmit={onSubmit}
      submitError={submitError}
    />
  );
}

