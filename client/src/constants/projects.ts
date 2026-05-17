export const PROJECT_STATUS_LABELS: Record<string, string> = {
  planned: 'Planifié',
  active: 'En cours',
  suspended: 'Suspendu',
  completed: 'Terminé',
};

export const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));
