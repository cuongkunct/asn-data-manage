import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { SystemAccountModel, AccountModel } from '../database/db';
import { ISystemAccount, IAccount } from '../types';
import { HistoryService } from '../services/history.service';
import { wsManager } from '../websocket/gateway';

const router = Router();

// GET /api/system-accounts/tree
router.get('/tree', async (req: Request, res: Response) => {
  const [sysList, regList] = await Promise.all([
    SystemAccountModel.find().lean().exec() as Promise<ISystemAccount[]>,
    AccountModel.find().lean().exec() as Promise<IAccount[]>
  ]);

  const list: ISystemAccount[] = [...sysList];
  regList.forEach(acc => {
    const accName = (acc.accountName || acc.accountId).trim();
    if (!list.some(s => s.systemUsername.toLowerCase() === accName.toLowerCase())) {
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
    const accName = (acc.accountName || acc.accountId).trim();
    // Tránh trùng lặp nếu tài khoản đã tồn tại trong SystemAccountModel
    const alreadyExists = list.some(s => s.systemUsername.toLowerCase() === accName.toLowerCase());
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
    list = list.filter(s => s.systemId === systemId);
  }
  if (supplierId && supplierId !== 'ALL') {
    list = list.filter(s => s.supplierId === supplierId);
  }
  if (customerCode) {
    list = list.filter(s => (s.customerCode || '').toLowerCase().includes(customerCode));
  }
  if (parentAccountId) {
    list = list.filter(s => (s.parentAccountId || '').toLowerCase().includes(parentAccountId));
  }
  if (search) {
    list = list.filter(s => 
      s.systemUsername.toLowerCase().includes(search) ||
      s.systemAccountId.toLowerCase().includes(search) ||
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

  let sysId = systemAccountId;
  if (!sysId) {
    const count = await SystemAccountModel.countDocuments();
    sysId = `SYS_ACC_${String(count + 1).padStart(3, '0')}`;
  }

  const newSysAcc: ISystemAccount = {
    systemAccountId: sysId,
    systemId: systemId || 'SYS_AA',
    supplierId: supplierId || 'SUP_GLOBAL',
    productId: productId || 'PROD_GOLD',
    accountLevel: accountLevel || 'LEVEL_1',
    accountType: accountType || 'SYSTEM',
    status: status || 'ACTIVE',
    customerCode: customerCode || '',
    parentCustomerId: parentCustomerId || '',
    parentAccountId: parentAccountId || null,
    systemUsername: systemUsername || `NODE_${sysId}`,
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
  const filter = isObjId ? { $or: [{ _id: idOrCode }, { systemAccountId: idOrCode }] } : { systemAccountId: idOrCode };
  let existingAcc = await SystemAccountModel.findOne(filter);

  if (existingAcc) {
    const updated: ISystemAccount = {
      ...existingAcc.toObject(),
      ...req.body,
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
  const accFilter = isObjId ? { $or: [{ _id: idOrCode }, { accountId: idOrCode }] } : { accountId: idOrCode };
  const existingRegular = await AccountModel.findOne(accFilter);
  if (existingRegular) {
    const updatedRegular = {
      ...existingRegular.toObject(),
      accountName: req.body.systemUsername || existingRegular.accountName,
      systemId: req.body.systemId || existingRegular.systemId,
      supplierId: req.body.supplierId || existingRegular.supplierId,
      productId: req.body.productId || existingRegular.productId,
      accountLevel: req.body.accountLevel || existingRegular.accountLevel,
      accountType: req.body.accountType || existingRegular.accountType,
      status: req.body.status || existingRegular.status,
      customerCode: req.body.customerCode || existingRegular.customerCode,
      parentAccountId: req.body.parentAccountId,
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
  const filter = isObjId ? { $or: [{ _id: idOrCode }, { systemAccountId: idOrCode }] } : { systemAccountId: idOrCode };
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

  const accFilter = isObjId ? { $or: [{ _id: idOrCode }, { accountId: idOrCode }] } : { accountId: idOrCode };
  const existingRegular = await AccountModel.findOne(accFilter);
  if (existingRegular) {
    await AccountModel.deleteOne({ _id: existingRegular._id });
    wsManager.broadcast('account.deleted', { accountId: idOrCode });
    return res.json({ message: 'Xóa tài khoản thành công.' });
  }

  return res.status(404).json({ message: 'Hệ thống tài khoản không tồn tại.' });
});

export default router;
