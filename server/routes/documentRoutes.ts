import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { firstLoginGuard } from '../middleware/firstLoginGuard';
import { auditLogger } from '../middleware/auditLogger';
import { uploadDocumentMiddleware } from '../middleware/uploadDocument';
import { listDocuments, createDocument, deleteDocument, documentUploadValidators } from '../controllers/documentController';

const router = Router();

router.use(authenticate);
router.use(firstLoginGuard);

const uploadSingle = (req: Request, res: Response, next: NextFunction): void => {
  uploadDocumentMiddleware.single('file')(req, res, (err: unknown) => {
    if (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed' });
      return;
    }
    next();
  });
};

router.get('/', listDocuments);
router.post('/', auditLogger, uploadSingle, documentUploadValidators, createDocument);
router.delete('/:id', auditLogger, deleteDocument);

export default router;
