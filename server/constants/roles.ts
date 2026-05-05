/** Role hierarchy: index 0 = highest privilege */
export const ROLE_ORDER = [
  'super_admin',
  'professor_emeritus',
  'maitre_conference',
  'maitre_assistant',
  'assistant_contractuel',
  'docteur',
  'assistant',
  'doctorant',
  'master_student',
] as const;

export const USER_ROLES = ROLE_ORDER;

export type UserRole = (typeof USER_ROLES)[number];

export const isUserRole = (value: string): value is UserRole =>
  (USER_ROLES as readonly string[]).includes(value);

/** Academic grade labels (excludes super_admin). Used for `currentGrade` and concours targets. */
export const ACADEMIC_GRADES = ROLE_ORDER.filter((r) => r !== 'super_admin');

export type AcademicGrade = (typeof ACADEMIC_GRADES)[number];

export const isAcademicGrade = (value: string): value is AcademicGrade =>
  (ACADEMIC_GRADES as readonly string[]).includes(value);

/** Parcours Master / Doctorat — distinct from grade de carrière (concours). */
export const ACADEMIC_PROGRAMS = ['none', 'master', 'doctorate'] as const;
export type AcademicProgram = (typeof ACADEMIC_PROGRAMS)[number];

export const isAcademicProgram = (value: string): value is AcademicProgram =>
  (ACADEMIC_PROGRAMS as readonly string[]).includes(value);

/**
 * Grades that can be awarded via concours (excludes student-only labels).
 * Master / Doctorat are academic tracks, not promotion targets.
 */
export const CONCOURS_TARGET_GRADES = [
  'professor_emeritus',
  'maitre_conference',
  'maitre_assistant',
  'assistant_contractuel',
  'docteur',
  'assistant',
] as const;

export type ConcoursTargetGrade = (typeof CONCOURS_TARGET_GRADES)[number];

export const isConcoursTargetGrade = (value: string): value is ConcoursTargetGrade =>
  (CONCOURS_TARGET_GRADES as readonly string[]).includes(value);

/** Effective program for API: stored value, or inferred from role for legacy rows. */
export function deriveEffectiveAcademicProgram(doc: {
  role: UserRole;
  academicProgram?: AcademicProgram | null;
}): AcademicProgram {
  const s = doc.academicProgram;
  if (s && s !== 'none') return s;
  if (doc.role === 'master_student') return 'master';
  if (doc.role === 'doctorant') return 'doctorate';
  return 'none';
}

export const roleRank = (role: UserRole): number => ROLE_ORDER.indexOf(role);

/** True if `actor` has strictly higher privilege than `other` (lower index = higher rank). */
export const outranks = (actor: UserRole, other: UserRole): boolean =>
  roleRank(actor) >= 0 && roleRank(other) >= 0 && roleRank(actor) < roleRank(other);
