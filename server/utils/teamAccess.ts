import ResearchTeam from '../models/ResearchTeam';
import { roleRank, type UserRole } from '../constants/roles';

export function hasLabTeamAdminRole(role: string): boolean {
  if (role === 'super_admin') return true;
  const u = roleRank(role as UserRole);
  const m = roleRank('maitre_assistant');
  return u >= 0 && m >= 0 && u <= m;
}

export async function isTeamLeader(userId: string, teamId: string): Promise<boolean> {
  const team = await ResearchTeam.findById(teamId).select('leader').lean();
  if (!team?.leader) return false;
  return String(team.leader) === String(userId);
}

/** Leader of the team, or lab role Maître-assistant and above / super_admin. */
export async function canManageTeam(userId: string, role: string, teamId: string): Promise<boolean> {
  if (hasLabTeamAdminRole(role)) return true;
  return isTeamLeader(userId, teamId);
}

/** Either team's leader (or lab team admin) may end or update a collaboration. */
export async function canManageCollaboration(
  userId: string,
  role: string,
  teamId: string,
  partnerTeamId: string
): Promise<boolean> {
  if (await canManageTeam(userId, role, teamId)) return true;
  return isTeamLeader(userId, partnerTeamId);
}
