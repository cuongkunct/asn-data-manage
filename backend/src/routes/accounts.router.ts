import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { AccountModel } from '../database/db';
import { IAccount } from '../types';
import { HistoryService } from '../services/history.service';
import { wsManager } from '../websocket/gateway';
import { generatePassword, PasswordConfig } from '../utils/security';

const router = Router();

// GET /api/accounts
router.get('/', async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const search = (req.query.search as string || '').trim().toLowerCase();
  const status = req.query.status as string;
  const systemId = req.query.system_id as string || req.query.systemId as string;
  const supplierId = req.query.supplier_id as string || req.query.supplierId as string;
  const productId = req.query.product_id as string || req.query.productId as string;
  const customerCode = req.query.customer_code as string || req.query.customerCode as string;
  const managedBy = req.query.managed_by as string || req.query.managedBy as string;

  let accounts = (await AccountModel.find().lean().exec()) as IAccount[];

  if (status && status !== 'ALL') {
    accounts = accounts.filter(a => a.status === status);
  }
  if (systemId && systemId !== 'ALL') {
    accounts = accounts.filter(a => a.systemId === systemId);
  }
  if (supplierId && supplierId !== 'ALL') {
    accounts = accounts.filter(a => a.supplierId === supplierId);
  }
  if (productId && productId !== 'ALL') {
    accounts = accounts.filter(a => a.productId === productId);
  }
  if (customerCode) {
    accounts = accounts.filter(a => a.customerCode.toLowerCase().includes(customerCode.toLowerCase()));
  }
  if (managedBy && managedBy !== 'ALL') {
    accounts = accounts.filter(a => a.managedBy === managedBy);
  }

  if (search) {
    accounts = accounts.filter(a => 
      a.accountName.toLowerCase().includes(search) ||
      a.accountId.toLowerCase().includes(search) ||
      a.customerCode.toLowerCase().includes(search) ||
      (a.code && a.code.toLowerCase().includes(search)) ||
      (a.subAccounts && a.subAccounts.some(s => s.username.toLowerCase().includes(search)))
    );
  }

  accounts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const total = accounts.length;
  const items = accounts.slice((page - 1) * limit, page * limit);

  return res.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  });
});

// POST /api/accounts/generate-password
router.post('/generate-password', (req: Request, res: Response) => {
  const config: PasswordConfig = {
    length: req.body.length || 12,
    uppercase: req.body.uppercase !== false,
    lowercase: req.body.lowercase !== false,
    numbers: req.body.numbers !== false,
    specialChars: req.body.specialChars !== false
  };
  const password = generatePassword(config);
  return res.json({ password, config });
});

// POST /api/accounts/:id/reveal-password
router.post('/:id/reveal-password', async (req: any, res: Response) => {
  const idOrCode = req.params.id;
  const isObjId = mongoose.Types.ObjectId.isValid(idOrCode);
  const filter = isObjId ? { $or: [{ _id: idOrCode }, { accountId: idOrCode }] } : { accountId: idOrCode };
  const account = await AccountModel.findOne(filter).lean();

  if (!account) return res.status(404).json({ message: 'Tài khoản không tồn tại trong MongoDB.' });

  await HistoryService.logAction({
    userId: req.user?.userId || 'system',
    userName: req.user?.username || 'Unknown',
    action: 'UPDATE',
    module: 'ACCOUNT',
    objectType: 'AccountPasswordReveal',
    objectId: account.accountId,
    newData: { action: 'PASSWORD_VIEWED' }
  });

  return res.json({
    accountId: account.accountId,
    password: account.password || '',
    subAccounts: (account.subAccounts || []).map(s => ({ id: s.id, username: s.username, password: s.password }))
  });
});

// GET /api/accounts/:id
router.get('/:id', async (req: Request, res: Response) => {
  const idOrCode = req.params.id;
  const isObjId = mongoose.Types.ObjectId.isValid(idOrCode);
  const filter = isObjId ? { $or: [{ _id: idOrCode }, { accountId: idOrCode }] } : { accountId: idOrCode };
  const account = await AccountModel.findOne(filter).lean();

  if (!account) return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
  return res.json(account);
});

// POST /api/accounts
router.post('/', async (req: Request, res: Response) => {
  const { 
    accountId, systemId, supplierId, productId, accountType, status,
    accountLevel, managedBy, cutRetail, customerCode, accountName, password, code, notes, subAccounts 
  } = req.body;

  let accId = accountId;
  if (!accId) {
    const count = await AccountModel.countDocuments();
    accId = `ACC_${String(count + 1).padStart(3, '0')}`;
  }

  const newAcc: IAccount = {
    accountId: accId,
    systemId: systemId || 'SYS_AA',
    supplierId: supplierId || 'SUP_GLOBAL',
    productId: productId || 'PROD_GOLD',
    accountType: accountType || 'REGULAR',
    status: status || 'ACTIVE',
    accountLevel: accountLevel || 'LEVEL_1',
    managedBy: managedBy || 'admin',
    cutRetail: cutRetail || '',
    customerCode: customerCode || 'CUS_001',
    accountName: accountName || `MSSUB_${accId}`,
    password: password || 'Default@123',
    code: code || '',
    notes: notes || '',
    subAccounts: subAccounts || [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const doc = await AccountModel.create(newAcc);
  const createdObj = doc.toObject();

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: 'CREATE',
    module: 'ACCOUNT',
    objectType: 'Account',
    objectId: accId,
    newData: createdObj
  });

  wsManager.broadcast('account.created', createdObj);

  return res.status(201).json(createdObj);
});

// PUT /api/accounts/:id
router.put('/:id', async (req: Request, res: Response) => {
  const idOrCode = req.params.id;
  const isObjId = mongoose.Types.ObjectId.isValid(idOrCode);
  const filter = isObjId ? { $or: [{ _id: idOrCode }, { accountId: idOrCode }] } : { accountId: idOrCode };
  const existingAcc = await AccountModel.findOne(filter).lean();

  if (!existingAcc) {
    return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
  }

  const updatedAcc: IAccount = {
    ...existingAcc,
    ...req.body,
    updatedAt: new Date()
  };

  await AccountModel.updateOne({ _id: existingAcc._id }, updatedAcc);

  const actionType = req.body.status && existingAcc.status !== req.body.status ? 'CHANGE_STATUS' : 'UPDATE';

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: actionType,
    module: 'ACCOUNT',
    objectType: 'Account',
    objectId: existingAcc.accountId,
    oldData: existingAcc,
    newData: updatedAcc
  });

  wsManager.broadcast('account.updated', updatedAcc);

  return res.json(updatedAcc);
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const idOrCode = req.params.id;
  const isObjId = mongoose.Types.ObjectId.isValid(idOrCode);
  const filter = isObjId ? { $or: [{ _id: idOrCode }, { accountId: idOrCode }] } : { accountId: idOrCode };
  const existingAcc = await AccountModel.findOne(filter).lean();

  if (!existingAcc) {
    return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
  }

  await AccountModel.deleteOne({ _id: existingAcc._id });

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: 'DELETE',
    module: 'ACCOUNT',
    objectType: 'Account',
    objectId: idOrCode,
    oldData: existingAcc
  });

  wsManager.broadcast('account.deleted', { accountId: idOrCode });

  return res.json({ message: 'Xóa tài khoản thành công.' });
});

export default router;
