import type { Request, Response } from 'express';
import User from '../models/User';
import Publication from '../models/Publication';
import Project from '../models/Project';
import Concours from '../models/Concours';
import Document from '../models/Document';
import Supervision from '../models/Supervision';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;

  const uid = req.auth.userId;
  const role = req.auth.role;

  const [
    userCount,
    publicationCount,
    projectCount,
    documentCount,
    openConcours,
    myProjects,
    mySupervisionsAsSupervisor,
    mySupervisionsAsStudent,
  ] = await Promise.all([
    role === 'super_admin' ? User.countDocuments({ isActive: true }) : Promise.resolve(0),
    Publication.countDocuments(),
    Project.countDocuments(),
    Document.countDocuments(),
    Concours.countDocuments({ status: 'open' }),
    Project.countDocuments({
      $or: [{ leader: uid }, { members: uid }],
    }),
    Supervision.countDocuments({ supervisor: uid }),
    Supervision.countDocuments({ supervised: uid }),
  ]);

  const myPublications = await Publication.countDocuments({ authors: uid });

  res.json({
    role,
    totals:
      role === 'super_admin'
        ? {
            users: userCount,
            publications: publicationCount,
            projects: projectCount,
            documents: documentCount,
            openConcours,
          }
        : undefined,
    mine: {
      publications: myPublications,
      projects: myProjects,
      supervisionsSupervisor: mySupervisionsAsSupervisor,
      supervisionsStudent: mySupervisionsAsStudent,
    },
    global: {
      publications: publicationCount,
      projects: projectCount,
      documents: documentCount,
      openConcours,
    },
  });
};
