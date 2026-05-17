import { ROLE_LABELS } from './roles';
import type { UserRole } from '../types/user';

export const PUBLICATION_VISIBILITY_OPTIONS = [
  {
    value: 'lab',
    label: 'Tout le laboratoire',
    description: 'Visible par tous les membres connectés du labo.',
  },
  {
    value: 'team',
    label: 'Mon équipe uniquement',
    description: 'Membres de votre équipe de recherche (et les auteurs).',
  },
  {
    value: 'team_and_collaborators',
    label: 'Équipe et partenaires',
    description: 'Votre équipe plus les équipes en collaboration avec elle.',
  },
  {
    value: 'senior_staff',
    label: 'Personnel de recherche',
    description: 'Maître-assistant et grades supérieurs (hors doctorants / étudiants).',
  },
  {
    value: 'authors',
    label: 'Auteurs uniquement',
    description: 'Brouillon ou travail restreint aux co-auteurs du labo.',
  },
  {
    value: 'custom_roles',
    label: 'Rôles personnalisés',
    description: 'Choisir précisément quels rôles du labo peuvent consulter.',
  },
] as const;

export type PublicationVisibilityValue = (typeof PUBLICATION_VISIBILITY_OPTIONS)[number]['value'];

export const PUBLICATION_VISIBILITY_LABELS: Record<PublicationVisibilityValue, string> =
  Object.fromEntries(PUBLICATION_VISIBILITY_OPTIONS.map((o) => [o.value, o.label])) as Record<
    PublicationVisibilityValue,
    string
  >;

export const ROLE_OPTIONS_FOR_PUBLICATION_ACCESS: UserRole[] = [
  'professor_emeritus',
  'maitre_conference',
  'maitre_assistant',
  'assistant_contractuel',
  'docteur',
  'assistant',
  'doctorant',
  'master_student',
];

export function publicationAccessRoleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] ?? role;
}
