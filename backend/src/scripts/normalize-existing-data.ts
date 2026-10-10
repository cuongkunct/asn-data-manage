import { connectDB, AccountModel, SystemAccountModel, CustomerModel, QLHAccountModel, CustomerNoteModel } from '../database/db';
import mongoose from 'mongoose';

async function run() {
  await connectDB();
  console.log('--- Checking & Normalizing Existing Data in MongoDB ---');

  // 1. Customers
  const customers = await CustomerModel.find();
  let custUpdated = 0;
  for (const c of customers) {
    const rawCode = c.customerCode || '';
    const normCode = rawCode.trim().toUpperCase();
    const rawParent = c.parentCustomerId || '';
    const normParent = rawParent ? rawParent.trim().toUpperCase() : null;
    const rawLevel = c.level || '1';
    const normLevel = rawLevel.match(/^(\d+)/) ? rawLevel.match(/^(\d+)/)![1] : rawLevel;
    if (rawCode !== normCode || rawParent !== normParent || rawLevel !== normLevel) {
      await CustomerModel.updateOne(
        { _id: c._id },
        { $set: { customerCode: normCode, parentCustomerId: normParent, level: normLevel } }
      );
      custUpdated++;
    }
  }
  console.log(`Customers updated: ${custUpdated} / ${customers.length}`);

  // 2. Accounts
  const accounts = await AccountModel.find();
  let accUpdated = 0;
  for (const a of accounts) {
    const normName = (a.accountName || '').trim().toUpperCase();
    const normCust = (a.customerCode || '').trim().toUpperCase();
    const normCode = (a.code || '').trim().toUpperCase();
    const normSys = (a.systemId || '').trim().toUpperCase();
    const normSup = (a.supplierId || '').trim().toUpperCase();
    const normParent = a.parentAccountId ? a.parentAccountId.trim().toUpperCase() : null;
    let subsChanged = false;
    const normSubs = (a.subAccounts || []).map(s => {
      const uNorm = (s.username || '').trim().toUpperCase();
      if (uNorm !== s.username) subsChanged = true;
      return { ...s, username: uNorm };
    });

    if (
      normName !== a.accountName ||
      normCust !== a.customerCode ||
      normCode !== a.code ||
      normSys !== a.systemId ||
      normSup !== a.supplierId ||
      normParent !== a.parentAccountId ||
      subsChanged
    ) {
      await AccountModel.updateOne(
        { _id: a._id },
        {
          $set: {
            accountName: normName,
            customerCode: normCust,
            code: normCode,
            systemId: normSys,
            supplierId: normSup,
            parentAccountId: normParent,
            subAccounts: normSubs
          }
        }
      );
      accUpdated++;
    }
  }
  console.log(`Accounts updated: ${accUpdated} / ${accounts.length}`);

  // 3. System Accounts
  const sysAccounts = await SystemAccountModel.find();
  let sysUpdated = 0;
  for (const s of sysAccounts) {
    const normUser = (s.systemUsername || '').trim().toUpperCase();
    const normCust = (s.customerCode || '').trim().toUpperCase();
    const normParentCust = (s.parentCustomerId || '').trim().toUpperCase();
    const normParentAcc = s.parentAccountId ? s.parentAccountId.trim().toUpperCase() : null;
    const normSys = (s.systemId || '').trim().toUpperCase();
    const normSup = (s.supplierId || '').trim().toUpperCase();

    if (
      normUser !== s.systemUsername ||
      normCust !== s.customerCode ||
      normParentCust !== s.parentCustomerId ||
      normParentAcc !== s.parentAccountId ||
      normSys !== s.systemId ||
      normSup !== s.supplierId
    ) {
      await SystemAccountModel.updateOne(
        { _id: s._id },
        {
          $set: {
            systemUsername: normUser,
            customerCode: normCust,
            parentCustomerId: normParentCust,
            parentAccountId: normParentAcc,
            systemId: normSys,
            supplierId: normSup
          }
        }
      );
      sysUpdated++;
    }
  }
  console.log(`System Accounts updated: ${sysUpdated} / ${sysAccounts.length}`);

  // 4. QLH Accounts
  const qlhAccounts = await QLHAccountModel.find();
  let qlhUpdated = 0;
  for (const q of qlhAccounts) {
    const normName = (q.accountName || '').trim().toUpperCase();
    const normCust = (q.customerCode || '').trim().toUpperCase();
    const normCode = (q.code || '').trim().toUpperCase();
    const normLogin = (q.loginName || '').trim().toUpperCase();
    const normSys = (q.systemId || '').trim().toUpperCase();
    const normSup = (q.supplierId || '').trim().toUpperCase();

    if (
      normName !== q.accountName ||
      normCust !== q.customerCode ||
      normCode !== q.code ||
      normLogin !== q.loginName ||
      normSys !== q.systemId ||
      normSup !== q.supplierId
    ) {
      await QLHAccountModel.updateOne(
        { _id: q._id },
        {
          $set: {
            accountName: normName,
            customerCode: normCust,
            code: normCode,
            loginName: normLogin,
            systemId: normSys,
            supplierId: normSup
          }
        }
      );
      qlhUpdated++;
    }
  }
  console.log(`QLH Accounts updated: ${qlhUpdated} / ${qlhAccounts.length}`);

  // 5. Notes
  const notes = await CustomerNoteModel.find();
  let notesUpdated = 0;
  for (const n of notes) {
    const normCust = (n.customerCode || '').trim().toUpperCase();
    const normApp = (n.applicableCustomer || '').trim().toUpperCase();
    const normAcc = (n.accountId || '').trim().toUpperCase();

    if (normCust !== n.customerCode || normApp !== n.applicableCustomer || normAcc !== n.accountId) {
      await CustomerNoteModel.updateOne(
        { _id: n._id },
        {
          $set: {
            customerCode: normCust,
            applicableCustomer: normApp,
            accountId: normAcc
          }
        }
      );
      notesUpdated++;
    }
  }
  console.log(`Notes updated: ${notesUpdated} / ${notes.length}`);

  console.log('--- Done normalizing existing data ---');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
