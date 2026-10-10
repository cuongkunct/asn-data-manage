export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

export interface IUser {
  _id?: string;
  username: string;
  password?: string;
  fullName: string;
  email: string;
  role: UserRole;
  department?: string;
  status: 'ACTIVE' | 'INACTIVE';
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICustomer {
  _id?: string;
  parentId?: any; // MongoDB ObjectId of parent customer
  parentCustomerId?: string | null; // Customer code of parent
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED' | 'LOCKED' | string;
  level: string; // 1, 2, 0, etc. (normalized)
  ottApps: string[]; // Telegram, Zalo, WhatsApp, etc.
  manageOnBehalf: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateCustomerDto {
  customerCode: string;
  parentId?: string | null;
  status: string;
  level?: string;
  ottApps?: string[] | string;
  manageOnBehalf?: boolean;
  notes?: string;
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {}

export interface ISubAccount {
  id: string;
  subName: string; // Sub 21, Sub 22...
  username: string;
  password?: string;
  createdAt?: string;
}

export interface IAccount {
  _id?: string;
  accountId: string; // ACC_001
  systemId: string; // SYS_001
  supplierId: string; // SUP_001
  productId: string; // PRO_001
  accountType: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'DELETED' | 'PENDING' | 'CLOSED' | 'CLOSED_CDL' | 'SUSPEND' | 'SECURITY' | 'UNASSIGNED';
  accountLevel: string;
  managedBy: string; // User ID / Username
  banker?: string; // Banker
  cutRetail?: string; // Cắt lẻ
  customerCode: string; // Linked Customer Code
  accountName: string;
  parentAccountId?: string | null;
  loginName?: string;
  password?: string;
  code?: string;
  notes?: string;
  subAccounts?: ISubAccount[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IQLHAccount {
  _id?: string;
  accountId: string;
  systemId: string;
  supplierId: string;
  productId: string;
  accountType: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'DELETED' | 'PENDING' | 'CLOSED' | 'CLOSED_CDL' | 'SUSPEND' | 'SECURITY' | 'UNASSIGNED';
  accountLevel: string;
  managedBy: string;
  banker?: string; // Banker
  cutRetail?: string;
  customerCode: string;
  accountName: string;
  loginName?: string;
  password?: string;
  code?: string;
  notes?: string;
  subAccounts?: ISubAccount[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISystemAccount {
  _id?: string;
  systemAccountId: string; // SYS_ACC_001
  systemId: string;
  supplierId: string;
  productId: string;
  accountLevel: string;
  accountType: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'DELETED' | 'PENDING' | 'CLOSED' | 'UNASSIGNED';
  customerCode?: string;
  banker?: string; // Banker
  parentCustomerId?: string;
  parentAccountId?: string | null; // For hierarchy AA -> AAB -> AABC
  systemUsername: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type NoteType = 'TEXT' | 'WARNING' | 'REQUEST' | 'INFORMATION' | 'IMPORTANT' | 'OTHER';

export interface ICustomerNote {
  _id?: string;
  noteId: string;
  customerCode: string;
  applicableCustomer?: string;
  accountId?: string;
  noteType: NoteType;
  requirement?: string;
  specialNote?: string;
  content: string;
  createdBy: string; // User ID / Name
  createdAt?: Date;
  updatedAt?: Date;
}

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'CHANGE_STATUS'
  | 'CHANGE_PASSWORD'
  | 'IMPORT'
  | 'EXPORT';

export interface IAuditHistory {
  _id?: string;
  historyId: string;
  userId: string;
  userName: string;
  action: AuditAction;
  module: 'ACCOUNT' | 'CUSTOMER' | 'SYSTEM_ACCOUNT' | 'NOTE' | 'USER' | 'CONFIG' | 'AUTH';
  objectType: string;
  objectId: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
}

export interface IConfigCategory {
  id: string;
  code: string;
  name: string;
  group:
  | 'system'
  | 'supplier'
  | 'product'
  | 'account_level'
  | 'account_status'
  | 'customer_status'
  | 'account_type'
  | 'ott_app'
  | 'note_type'
  | 'general';
  sortOrder?: number;
  systems?: string[];
}
