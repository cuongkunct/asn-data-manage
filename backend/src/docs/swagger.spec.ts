export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'ASM Data Management - Full RESTful API Documentation',
    version: '1.0.0',
    description: `
### Tài liệu Toàn bộ API Hệ Thống Quản Lý Dữ Liệu ASM
Hệ thống cung cấp đầy đủ các API quản lý Khách hàng, Tài khoản, Hệ thống tài khoản, Quản lý hộ, Ghi chú, Cấu hình danh mục, Thống kê Dashboard, Tra cứu tổng quan, Phân quyền người dùng và Nhật ký thao tác.

#### Hướng dẫn Xác thực (Authorize):
1. **Lấy Token**: Chạy API \`POST /api/auth/login\` với thông tin đăng nhập quản trị viên.
2. **Authorize**: Nhấn nút **Authorize 🔓** (màu xanh lá góc trên bên phải), dán mã \`token\` vào ô Value và bấm Authorize.
3. **Thử nghiệm (Try it out)**: Mọi API bên dưới đều có thể gọi trực tiếp trên giao diện với dữ liệu mẫu chuẩn hóa.
    `,
    contact: {
      name: 'ASM Development & Engineering',
      email: 'dev@asm-manage.local'
    }
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Local Backend Server'
    },
    {
      url: '/',
      description: 'Current Origin Server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Dán JWT Token nhận được từ API /api/auth/login (không cần thêm chữ Bearer)'
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Thông báo lỗi chi tiết' }
        }
      },
      SuccessMessageResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Thao tác thành công.' }
        }
      },
      // AUTH
      LoginDto: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'admin' },
          password: { type: 'string', example: '123456' }
        }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          user: {
            type: 'object',
            properties: {
              _id: { type: 'string', example: '6707f1a8c9b20e11894b1234' },
              username: { type: 'string', example: 'admin' },
              fullName: { type: 'string', example: 'Administrator' },
              role: { type: 'string', example: 'SUPER_ADMIN' },
              department: { type: 'string', example: 'IT & Security' }
            }
          }
        }
      },
      // CUSTOMERS
      CreateCustomerDto: {
        type: 'object',
        required: ['customerCode'],
        properties: {
          customerCode: {
            type: 'string',
            description: 'Mã khách hàng duy nhất (tự động uppercase & trim)',
            example: 'CUS_VIP01'
          },
          parentId: {
            type: 'string',
            nullable: true,
            description: 'MongoDB ObjectId của khách hàng cấp trên (nếu có, không có để trống hoặc null)',
            example: '6732f1a8c9b20e11894b1234'
          },
          status: {
            type: 'string',
            description: 'Trạng thái khách hàng (từ cấu hình customer_status)',
            example: 'ACTIVE'
          },
          level: {
            type: 'string',
            description: 'Cấp độ khách hàng (điền 1 lưu 1 nhưng UI hiển thị 1-0, điền 2 hiển thị 2-1)',
            example: '1'
          },
          ottApps: {
            type: 'array',
            items: { type: 'string' },
            description: 'Danh sách ứng dụng OTT liên lạc',
            example: ['Telegram', 'Zalo']
          },
          manageOnBehalf: {
            type: 'boolean',
            description: 'Có thuộc diện Quản Lý Hộ (QLH) không',
            example: false
          },
          notes: {
            type: 'string',
            description: 'Ghi chú hoặc thông tin chi tiết',
            example: 'Khách hàng VIP khu vực miền Bắc'
          }
        }
      },
      Customer: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6732f1a8c9b20e11894b1234' },
          customerCode: { type: 'string', example: 'CUS_VIP01' },
          parentId: { type: 'string', nullable: true, example: null },
          parentCustomerId: { type: 'string', nullable: true, example: null },
          status: { type: 'string', example: 'ACTIVE' },
          level: { type: 'string', example: '1' },
          ottApps: { type: 'array', items: { type: 'string' }, example: ['Telegram'] },
          manageOnBehalf: { type: 'boolean', example: false },
          notes: { type: 'string', example: 'Khách hàng gốc' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      // ACCOUNTS
      CreateAccountDto: {
        type: 'object',
        required: ['customerCode', 'accountName'],
        properties: {
          accountId: { type: 'string', example: 'ACC_1001' },
          accountName: { type: 'string', example: 'VIVA_ADMIN_01', description: 'Tên tài khoản (tự động UPPERCASE)' },
          loginName: { type: 'string', example: 'admin_viva_user', description: 'Tên đăng nhập (giữ nguyên mẫu chữ hoa/thường)' },
          password: { type: 'string', example: 'SecurePass@2026' },
          code: { type: 'string', example: 'VIV01' },
          customerCode: { type: 'string', example: 'CUS_VIP01', description: 'Mã khách hàng (tự động UPPERCASE)' },
          systemId: { type: 'string', example: 'VIVA88' },
          supplierId: { type: 'string', example: 'C9' },
          productId: { type: 'string', example: 'SPORTBOOKS' },
          accountType: { type: 'string', example: 'REGULAR' },
          status: { type: 'string', example: 'ACTIVE' },
          accountLevel: { type: 'string', example: 'LEVEL_1' },
          managedBy: { type: 'string', example: 'Admin User' },
          cutRetail: { type: 'string', example: 'All' },
          notes: { type: 'string', example: 'Tài khoản chính đại lý' },
          subAccounts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                subName: { type: 'string', example: 'Sub 01' },
                username: { type: 'string', example: 'SUB_01' },
                password: { type: 'string', example: 'Pass@123' }
              }
            }
          }
        }
      },
      // SYSTEM ACCOUNTS
      CreateSystemAccountDto: {
        type: 'object',
        required: ['systemUsername'],
        properties: {
          systemAccountId: { type: 'string', example: 'SYSACC_001' },
          systemUsername: { type: 'string', example: 'NODE_MASTER_01' },
          customerCode: { type: 'string', example: 'CUS_VIP01' },
          parentCustomerId: { type: 'string', example: '' },
          parentAccountId: { type: 'string', nullable: true, example: null },
          systemId: { type: 'string', example: 'VIVA88' },
          supplierId: { type: 'string', example: 'C9' },
          productId: { type: 'string', example: 'SPORTBOOKS' },
          accountLevel: { type: 'string', example: 'Super' },
          accountType: { type: 'string', example: 'REGULAR' },
          status: { type: 'string', example: 'ACTIVE' },
          notes: { type: 'string', example: 'Tài khoản hệ thống phân cấp' }
        }
      },
      // QUAN LY HO
      CreateQLHAccountDto: {
        type: 'object',
        required: ['customerCode', 'accountName'],
        properties: {
          accountId: { type: 'string', example: 'QLH_001' },
          accountName: { type: 'string', example: 'QLH_AGENT_01' },
          loginName: { type: 'string', example: 'qlh_login_name', description: 'Giữ nguyên mẫu hoa thường' },
          code: { type: 'string', example: 'QLH01' },
          password: { type: 'string', example: 'QLHPass@2026' },
          customerCode: { type: 'string', example: 'CUS_VIP01' },
          systemId: { type: 'string', example: 'VIVA88' },
          supplierId: { type: 'string', example: 'C9' },
          productId: { type: 'string', example: 'SPORTBOOKS' },
          accountType: { type: 'string', example: 'QLH' },
          status: { type: 'string', example: 'ACTIVE' },
          accountLevel: { type: 'string', example: 'Agent' },
          managedBy: { type: 'string', example: 'Công Ty' },
          cutRetail: { type: 'string', example: 'All' },
          notes: { type: 'string', example: 'Quản lý hộ theo hợp đồng' }
        }
      },
      // NOTES
      CreateNoteDto: {
        type: 'object',
        required: ['customerCode', 'content'],
        properties: {
          customerCode: { type: 'string', example: 'CUS_VIP01' },
          applicableCustomer: { type: 'string', example: 'ALL', description: 'Mã khách hàng áp dụng hoặc ALL' },
          accountId: { type: 'string', example: 'ACC_1001' },
          noteType: { type: 'string', example: 'TEXT' },
          content: { type: 'string', example: 'Ghi chú quan trọng về hạn mức thanh toán tuần' }
        }
      },
      // CONFIGS
      CreateConfigDto: {
        type: 'object',
        required: ['code', 'name', 'group'],
        properties: {
          code: { type: 'string', example: 'ACTIVE' },
          name: { type: 'string', example: 'Hoạt động' },
          group: {
            type: 'string',
            enum: ['customer_status', 'account_status', 'product', 'supplier', 'system', 'account_level', 'account_type', 'ott_app', 'note_type'],
            example: 'customer_status'
          },
          sortOrder: { type: 'integer', example: 1 },
          systems: { type: 'array', items: { type: 'string' }, example: ['VIVA88'] }
        }
      },
      // USERS
      CreateUserDto: {
        type: 'object',
        required: ['username', 'password', 'fullName', 'email', 'role'],
        properties: {
          username: { type: 'string', example: 'operator_01' },
          password: { type: 'string', example: 'StrongP@ss2026' },
          fullName: { type: 'string', example: 'Nguyen Van A' },
          email: { type: 'string', example: 'operator01@asm.vn' },
          role: { type: 'string', enum: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'], example: 'OPERATOR' },
          department: { type: 'string', example: 'Vận hành' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], example: 'ACTIVE' }
        }
      },
      // UTILITY
      GeneratePasswordDto: {
        type: 'object',
        properties: {
          length: { type: 'integer', default: 12, example: 12 },
          special: { type: 'boolean', default: true, example: true },
          includeUpper: { type: 'boolean', default: true, example: true },
          includeLower: { type: 'boolean', default: true, example: true },
          includeDigits: { type: 'boolean', default: true, example: true }
        }
      },
      DeleteSystemPreviewDto: {
        type: 'object',
        required: ['type', 'value'],
        properties: {
          type: { type: 'string', enum: ['SYSTEM', 'SUPPLIER'], example: 'SYSTEM' },
          value: { type: 'string', example: 'VIVA88' }
        }
      },
      DeleteSystemExecuteDto: {
        type: 'object',
        required: ['type', 'value'],
        properties: {
          type: { type: 'string', enum: ['SYSTEM', 'SUPPLIER'], example: 'SYSTEM' },
          value: { type: 'string', example: 'VIVA88' }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  tags: [
    { name: 'Auth', description: 'Xác thực, Đăng nhập, Phiên làm việc' },
    { name: 'Customers', description: 'Quản lý Khách hàng & Cây phân cấp (Tree View)' },
    { name: 'Accounts', description: 'Danh sách Tài khoản, Mật khẩu & Xóa HT' },
    { name: 'System Accounts', description: 'Hệ thống Tài khoản & Cấu trúc phân cấp Node' },
    { name: 'Quản Lý Hộ', description: 'Quản lý Hộ & Cắt lẻ' },
    { name: 'Notes', description: 'Ghi chú Khách hàng theo phân cấp' },
    { name: 'Configs', description: 'Cấu hình Danh mục chung toàn hệ thống' },
    { name: 'Dashboard', description: 'Thống kê Tổng hợp & Số liệu Realtime' },
    { name: 'Overview', description: 'Tra cứu Thông tin Chi tiết Đa tầng' },
    { name: 'Users', description: 'Quản lý Người dùng & Phân quyền' },
    { name: 'History', description: 'Nhật ký Hoạt động (Audit History)' }
  ],
  paths: {
    // ── AUTH ──
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Đăng nhập hệ thống để nhận Bearer JWT Token',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginDto' } } }
        },
        responses: {
          200: { description: 'Đăng nhập thành công', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          400: { description: 'Thiếu username hoặc mật khẩu', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { description: 'Sai tài khoản hoặc mật khẩu', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Lấy thông tin tài khoản hiện tại',
        responses: {
          200: { description: 'Thông tin tài khoản và quyền hạn' },
          401: { description: 'Chưa xác thực hoặc token không hợp lệ' }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Đăng xuất khỏi hệ thống',
        responses: {
          200: { description: 'Đăng xuất thành công' }
        }
      }
    },

    // ── CUSTOMERS ──
    '/api/customers': {
      get: {
        tags: ['Customers'],
        summary: 'Lấy danh sách khách hàng (Lọc, tìm kiếm, phân trang)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Số trang' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 }, description: 'Số dòng / trang' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Tìm theo Mã KH, Cấp trên, Ghi chú' },
          { name: 'customer_code', in: 'query', schema: { type: 'string' }, description: 'Lọc chính xác theo Mã KH' },
          { name: 'parent_customer_id', in: 'query', schema: { type: 'string' }, description: 'Lọc theo Cấp trên' },
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Lọc theo trạng thái (từ cấu hình)' },
          { name: 'level', in: 'query', schema: { type: 'string' }, description: 'Lọc theo cấp độ (1, 2, 0...)' },
          { name: 'qlh', in: 'query', schema: { type: 'string', enum: ['ALL', 'YES', 'NO'] }, description: 'Lọc Quản Lý Hộ' }
        ],
        responses: {
          200: { description: 'Danh sách khách hàng' }
        }
      },
      post: {
        tags: ['Customers'],
        summary: 'Tạo khách hàng mới (Đồng bộ ID MongoDB cho Cấp trên)',
        description: `
Quy tắc xử lý độc lập tại backend:
- **customerCode**: Tự động uppercase, loại bỏ khoảng trắng, kiểm tra chống trùng lặp.
- **parentId**: ID Mongo (ObjectId) của khách hàng cấp trên (nếu có, không có để trống hoặc null). Bỏ trường parentCustomerId.
- **status**: Trạng thái lấy từ cấu hình \`customer_status\`.
- **level**: Chuẩn hóa cấp độ (VD nhập 1 lưu 1, hiển thị 1-0; nhập 2 lưu 2, hiển thị 2-1).
        `,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCustomerDto' } } }
        },
        responses: {
          201: { description: 'Tạo khách hàng thành công', content: { 'application/json': { schema: { $ref: '#/components/schemas/Customer' } } } },
          400: { description: 'Lỗi xác thực dữ liệu hoặc trùng mã', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/api/customers/{id}': {
      get: {
        tags: ['Customers'],
        summary: 'Xem chi tiết khách hàng theo Mongo _id hoặc Mã KH',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'MongoDB ObjectId hoặc Mã khách hàng' }],
        responses: {
          200: { description: 'Thông tin chi tiết' },
          404: { description: 'Khách hàng không tồn tại' }
        }
      },
      put: {
        tags: ['Customers'],
        summary: 'Cập nhật khách hàng theo Mongo _id hoặc Mã KH',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCustomerDto' } } }
        },
        responses: {
          200: { description: 'Cập nhật thành công' },
          400: { description: 'Dữ liệu không hợp lệ' },
          404: { description: 'Không tìm thấy khách hàng' }
        }
      },
      delete: {
        tags: ['Customers'],
        summary: 'Xóa khách hàng theo Mongo _id hoặc Mã KH (Tự động giải phóng con)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Xóa thành công' },
          404: { description: 'Không tìm thấy khách hàng' }
        }
      }
    },

    // ── ACCOUNTS ──
    '/api/accounts': {
      get: {
        tags: ['Accounts'],
        summary: 'Lấy danh sách tài khoản (Hỗ trợ lọc đa điều kiện)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'customer_code', in: 'query', schema: { type: 'string' } },
          { name: 'system_id', in: 'query', schema: { type: 'string' } },
          { name: 'supplier_id', in: 'query', schema: { type: 'string' } },
          { name: 'product_id', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'managed_by', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Danh sách tài khoản' } }
      },
      post: {
        tags: ['Accounts'],
        summary: 'Tạo tài khoản mới (Mã KH & Tên TK uppercase, Login Name giữ nguyên mẫu)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateAccountDto' } } }
        },
        responses: {
          201: { description: 'Tạo tài khoản thành công' },
          400: { description: 'Lỗi xác thực hoặc trùng tên tài khoản' }
        }
      }
    },
    '/api/accounts/{id}': {
      get: {
        tags: ['Accounts'],
        summary: 'Xem chi tiết tài khoản theo accountId',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Chi tiết tài khoản' }, 404: { description: 'Không tìm thấy' } }
      },
      put: {
        tags: ['Accounts'],
        summary: 'Cập nhật tài khoản (Login Name giữ nguyên mẫu)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateAccountDto' } } }
        },
        responses: { 200: { description: 'Cập nhật thành công' }, 400: { description: 'Lỗi cập nhật' } }
      },
      delete: {
        tags: ['Accounts'],
        summary: 'Xóa tài khoản',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Xóa thành công' }, 404: { description: 'Không tìm thấy' } }
      }
    },
    '/api/accounts/generate-password': {
      post: {
        tags: ['Accounts'],
        summary: 'Tạo mật khẩu ngẫu nhiên bảo mật',
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/GeneratePasswordDto' } } }
        },
        responses: {
          200: {
            description: 'Mật khẩu được sinh thành công',
            content: { 'application/json': { schema: { type: 'object', properties: { password: { type: 'string', example: 'K#9xL@2mQ$8p' } } } } }
          }
        }
      }
    },
    '/api/accounts/{id}/reveal-password': {
      post: {
        tags: ['Accounts'],
        summary: 'Xem mật khẩu tài khoản và ghi nhận nhật ký bảo mật',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Trả về mật khẩu kèm ghi nhận audit',
            content: { 'application/json': { schema: { type: 'object', properties: { password: { type: 'string' }, accountId: { type: 'string' } } } } }
          }
        }
      }
    },
    '/api/accounts/delete-system/options': {
      get: {
        tags: ['Accounts'],
        summary: 'Lấy danh sách các Hệ Thống và Nhà Cung Cấp cho tính năng Xóa HT',
        responses: {
          200: {
            description: 'Danh sách systems và suppliers',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    systems: { type: 'array', items: { type: 'string' }, example: ['VIVA88', 'SBOBET'] },
                    suppliers: { type: 'array', items: { type: 'string' }, example: ['C9', 'GLOBAL'] }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/accounts/delete-system/preview': {
      post: {
        tags: ['Accounts'],
        summary: 'Xem trước số lượng tài khoản sẽ bị xóa theo Hệ thống hoặc Nhà cung cấp',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DeleteSystemPreviewDto' } } }
        },
        responses: {
          200: {
            description: 'Số lượng và danh sách xem trước',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer', example: 15 },
                    systemAccountsCount: { type: 'integer', example: 5 },
                    accountsCount: { type: 'integer', example: 8 },
                    qlhCount: { type: 'integer', example: 2 }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/accounts/delete-system': {
      post: {
        tags: ['Accounts'],
        summary: 'Thực hiện xóa toàn bộ tài khoản thuộc Hệ thống hoặc Nhà cung cấp trên cả 3 trang',
        description: 'Xóa đồng bộ tài khoản có liên quan ở Hệ thống tài khoản, Danh sách tài khoản, và Quản lý hộ.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DeleteSystemExecuteDto' } } }
        },
        responses: {
          200: { description: 'Đã xóa toàn bộ tài khoản thành công' },
          400: { description: 'Lỗi thực thi xóa' }
        }
      }
    },

    // ── SYSTEM ACCOUNTS ──
    '/api/system-accounts': {
      get: {
        tags: ['System Accounts'],
        summary: 'Lấy danh sách hệ thống tài khoản',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'system_id', in: 'query', schema: { type: 'string' } },
          { name: 'supplier_id', in: 'query', schema: { type: 'string' } },
          { name: 'customer_code', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Danh sách hệ thống tài khoản' } }
      },
      post: {
        tags: ['System Accounts'],
        summary: 'Tạo tài khoản hệ thống mới',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateSystemAccountDto' } } }
        },
        responses: { 201: { description: 'Tạo thành công' }, 400: { description: 'Lỗi dữ liệu' } }
      }
    },
    '/api/system-accounts/tree': {
      get: {
        tags: ['System Accounts'],
        summary: 'Lấy cấu trúc cây phân cấp (Tree Hierarchy) của Hệ thống tài khoản',
        responses: { 200: { description: 'Cấu trúc cây tài khoản' } }
      }
    },
    '/api/system-accounts/{id}': {
      put: {
        tags: ['System Accounts'],
        summary: 'Cập nhật tài khoản hệ thống',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateSystemAccountDto' } } }
        },
        responses: { 200: { description: 'Cập nhật thành công' } }
      },
      delete: {
        tags: ['System Accounts'],
        summary: 'Xóa tài khoản hệ thống',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Xóa thành công' } }
      }
    },

    // ── QUAN LY HO ──
    '/api/quan-ly-ho': {
      get: {
        tags: ['Quản Lý Hộ'],
        summary: 'Lấy danh sách tài khoản Quản Lý Hộ (hỗ trợ tab QLH và QLH Cắt Lẻ)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'search_account', in: 'query', schema: { type: 'string' } },
          { name: 'system_id', in: 'query', schema: { type: 'string' } },
          { name: 'tab', in: 'query', schema: { type: 'string', enum: ['qlh', 'qlh_cat_le'] } }
        ],
        responses: { 200: { description: 'Danh sách tài khoản QLH' } }
      },
      post: {
        tags: ['Quản Lý Hộ'],
        summary: 'Tạo tài khoản Quản Lý Hộ (Login Name giữ nguyên mẫu)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateQLHAccountDto' } } }
        },
        responses: { 201: { description: 'Tạo thành công' }, 400: { description: 'Lỗi tạo tài khoản QLH' } }
      }
    },
    '/api/quan-ly-ho/{id}': {
      get: {
        tags: ['Quản Lý Hộ'],
        summary: 'Xem chi tiết tài khoản QLH',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Chi tiết QLH' }, 404: { description: 'Không tìm thấy' } }
      },
      put: {
        tags: ['Quản Lý Hộ'],
        summary: 'Cập nhật tài khoản QLH',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateQLHAccountDto' } } }
        },
        responses: { 200: { description: 'Cập nhật thành công' } }
      },
      delete: {
        tags: ['Quản Lý Hộ'],
        summary: 'Xóa tài khoản QLH',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Xóa thành công' } }
      }
    },
    '/api/quan-ly-ho/generate-password': {
      post: {
        tags: ['Quản Lý Hộ'],
        summary: 'Sinh mật khẩu ngẫu nhiên cho QLH',
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/GeneratePasswordDto' } } }
        },
        responses: {
          200: { description: 'Mật khẩu ngẫu nhiên' }
        }
      }
    },

    // ── NOTES ──
    '/api/notes': {
      get: {
        tags: ['Notes'],
        summary: 'Lấy danh sách ghi chú khách hàng (Hỗ trợ lọc theo Mã KH và Khách hàng áp dụng)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } },
          { name: 'customer_code', in: 'query', schema: { type: 'string' } },
          { name: 'applicable_customer', in: 'query', schema: { type: 'string' } },
          { name: 'note_type', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Danh sách ghi chú' } }
      },
      post: {
        tags: ['Notes'],
        summary: 'Tạo ghi chú mới cho khách hàng',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateNoteDto' } } }
        },
        responses: { 201: { description: 'Tạo ghi chú thành công' }, 400: { description: 'Lỗi tạo ghi chú' } }
      }
    },
    '/api/notes/{id}': {
      put: {
        tags: ['Notes'],
        summary: 'Cập nhật ghi chú',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateNoteDto' } } }
        },
        responses: { 200: { description: 'Cập nhật thành công' } }
      },
      delete: {
        tags: ['Notes'],
        summary: 'Xóa ghi chú',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Xóa thành công' } }
      }
    },

    // ── CONFIGS ──
    '/api/configs': {
      get: {
        tags: ['Configs'],
        summary: 'Lấy danh mục cấu hình hệ thống (Nhóm theo customer_status, product, supplier...)',
        responses: {
          200: {
            description: 'Danh mục cấu hình grouped',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    raw: { type: 'array', items: { type: 'object' } },
                    grouped: { type: 'object' },
                    groups: { type: 'array', items: { type: 'object' } }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Configs'],
        summary: 'Thêm mục cấu hình mới (Trạng thái KH, Sản phẩm, NCC, Hệ thống...)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateConfigDto' } } }
        },
        responses: { 201: { description: 'Tạo thành công' }, 400: { description: 'Thiếu thông tin bắt buộc' } }
      }
    },
    '/api/configs/{id}': {
      put: {
        tags: ['Configs'],
        summary: 'Cập nhật mục cấu hình',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateConfigDto' } } }
        },
        responses: { 200: { description: 'Cập nhật thành công' } }
      },
      delete: {
        tags: ['Configs'],
        summary: 'Xóa mục cấu hình',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Xóa thành công' } }
      }
    },

    // ── DASHBOARD ──
    '/api/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        summary: 'Lấy số liệu tổng hợp Dashboard thời gian thực',
        parameters: [
          { name: 'period', in: 'query', schema: { type: 'string', enum: ['this_week', 'last_week', 'this_month', 'last_month', 'custom', 'all'], default: 'this_week' } },
          { name: 'startDate', in: 'query', schema: { type: 'string' } },
          { name: 'endDate', in: 'query', schema: { type: 'string' } },
          { name: 'agentPrefix', in: 'query', schema: { type: 'string' } },
          { name: 'supplierId', in: 'query', schema: { type: 'string' } },
          { name: 'banker', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: {
            description: 'Dữ liệu thống kê metrics, top accounts, supplier chart',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    metrics: { type: 'object' },
                    recentAccounts: { type: 'array', items: { type: 'object' } },
                    suppliersBreakdown: { type: 'array', items: { type: 'object' } }
                  }
                }
              }
            }
          }
        }
      }
    },

    // ── OVERVIEW ──
    '/api/overview/suggestions': {
      get: {
        tags: ['Overview'],
        summary: 'Gợi ý tìm kiếm autocomplete cho ô tra cứu Tổng Quan',
        parameters: [{ name: 'q', in: 'query', schema: { type: 'string' }, description: 'Ký tự gõ vào' }],
        responses: {
          200: {
            description: 'Danh sách gợi ý khách hàng và tài khoản',
            content: { 'application/json': { schema: { type: 'array', items: { type: 'object' } } } }
          }
        }
      }
    },
    '/api/overview/lookup': {
      get: {
        tags: ['Overview'],
        summary: 'Tra cứu đa chiều tổng thể hồ sơ Khách hàng và các Tài khoản liên kết',
        parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Mã KH hoặc Tên tài khoản' }],
        responses: {
          200: {
            description: 'Hồ sơ đầy đủ gồm Thông tin KH, Tài khoản liên kết, Hệ thống tài khoản, Ghi chú',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    customer: { $ref: '#/components/schemas/Customer' },
                    accounts: { type: 'array', items: { type: 'object' } },
                    systemAccounts: { type: 'array', items: { type: 'object' } },
                    notes: { type: 'array', items: { type: 'object' } }
                  }
                }
              }
            }
          }
        }
      }
    },

    // ── USERS ──
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'Lấy danh sách người dùng hệ thống (Yêu cầu quyền Quản trị)',
        responses: { 200: { description: 'Danh sách người dùng' } }
      },
      post: {
        tags: ['Users'],
        summary: 'Tạo tài khoản người dùng mới',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUserDto' } } }
        },
        responses: { 201: { description: 'Tạo người dùng thành công' }, 400: { description: 'Trùng username hoặc thiếu dữ liệu' } }
      }
    },
    '/api/users/{id}': {
      put: {
        tags: ['Users'],
        summary: 'Cập nhật thông tin người dùng',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUserDto' } } }
        },
        responses: { 200: { description: 'Cập nhật thành công' } }
      },
      delete: {
        tags: ['Users'],
        summary: 'Xóa người dùng khỏi hệ thống',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Xóa thành công' } }
      }
    },

    // ── HISTORY ──
    '/api/history': {
      get: {
        tags: ['History'],
        summary: 'Lấy danh sách lịch sử thao tác và Audit Log toàn hệ thống',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'module', in: 'query', schema: { type: 'string', enum: ['ACCOUNT', 'CUSTOMER', 'SYSTEM_ACCOUNT', 'NOTE', 'USER', 'CONFIG', 'AUTH'] } },
          { name: 'action', in: 'query', schema: { type: 'string' } },
          { name: 'objectId', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Lịch sử thao tác' } }
      }
    }
  }
};
