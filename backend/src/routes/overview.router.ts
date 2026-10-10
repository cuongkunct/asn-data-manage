import { Router, Request, Response } from 'express';
import { CustomerModel, AccountModel, SystemAccountModel, CustomerNoteModel, AuditHistoryModel } from '../database/db';
import { escapeRegex } from '../utils/normalize';

const router = Router();

// GET /api/overview/suggestions?q=
router.get('/suggestions', async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim();
  const safe = escapeRegex(query);
  const regex = new RegExp(safe, 'i');

  const [customers, accounts] = await Promise.all([
    CustomerModel.find(query ? { customerCode: { $regex: regex } } : {})
      .select('customerCode level status')
      .limit(30)
      .lean(),
    AccountModel.find(query ? { $or: [{ accountId: { $regex: regex } }, { accountName: { $regex: regex } }] } : {})
      .select('accountId accountName customerCode status')
      .limit(30)
      .lean()
  ]);

  return res.json({
    customers: customers.map(c => ({
      value: c.customerCode,
      label: c.customerCode,
      subLabel: `Level: ${c.level || 'VIP'} • ${c.status}`,
      badge: 'Khách hàng'
    })),
    accounts: accounts.map(a => ({
      value: a.accountId,
      label: `${a.accountId} - ${a.accountName}`,
      subLabel: `KH: ${a.customerCode} • ${a.status}`,
      badge: 'Tài khoản'
    }))
  });
});

// GET /api/overview/lookup?q=CUS_001 or ACC_001
router.get('/lookup', async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim();
  if (!query) {
    return res.status(400).json({ message: 'Search query parameter q is required.' });
  }

  const safeQuery = escapeRegex(query);
  const queryRegex = new RegExp(safeQuery, 'i');

  let customer = await CustomerModel.findOne({ customerCode: { $regex: queryRegex } }).lean();
  let targetCustomerCode = customer ? customer.customerCode : query;
  const safeTarget = escapeRegex(targetCustomerCode);
  const targetRegex = new RegExp(safeTarget, 'i');

  // Find linked accounts
  let accounts = await AccountModel.find({ 
    $or: [
      { customerCode: { $regex: targetRegex } },
      { customerCode: { $regex: queryRegex } },
      { accountId: { $regex: queryRegex } },
      { accountName: { $regex: queryRegex } }
    ] 
  }).lean();

  if (!customer && accounts.length > 0) {
    targetCustomerCode = accounts[0].customerCode;
    customer = await CustomerModel.findOne({ customerCode: { $regex: new RegExp(`^${escapeRegex(targetCustomerCode)}$`, 'i') } }).lean();
  }

  // Find system accounts
  const systemAccounts = await SystemAccountModel.find({ 
    $or: [
      { customerCode: { $regex: targetRegex } },
      { customerCode: { $regex: queryRegex } },
      { systemUsername: { $regex: queryRegex } },
      { systemAccountId: { $regex: queryRegex } }
    ]
  }).lean();

  // Find notes
  const notes = await CustomerNoteModel.find({ 
    $or: [
      { customerCode: { $regex: targetRegex } },
      { customerCode: { $regex: queryRegex } },
      { applicableCustomer: { $regex: queryRegex } },
      { accountId: { $regex: queryRegex } }
    ]
  }).lean();

  // Find history
  const accountIds = accounts.map(a => a.accountId);
  const history = await AuditHistoryModel.find({ 
    $or: [
      { objectId: { $in: [targetCustomerCode, query, ...accountIds] } },
      { objectId: { $regex: queryRegex } }
    ]
  }).sort({ createdAt: -1 }).limit(20).lean();

  return res.json({
    query,
    customer: customer || null,
    accounts,
    systemAccounts,
    notes,
    history
  });
});

export default router;

