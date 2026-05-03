export const USER_ROLES = [
  'administrateur',
  'etudiant_master',
  'etudiant_these',
  'professeur_emerite',
  'maitre_conference',
  'maitre_assistant',
  'assistant_contractuel',
  'docteur',
  'assistant',
  'personnel_equipe',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const isUserRole = (value: string): value is UserRole =>
  (USER_ROLES as readonly string[]).includes(value);
