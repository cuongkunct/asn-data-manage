import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { AccountModel, SystemAccountModel, QLHAccountModel } from '../database/db';
import { IAccount } from '../types';
import { HistoryService } from '../services/history.service';
import { wsManager } from '../websocket/gateway';
import { generatePassword, PasswordConfig } from '../utils/security';
import { normalizeUpper, normalizeUpperOrNull, normalizeTrim, caseInsensitiveExact, escapeRegex } from '../utils/normalize';

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
  const customerCode = (req.query.customer_code as string || req.query.customerCode as string || '').trim().toLowerCase();
  const managedBy = req.query.managed_by as string || req.query.managedBy as string;

  let accounts = (await AccountModel.find().lean().exec()) as IAccount[];

  if (status && status !== 'ALL') {
    accounts = accounts.filter(a => a.status === status);
  }
  if (systemId && systemId !== 'ALL') {
    accounts = accounts.filter(a => (a.systemId || '').toLowerCase() === systemId.toLowerCase());
  }
  if (supplierId && supplierId !== 'ALL') {
    accounts = accounts.filter(a => (a.supplierId || '').toLowerCase() === supplierId.toLowerCase());
  }
  if (productId && productId !== 'ALL') {
    accounts = accounts.filter(a => (a.productId || '').toLowerCase() === productId.toLowerCase());
  }
  if (customerCode) {
    accounts = accounts.filter(a => (a.customerCode || '').toLowerCase().includes(customerCode));
  }
  if (managedBy && managedBy !== 'ALL') {
    accounts = accounts.filter(a => a.managedBy === managedBy);
  }

  if (search) {
    accounts = accounts.filter(a => 
      (a.accountName || '').toLowerCase().includes(search) ||
      (a.loginName && a.loginName.toLowerCase().includes(search)) ||
      (a.accountId || '').toLowerCase().includes(search) ||
      (a.customerCode || '').toLowerCase().includes(search) ||
      (a.code && a.code.toLowerCase().includes(search)) ||
      (a.subAccounts && a.subAccounts.some(s => (s.username || '').toLowerCase().includes(search)))
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



// Helper: Build query filter matching systemId and/or supplierId
function buildSystemSupplierQuery(systemName?: string, supplierName?: string, bySupplier?: boolean) {
  const query: any = {};
  const sys = (systemName || '').trim();
  const sup = (supplierName || '').trim();

  if (sys) {
    query.systemId = { $regex: new RegExp(`^${escapeRegex(sys)}$`, 'i') };
  }

  if (bySupplier && sup) {
    query.supplierId = { $regex: new RegExp(`^${escapeRegex(sup)}$`, 'i') };
  } else if (!sys && sup) {
    query.supplierId = { $regex: new RegExp(`^${escapeRegex(sup)}$`, 'i') };
  }

  return query;
}

// GET /api/accounts/delete-system/options - Get existing systems and suppliers for quick suggestion
router.get('/delete-system/options', async (req: Request, res: Response) => {
  try {
    const [accSys, sysAccSys, qlhSys, accSup, sysAccSup, qlhSup] = await Promise.all([
      AccountModel.distinct('systemId'),
      SystemAccountModel.distinct('systemId'),
      QLHAccountModel.distinct('systemId'),
      AccountModel.distinct('supplierId'),
      SystemAccountModel.distinct('supplierId'),
      QLHAccountModel.distinct('supplierId')
    ]);

    const systems = Array.from(new Set([...accSys, ...sysAccSys, ...qlhSys].filter(Boolean))).sort();
    const suppliers = Array.from(new Set([...accSup, ...sysAccSup, ...qlhSup].filter(Boolean))).sort();

    return res.json({ systems, suppliers });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Lỗi khi lấy danh sách hệ thống/nhà cung cấp.' });
  }
});

// POST /api/accounts/delete-system/preview - Calculate affected accounts across HTTK, DSTK, and QLH
router.post('/delete-system/preview', async (req: Request, res: Response) => {
  try {
    const { systemName, supplierName, bySupplier } = req.body;
    const query = buildSystemSupplierQuery(systemName, supplierName, bySupplier);

    if (Object.keys(query).length === 0) {
      return res.json({
        accountsCount: 0,
        systemAccountsCount: 0,
        qlhCount: 0,
        total: 0,
        samples: {
          accounts: [],
          systemAccounts: [],
          qlh: []
        }
      });
    }

    const [accCount, sysAccCount, qlhCount, sampleAcc, sampleSysAcc, sampleQLH] = await Promise.all([
      AccountModel.countDocuments(query),
      SystemAccountModel.countDocuments(query),
      QLHAccountModel.countDocuments(query),
      AccountModel.find(query).limit(5).select('accountName accountId customerCode systemId supplierId status').lean(),
      SystemAccountModel.find(query).limit(5).select('systemUsername systemAccountId customerCode systemId supplierId status').lean(),
      QLHAccountModel.find(query).limit(5).select('accountName accountId customerCode systemId supplierId status').lean()
    ]);

    const total = accCount + sysAccCount + qlhCount;

    return res.json({
      accountsCount: accCount,
      systemAccountsCount: sysAccCount,
      qlhCount,
      total,
      samples: {
        accounts: sampleAcc,
        systemAccounts: sampleSysAcc,
        qlh: sampleQLH
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Lỗi khi tính toán dữ liệu ảnh hưởng.' });
  }
});

// POST /api/accounts/delete-system - Execute bulk deletion across HTTK, DSTK, and QLH
router.post('/delete-system', async (req: Request, res: Response) => {
  try {
    const { systemName, supplierName, bySupplier } = req.body;
    const query = buildSystemSupplierQuery(systemName, supplierName, bySupplier);

    if (Object.keys(query).length === 0) {
      return res.status(400).json({ message: 'Vui lòng cung cấp Tên hệ thống hoặc Nhà cung cấp cần xóa.' });
    }

    const [delAccResult, delSysAccResult, delQLHResult] = await Promise.all([
      AccountModel.deleteMany(query),
      SystemAccountModel.deleteMany(query),
      QLHAccountModel.deleteMany(query)
    ]);

    const accountsDeleted = delAccResult.deletedCount || 0;
    const systemAccountsDeleted = delSysAccResult.deletedCount || 0;
    const qlhDeleted = delQLHResult.deletedCount || 0;
    const total = accountsDeleted + systemAccountsDeleted + qlhDeleted;

    const user = (req as any).user;
    const sysLabel = systemName?.trim() || 'ALL_SYSTEMS';
    const supLabel = (bySupplier && supplierName?.trim()) || (supplierName?.trim()) || 'ALL_SUPPLIERS';

    await HistoryService.logAction({
      userId: user?.userId || 'admin',
      userName: user?.username || 'admin',
      action: 'DELETE',
      module: 'ACCOUNT',
      objectType: 'BulkDeleteSystem',
      objectId: `${sysLabel}_${supLabel}`,
      oldData: {
        filter: query,
        deletedStats: {
          accounts: accountsDeleted,
          systemAccounts: systemAccountsDeleted,
          qlh: qlhDeleted,
          total
        }
      }
    });

    // Broadcast WebSocket events to update all open client screens
    wsManager.broadcast('system.bulk_deleted', {
      systemName,
      supplierName,
      bySupplier,
      accountsDeleted,
      systemAccountsDeleted,
      qlhDeleted,
      total
    });
    wsManager.broadcast('account.deleted', { systemName });
    wsManager.broadcast('system_account.deleted', { systemName });

    return res.json({
      success: true,
      message: `Đã xóa thành công ${total} tài khoản trên toàn bộ hệ thống (DSTK: ${accountsDeleted}, HTTK: ${systemAccountsDeleted}, QLH: ${qlhDeleted}).`,
      deleted: {
        accounts: accountsDeleted,
        systemAccounts: systemAccountsDeleted,
        qlh: qlhDeleted,
        total
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Lỗi khi thực hiện xóa hệ thống.' });
  }
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
  const filter = isObjId 
    ? { $or: [{ _id: idOrCode }, { accountId: caseInsensitiveExact(idOrCode) }, { accountName: caseInsensitiveExact(idOrCode) }] } 
    : { $or: [{ accountId: caseInsensitiveExact(idOrCode) }, { accountName: caseInsensitiveExact(idOrCode) }] };
  const account = await AccountModel.findOne(filter).lean();

  if (!account) return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
  return res.json(account);
});

// POST /api/accounts
router.post('/', async (req: Request, res: Response) => {
  const { 
    accountId, systemId, supplierId, productId, accountType, status,
    accountLevel, managedBy, cutRetail, customerCode, accountName, password, code, notes, subAccounts, loginName 
  } = req.body;

  let accId = normalizeUpper(accountId);
  if (!accId) {
    const count = await AccountModel.countDocuments();
    accId = `ACC_${String(count + 1).padStart(3, '0')}`;
  }

  const finalAccountName = normalizeUpper(accountName) || `MSSUB_${accId}`;
  const finalLoginName = normalizeTrim(loginName || '');
  const finalCode = normalizeUpper(code || '');
  const finalCustomerCode = normalizeUpper(customerCode) || 'CUS_001';
  const finalSystemId = normalizeUpper(systemId) || 'SYS_AA';
  const finalSupplierId = normalizeUpper(supplierId) || 'SUP_GLOBAL';
  const finalProductId = normalizeUpper(productId) || 'PROD_GOLD';
  const finalParentAccountId = normalizeUpperOrNull(req.body.parentAccountId);

  // Case-insensitive duplicate check on accountName and accountId
  const existingByName = await AccountModel.findOne({
    $or: [
      { accountName: caseInsensitiveExact(finalAccountName) },
      { accountId: caseInsensitiveExact(accId) }
    ]
  }).lean();
  if (existingByName) {
    return res.status(400).json({ message: `Tên tài khoản hoặc mã "${finalAccountName}" đã tồn tại trên hệ thống.` });
  }

  const finalSubs = Array.isArray(subAccounts)
    ? subAccounts.map((s: any) => ({
        id: s.id,
        subName: s.subName || 'Sub Account',
        username: normalizeUpper(s.username),
        password: s.password || ''
      }))
    : [];

  const newAcc: IAccount = {
    accountId: accId,
    systemId: finalSystemId,
    supplierId: finalSupplierId,
    productId: finalProductId,
    accountType: accountType || 'REGULAR',
    status: status || 'ACTIVE',
    accountLevel: accountLevel || 'LEVEL_1',
    managedBy: managedBy || 'admin',
    cutRetail: cutRetail || '',
    customerCode: finalCustomerCode,
    accountName: finalAccountName,
    loginName: finalLoginName,
    password: password || 'Default@123',
    code: finalCode,
    parentAccountId: finalParentAccountId,
    notes: notes || '',
    subAccounts: finalSubs,
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
  const filter = isObjId 
    ? { $or: [{ _id: idOrCode }, { accountId: caseInsensitiveExact(idOrCode) }] } 
    : { accountId: caseInsensitiveExact(idOrCode) };
  const existingAcc = await AccountModel.findOne(filter).lean();

  if (!existingAcc) {
    return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
  }

  // Duplicate check if accountName changed
  const targetAccountName = req.body.accountName !== undefined ? normalizeUpper(req.body.accountName) : existingAcc.accountName;
  if (targetAccountName && targetAccountName.toLowerCase() !== (existingAcc.accountName || '').toLowerCase()) {
    const dup = await AccountModel.findOne({
      _id: { $ne: existingAcc._id },
      accountName: caseInsensitiveExact(targetAccountName)
    }).lean();
    if (dup) {
      return res.status(400).json({ message: `Tên tài khoản "${targetAccountName}" đã tồn tại.` });
    }
  }

  const updatedAcc: IAccount = {
    ...existingAcc,
    ...req.body,
    ...(req.body.accountName !== undefined && { accountName: targetAccountName }),
    ...(req.body.loginName !== undefined && { loginName: normalizeTrim(req.body.loginName) }),
    ...(req.body.customerCode !== undefined && { customerCode: normalizeUpper(req.body.customerCode) }),
    ...(req.body.systemId !== undefined && { systemId: normalizeUpper(req.body.systemId) }),
    ...(req.body.supplierId !== undefined && { supplierId: normalizeUpper(req.body.supplierId) }),
    ...(req.body.productId !== undefined && { productId: normalizeUpper(req.body.productId) }),
    ...(req.body.code !== undefined && { code: normalizeUpper(req.body.code) }),
    ...(req.body.parentAccountId !== undefined && { parentAccountId: normalizeUpperOrNull(req.body.parentAccountId) }),
    ...(req.body.subAccounts && {
      subAccounts: req.body.subAccounts.map((s: any) => ({
        ...s,
        username: normalizeUpper(s.username)
      }))
    }),
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
  const filter = isObjId 
    ? { $or: [{ _id: idOrCode }, { accountId: caseInsensitiveExact(idOrCode) }] } 
    : { accountId: caseInsensitiveExact(idOrCode) };
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
