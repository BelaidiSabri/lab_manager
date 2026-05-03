import type { UserRole } from '../types/user';

export const ROLE_LABELS: Record<UserRole, string> = {
  administrateur: 'Administrateur',
  etudiant_master: 'Étudiant Master',
  etudiant_these: 'Étudiant thèse',
  professeur_emerite: 'Professeur émérite',
  maitre_conference: 'Maître de conférences',
  maitre_assistant: 'Maître-assistant',
  assistant_contractuel: 'Assistant contractuel',
  docteur: 'Docteur',
  assistant: 'Assistant',
  personnel_equipe: 'Personnel équipe',
};

export const ROLE_OPTIONS: UserRole[] = [
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
];
