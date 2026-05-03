export type UserRole =
  | 'administrateur'
  | 'etudiant_master'
  | 'etudiant_these'
  | 'professeur_emerite'
  | 'maitre_conference'
  | 'maitre_assistant'
  | 'assistant_contractuel'
  | 'docteur'
  | 'assistant'
  | 'personnel_equipe';

export type PublicUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  academicProfile: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};
