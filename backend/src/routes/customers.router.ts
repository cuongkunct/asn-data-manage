import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { CustomerModel } from '../database/db';
import { ICustomer } from '../types';
import { HistoryService } from '../services/history.service';
import { wsManager } from '../websocket/gateway';

const router = Router();

// GET /api/customers
router.get('/', async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const search = (req.query.search as string || '').trim().toLowerCase();
  const customerCode = (req.query.customer_code as string || req.query.customerCode as string || '').trim().toLowerCase();
  const parentCustomerId = (req.query.parent_customer_id as string || req.query.parentCustomerId as string || '').trim().toLowerCase();
  const status = req.query.status as string;
  const level = req.query.level as string;
  const qlh = req.query.qlh as string; // 'ALL', 'YES', 'NO'

  let customers = (await CustomerModel.find().lean().exec()) as ICustomer[];

  if (status && status !== 'ALL') {
    customers = customers.filter(c => c.status === status);
  }
  if (level && level !== 'ALL') {
    customers = customers.filter(c => c.level === level);
  }
  if (qlh && qlh !== 'ALL') {
    const isManage = qlh === 'YES' || qlh === 'TRUE';
    customers = customers.filter(c => Boolean(c.manageOnBehalf) === isManage);
  }
  if (customerCode) {
    customers = customers.filter(c => (c.customerCode || '').toLowerCase().includes(customerCode));
  }
  if (parentCustomerId) {
    customers = customers.filter(c => (c.parentCustomerId || '').toLowerCase().includes(parentCustomerId));
  }
  if (search) {
    customers = customers.filter(c => 
      c.customerCode.toLowerCase().includes(search) ||
      (c.parentCustomerId && c.parentCustomerId.toLowerCase().includes(search)) ||
      (c.notes && c.notes.toLowerCase().includes(search))
    );
  }

  customers.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const total = customers.length;
  const items = customers.slice((page - 1) * limit, page * limit);

  return res.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  });
});

// GET /api/customers/:id
router.get('/:id', async (req: Request, res: Response) => {
  const idOrCode = req.params.id;
  const isObjId = mongoose.Types.ObjectId.isValid(idOrCode);
  const filter = isObjId ? { $or: [{ _id: idOrCode }, { customerCode: idOrCode }] } : { customerCode: idOrCode };
  const customer = await CustomerModel.findOne(filter).lean();

  if (!customer) return res.status(404).json({ message: 'Khách hàng không tồn tại.' });
  return res.json(customer);
});

// POST /api/customers
router.post('/', async (req: Request, res: Response) => {
  const { customerCode, parentCustomerId, status, level, ottApps, manageOnBehalf, notes } = req.body;

  let code = customerCode;
  if (!code) {
    const count = await CustomerModel.countDocuments();
    code = `CUS_${String(count + 1).padStart(3, '0')}`;
  }

  const existing = await CustomerModel.findOne({ customerCode: code }).lean();
  if (existing) {
    return res.status(400).json({ message: `Mã khách hàng ${code} đã tồn tại.` });
  }

  const newCust: ICustomer = {
    customerCode: code,
    parentCustomerId: parentCustomerId || null,
    status: status || 'ACTIVE',
    level: level || 'A',
    ottApps: Array.isArray(ottApps) ? ottApps : ['Telegram'],
    manageOnBehalf: Boolean(manageOnBehalf),
    notes: notes || '',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const doc = await CustomerModel.create(newCust);
  const createdObj = doc.toObject();

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: 'CREATE',
    module: 'CUSTOMER',
    objectType: 'Customer',
    objectId: code,
    newData: createdObj
  });

  wsManager.broadcast('customer.created', createdObj);
  wsManager.broadcast('customer.created', createdObj, `customer:${code}`);

  return res.status(201).json(createdObj);
});

// PUT /api/customers/:id
router.put('/:id', async (req: Request, res: Response) => {
  const idOrCode = req.params.id;
  const isObjId = mongoose.Types.ObjectId.isValid(idOrCode);
  const filter = isObjId ? { $or: [{ _id: idOrCode }, { customerCode: idOrCode }] } : { customerCode: idOrCode };
  const existingCust = await CustomerModel.findOne(filter).lean();
  
  if (!existingCust) {
    return res.status(404).json({ message: 'Khách hàng không tồn tại.' });
  }

  const updatedCust: ICustomer = {
    ...existingCust,
    ...req.body,
    updatedAt: new Date()
  };

  await CustomerModel.updateOne({ _id: existingCust._id }, updatedCust);

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: 'UPDATE',
    module: 'CUSTOMER',
    objectType: 'Customer',
    objectId: existingCust.customerCode,
    oldData: existingCust,
    newData: updatedCust
  });

  wsManager.broadcast('customer.updated', updatedCust);
  wsManager.broadcast('customer.updated', updatedCust, `customer:${existingCust.customerCode}`);

  return res.json(updatedCust);
});

// DELETE /api/customers/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const idOrCode = req.params.id;
  const isObjId = mongoose.Types.ObjectId.isValid(idOrCode);
  const filter = isObjId ? { $or: [{ _id: idOrCode }, { customerCode: idOrCode }] } : { customerCode: idOrCode };
  const existingCust = await CustomerModel.findOne(filter).lean();

  if (!existingCust) {
    return res.status(404).json({ message: 'Khách hàng không tồn tại.' });
  }

  await CustomerModel.deleteOne({ _id: existingCust._id });

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: 'DELETE',
    module: 'CUSTOMER',
    objectType: 'Customer',
    objectId: idOrCode,
    oldData: existingCust
  });

  wsManager.broadcast('customer.deleted', { customerCode: existingCust.customerCode });

  return res.json({ message: 'Xóa khách hàng thành công.' });
});

export default router;
