import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { QLHAccountModel } from '../database/db';
import { IQLHAccount } from '../types';
import { HistoryService } from '../services/history.service';
import { wsManager } from '../websocket/gateway';
import { generatePassword, PasswordConfig } from '../utils/security';

const router = Router();

// GET /api/quan-ly-ho - List all QLH accounts
router.get('/', async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const search = (req.query.search as string || '').trim().toLowerCase();
  const searchAccount = (req.query.search_account as string || '').trim().toLowerCase();
  const systemId = req.query.system_id as string || 'ALL';
  const tab = (req.query.tab as string) || 'qlh'; // 'qlh' | 'qlh_cat_le'

  let accounts = (await QLHAccountModel.find().lean().exec()) as IQLHAccount[];

  // Filter by tab (accountType or cutRetail)
  if (tab === 'qlh_cat_le') {
    accounts = accounts.filter(a => 
      a.accountType === 'QLH Cắt Lẻ' ||
      (a.cutRetail && a.cutRetail !== '' && a.cutRetail !== 'Không' && a.cutRetail !== 'All')
    );
  } else {
    accounts = accounts.filter(a => 
      a.accountType !== 'QLH Cắt Lẻ'
    );
  }

  // System filter
  if (systemId && systemId !== 'ALL') {
    accounts = accounts.filter(a => a.systemId === systemId);
  }

  // Customer code search
  if (search) {
    accounts = accounts.filter(a =>
      a.customerCode.toLowerCase().includes(search) ||
      a.accountId.toLowerCase().includes(search)
    );
  }

  // Account name/login search
  if (searchAccount) {
    accounts = accounts.filter(a =>
      a.accountName.toLowerCase().includes(searchAccount) ||
      (a.code && a.code.toLowerCase().includes(searchAccount))
    );
  }

  accounts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const total = accounts.length;
  const items = accounts.slice((page - 1) * limit, page * limit);

  return res.json({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
});

// GET /api/quan-ly-ho/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = mongoose.Types.ObjectId.isValid(id) ? { $or: [{ _id: id }, { accountId: id }] } : { accountId: id };
  const account = await QLHAccountModel.findOne(query).lean();

  if (!account) return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
  return res.json(account);
});

// POST /api/quan-ly-ho
router.post('/', async (req: Request, res: Response) => {
  const {
    systemId, supplierId, productId, accountType, status, accountLevel,
    managedBy, cutRetail, customerCode, accountName, password, code, notes,
    loginName, subAccounts
  } = req.body;

  const count = await QLHAccountModel.countDocuments();
  const accId = req.body.accountId || `ACC_${Date.now().toString().slice(-6)}`;

  const newAcc: IQLHAccount = {
    accountId: accId,
    systemId: systemId || '',
    supplierId: supplierId || '',
    productId: productId || '',
    accountType: accountType || 'QLH',
    status: status || 'ACTIVE',
    accountLevel: accountLevel || 'Agent',
    managedBy: managedBy || 'Công Ty',
    cutRetail: cutRetail || 'All',
    customerCode: customerCode || '',
    accountName: accountName || accId,
    password: password || '',
    code: code || loginName || '',
    loginName: loginName || code || '',
    notes: notes || '',
    subAccounts: subAccounts || [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const doc = await QLHAccountModel.create(newAcc);
  const createdObj = doc.toObject();

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: 'CREATE',
    module: 'ACCOUNT',
    objectType: 'QLH_Account',
    objectId: accId,
    newData: createdObj
  });

  wsManager.broadcast('account.created', createdObj);
  return res.status(201).json(createdObj);
});

// PUT /api/quan-ly-ho/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = mongoose.Types.ObjectId.isValid(id) ? { $or: [{ _id: id }, { accountId: id }] } : { accountId: id };
  const existingAcc = await QLHAccountModel.findOne(query).lean();

  if (!existingAcc) {
    return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
  }

  const updated: IQLHAccount = { ...existingAcc, ...req.body, updatedAt: new Date() };
  await QLHAccountModel.updateOne({ _id: existingAcc._id }, updated);

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: 'UPDATE',
    module: 'ACCOUNT',
    objectType: 'QLH_Account',
    objectId: existingAcc.accountId,
    oldData: existingAcc,
    newData: updated
  });

  wsManager.broadcast('account.updated', updated);
  return res.json(updated);
});

// DELETE /api/quan-ly-ho/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = mongoose.Types.ObjectId.isValid(id) ? { $or: [{ _id: id }, { accountId: id }] } : { accountId: id };
  const existingAcc = await QLHAccountModel.findOne(query).lean();

  if (!existingAcc) {
    return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
  }

  await QLHAccountModel.deleteOne({ _id: existingAcc._id });

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: 'DELETE',
    module: 'ACCOUNT',
    objectType: 'QLH_Account',
    objectId: id,
    oldData: existingAcc
  });

  wsManager.broadcast('account.deleted', { accountId: id });
  return res.json({ message: 'Xóa tài khoản thành công.' });
});

// POST /api/quan-ly-ho/generate-password
router.post('/generate-password', (req: Request, res: Response) => {
  const config: PasswordConfig = {
    length: req.body.length || 12,
    uppercase: req.body.uppercase !== false,
    lowercase: req.body.lowercase !== false,
    numbers: req.body.numbers !== false,
    specialChars: req.body.specialChars !== false
  };
  const password = generatePassword(config);
  return res.json({ password });
});

export default router;
