import type { ProjectRow } from '../services/labApi';

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  planned: 'Planifié',
  active: 'En cours',
  suspended: 'Suspendu',
  completed: 'Terminé',
};

export const PROJECT_STATUS_OPTIONS = (
  Object.entries(PROJECT_STATUS_LABELS) as [keyof typeof PROJECT_STATUS_LABELS, string][]
).map(([value, label]) => ({ value, label }));

type TeamRef = { _id?: string; name?: string };

export function projectTeamsList(project: {
  teams?: TeamRef[] | null;
  team?: TeamRef | null;
}): TeamRef[] {
  if (project.teams?.length) return project.teams;
  if (project.team?._id) return [project.team];
  return [];
}

export function projectTeamsLabel(project: Parameters<typeof projectTeamsList>[0]): string {
  const names = projectTeamsList(project)
    .map((t) => t.name)
    .filter(Boolean);
  return names.length ? names.join(', ') : '';
}

export function projectTeamsSearchText(project: ProjectRow): string {
  return projectTeamsList(project)
    .map((t) => t.name ?? '')
    .join(' ');
}
