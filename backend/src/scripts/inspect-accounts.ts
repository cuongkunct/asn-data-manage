import { connectDB, AccountModel } from '../database/db';
import mongoose from 'mongoose';

async function check() {
  await connectDB();
  const accs = await AccountModel.find().lean();
  console.log('Account count:', accs.length);
  for (const a of accs) {
    console.log({
      id: a.accountId,
      accountName: a.accountName,
      loginName: (a as any).loginName,
      code: a.code,
      customerCode: a.customerCode
    });
  }
  await mongoose.disconnect();
  process.exit(0);
}
check();
