import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { SystemAccountModel, AccountModel } from '../database/db';
import { ISystemAccount, IAccount } from '../types';
import { HistoryService } from '../services/history.service';
import { wsManager } from '../websocket/gateway';
import { normalizeUpper, normalizeUpperOrNull, caseInsensitiveExact, escapeRegex } from '../utils/normalize';

const router = Router();

// GET /api/system-accounts/tree
router.get('/tree', async (req: Request, res: Response) => {
  const [sysList, regList] = await Promise.all([
    SystemAccountModel.find().lean().exec() as Promise<ISystemAccount[]>,
    AccountModel.find().lean().exec() as Promise<IAccount[]>
  ]);

  const list: ISystemAccount[] = [...sysList];
  regList.forEach(acc => {
    const accName = normalizeUpper(acc.accountName || acc.accountId);
    if (!list.some(s => (s.systemUsername || '').trim().toLowerCase() === accName.toLowerCase())) {
      list.push({
        _id: acc._id,
        systemAccountId: acc.accountId,
        systemUsername: accName,
        systemId: acc.systemId,
        supplierId: acc.supplierId,
        productId: acc.productId,
        accountLevel: acc.accountLevel,
        accountType: acc.accountType,
        status: acc.status as any,
        customerCode: acc.customerCode,
        parentCustomerId: '',
        parentAccountId: acc.parentAccountId || null,
        notes: acc.notes || '',
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt
      });
    }
  });

  const buildTree = (parentId: string | null = null): any[] => {
    return list
      .filter(item => (item.parentAccountId || null) === parentId)
      .map(item => ({
        ...item,
        children: buildTree(item.systemAccountId)
      }));
  };

  const tree = buildTree(null);
  return res.json(tree);
});

// GET /api/system-accounts (Đồng bộ gộp chung Danh Sách Tài Khoản sang Hệ Thống Tài Khoản)
router.get('/', async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 25));
  const search = (req.query.search as string || '').trim().toLowerCase();
  const customerCode = (req.query.customer_code as string || req.query.customerCode as string || '').trim().toLowerCase();
  const parentAccountId = (req.query.parent_account_id as string || req.query.parentAccountId as string || '').trim().toLowerCase();
  const systemId = req.query.system_id as string || req.query.systemId as string;
  const supplierId = req.query.supplier_id as string || req.query.supplierId as string;
  const status = req.query.status as string;

  const [sysAccounts, regularAccounts] = await Promise.all([
    SystemAccountModel.find().lean().exec() as Promise<ISystemAccount[]>,
    AccountModel.find().lean().exec() as Promise<IAccount[]>
  ]);

  // Gộp danh sách tài khoản sang hệ thống tài khoản
  let list: (ISystemAccount & { source?: string })[] = sysAccounts.map(s => ({ ...s, source: 'SYSTEM' }));

  regularAccounts.forEach(acc => {
    const accName = normalizeUpper(acc.accountName || acc.accountId);
    // Tránh trùng lặp nếu tài khoản đã tồn tại trong SystemAccountModel
    const alreadyExists = list.some(s => (s.systemUsername || '').trim().toLowerCase() === accName.toLowerCase());
    if (!alreadyExists) {
      list.push({
        _id: acc._id,
        systemAccountId: acc.accountId,
        systemUsername: accName,
        systemId: acc.systemId,
        supplierId: acc.supplierId,
        productId: acc.productId,
        accountLevel: acc.accountLevel,
        accountType: acc.accountType,
        status: acc.status as any,
        customerCode: acc.customerCode,
        parentCustomerId: '',
        parentAccountId: acc.parentAccountId || null,
        notes: acc.notes || '',
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt,
        source: 'ACCOUNT'
      });
    }
  });

  if (status && status !== 'ALL') {
    list = list.filter(s => s.status === status);
  }
  if (systemId && systemId !== 'ALL') {
    list = list.filter(s => (s.systemId || '').toLowerCase() === systemId.toLowerCase());
  }
  if (supplierId && supplierId !== 'ALL') {
    list = list.filter(s => (s.supplierId || '').toLowerCase() === supplierId.toLowerCase());
  }
  if (customerCode) {
    list = list.filter(s => (s.customerCode || '').toLowerCase().includes(customerCode));
  }
  if (parentAccountId) {
    list = list.filter(s => (s.parentAccountId || '').toLowerCase().includes(parentAccountId));
  }
  if (search) {
    list = list.filter(s => 
      (s.systemUsername || '').toLowerCase().includes(search) ||
      (s.systemAccountId || '').toLowerCase().includes(search) ||
      (s.customerCode && s.customerCode.toLowerCase().includes(search)) ||
      (s.parentAccountId && s.parentAccountId.toLowerCase().includes(search))
    );
  }

  list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const total = list.length;
  const items = list.slice((page - 1) * limit, page * limit);

  return res.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  });
});

// POST /api/system-accounts
router.post('/', async (req: Request, res: Response) => {
  const { systemAccountId, systemId, supplierId, productId, accountLevel, accountType, status, customerCode, parentCustomerId, parentAccountId, systemUsername, notes } = req.body;

  let sysId = normalizeUpper(systemAccountId);
  if (!sysId) {
    const count = await SystemAccountModel.countDocuments();
    sysId = `SYS_ACC_${String(count + 1).padStart(3, '0')}`;
  }

  const finalUsername = normalizeUpper(systemUsername || req.body.accountName) || `NODE_${sysId}`;
  const finalCustomerCode = normalizeUpper(customerCode);
  const finalParentCustomerId = normalizeUpper(parentCustomerId);
  const finalParentAccountId = normalizeUpperOrNull(parentAccountId);
  const finalSystemId = normalizeUpper(systemId) || 'SYS_AA';
  const finalSupplierId = normalizeUpper(supplierId) || 'SUP_GLOBAL';
  const finalProductId = normalizeUpper(productId) || 'PROD_GOLD';

  // Case-insensitive duplicate check
  const existingSys = await SystemAccountModel.findOne({
    $or: [
      { systemUsername: caseInsensitiveExact(finalUsername) },
      { systemAccountId: caseInsensitiveExact(sysId) }
    ]
  }).lean();
  if (existingSys) {
    return res.status(400).json({ message: `Tên tài khoản hệ thống "${finalUsername}" đã tồn tại.` });
  }

  const newSysAcc: ISystemAccount = {
    systemAccountId: sysId,
    systemId: finalSystemId,
    supplierId: finalSupplierId,
    productId: finalProductId,
    accountLevel: accountLevel || 'LEVEL_1',
    accountType: accountType || 'SYSTEM',
    status: status || 'ACTIVE',
    customerCode: finalCustomerCode,
    parentCustomerId: finalParentCustomerId,
    parentAccountId: finalParentAccountId,
    systemUsername: finalUsername,
    notes: notes || '',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const doc = await SystemAccountModel.create(newSysAcc);
  const createdObj = doc.toObject();

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: 'CREATE',
    module: 'SYSTEM_ACCOUNT',
    objectType: 'SystemAccount',
    objectId: sysId,
    newData: createdObj
  });

  wsManager.broadcast('system_account.created', createdObj);

  return res.status(201).json(createdObj);
});

// PUT /api/system-accounts/:id
router.put('/:id', async (req: Request, res: Response) => {
  const idOrCode = req.params.id;
  const isObjId = mongoose.Types.ObjectId.isValid(idOrCode);
  const filter = isObjId 
    ? { $or: [{ _id: idOrCode }, { systemAccountId: caseInsensitiveExact(idOrCode) }, { systemUsername: caseInsensitiveExact(idOrCode) }] } 
    : { $or: [{ systemAccountId: caseInsensitiveExact(idOrCode) }, { systemUsername: caseInsensitiveExact(idOrCode) }] };
  let existingAcc = await SystemAccountModel.findOne(filter);

  if (existingAcc) {
    const targetUsername = req.body.systemUsername !== undefined ? normalizeUpper(req.body.systemUsername) : existingAcc.systemUsername;
    if (targetUsername && targetUsername.toLowerCase() !== existingAcc.systemUsername.toLowerCase()) {
      const dup = await SystemAccountModel.findOne({
        _id: { $ne: existingAcc._id },
        systemUsername: caseInsensitiveExact(targetUsername)
      }).lean();
      if (dup) {
        return res.status(400).json({ message: `Tên tài khoản hệ thống "${targetUsername}" đã tồn tại.` });
      }
    }

    const updated: ISystemAccount = {
      ...existingAcc.toObject(),
      ...req.body,
      ...(req.body.systemUsername !== undefined && { systemUsername: targetUsername }),
      ...(req.body.customerCode !== undefined && { customerCode: normalizeUpper(req.body.customerCode) }),
      ...(req.body.parentCustomerId !== undefined && { parentCustomerId: normalizeUpper(req.body.parentCustomerId) }),
      ...(req.body.parentAccountId !== undefined && { parentAccountId: normalizeUpperOrNull(req.body.parentAccountId) }),
      ...(req.body.systemId !== undefined && { systemId: normalizeUpper(req.body.systemId) }),
      ...(req.body.supplierId !== undefined && { supplierId: normalizeUpper(req.body.supplierId) }),
      ...(req.body.productId !== undefined && { productId: normalizeUpper(req.body.productId) }),
      updatedAt: new Date()
    };

    await SystemAccountModel.updateOne({ _id: existingAcc._id }, updated);

    await HistoryService.logAction({
      userId: (req as any).user?.userId,
      userName: (req as any).user?.username,
      action: 'UPDATE',
      module: 'SYSTEM_ACCOUNT',
      objectType: 'SystemAccount',
      objectId: existingAcc.systemAccountId,
      oldData: existingAcc.toObject(),
      newData: updated
    });

    wsManager.broadcast('system_account.updated', updated);
    return res.json(updated);
  }

  // Nếu là tài khoản từ AccountModel
  const accFilter = isObjId 
    ? { $or: [{ _id: idOrCode }, { accountId: caseInsensitiveExact(idOrCode) }, { accountName: caseInsensitiveExact(idOrCode) }] } 
    : { $or: [{ accountId: caseInsensitiveExact(idOrCode) }, { accountName: caseInsensitiveExact(idOrCode) }] };
  const existingRegular = await AccountModel.findOne(accFilter);
  if (existingRegular) {
    const targetRegularName = req.body.systemUsername ? normalizeUpper(req.body.systemUsername) : existingRegular.accountName;
    if (targetRegularName && targetRegularName.toLowerCase() !== existingRegular.accountName.toLowerCase()) {
      const dup = await AccountModel.findOne({
        _id: { $ne: existingRegular._id },
        accountName: caseInsensitiveExact(targetRegularName)
      }).lean();
      if (dup) {
        return res.status(400).json({ message: `Tên tài khoản "${targetRegularName}" đã tồn tại.` });
      }
    }

    const updatedRegular = {
      ...existingRegular.toObject(),
      accountName: targetRegularName,
      systemId: req.body.systemId ? normalizeUpper(req.body.systemId) : existingRegular.systemId,
      supplierId: req.body.supplierId ? normalizeUpper(req.body.supplierId) : existingRegular.supplierId,
      productId: req.body.productId ? normalizeUpper(req.body.productId) : existingRegular.productId,
      accountLevel: req.body.accountLevel || existingRegular.accountLevel,
      accountType: req.body.accountType || existingRegular.accountType,
      status: req.body.status || existingRegular.status,
      customerCode: req.body.customerCode !== undefined ? normalizeUpper(req.body.customerCode) : existingRegular.customerCode,
      parentAccountId: req.body.parentAccountId !== undefined ? normalizeUpperOrNull(req.body.parentAccountId) : existingRegular.parentAccountId,
      notes: req.body.notes !== undefined ? req.body.notes : existingRegular.notes,
      updatedAt: new Date()
    };
    await AccountModel.updateOne({ _id: existingRegular._id }, updatedRegular);
    wsManager.broadcast('account.updated', updatedRegular);
    return res.json({
      ...updatedRegular,
      systemAccountId: updatedRegular.accountId,
      systemUsername: updatedRegular.accountName
    });
  }

  return res.status(404).json({ message: 'Hệ thống tài khoản không tồn tại.' });
});

// DELETE /api/system-accounts/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const idOrCode = req.params.id;
  const isObjId = mongoose.Types.ObjectId.isValid(idOrCode);
  const filter = isObjId 
    ? { $or: [{ _id: idOrCode }, { systemAccountId: caseInsensitiveExact(idOrCode) }, { systemUsername: caseInsensitiveExact(idOrCode) }] } 
    : { $or: [{ systemAccountId: caseInsensitiveExact(idOrCode) }, { systemUsername: caseInsensitiveExact(idOrCode) }] };
  const existingAcc = await SystemAccountModel.findOne(filter);

  if (existingAcc) {
    await SystemAccountModel.deleteOne({ _id: existingAcc._id });

    await HistoryService.logAction({
      userId: (req as any).user?.userId,
      userName: (req as any).user?.username,
      action: 'DELETE',
      module: 'SYSTEM_ACCOUNT',
      objectType: 'SystemAccount',
      objectId: idOrCode,
      oldData: existingAcc.toObject()
    });

    wsManager.broadcast('system_account.deleted', { systemAccountId: idOrCode });
    return res.json({ message: 'Xóa hệ thống tài khoản thành công.' });
  }

  const accFilter = isObjId 
    ? { $or: [{ _id: idOrCode }, { accountId: caseInsensitiveExact(idOrCode) }, { accountName: caseInsensitiveExact(idOrCode) }] } 
    : { $or: [{ accountId: caseInsensitiveExact(idOrCode) }, { accountName: caseInsensitiveExact(idOrCode) }] };
  const existingRegular = await AccountModel.findOne(accFilter);
  if (existingRegular) {
    await AccountModel.deleteOne({ _id: existingRegular._id });
    wsManager.broadcast('account.deleted', { accountId: idOrCode });
    return res.json({ message: 'Xóa tài khoản thành công.' });
  }

  return res.status(404).json({ message: 'Hệ thống tài khoản không tồn tại.' });
});

export default router;

