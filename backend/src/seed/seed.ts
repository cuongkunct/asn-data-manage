import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import dns from 'dns';
import {
  UserModel,
  CustomerModel,
  AccountModel,
  SystemAccountModel,
  CustomerNoteModel,
  AuditHistoryModel,
  ConfigModel,
  QLHAccountModel
} from '../database/db';

dotenv.config();

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (_) {}

async function runSeed() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://thangtrandz04_db_user:OKztUrDX5tJXHVdr@cluster0.ul11lo6.mongodb.net/asm_data?retryWrites=true&w=majority&appName=Cluster0';

  console.log(`[Seed] ⏳ Connecting to MongoDB Atlas: ${uri.split('@')[1] || uri}...`);
  mongoose.set('strictQuery', false);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log(`[Seed] 🚀 Connected successfully to MongoDB!`);

  console.log(`[Seed] 🧹 Clearing all old collections...`);
  await Promise.all([
    UserModel.deleteMany({}),
    CustomerModel.deleteMany({}),
    AccountModel.deleteMany({}),
    SystemAccountModel.deleteMany({}),
    CustomerNoteModel.deleteMany({}),
    AuditHistoryModel.deleteMany({}),
    ConfigModel.deleteMany({}),
    QLHAccountModel.deleteMany({})
  ]);

  console.log(`[Seed] 👤 Seeding System Users (Admin, Manager, Operator)...`);
  const passwordHash = bcrypt.hashSync('admin123', 10);
  const [adminUser, managerUser, operatorUser] = await UserModel.create([
    {
      username: 'admin',
      password: passwordHash,
      fullName: 'Super Administrator',
      email: 'admin@asm.vn',
      role: 'SUPER_ADMIN',
      department: 'Quản Trị Cấp Cao',
      status: 'ACTIVE'
    },
    {
      username: 'manager',
      password: passwordHash,
      fullName: 'Quản Lý Vận Hành',
      email: 'manager@asm.vn',
      role: 'MANAGER',
      department: 'Phòng Vận Hành',
      status: 'ACTIVE'
    },
    {
      username: 'operator1',
      password: passwordHash,
      fullName: 'Nhân Viên Vận Hành 1',
      email: 'operator1@asm.vn',
      role: 'OPERATOR',
      department: 'Chăm Sóc Khách Hàng',
      status: 'ACTIVE'
    }
  ]);

  console.log(`[Seed] ⚙️ Seeding Core System Configs...`);
  await ConfigModel.create([
    // Hệ thống
    { id: 'cfg_sys_01', code: 'SYS_01', name: 'Hệ Thống Alpha', group: 'system', sortOrder: 1 },
    { id: 'cfg_sys_02', code: 'SYS_02', name: 'Hệ Thống Beta', group: 'system', sortOrder: 2 },

    // Nhà cung cấp
    { id: 'cfg_sup_01', code: 'SUP_01', name: 'Nhà Cung Cấp Alpha', group: 'supplier', sortOrder: 1 },
    { id: 'cfg_sup_02', code: 'SUP_02', name: 'Nhà Cung Cấp Beta', group: 'supplier', sortOrder: 2 },

    // Sản phẩm
    { id: 'cfg_prod_01', code: 'PROD_GOLD', name: 'Sản Phẩm Gold', group: 'product', sortOrder: 1 },
    { id: 'cfg_prod_02', code: 'PROD_SILVER', name: 'Sản Phẩm Silver', group: 'product', sortOrder: 2 },

    // Cấp tài khoản
    { id: 'cfg_lvl_01', code: 'MASTER', name: 'Tổng Đại Lý (Master)', group: 'account_level', sortOrder: 1 },
    { id: 'cfg_lvl_02', code: 'AGENT', name: 'Đại Lý Cấp 1 (Agent)', group: 'account_level', sortOrder: 2 },
    { id: 'cfg_lvl_03', code: 'SUB_AGENT', name: 'Đại Lý Cấp 2 (Sub-Agent)', group: 'account_level', sortOrder: 3 },

    // Trạng thái tài khoản
    { id: 'cfg_ast_01', code: 'ACTIVE', name: 'Đang hoạt động', group: 'account_status', sortOrder: 1 },
    { id: 'cfg_ast_02', code: 'INACTIVE', name: 'Tạm ngưng', group: 'account_status', sortOrder: 2 },
    { id: 'cfg_ast_03', code: 'LOCKED', name: 'Đang khóa', group: 'account_status', sortOrder: 3 },

    // Trạng thái khách hàng
    { id: 'cfg_cst_01', code: 'ACTIVE', name: 'Hoạt động', group: 'customer_status', sortOrder: 1 },
    { id: 'cfg_cst_02', code: 'INACTIVE', name: 'Tạm ngưng', group: 'customer_status', sortOrder: 2 },

    // Loại tài khoản
    { id: 'cfg_typ_01', code: 'REGULAR', name: 'Tài khoản thường', group: 'account_type', sortOrder: 1 },
    { id: 'cfg_typ_02', code: 'VIP', name: 'Tài khoản VIP', group: 'account_type', sortOrder: 2 },
    { id: 'cfg_typ_03', code: 'QLH', name: 'Quản Lý Hộ', group: 'account_type', sortOrder: 3 },

    // Ứng dụng OTT
    { id: 'cfg_ott_01', code: 'Telegram', name: 'Telegram', group: 'ott_app', sortOrder: 1 },
    { id: 'cfg_ott_02', code: 'Zalo', name: 'Zalo', group: 'ott_app', sortOrder: 2 },
    { id: 'cfg_ott_03', code: 'WhatsApp', name: 'WhatsApp', group: 'ott_app', sortOrder: 3 },

    // Loại ghi chú
    { id: 'cfg_nt_01', code: 'TEXT', name: 'Ghi chú thường', group: 'note_type', sortOrder: 1 },
    { id: 'cfg_nt_02', code: 'IMPORTANT', name: 'Quan trọng', group: 'note_type', sortOrder: 2 },
    { id: 'cfg_nt_03', code: 'REQUEST', name: 'Yêu cầu hỗ trợ', group: 'note_type', sortOrder: 3 }
  ]);

  console.log(`[Seed] 🏢 Seeding Core Customers...`);
  await CustomerModel.create([
    {
      customerCode: 'CUS_001',
      parentCustomerId: null,
      status: 'ACTIVE',
      level: 'VIP',
      ottApps: ['Telegram', 'Zalo'],
      manageOnBehalf: true,
      notes: 'Khách hàng VIP chiến lược. Hỗ trợ giao dịch 24/7.'
    },
    {
      customerCode: 'CUS_002',
      parentCustomerId: null,
      status: 'ACTIVE',
      level: 'A',
      ottApps: ['Telegram'],
      manageOnBehalf: false,
      notes: 'Khách hàng đối tác khu vực miền Bắc.'
    },
    {
      customerCode: 'CUS_003',
      parentCustomerId: 'CUS_001',
      status: 'ACTIVE',
      level: 'B',
      ottApps: ['Zalo'],
      manageOnBehalf: false,
      notes: 'Đại lý trực thuộc khách hàng CUS_001.'
    }
  ]);

  console.log(`[Seed] 💼 Seeding Core Accounts...`);
  await AccountModel.create([
    {
      accountId: 'ACC_001',
      systemId: 'SYS_01',
      supplierId: 'SUP_01',
      productId: 'PROD_GOLD',
      accountType: 'REGULAR',
      status: 'ACTIVE',
      accountLevel: 'MASTER',
      managedBy: 'admin',
      cutRetail: '10%',
      customerCode: 'CUS_001',
      accountName: 'ACC_MASTER_GOLD_01',
      loginName: 'admin_gold',
      notes: 'Tài khoản chính kết nối sàn',
      subAccounts: [
        { id: 'sub_1', subName: 'Sub Kế Toán', username: 'sub_kt01', password: '123', createdAt: new Date().toISOString() }
      ]
    },
    {
      accountId: 'ACC_002',
      systemId: 'SYS_02',
      supplierId: 'SUP_02',
      productId: 'PROD_SILVER',
      accountType: 'REGULAR',
      status: 'ACTIVE',
      accountLevel: 'AGENT',
      managedBy: 'admin',
      cutRetail: '5%',
      customerCode: 'CUS_001',
      accountName: 'ACC_AGENT_SILVER_02',
      loginName: 'admin_silver',
      notes: 'Tài khoản đại lý nhánh Bạc'
    },
    {
      accountId: 'ACC_003',
      systemId: 'SYS_01',
      supplierId: 'SUP_01',
      productId: 'PROD_GOLD',
      accountLevel: 'AGENT',
      accountType: 'REGULAR',
      status: 'ACTIVE',
      managedBy: 'admin',
      cutRetail: '',
      customerCode: 'CUS_002',
      accountName: 'ACC_AGENT_GOLD_03',
      loginName: 'agent_gold03',
      notes: 'Tài khoản khách hàng CUS_002'
    }
  ]);

  console.log(`[Seed] 🖥️ Seeding System Accounts...`);
  await SystemAccountModel.create([
    {
      systemAccountId: 'SYS_ACC_001',
      systemId: 'SYS_01',
      supplierId: 'SUP_01',
      productId: 'PROD_GOLD',
      accountLevel: 'MASTER',
      accountType: 'SYSTEM',
      status: 'ACTIVE',
      customerCode: 'CUS_001',
      systemUsername: 'sys_root_alpha',
      notes: 'Tài khoản hệ thống cổng kết nối Alpha'
    }
  ]);

  console.log(`[Seed] 🤝 Seeding Quản Lý Hộ (QLH)...`);
  await QLHAccountModel.create([
    {
      accountId: 'QLH_001',
      systemId: 'SYS_01',
      supplierId: 'SUP_01',
      productId: 'PROD_GOLD',
      accountType: 'QLH',
      status: 'ACTIVE',
      accountLevel: 'Agent',
      managedBy: 'Công Ty',
      customerCode: 'CUS_001',
      accountName: 'QLH_TAI_CHINH_01',
      loginName: 'qlh_user01',
      password: 'Password123@',
      notes: 'Ủy quyền công ty quản lý hộ danh mục đầu tư',
      subAccounts: [
        { id: 'sub_qlh_1', subName: 'Sub Giao dịch 1', username: 'qlh_sub01', password: '123', createdAt: new Date().toISOString() }
      ]
    }
  ]);

  console.log(`[Seed] 📝 Seeding Customer Notes...`);
  await CustomerNoteModel.create([
    {
      noteId: 'NOTE_001',
      customerCode: 'CUS_001',
      applicableCustomer: 'CUS_001',
      accountId: 'ACC_001',
      noteType: 'IMPORTANT',
      requirement: 'Ưu tiên duyệt lệnh trong 5 giây',
      specialNote: 'Khách hàng VIP được hỗ trợ 24/7',
      content: 'Lưu ý kiểm tra số dư và hạn mức tín dụng trước 10h sáng mỗi ngày.',
      createdBy: 'admin'
    }
  ]);

  console.log(`[Seed] 📜 Seeding Audit Histories...`);
  await AuditHistoryModel.create([
    {
      historyId: 'AUD_001',
      userId: adminUser._id?.toString() || 'admin_id',
      userName: 'admin',
      action: 'LOGIN',
      module: 'AUTH',
      objectType: 'User',
      objectId: 'admin',
      ipAddress: '127.0.0.1',
      userAgent: 'ASM System Initializer'
    },
    {
      historyId: 'AUD_002',
      userId: adminUser._id?.toString() || 'admin_id',
      userName: 'admin',
      action: 'CREATE',
      module: 'CUSTOMER',
      objectType: 'Customer',
      objectId: 'CUS_001',
      newData: { customerCode: 'CUS_001', level: 'VIP' },
      ipAddress: '127.0.0.1',
      userAgent: 'ASM System Initializer'
    }
  ]);

  console.log(`=======================================================`);
  console.log(`🎉 SEED THÀNH CÔNG! DỮ LIỆU ĐÃ ĐƯỢC LÀM SẠCH VÀ NẠP MỚI`);
  console.log(`=======================================================`);
  console.log(`Tài khoản đăng nhập hệ thống:`);
  console.log(`👉 1. SUPER ADMIN: admin     / admin123  (Toàn quyền hệ thống)`);
  console.log(`👉 2. MANAGER:     manager   / admin123  (Quản lý & điều hành)`);
  console.log(`👉 3. OPERATOR:    operator1 / admin123  (Nhân viên vận hành)`);
  console.log(`=======================================================`);

  await mongoose.disconnect();
  process.exit(0);
}

runSeed().catch(err => {
  console.error('[Seed] ❌ Seed thất bại:', err);
  process.exit(1);
});
