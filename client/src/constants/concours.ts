import type { UserRole } from '../types/user';
import { ROLE_LABELS } from './roles';

/** Must match server `CONCOURS_TARGET_GRADES` (career grades only — not Master/Doctorat). */
export const CONCOURS_TARGET_ROLE_KEYS = [
  'professor_emeritus',
  'maitre_conference',
  'maitre_assistant',
  'assistant_contractuel',
  'docteur',
  'assistant',
] as const satisfies readonly UserRole[];

export const CONCOURS_TARGET_OPTIONS = CONCOURS_TARGET_ROLE_KEYS.map((value) => ({
  value,
  label: ROLE_LABELS[value],
}));

export const CONCOURS_STATUS_LABELS: Record<'open' | 'closed' | 'finished', string> = {
  open: 'Ouvert',
  closed: 'Fermé',
  finished: 'Terminé',
};

export const ACADEMIC_PROGRAM_LABELS: Record<'none' | 'master' | 'doctorate', string> = {
  none: '—',
  master: 'Parcours Master',
  doctorate: 'Parcours Doctorat',
};
