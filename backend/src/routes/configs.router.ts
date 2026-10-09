import { Router, Request, Response } from 'express';
import { ConfigModel } from '../database/db';
import { IConfigCategory } from '../types';
import { HistoryService } from '../services/history.service';
import { wsManager } from '../websocket/gateway';

const router = Router();

export const CONFIG_GROUPS = [
  { key: 'product', label: 'Sản Phẩm' },
  { key: 'supplier', label: 'Nhà Cung Cấp' },
  { key: 'system', label: 'Hệ Thống' },
  { key: 'account_level', label: 'Cấp Tài Khoản' },
  { key: 'account_status', label: 'Trạng Thái Tài Khoản' },
  { key: 'customer_status', label: 'Trạng Thái Khách Hàng' },
  { key: 'account_type', label: 'Loại Tài Khoản' },
  { key: 'ott_app', label: 'Ứng Dụng' },
  { key: 'note_type', label: 'Loại Ghi chú' }
];

// GET /api/configs
router.get('/', async (req: Request, res: Response) => {
  const configs = (await ConfigModel.find().lean().exec()) as IConfigCategory[];

  // Sort by sortOrder
  configs.sort((a, b) => (a.sortOrder || 1) - (b.sortOrder || 1));

  // Group by category
  const grouped: Record<string, IConfigCategory[]> = {};
  CONFIG_GROUPS.forEach(g => {
    grouped[g.key] = [];
  });

  configs.forEach(cfg => {
    if (!grouped[cfg.group]) grouped[cfg.group] = [];
    grouped[cfg.group].push(cfg);
  });

  return res.json({
    raw: configs,
    grouped,
    groups: CONFIG_GROUPS
  });
});

// POST /api/configs
router.post('/', async (req: Request, res: Response) => {
  const { code, name, group, sortOrder, systems } = req.body;
  if (!code || !name || !group) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ code, name và group.' });
  }

  const newConfig: IConfigCategory = {
    id: req.body.id || `cfg_${group}_${Date.now()}`,
    code: code.trim(),
    name: name.trim(),
    group: group.trim(),
    sortOrder: Number(sortOrder) || 1,
    systems: Array.isArray(systems) ? systems : []
  };

  const createdDoc = await ConfigModel.create(newConfig);

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: 'CREATE',
    module: 'CONFIG',
    objectType: 'ConfigCategory',
    objectId: newConfig.id,
    newData: newConfig
  });

  wsManager.broadcast('config.created', createdDoc.toObject());

  return res.status(201).json(createdDoc.toObject());
});

// PUT /api/configs/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { code, name, group, sortOrder, systems } = req.body;

  if (!code || !name || !group) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ code, name và group.' });
  }

  const existingConfig = await ConfigModel.findOne({ id }).lean();
  if (!existingConfig) {
    return res.status(404).json({ message: 'Cấu hình không tồn tại trong MongoDB.' });
  }

  const updatedConfig: IConfigCategory = {
    id,
    code: code.trim(),
    name: name.trim(),
    group: group.trim(),
    sortOrder: Number(sortOrder) || 1,
    systems: Array.isArray(systems) ? systems : []
  };

  await ConfigModel.updateOne({ id }, updatedConfig);

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: 'UPDATE',
    module: 'CONFIG',
    objectType: 'ConfigCategory',
    objectId: id,
    oldData: existingConfig,
    newData: updatedConfig
  });

  wsManager.broadcast('config.updated', updatedConfig);

  return res.json(updatedConfig);
});

// DELETE /api/configs/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const existingConfig = await ConfigModel.findOne({ id }).lean();
  if (!existingConfig) {
    return res.status(404).json({ message: 'Cấu hình không tồn tại trong MongoDB.' });
  }

  await ConfigModel.deleteOne({ id });

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: 'DELETE',
    module: 'CONFIG',
    objectType: 'ConfigCategory',
    objectId: id,
    oldData: existingConfig
  });

  wsManager.broadcast('config.deleted', { id });

  return res.json({ message: 'Xóa cấu hình thành công khỏi MongoDB.' });
});

export default router;
