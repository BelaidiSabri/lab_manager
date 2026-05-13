import type { UserRole } from '../constants/roles';
import { deriveEffectiveAcademicProgram, type AcademicProgram } from '../constants/roles';
import type { Department } from '../constants/departments';

export type PublicUserDto = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  currentGrade?: string;
  academicProgram: AcademicProgram;
  department?: Department;
  speciality?: string;
  isFirstLogin: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicUserDto(doc: {
  _id: { toString: () => string };
  name: string;
  email: string;
  role: UserRole;
  currentGrade?: string | null;
  academicProgram?: AcademicProgram | null;
  department?: Department | null;
  speciality?: string | null;
  isFirstLogin: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicUserDto {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    currentGrade: doc.currentGrade ?? undefined,
    academicProgram: deriveEffectiveAcademicProgram({
      role: doc.role,
      academicProgram: doc.academicProgram ?? undefined,
    }),
    department: doc.department ?? undefined,
    speciality: doc.speciality ?? undefined,
    isFirstLogin: doc.isFirstLogin,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
