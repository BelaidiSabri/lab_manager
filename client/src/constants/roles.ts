import type { UserRole } from '../types/user';

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super administrateur',
  professor_emeritus: 'Professeur émérite',
  maitre_conference: 'Maître de conférences',
  maitre_assistant: 'Maître-assistant',
  assistant_contractuel: 'Assistant contractuel',
  docteur: 'Docteur',
  assistant: 'Assistant',
  doctorant: 'Doctorant',
  master_student: 'Étudiant master',
};

/** Roles assignable when creating a user (never self-service super_admin). */
export const ROLE_OPTIONS: UserRole[] = [
  'professor_emeritus',
  'maitre_conference',
  'maitre_assistant',
  'assistant_contractuel',
  'docteur',
  'assistant',
  'doctorant',
  'master_student',
];

export const ROLE_ORDER: UserRole[] = [
  'super_admin',
  'professor_emeritus',
  'maitre_conference',
  'maitre_assistant',
  'assistant_contractuel',
  'docteur',
  'assistant',
  'doctorant',
  'master_student',
];

export const canManageTeams = (role: string | undefined | null): boolean => {
  if (!role) return false;
  const idx = ROLE_ORDER.indexOf(role as UserRole);
  const minIdx = ROLE_ORDER.indexOf('maitre_assistant');
  return idx >= 0 && idx <= minIdx;
};

/** Leader of a given team, or lab-wide team admin (Maître-assistant+). */
export const canManageThisTeam = (
  userId: string | undefined,
  role: string | undefined | null,
  teamLeaderId: string | undefined
): boolean => {
  if (canManageTeams(role)) return true;
  if (userId && teamLeaderId && userId === teamLeaderId) return true;
  return false;
};

/** Either team's leader (or lab team admin) may end or edit a collaboration. */
export const canManageCollaboration = (
  userId: string | undefined,
  role: string | undefined | null,
  teamLeaderId: string | undefined,
  partnerLeaderId: string | undefined
): boolean => {
  if (canManageThisTeam(userId, role, teamLeaderId)) return true;
  if (userId && partnerLeaderId && userId === partnerLeaderId) return true;
  return false;
};

export const isStudentTrackRole = (role: string | undefined | null): boolean =>
  role === 'master_student' || role === 'doctorant';

export const canReviewEncadrementRequests = (role: string | undefined | null): boolean => {
  if (!role) return false;
  if (role === 'super_admin') return true;
  const idx = ROLE_ORDER.indexOf(role as UserRole);
  return idx >= 0 && idx <= ROLE_ORDER.indexOf('maitre_assistant');
};

/** Matches server `ACADEMIC_GRADES` — valid values for user `currentGrade`. */
export const ACADEMIC_GRADE_OPTIONS = [
  'professor_emeritus',
  'maitre_conference',
  'maitre_assistant',
  'assistant_contractuel',
  'docteur',
  'assistant',
  'doctorant',
  'master_student',
] as const satisfies readonly UserRole[];

/** Lower index = more senior (aligns with server `ROLE_ORDER` for academic grades). */
export function careerRankGrade(grade: string): number {
  return ACADEMIC_GRADE_OPTIONS.indexOf(grade as (typeof ACADEMIC_GRADE_OPTIONS)[number]);
}

/** Grades strictly more junior than `targetGrade` (for plafond d’éligibilité concours). */
export function maxJuniorGradeOptionsForTarget(targetGrade: string): (typeof ACADEMIC_GRADE_OPTIONS)[number][] {
  const rt = careerRankGrade(targetGrade);
  if (rt < 0) return [];
  return ACADEMIC_GRADE_OPTIONS.filter((g) => {
    const isMoreJunior = careerRankGrade(g) > rt;
    if (!isMoreJunior) return false;
    // Master/Doctorant are academic milestones managed outside concours.
    if (g === 'doctorant' || g === 'master_student') return false;
    return true;
  });
}
