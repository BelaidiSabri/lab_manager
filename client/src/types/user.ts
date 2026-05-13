/** Mirrors server `ROLE_ORDER` / `UserRole` */
export type UserRole =
  | 'super_admin'
  | 'professor_emeritus'
  | 'maitre_conference'
  | 'maitre_assistant'
  | 'assistant_contractuel'
  | 'docteur'
  | 'assistant'
  | 'doctorant'
  | 'master_student';

export type AcademicProgram = 'none' | 'master' | 'doctorate';

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  currentGrade?: string;
  department?: string;
  speciality?: string;
  /** Parcours Master/Doctorat — distinct from grade de carrière (concours). */
  academicProgram?: AcademicProgram;
  isFirstLogin: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};
