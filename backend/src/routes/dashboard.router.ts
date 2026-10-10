import { Router, Request, Response } from 'express';
import {
  AccountModel,
  QLHAccountModel,
  SystemAccountModel,
  CustomerModel,
  CustomerNoteModel,
  AuditHistoryModel,
  ConfigModel
} from '../database/db';

const router = Router();

// Helper: Calculate Date Range based on period
function parseDateRange(period?: string, startDate?: string, endDate?: string): { start?: Date; end?: Date; label: string } {
  const now = new Date();

  if (period === 'this_week') {
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday, label: 'Tuần này' };
  }

  if (period === 'last_week') {
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() + diffToMonday - 7);
    lastMonday.setHours(0, 0, 0, 0);

    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);
    return { start: lastMonday, end: lastSunday, label: 'Tuần trước' };
  }

  if (period === 'this_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: firstDay, end: lastDay, label: 'Tháng này' };
  }

  if (period === 'last_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start: firstDay, end: lastDay, label: 'Tháng trước' };
  }

  if (period === 'custom' && startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: `Từ ${startDate} đến ${endDate}` };
  }

  return { label: 'Tất cả' };
}

// Clean up any test/seed records from previous auto-seed runs if any exist
(async () => {
  try {
    await AccountModel.deleteMany({ accountId: { $regex: /^ACC_(3N1|DUA|FISH|HPW|HT3|SYS1|SYS2)_/ } });
    await SystemAccountModel.deleteMany({ systemAccountId: { $regex: /^HTTK_0/ } });
    await CustomerModel.deleteMany({ customerCode: { $in: ['AA001', 'AA002', 'AA003', 'AA004', 'BB001', 'BB002', 'BB003', 'CUS_004', 'CUS_005'] } });
  } catch (e) {
    // Ignore cleanup errors
  }
})();

// GET /api/dashboard/summary - 100% REAL DATABASE DATA
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || 'this_week';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const agentPrefix = (req.query.agentPrefix as string || '').trim();
    const supplierId = (req.query.supplierId as string || '').trim();
    const banker = (req.query.banker as string || '').trim();

    const dateRange = parseDateRange(period, startDate, endDate);

    // 1. Build Query Filters for Real Database Queries
    const accountFilter: any = {};
    const customerFilter: any = {};
    const systemAccountFilter: any = {};

    // Agent / Customer Prefix filter
    if (agentPrefix && agentPrefix !== 'ALL') {
      const prefixRegex = new RegExp(`^${agentPrefix}`, 'i');
      accountFilter.customerCode = { $regex: prefixRegex };
      customerFilter.customerCode = { $regex: prefixRegex };
      systemAccountFilter.customerCode = { $regex: prefixRegex };
    }

    // Supplier filter
    if (supplierId && supplierId !== 'ALL') {
      accountFilter.supplierId = supplierId;
      systemAccountFilter.supplierId = supplierId;
    }

    // Banker filter
    if (banker && banker !== 'ALL') {
      accountFilter.banker = banker;
      systemAccountFilter.banker = banker;
    }

    // 2. Fetch Real Records from MongoDB Collections
    const [allMatchingAccounts, allMatchingSystemAccounts, allMatchingCustomers, totalNotes] = await Promise.all([
      AccountModel.find(accountFilter).lean(),
      SystemAccountModel.find(systemAccountFilter).lean(),
      CustomerModel.find(customerFilter).lean(),
      CustomerNoteModel.countDocuments()
    ]);

    // Accounts created in period
    const accountsInPeriod = allMatchingAccounts.filter(acc => {
      if (!dateRange.start || !dateRange.end) return true;
      const created = new Date(acc.createdAt || 0);
      return created >= dateRange.start && created <= dateRange.end;
    });

    // System accounts created in period
    const systemAccountsInPeriod = allMatchingSystemAccounts.filter(acc => {
      if (!dateRange.start || !dateRange.end) return true;
      const created = new Date(acc.createdAt || 0);
      return created >= dateRange.start && created <= dateRange.end;
    });

    // Customers created in period
    const customersInPeriod = allMatchingCustomers.filter(cust => {
      if (!dateRange.start || !dateRange.end) return true;
      const created = new Date(cust.createdAt || 0);
      return created >= dateRange.start && created <= dateRange.end;
    });

    // Inactive / Deleted customers in period or current
    const inactiveOrDeletedCustomers = allMatchingCustomers.filter(c =>
      (c.status as string) === 'INACTIVE' || (c.status as string) === 'DELETED'
    );

    // 3. Status Distributions from Real DB Data
    // Customer Breakdown
    const totalCustCount = allMatchingCustomers.length || 1;
    const custActive = allMatchingCustomers.filter(c => c.status === 'ACTIVE').length;
    const custSuspend = allMatchingCustomers.filter(c => c.status === 'INACTIVE').length;
    const custClosed = allMatchingCustomers.filter(c => c.status === 'DELETED').length;
    const custSecurity = allMatchingCustomers.filter(c => (c.status as string) === 'LOCKED').length;

    const customerStatusDistribution = {
      total: allMatchingCustomers.length,
      active: { count: custActive, percent: allMatchingCustomers.length > 0 ? Math.round((custActive / totalCustCount) * 100) : 0 },
      suspend: { count: custSuspend, percent: allMatchingCustomers.length > 0 ? Math.round((custSuspend / totalCustCount) * 100) : 0 },
      closed: { count: custClosed, percent: allMatchingCustomers.length > 0 ? Math.round((custClosed / totalCustCount) * 100) : 0 },
      security: { count: custSecurity, percent: allMatchingCustomers.length > 0 ? Math.round((custSecurity / totalCustCount) * 100) : 0 }
    };

    // HTTK System Accounts Breakdown
    const totalSysCount = allMatchingSystemAccounts.length || 1;
    const sysActive = allMatchingSystemAccounts.filter(s => s.status === 'ACTIVE').length;
    const sysSuspend = allMatchingSystemAccounts.filter(s => s.status === 'INACTIVE').length;
    const sysClosed = allMatchingSystemAccounts.filter(s => (s.status as string) === 'DELETED' || (s.status as string) === 'CLOSED').length;
    const sysPending = allMatchingSystemAccounts.filter(s => s.status === 'PENDING' || !s.customerCode).length;

    const systemAccountDistribution = {
      total: allMatchingSystemAccounts.length,
      active: { count: sysActive, percent: allMatchingSystemAccounts.length > 0 ? Math.round((sysActive / totalSysCount) * 100) : 0 },
      suspend: { count: sysSuspend, percent: allMatchingSystemAccounts.length > 0 ? Math.round((sysSuspend / totalSysCount) * 100) : 0 },
      closed: { count: sysClosed, percent: allMatchingSystemAccounts.length > 0 ? Math.round((sysClosed / totalSysCount) * 100) : 0 },
      unassigned: { count: sysPending, percent: allMatchingSystemAccounts.length > 0 ? Math.round((sysPending / totalSysCount) * 100) : 0 }
    };

    // DSTK Accounts Breakdown
    const totalAccCount = allMatchingAccounts.length || 1;
    const accActive = allMatchingAccounts.filter(a => a.status === 'ACTIVE').length;
    const accSuspend = allMatchingAccounts.filter(a => a.status === 'INACTIVE' || (a.status as string) === 'SUSPEND').length;
    const accClosedCdl = allMatchingAccounts.filter(a => (a.status as string) === 'CLOSED_CDL').length;
    const accClosed = allMatchingAccounts.filter(a => (a.status as string) === 'CLOSED' || a.status === 'DELETED').length;
    const accSecurity = allMatchingAccounts.filter(a => (a.status as string) === 'LOCKED' || (a.status as string) === 'SECURITY').length;
    const accPending = allMatchingAccounts.filter(a => a.status === 'PENDING' || (a.status as string) === 'UNASSIGNED' || a.banker === 'Chưa gán').length;

    const accountStatusDistribution = {
      total: allMatchingAccounts.length,
      active: { count: accActive, percent: allMatchingAccounts.length > 0 ? Math.round((accActive / totalAccCount) * 100) : 0 },
      suspend: { count: accSuspend, percent: allMatchingAccounts.length > 0 ? Math.round((accSuspend / totalAccCount) * 100) : 0 },
      closed: { count: accClosed, percent: allMatchingAccounts.length > 0 ? Math.round((accClosed / totalAccCount) * 100) : 0 },
      security: { count: accSecurity, percent: allMatchingAccounts.length > 0 ? Math.round((accSecurity / totalAccCount) * 100) : 0 },
      unassigned: { count: accPending, percent: allMatchingAccounts.length > 0 ? Math.round((accPending / totalAccCount) * 100) : 0 }
    };

    // 4. Matrix Breakdown Grouped strictly by systemId + supplierId from actual accounts
    const matrixMap = new Map<string, {
      system: string;
      supplier: string;
      active: number;
      suspend: number;
      closedCdl: number;
      closed: number;
      security: number;
      unassigned: number;
      total: number;
    }>();

    for (const acc of allMatchingAccounts) {
      const sys = acc.systemId || 'DEFAULT';
      const sup = acc.supplierId || 'DEFAULT';
      const key = `${sys}___${sup}`;
      if (!matrixMap.has(key)) {
        matrixMap.set(key, {
          system: sys,
          supplier: sup,
          active: 0,
          suspend: 0,
          closedCdl: 0,
          closed: 0,
          security: 0,
          unassigned: 0,
          total: 0
        });
      }
      const row = matrixMap.get(key)!;
      row.total++;
      const st = (acc.status || '').toUpperCase();
      if (st === 'ACTIVE') row.active++;
      else if (st === 'INACTIVE' || st === 'SUSPEND') row.suspend++;
      else if (st === 'CLOSED_CDL') row.closedCdl++;
      else if (st === 'CLOSED' || st === 'DELETED') row.closed++;
      else if (st === 'LOCKED' || st === 'SECURITY') row.security++;
      else if (st === 'PENDING' || st === 'UNASSIGNED') row.unassigned++;
      else row.active++;
    }

    const accountMatrixData = Array.from(matrixMap.values());
    const matrixTotals = {
      active: accActive,
      suspend: accSuspend,
      closedCdl: accClosedCdl,
      closed: accClosed,
      security: accSecurity,
      unassigned: accPending,
      total: allMatchingAccounts.length
    };

    // 5. Customer Fluctuations List (New / Deleted / Security) from Real Data
    const customerFluctuations = {
      newCreated: customersInPeriod.map(c => ({
        customerCode: c.customerCode,
        level: c.level,
        status: c.status,
        createdAt: c.createdAt
      })),
      deleted: inactiveOrDeletedCustomers.map(c => ({
        customerCode: c.customerCode,
        level: c.level,
        status: c.status,
        createdAt: c.createdAt
      })),
      security: allMatchingCustomers.filter(c => (c.status as string) === 'LOCKED').map(c => ({
        customerCode: c.customerCode,
        level: c.level,
        status: c.status,
        createdAt: c.createdAt
      }))
    };

    // 6. Distinct Filter Options queried from REAL DB
    const [accSuppliers, sysSuppliers, qlhSuppliers] = await Promise.all([
      AccountModel.distinct('supplierId'),
      SystemAccountModel.distinct('supplierId'),
      QLHAccountModel.distinct('supplierId')
    ]);
    const suppliers = Array.from(new Set([
      ...accSuppliers,
      ...sysSuppliers,
      ...qlhSuppliers
    ])).filter((s): s is string => typeof s === 'string' && s.trim().length > 0).sort();

    const [accBankers, sysBankers, qlhBankers] = await Promise.all([
      AccountModel.distinct('banker'),
      SystemAccountModel.distinct('banker'),
      QLHAccountModel.distinct('banker')
    ]);
    const bankers = Array.from(new Set([
      ...accBankers,
      ...sysBankers,
      ...qlhBankers
    ])).filter((b): b is string => typeof b === 'string' && b.trim().length > 0).sort();

    const allCustomers = await CustomerModel.find().select('customerCode').lean();
    const allAccountsForPrefix = await AccountModel.find().select('customerCode').lean();
    const prefixSet = new Set<string>();
    for (const c of [...allCustomers, ...allAccountsForPrefix]) {
      const code = (c.customerCode || '').trim();
      if (!code) continue;
      const match = code.match(/^[A-Za-z_]+/);
      if (match && match[0] && match[0].length >= 2) {
        prefixSet.add(match[0].toUpperCase());
      } else if (code.length >= 2) {
        prefixSet.add(code.substring(0, 2).toUpperCase());
      }
    }
    const agentPrefixes = Array.from(prefixSet).sort();

    return res.json({
      filter: {
        period,
        startDate: startDate || null,
        endDate: endDate || null,
        periodLabel: dateRange.label,
        agentPrefix: agentPrefix || 'ALL',
        supplierId: supplierId || 'ALL',
        banker: banker || 'ALL'
      },
      metrics: {
        totalCustomers: allMatchingCustomers.length,
        newCustomers: customersInPeriod.length,
        deletedCustomers: inactiveOrDeletedCustomers.length,
        totalAccounts: allMatchingAccounts.length,
        newAccounts: accountsInPeriod.length,
        totalSystemAccounts: allMatchingSystemAccounts.length,
        newSystemAccounts: systemAccountsInPeriod.length,
        totalNotes
      },
      customerStatusDistribution,
      systemAccountDistribution,
      accountStatusDistribution,
      accountMatrixData,
      matrixTotals,
      customerFluctuations,
      filterOptions: {
        suppliers,
        bankers,
        agentPrefixes
      }
    });
  } catch (error: any) {
    console.error('[Dashboard Error]', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

export default router;
