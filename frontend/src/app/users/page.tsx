'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, Search, RefreshCw, Edit3, Trash2, 
  CheckCircle2, XCircle, Key, Lock, Mail, Building, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/authContext';

interface UserItem {
  _id?: string;
  username: string;
  fullName: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
  department?: string;
  status: 'ACTIVE' | 'INACTIVE';
  lastLoginAt?: string;
  createdAt?: string;
}

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' },
  ADMIN: { label: 'Admin', bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
  MANAGER: { label: 'Manager', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  OPERATOR: { label: 'Operator', bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  VIEWER: { label: 'Viewer', bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/30' },
};

export default function UsersPage() {
  const { authFetch } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    role: 'OPERATOR' as UserItem['role'],
    department: 'Vận Hành',
    status: 'ACTIVE' as UserItem['status']
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Delete Confirm State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách người dùng:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      fullName: '',
      email: '',
      role: 'OPERATOR',
      department: 'Vận Hành',
      status: 'ACTIVE'
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: UserItem) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      password: '',
      fullName: u.fullName,
      email: u.email || '',
      role: u.role,
      department: u.department || 'Vận Hành',
      status: u.status
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      if (editingUser) {
        // Edit User
        const payload: any = {
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          status: formData.status
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }

        const res = await authFetch(`/api/users/${editingUser._id || editingUser.username}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          let errText = 'Lỗi khi cập nhật người dùng';
          try {
            const errData = await res.json();
            errText = errData.message || errText;
          } catch (e) {
            errText = `Lỗi hệ thống (${res.status}): ${res.statusText || 'Phản hồi không hợp lệ'}`;
          }
          throw new Error(errText);
        }
      } else {
        // Create User
        if (!formData.username.trim() || !formData.password.trim() || !formData.fullName.trim()) {
          throw new Error('Vui lòng điền đầy đủ Tên đăng nhập, Mật khẩu và Họ tên.');
        }

        const res = await authFetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!res.ok) {
          let errText = 'Lỗi khi tạo người dùng';
          try {
            const errData = await res.json();
            errText = errData.message || errText;
          } catch (e) {
            errText = `Lỗi hệ thống (${res.status}): ${res.statusText || 'Phản hồi không hợp lệ'}`;
          }
          throw new Error(errText);
        }
      }

      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(users.filter(u => u._id !== id && u.username !== id));
      }
    } catch (err) {
      console.error('Lỗi khi xóa người dùng:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = 
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  const totalCount = users.length;
  const activeCount = users.filter(u => u.status === 'ACTIVE').length;
  const adminCount = users.filter(u => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN').length;
  const operatorCount = users.filter(u => u.role === 'OPERATOR' || u.role === 'MANAGER').length;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Quản Lý Người Dùng & Phân Quyền
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">
                RBAC System
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Quản lý danh sách tài khoản, gán vai trò truy cập và kiểm soát trạng thái hoạt động
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm Người Dùng</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng Tài Khoản</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-between p-2.5 text-slate-600 dark:text-slate-300">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-slate-500 font-medium">Đang Hoạt Động</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-slate-500 font-medium">Quản Quản Lí / Admin</p>
            <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{adminCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-slate-500 font-medium">Vận Hành / Chuyên Viên</p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{operatorCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên đăng nhập, họ tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-slate-900 dark:text-white"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="OPERATOR">Operator</option>
            <option value="VIEWER">Viewer</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Khóa / Ngừng</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
            <p className="text-xs text-slate-500">Đang tải danh sách người dùng...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Không tìm thấy người dùng nào</p>
            <p className="text-xs text-slate-400">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Tài khoản</th>
                  <th className="py-3.5 px-4">Họ và tên</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Phòng ban</th>
                  <th className="py-3.5 px-4">Vai trò (RBAC)</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4">Ngày tạo</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredUsers.map((u) => {
                  const roleStyle = ROLE_CONFIG[u.role] || ROLE_CONFIG.OPERATOR;
                  return (
                    <tr key={u._id || u.username} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center text-xs">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <span>{u.username}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {u.fullName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {u.email || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {u.department || 'Vận Hành'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                          <Shield className="w-3 h-3" />
                          {roleStyle.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {u.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                            <XCircle className="w-3 h-3" />
                            Khóa
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {deletingId === (u._id || u.username) ? (
                            <div className="flex items-center gap-1 bg-rose-500/10 p-1 rounded-lg">
                              <button
                                onClick={() => handleDelete(u._id || u.username)}
                                className="px-2 py-0.5 bg-rose-500 text-white font-bold text-[10px] rounded hover:bg-rose-600"
                              >
                                Xóa
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] rounded"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingId(u._id || u.username)}
                              className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                              title="Xóa tài khoản"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <span>{editingUser ? 'Cập Nhật Tài Khoản' : 'Thêm Người Dùng Mới'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên đăng nhập *
                  </label>
                  <input
                    type="text"
                    disabled={!!editingUser}
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="ví dụ: admin01"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mật khẩu {editingUser ? '(bỏ trống nếu giữ nguyên)' : '*'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? '••••••••' : 'Nhập mật khẩu'}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="ví dụ: Nguyễn Văn A"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@asm.vn"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phòng ban
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Vận Hành, Kế Toán..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vai trò (RBAC Role)
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserItem['role'] })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="OPERATOR">Operator</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as UserItem['status'] })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    <option value="ACTIVE">Hoạt động (Active)</option>
                    <option value="INACTIVE">Khóa tài khoản (Inactive)</option>
                  </select>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : editingUser ? 'Cập Nhật' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
