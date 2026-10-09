import mongoose, { Schema } from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import {
  IUser, ICustomer, IAccount, IQLHAccount, ISystemAccount, ICustomerNote, IAuditHistory, IConfigCategory
} from '../types';

dotenv.config();

// Configure reliable public DNS resolvers to prevent MongoDB SRV ECONNREFUSED on Windows
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore fallback
}

// Mongo Schemas
const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, required: true, default: 'OPERATOR' },
  department: { type: String, default: 'Operations' },
  status: { type: String, default: 'ACTIVE' },
  lastLoginAt: { type: Date }
}, { timestamps: true });

const CustomerSchema = new Schema<ICustomer>({
  customerCode: { type: String, required: true, unique: true, index: true },
  parentCustomerId: { type: String, default: null, index: true },
  status: { type: String, default: 'ACTIVE', index: true },
  level: { type: String, default: 'A' },
  ottApps: [{ type: String }],
  manageOnBehalf: { type: Boolean, default: false },
  notes: { type: String, default: '' }
}, { timestamps: true });

const AccountSchema = new Schema<IAccount>({
  accountId: { type: String, required: true, unique: true, index: true },
  systemId: { type: String, required: true, index: true },
  supplierId: { type: String, required: true, index: true },
  productId: { type: String, required: true, index: true },
  accountType: { type: String, default: 'REGULAR' },
  status: { type: String, default: 'ACTIVE', index: true },
  accountLevel: { type: String, default: 'AGENT' },
  managedBy: { type: String, default: 'User A', index: true },
  cutRetail: { type: String, default: '' },
  customerCode: { type: String, required: true, index: true },
  accountName: { type: String, required: true, index: true },
  parentAccountId: { type: String, default: null, index: true },
  password: { type: String, default: '' },
  code: { type: String, default: '' },
  notes: { type: String, default: '' },
  subAccounts: [{
    id: String,
    subName: String,
    username: String,
    password: String,
    createdAt: String
  }]
}, { timestamps: true });

const SystemAccountSchema = new Schema<ISystemAccount>({
  systemAccountId: { type: String, required: true, unique: true, index: true },
  systemId: { type: String, required: true, index: true },
  supplierId: { type: String, required: true, index: true },
  productId: { type: String, required: true, index: true },
  accountLevel: { type: String, default: 'MASTER' },
  accountType: { type: String, default: 'SYSTEM' },
  status: { type: String, default: 'ACTIVE', index: true },
  customerCode: { type: String, default: '' },
  parentCustomerId: { type: String, default: '' },
  parentAccountId: { type: String, default: null, index: true },
  systemUsername: { type: String, required: true, index: true },
  notes: { type: String, default: '' }
}, { timestamps: true });

const CustomerNoteSchema = new Schema<ICustomerNote>({
  noteId: { type: String, required: true, unique: true, index: true },
  customerCode: { type: String, required: true, index: true },
  applicableCustomer: { type: String, default: '' },
  accountId: { type: String, default: '', index: true },
  noteType: { type: String, default: 'TEXT', index: true },
  requirement: { type: String, default: '' },
  specialNote: { type: String, default: '' },
  content: { type: String, required: true },
  createdBy: { type: String, required: true }
}, { timestamps: true });

const AuditHistorySchema = new Schema<IAuditHistory>({
  historyId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  action: { type: String, required: true, index: true },
  module: { type: String, required: true, index: true },
  objectType: { type: String, required: true },
  objectId: { type: String, required: true, index: true },
  oldData: { type: Schema.Types.Mixed },
  newData: { type: Schema.Types.Mixed },
  ipAddress: { type: String, default: '127.0.0.1' },
  userAgent: { type: String, default: 'ASM Client' }
}, { timestamps: true });

const ConfigSchema = new Schema<IConfigCategory>({
  id: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  group: { type: String, required: true, index: true },
  sortOrder: { type: Number, default: 1 },
  systems: [{ type: String }]
});

const QLHAccountSchema = new Schema<IQLHAccount>({
  accountId: { type: String, required: true, unique: true, index: true },
  systemId: { type: String, required: true, index: true },
  supplierId: { type: String, required: true, index: true },
  productId: { type: String, default: 'PROD_GOLD', index: true },
  accountType: { type: String, default: 'QLH', index: true },
  status: { type: String, default: 'ACTIVE', index: true },
  accountLevel: { type: String, default: 'Agent' },
  managedBy: { type: String, default: 'Công Ty', index: true },
  cutRetail: { type: String, default: '' },
  customerCode: { type: String, default: 'CUS_001', index: true },
  accountName: { type: String, required: true, index: true },
  loginName: { type: String, default: '' },
  password: { type: String, default: '' },
  code: { type: String, default: '' },
  notes: { type: String, default: '' },
  subAccounts: [{
    id: String,
    subName: String,
    username: String,
    password: String,
    createdAt: String
  }]
}, { timestamps: true });

export const UserModel = mongoose.model<IUser>('User', UserSchema);
export const CustomerModel = mongoose.model<ICustomer>('Customer', CustomerSchema);
export const AccountModel = mongoose.model<IAccount>('Account', AccountSchema);
export const QLHAccountModel = mongoose.model<IQLHAccount>('QLHAccount', QLHAccountSchema);
export const SystemAccountModel = mongoose.model<ISystemAccount>('SystemAccount', SystemAccountSchema);
export const CustomerNoteModel = mongoose.model<ICustomerNote>('CustomerNote', CustomerNoteSchema);
export const AuditHistoryModel = mongoose.model<IAuditHistory>('AuditHistory', AuditHistorySchema);
export const ConfigModel = mongoose.model<IConfigCategory>('Config', ConfigSchema);

export let isMongoConnected = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://cuongkunct_db_user:Cuong240418@asm-data-db.2b1zrve.mongodb.net/?appName=asm-data-db';

  if (uri.includes('<db_password>') || uri.includes('<password>')) {
    console.error(`[Database] ⚠️ CẢNH BÁO: MONGODB_URI đang chứa placeholder '<db_password>'. Vui lòng điền mật khẩu thật của user database vào backend/.env!`);
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    isMongoConnected = true;
    const safeHost = uri.split('@')[1] ? uri.split('@')[1].split('/')[0] : 'localhost';
    console.log(`[Database] 🚀 Successfully connected directly to MongoDB Cloud Atlas (${safeHost})`);

    // Ensure initial admin user exists if users collection is empty
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await UserModel.create({
        username: 'admin',
        password: hashedPassword,
        fullName: 'System Administrator',
        email: 'admin@asm.vn',
        role: 'SUPER_ADMIN',
        department: 'Quản Trị Hệ Thống',
        status: 'ACTIVE'
      });
      console.log('[Database] 🔐 Created default admin account in MongoDB (username: admin / pass: admin123)');
    }
  } catch (err: any) {
    isMongoConnected = false;
    console.error(`[Database] ❌ Could not connect to MongoDB Atlas (${err.message || 'Timeout'}). Please check network or MONGODB_URI.`);
  }
}
