import mongoose from 'mongoose';
import ResearchTeam from '../models/ResearchTeam';
import TeamCollaboration, { normalizeTeamPair } from '../models/TeamCollaboration';

export function parseTeamIdsFromBody(body: { teams?: unknown; team?: unknown }): string[] {
  if (Array.isArray(body.teams)) {
    return [
      ...new Set(
        body.teams
          .map((id) => String(id).trim())
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
      ),
    ];
  }
  if (body.team != null && body.team !== '' && mongoose.Types.ObjectId.isValid(String(body.team))) {
    return [String(body.team)];
  }
  return [];
}

/** Legacy `team` → `teams` for documents not yet migrated. */
export function resolveProjectTeams(doc: {
  teams?: mongoose.Types.ObjectId[] | { _id?: unknown }[];
  team?: mongoose.Types.ObjectId | { _id?: unknown } | null;
}): unknown[] {
  const fromArray = doc.teams;
  if (Array.isArray(fromArray) && fromArray.length > 0) return fromArray;
  if (doc.team) return [doc.team];
  return [];
}

export async function validateProjectTeamIds(
  teamIds: string[]
): Promise<{ ok: true; objectIds: mongoose.Types.ObjectId[] } | { ok: false; status: number; error: string }> {
  if (teamIds.length === 0) {
    return { ok: true, objectIds: [] };
  }

  const objectIds = teamIds.map((id) => new mongoose.Types.ObjectId(id));
  const found = await ResearchTeam.find({ _id: { $in: objectIds } }).select('_id name').lean();
  if (found.length !== teamIds.length) {
    return { ok: false, status: 404, error: 'Une ou plusieurs équipes sont introuvables.' };
  }

  if (teamIds.length < 2) {
    return { ok: true, objectIds };
  }

  const nameById = new Map(found.map((t) => [String(t._id), String(t.name)]));
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      const [teamA, teamB] = normalizeTeamPair(teamIds[i], teamIds[j]);
      const collab = await TeamCollaboration.findOne({ teamA, teamB }).lean();
      if (!collab) {
        const a = nameById.get(teamIds[i]) ?? 'Équipe';
        const b = nameById.get(teamIds[j]) ?? 'Équipe';
        return {
          ok: false,
          status: 400,
          error: `Aucune collaboration enregistrée entre « ${a} » et « ${b} ». Créez d’abord une collaboration inter-équipes.`,
        };
      }
      const now = new Date();
      if (collab.endDate && new Date(collab.endDate) < now) {
        return {
          ok: false,
          status: 400,
          error: 'La collaboration entre certaines équipes sélectionnées est terminée.',
        };
      }
    }
  }

  return { ok: true, objectIds };
}

export function teamFilterForQuery(teamId: string): Record<string, unknown> {
  const oid = new mongoose.Types.ObjectId(teamId);
  return { $or: [{ teams: oid }, { team: oid }] };
}

export function projectTeamIdStrings(project: {
  teams?: mongoose.Types.ObjectId[] | { _id?: unknown }[];
  team?: mongoose.Types.ObjectId | { _id?: unknown } | null;
}): string[] {
  return resolveProjectTeams(project).map((t) =>
    String((t as { _id?: unknown })._id ?? t)
  );
}

