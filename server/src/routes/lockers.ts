import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { adminOnly } from '../middleware/adminOnly';
import * as lockerService from '../services/lockerService';
import * as classificationService from '../services/classificationService';
import { upload } from '../utils/upload';

const router = Router();

router.get('/', async (_req, res: Response) => {
  const slots = await lockerService.getAllSlots();
  res.json({ slots });
});

router.get('/plans', async (_req, res: Response) => {
  const plans = await lockerService.getSubscriptionPlans();
  res.json({ plans });
});

router.get('/:slotId', async (req, res: Response) => {
  const slot = await lockerService.getSlot(req.params.slotId);
  res.json({ slot });
});

router.get('/:slotId/events', authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  const limit = Number(req.query.limit) || 50;
  const events = await lockerService.getLockerEvents(req.params.slotId, limit);
  res.json({ events });
});

router.patch(
  '/:slotId/status',
  authenticate,
  adminOnly,
  async (req: AuthRequest, res: Response) => {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ message: 'status is required' });
      return;
    }
    const slot = await lockerService.updateSlotStatus(
      req.params.slotId,
      status,
      'ADMIN',
      req.user!.userId,
      req.body.metadata,
    );
    res.json({ slot });
  },
);

router.post(
  '/:slotId/capture',
  authenticate,
  upload.single('image'),
  async (req: AuthRequest, res: Response) => {
    const { captureType, itemId } = req.body;
    if (!req.file) {
      res.status(400).json({ message: 'image file is required' });
      return;
    }
    if (!captureType || !['PLACEMENT', 'RETURN'].includes(captureType)) {
      res.status(400).json({ message: 'captureType must be PLACEMENT or RETURN' });
      return;
    }

    let classificationResult: Record<string, unknown> | undefined;
    try {
      if (captureType === 'RETURN' && itemId) {
        const reference = await classificationService.getCaptures(req.params.slotId, 1);
        const placementCapture = reference.find((c) => c.captureType === 'PLACEMENT');
        if (placementCapture) {
          classificationResult = (await classificationService.verifyItem(
            placementCapture.imagePath,
            req.file.path,
          )) as unknown as Record<string, unknown>;
        }
      }
    } catch {
      // Classification failure is non-fatal; admin reviews manually
    }

    const capture = await classificationService.recordCapture(
      req.params.slotId,
      captureType,
      req.file.path,
      itemId,
      classificationResult,
    );

    res.status(201).json({ capture, classificationResult });
  },
);

router.get('/:slotId/captures', authenticate, async (req: AuthRequest, res: Response) => {
  const limit = Number(req.query.limit) || 20;
  const captures = await classificationService.getCaptures(req.params.slotId, limit);
  res.json({ captures });
});

export default router;
