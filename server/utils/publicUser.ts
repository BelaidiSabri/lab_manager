import type { UserRole } from '../constants/roles';
import { deriveEffectiveAcademicProgram, type AcademicProgram } from '../constants/roles';

export type PublicUserDto = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  currentGrade?: string;
  academicProgram: AcademicProgram;
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
    isFirstLogin: doc.isFirstLogin,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
