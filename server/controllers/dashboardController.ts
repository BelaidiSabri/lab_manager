import type { Request, Response } from 'express';
import User from '../models/User';
import Publication from '../models/Publication';
import Project from '../models/Project';
import Concours from '../models/Concours';
import Document from '../models/Document';
import Supervision from '../models/Supervision';
import { buildViewerContext, filterVisiblePublications } from '../utils/publicationAccess';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) return;

  const uid = req.auth.userId;
  const role = req.auth.role;

  const [
    userCount,
    publicationCount,
    projectCount,
    projectsActiveCount,
    documentCount,
    openConcours,
    myProjects,
    myProjectsLed,
    myProjectsActive,
    mySupervisionsAsSupervisor,
    mySupervisionsAsStudent,
  ] = await Promise.all([
    role === 'super_admin' ? User.countDocuments({ isActive: true }) : Promise.resolve(0),
    Publication.countDocuments(),
    Project.countDocuments(),
    Project.countDocuments({ status: 'active' }),
    Document.countDocuments(),
    Concours.countDocuments({ status: 'open' }),
    Project.countDocuments({
      $or: [{ leader: uid }, { members: uid }],
    }),
    Project.countDocuments({ leader: uid }),
    Project.countDocuments({
      $or: [{ leader: uid }, { members: uid }],
      status: 'active',
    }),
    Supervision.countDocuments({ supervisor: uid }),
    Supervision.countDocuments({ supervised: uid }),
  ]);

  const myPublications = await Publication.countDocuments({ authors: uid });

  let visiblePublicationCount = publicationCount;
  if (role !== 'super_admin') {
    const viewer = await buildViewerContext(uid, role);
    const allPubs = await Publication.find()
      .select('visibility teamId accessRoles authors')
      .lean();
    visiblePublicationCount = filterVisiblePublications(viewer, allPubs).length;
  }

  res.json({
    role,
    totals:
      role === 'super_admin'
        ? {
            users: userCount,
            publications: publicationCount,
            projects: projectCount,
            projectsActive: projectsActiveCount,
            documents: documentCount,
            openConcours,
          }
        : undefined,
    mine: {
      publications: myPublications,
      projects: myProjects,
      projectsLed: myProjectsLed,
      projectsActive: myProjectsActive,
      supervisionsSupervisor: mySupervisionsAsSupervisor,
      supervisionsStudent: mySupervisionsAsStudent,
    },
    global: {
      publications: visiblePublicationCount,
      projects: projectCount,
      projectsActive: projectsActiveCount,
      documents: documentCount,
      openConcours,
    },
  });
};
