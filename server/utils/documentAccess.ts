import type { UserRole } from '../constants/roles';

/** Empty accessRoles → visible to all authenticated lab users. */
export const canViewDocument = (userRole: UserRole, accessRoles: string[]): boolean => {
  if (!accessRoles.length) return true;
  if (userRole === 'super_admin') return true;
  return accessRoles.includes(userRole);
};
