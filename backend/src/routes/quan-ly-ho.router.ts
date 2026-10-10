import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { QLHAccountModel } from '../database/db';
import { IQLHAccount } from '../types';
import { HistoryService } from '../services/history.service';
import { wsManager } from '../websocket/gateway';
import { generatePassword, PasswordConfig } from '../utils/security';
import { normalizeUpper, normalizeUpperOrNull, normalizeTrim, caseInsensitiveExact, escapeRegex } from '../utils/normalize';

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
    accounts = accounts.filter(a => (a.systemId || '').toLowerCase() === systemId.toLowerCase());
  }

  // Customer code search
  if (search) {
    accounts = accounts.filter(a =>
      (a.customerCode || '').toLowerCase().includes(search) ||
      (a.accountId || '').toLowerCase().includes(search)
    );
  }

  // Account name/login search
  if (searchAccount) {
    accounts = accounts.filter(a =>
      (a.accountName || '').toLowerCase().includes(searchAccount) ||
      (a.code && a.code.toLowerCase().includes(searchAccount)) ||
      (a.loginName && a.loginName.toLowerCase().includes(searchAccount))
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
  const isObjId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjId 
    ? { $or: [{ _id: id }, { accountId: caseInsensitiveExact(id) }, { accountName: caseInsensitiveExact(id) }] } 
    : { $or: [{ accountId: caseInsensitiveExact(id) }, { accountName: caseInsensitiveExact(id) }] };
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

  const accId = normalizeUpper(req.body.accountId) || `ACC_${Date.now().toString().slice(-6)}`;
  const finalAccountName = normalizeUpper(accountName) || accId;
  const finalCustomerCode = normalizeUpper(customerCode);
  const finalSystemId = normalizeUpper(systemId);
  const finalSupplierId = normalizeUpper(supplierId);
  const finalProductId = normalizeUpper(productId);
  const finalCode = normalizeUpper(code || loginName || '');
  const finalLoginName = normalizeTrim(loginName || code || '');

  // Case-insensitive duplicate check
  const existingAcc = await QLHAccountModel.findOne({
    $or: [
      { accountName: caseInsensitiveExact(finalAccountName) },
      { accountId: caseInsensitiveExact(accId) }
    ]
  }).lean();
  if (existingAcc) {
    return res.status(400).json({ message: `Tên tài khoản hoặc mã "${finalAccountName}" đã tồn tại.` });
  }

  const finalSubs = Array.isArray(subAccounts)
    ? subAccounts.map((s: any) => ({
        ...s,
        username: normalizeUpper(s.username),
        password: s.password || ''
      }))
    : [];

  const newAcc: IQLHAccount = {
    accountId: accId,
    systemId: finalSystemId,
    supplierId: finalSupplierId,
    productId: finalProductId,
    accountType: accountType || 'QLH',
    status: status || 'ACTIVE',
    accountLevel: accountLevel || 'Agent',
    managedBy: managedBy || 'Công Ty',
    cutRetail: cutRetail || 'All',
    customerCode: finalCustomerCode,
    accountName: finalAccountName,
    password: password || '',
    code: finalCode,
    loginName: finalLoginName,
    notes: notes || '',
    subAccounts: finalSubs,
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
  const isObjId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjId 
    ? { $or: [{ _id: id }, { accountId: caseInsensitiveExact(id) }, { accountName: caseInsensitiveExact(id) }] } 
    : { $or: [{ accountId: caseInsensitiveExact(id) }, { accountName: caseInsensitiveExact(id) }] };
  const existingAcc = await QLHAccountModel.findOne(query).lean();

  if (!existingAcc) {
    return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
  }

  // Check duplicate if accountName changed
  const targetAccountName = req.body.accountName !== undefined ? normalizeUpper(req.body.accountName) : existingAcc.accountName;
  if (targetAccountName && targetAccountName.toLowerCase() !== (existingAcc.accountName || '').toLowerCase()) {
    const dup = await QLHAccountModel.findOne({
      _id: { $ne: existingAcc._id },
      accountName: caseInsensitiveExact(targetAccountName)
    }).lean();
    if (dup) {
      return res.status(400).json({ message: `Tên tài khoản "${targetAccountName}" đã tồn tại.` });
    }
  }

  const updated: IQLHAccount = { 
    ...existingAcc, 
    ...req.body, 
    ...(req.body.accountName !== undefined && { accountName: targetAccountName }),
    ...(req.body.customerCode !== undefined && { customerCode: normalizeUpper(req.body.customerCode) }),
    ...(req.body.systemId !== undefined && { systemId: normalizeUpper(req.body.systemId) }),
    ...(req.body.supplierId !== undefined && { supplierId: normalizeUpper(req.body.supplierId) }),
    ...(req.body.productId !== undefined && { productId: normalizeUpper(req.body.productId) }),
    ...(req.body.code !== undefined && { code: normalizeUpper(req.body.code) }),
    ...(req.body.loginName !== undefined && { loginName: normalizeTrim(req.body.loginName) }),
    ...(req.body.subAccounts && {
      subAccounts: req.body.subAccounts.map((s: any) => ({
        ...s,
        username: normalizeUpper(s.username)
      }))
    }),
    updatedAt: new Date() 
  };
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
  const isObjId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjId 
    ? { $or: [{ _id: id }, { accountId: caseInsensitiveExact(id) }, { accountName: caseInsensitiveExact(id) }] } 
    : { $or: [{ accountId: caseInsensitiveExact(id) }, { accountName: caseInsensitiveExact(id) }] };
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
