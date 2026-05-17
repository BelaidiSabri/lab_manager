import type { Request, Response } from 'express';
import Concours from '../models/Concours';

/** Public concours feed for the landing page (no auth). */
export const listPublicConcours = async (_req: Request, res: Response): Promise<void> => {
  const concours = await Concours.find()
    .select('title description department targetGrade startDate endDate status')
    .sort({ status: 1, endDate: -1 })
    .limit(20)
    .lean();
  res.json({ concours });
};

/** Lab branding and contact info (env-driven). */
export const getPublicLabInfo = async (_req: Request, res: Response): Promise<void> => {
  res.json({
    labName: process.env.LAB_NAME ?? 'Laboratoire de recherche',
    tagline:
      process.env.LAB_TAGLINE ??
      'Gestion des équipes, publications, projets et concours de carrière.',
    contact: {
      email: process.env.LAB_CONTACT_EMAIL ?? 'contact@lab.local',
      phone: process.env.LAB_CONTACT_PHONE ?? '',
      address: process.env.LAB_CONTACT_ADDRESS ?? '',
    },
  });
};
