import TeamCollaboration from '../models/TeamCollaboration';
import User from '../models/User';
import { roleRank, type UserRole } from '../constants/roles';

export const PUBLICATION_VISIBILITY = [
  'lab',
  'team',
  'team_and_collaborators',
  'authors',
  'senior_staff',
  'custom_roles',
] as const;

export type PublicationVisibility = (typeof PUBLICATION_VISIBILITY)[number];

export type PublicationAccessDoc = {
  visibility?: string;
  teamId?: unknown;
  accessRoles?: string[];
  authors: unknown[];
};

export type ViewerContext = {
  userId: string;
  role: UserRole;
  teamId: string | null;
  collaboratorTeamIds: Set<string>;
};

export function authorIds(authors: unknown[]): string[] {
  return authors.map((a) => {
    if (a && typeof a === 'object' && '_id' in a) return String((a as { _id: unknown })._id);
    return String(a);
  });
}

export async function buildViewerContext(userId: string, role: UserRole): Promise<ViewerContext> {
  const user = await User.findById(userId).select('teamId').lean();
  const teamId = user?.teamId ? String(user.teamId) : null;
  const collaboratorTeamIds = new Set<string>();
  if (teamId) {
    const collabs = await TeamCollaboration.find({
      $or: [{ teamA: teamId }, { teamB: teamId }],
    })
      .select('teamA teamB')
      .lean();
    for (const c of collabs) {
      const a = String(c.teamA);
      const b = String(c.teamB);
      if (a !== teamId) collaboratorTeamIds.add(a);
      if (b !== teamId) collaboratorTeamIds.add(b);
    }
  }
  return { userId, role, teamId, collaboratorTeamIds };
}

/** super_admin sees all; authors always see their own publications. */
export function canViewPublication(viewer: ViewerContext, pub: PublicationAccessDoc): boolean {
  if (viewer.role === 'super_admin') return true;
  if (authorIds(pub.authors).includes(viewer.userId)) return true;

  const visibility = (pub.visibility ?? 'lab') as PublicationVisibility;
  const pubTeamId = pub.teamId ? String(pub.teamId) : null;

  switch (visibility) {
    case 'lab':
      return true;
    case 'authors':
      return false;
    case 'senior_staff': {
      const r = roleRank(viewer.role);
      const min = roleRank('maitre_assistant');
      return r >= 0 && min >= 0 && r <= min;
    }
    case 'team':
      return !!viewer.teamId && !!pubTeamId && viewer.teamId === pubTeamId;
    case 'team_and_collaborators': {
      if (!pubTeamId || !viewer.teamId) return false;
      if (viewer.teamId === pubTeamId) return true;
      return viewer.collaboratorTeamIds.has(pubTeamId);
    }
    case 'custom_roles': {
      const roles = pub.accessRoles ?? [];
      if (!roles.length) return true;
      return roles.includes(viewer.role);
    }
    default:
      return true;
  }
}

export function filterVisiblePublications<T extends PublicationAccessDoc>(
  viewer: ViewerContext,
  publications: T[]
): T[] {
  return publications.filter((p) => canViewPublication(viewer, p));
}
