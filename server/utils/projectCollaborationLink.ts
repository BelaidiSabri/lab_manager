import mongoose from 'mongoose';
import Project from '../models/Project';
import TeamCollaboration from '../models/TeamCollaboration';
import { validateProjectTeamIds } from './projectTeams';

export function collaborationTeamIds(collab: {
  teamA: mongoose.Types.ObjectId | string;
  teamB: mongoose.Types.ObjectId | string;
}): [string, string] {
  return [String(collab.teamA), String(collab.teamB)];
}

/** Attach a project to a collaboration: both équipes on `teams`, optional `collaboration` ref. */
export async function linkProjectToCollaboration(
  collabId: mongoose.Types.ObjectId | string,
  projectId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const collab = await TeamCollaboration.findById(collabId).lean();
  if (!collab) {
    return { ok: false, status: 404, error: 'Collaboration introuvable.' };
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return { ok: false, status: 404, error: 'Projet introuvable.' };
  }

  const [teamA, teamB] = collaborationTeamIds(collab);
  const merged = [
    ...new Set([
      ...project.teams.map((t) => t.toString()),
      teamA,
      teamB,
    ]),
  ];

  const validation = await validateProjectTeamIds(merged);
  if (!validation.ok) {
    return { ok: false, status: validation.status, error: validation.error };
  }

  project.teams = validation.objectIds;
  project.collaboration = collab._id as mongoose.Types.ObjectId;
  project.team = null;
  await project.save();

  await TeamCollaboration.updateOne(
    { _id: collab._id },
    { $addToSet: { projects: project._id } }
  );

  return { ok: true };
}

export async function unlinkProjectFromCollaboration(
  collabId: mongoose.Types.ObjectId | string,
  projectId: string
): Promise<void> {
  await TeamCollaboration.updateOne({ _id: collabId }, { $pull: { projects: projectId } });
  await Project.updateOne(
    { _id: projectId, collaboration: collabId },
    { $unset: { collaboration: 1 } }
  );
}

export async function syncProjectCollaborationAfterTeamChange(project: {
  _id: mongoose.Types.ObjectId;
  teams: mongoose.Types.ObjectId[];
  collaboration?: mongoose.Types.ObjectId | null;
}): Promise<void> {
  if (!project.collaboration) return;
  const collab = await TeamCollaboration.findById(project.collaboration).lean();
  if (!collab) {
    await Project.updateOne({ _id: project._id }, { $unset: { collaboration: 1 } });
    return;
  }
  const required = [String(collab.teamA), String(collab.teamB)];
  const current = project.teams.map((t) => t.toString());
  const hasPair = required.every((id) => current.includes(id));
  if (!hasPair) {
    await Project.updateOne({ _id: project._id }, { $unset: { collaboration: 1 } });
    await TeamCollaboration.updateOne({ _id: collab._id }, { $pull: { projects: project._id } });
  }
}

export async function findCollaborationProjects(collabId: mongoose.Types.ObjectId | string) {
  const collab = await TeamCollaboration.findById(collabId).select('projects').lean();
  const fromRef = collab?.projects ?? [];
  const fromField = await Project.find({ collaboration: collabId }).select('_id').lean();
  const ids = [
    ...new Set([
      ...fromRef.map((id) => String(id)),
      ...fromField.map((p) => String(p._id)),
    ]),
  ];
  if (ids.length === 0) return [];
  return Project.find({ _id: { $in: ids } })
    .select('title status leader teams')
    .populate('leader', 'name')
    .populate('teams', 'name')
    .lean();
}
