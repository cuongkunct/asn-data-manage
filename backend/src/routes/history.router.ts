import { Router, Request, Response } from 'express';
import { HistoryService } from '../services/history.service';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const result = await HistoryService.getHistory({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    module: req.query.module as string,
    action: req.query.action as string,
    objectId: req.query.object_id as string || req.query.objectId as string,
    search: req.query.search as string
  });

  return res.json(result);
});

export default router;
