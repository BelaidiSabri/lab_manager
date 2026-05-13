export const DEPARTMENTS = [
  'Informatique',
  'Mathématiques',
  'Physique',
  'Chimie',
  'Mécanique',
  'Électronique',
  'Génie Civil',
  'Biologie',
  'Sciences Économiques',
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const isDepartment = (value: string): value is Department =>
  (DEPARTMENTS as readonly string[]).includes(value);
