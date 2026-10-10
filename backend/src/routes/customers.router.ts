import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { CustomerModel } from '../database/db';
import { ICustomer } from '../types';
import { CustomerService } from '../services/customer.service';
import { normalizeUpper, normalizeUpperOrNull, normalizeCustomerLevel, caseInsensitiveExact, escapeRegex } from '../utils/normalize';

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
    const normLvl = normalizeCustomerLevel(level);
    customers = customers.filter(c => c.level === level || normalizeCustomerLevel(c.level) === normLvl);
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
      (c.customerCode || '').toLowerCase().includes(search) ||
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
  try {
    const customer = await CustomerService.getCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Khách hàng không tồn tại.' });
    return res.json(customer);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/customers - Tạo khách hàng mới chuẩn cấu trúc (bỏ parentCustomerId, dùng parentId)
router.post('/', async (req: Request, res: Response) => {
  try {
    const userContext = {
      userId: (req as any).user?.userId,
      userName: (req as any).user?.username
    };
    const { parentCustomerId, ...customerData } = req.body;
    const created = await CustomerService.createCustomer(customerData, userContext);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Lỗi khi tạo khách hàng.' });
  }
});

// PUT /api/customers/:id - Cập nhật khách hàng
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userContext = {
      userId: (req as any).user?.userId,
      userName: (req as any).user?.username
    };
    const { parentCustomerId, ...customerData } = req.body;
    const updated = await CustomerService.updateCustomer(req.params.id, customerData, userContext);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Lỗi khi cập nhật khách hàng.' });
  }
});

// DELETE /api/customers/:id - Xóa khách hàng
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userContext = {
      userId: (req as any).user?.userId,
      userName: (req as any).user?.username
    };
    const result = await CustomerService.deleteCustomer(req.params.id, userContext);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Lỗi khi xóa khách hàng.' });
  }
});

export default router;

