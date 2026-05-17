import { PROJECT_STATUSES, type ProjectStatus } from '../models/Project';
import { roleRank, type UserRole } from '../constants/roles';

const FORWARD_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  planned: ['active'],
  active: ['completed', 'suspended'],
  suspended: ['completed'],
  completed: [],
};

export function isValidProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(value);
}

export function canTransitionProjectStatus(from: ProjectStatus, to: ProjectStatus): boolean {
  if (from === to) return true;
  return FORWARD_TRANSITIONS[from].includes(to);
}

export function isProjectCompletedLocked(status: ProjectStatus): boolean {
  return status === 'completed';
}

export function canCreateOrLeadProject(role: string): boolean {
  if (role === 'super_admin') return true;
  const r = roleRank(role as UserRole);
  const min = roleRank('maitre_assistant');
  return r >= 0 && min >= 0 && r <= min;
}

export const NEXT_STATUS_OPTIONS: Record<ProjectStatus, ProjectStatus[]> = FORWARD_TRANSITIONS;
