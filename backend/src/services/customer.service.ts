import mongoose from 'mongoose';
import { CustomerModel } from '../database/db';
import { ICustomer, CreateCustomerDto, UpdateCustomerDto } from '../types';
import { HistoryService } from './history.service';
import { wsManager } from '../websocket/gateway';
import {
  normalizeUpper,
  normalizeCustomerLevel,
  caseInsensitiveExact
} from '../utils/normalize';

export class CustomerService {
  /**
   * Tạo khách hàng mới chuẩn cấu trúc:
   * - customerCode: Bắt buộc, chuẩn hóa UPPERCASE, kiểm tra trùng lặp
   * - parentId: Nhận MongoDB ObjectId của khách hàng cấp trên (hoặc Mã KH), đồng bộ ID Mongo vào DB
   * - status: Trạng thái (ACTIVE, INACTIVE, CLOSED...)
   * - level: Cấp độ khách hàng (chuẩn hóa số nguyên 1, 0, 2...)
   * - ottApps: Danh sách ứng dụng OTT (Telegram, Zalo, Viber...)
   * - manageOnBehalf: Quản lý hộ (boolean)
   * - notes: Ghi chú / thông tin chi tiết
   */
  static async createCustomer(
    payload: CreateCustomerDto,
    userContext?: { userId?: string; userName?: string }
  ): Promise<ICustomer> {
    const rawCode = payload.customerCode;
    const code = normalizeUpper(rawCode);

    if (!code) {
      throw new Error('Mã khách hàng là thông tin bắt buộc.');
    }

    // 1. Kiểm tra trùng lặp Mã KH (Case-insensitive)
    const existing = await CustomerModel.findOne({
      customerCode: caseInsensitiveExact(code)
    }).lean();
    if (existing) {
      throw new Error(`Mã khách hàng "${code}" đã tồn tại trên hệ thống.`);
    }

    // 2. Xử lý Cấp trên (Nhận MongoDB ObjectId qua parentId hoặc Mã KH)
    let parentDoc: any = null;
    const rawParent = (payload.parentId || '').toString().trim();

    if (rawParent && rawParent.toLowerCase() !== 'cty') {
      const isMongoId = mongoose.Types.ObjectId.isValid(rawParent);
      const parentFilter = isMongoId
        ? { $or: [{ _id: rawParent }, { customerCode: caseInsensitiveExact(rawParent) }] }
        : { customerCode: caseInsensitiveExact(rawParent) };

      parentDoc = await CustomerModel.findOne(parentFilter).lean();
      if (!parentDoc) {
        throw new Error(`Khách hàng cấp trên "${rawParent}" không tồn tại trong hệ thống.`);
      }

      // Ngăn chặn tham chiếu vòng tròn
      if (parentDoc.customerCode.toUpperCase() === code) {
        throw new Error('Khách hàng không thể tự làm cấp trên của chính mình.');
      }
    }

    // 3. Chuẩn hóa các trường thông tin
    const finalParentId = parentDoc ? parentDoc._id : null;
    const finalParentCustomerId = parentDoc ? parentDoc.customerCode : null;

    let ottAppsList: string[] = ['Telegram'];
    if (Array.isArray(payload.ottApps)) {
      ottAppsList = payload.ottApps.map(a => String(a).trim()).filter(Boolean);
    } else if (typeof payload.ottApps === 'string' && payload.ottApps.trim()) {
      ottAppsList = [payload.ottApps.trim()];
    }
    if (ottAppsList.length === 0) ottAppsList = ['Telegram'];

    const newCustData: ICustomer = {
      customerCode: code,
      parentId: finalParentId,
      parentCustomerId: finalParentCustomerId,
      status: (payload.status || 'ACTIVE').trim().toUpperCase(),
      level: normalizeCustomerLevel(payload.level),
      ottApps: ottAppsList,
      manageOnBehalf: Boolean(payload.manageOnBehalf),
      notes: (payload.notes || '').trim()
    };

    // 4. Lưu vào Database MongoDB
    const doc = await CustomerModel.create(newCustData);
    const createdObj = doc.toObject() as ICustomer;

    // 5. Ghi nhật ký hệ thống (Audit History)
    await HistoryService.logAction({
      userId: userContext?.userId || 'system',
      userName: userContext?.userName || 'System',
      action: 'CREATE',
      module: 'CUSTOMER',
      objectType: 'Customer',
      objectId: code,
      newData: createdObj
    });

    // 6. Phát sự kiện WebSocket Realtime
    wsManager.broadcast('customer.created', createdObj);
    wsManager.broadcast('customer.created', createdObj, `customer:${code}`);

    return createdObj;
  }

  /**
   * Cập nhật thông tin khách hàng
   */
  static async updateCustomer(
    idOrCode: string,
    payload: UpdateCustomerDto,
    userContext?: { userId?: string; userName?: string }
  ): Promise<ICustomer> {
    const isObjId = mongoose.Types.ObjectId.isValid(idOrCode);
    const filter = isObjId
      ? { $or: [{ _id: idOrCode }, { customerCode: caseInsensitiveExact(idOrCode) }] }
      : { customerCode: caseInsensitiveExact(idOrCode) };

    const existingCust = await CustomerModel.findOne(filter);
    if (!existingCust) {
      throw new Error('Khách hàng không tồn tại trong hệ thống.');
    }

    // 1. Kiểm tra Mã KH mới nếu thay đổi
    let updatedCustCode = existingCust.customerCode;
    if (payload.customerCode !== undefined) {
      const newCode = normalizeUpper(payload.customerCode);
      if (newCode && newCode.toLowerCase() !== existingCust.customerCode.toLowerCase()) {
        const dup = await CustomerModel.findOne({
          _id: { $ne: existingCust._id },
          customerCode: caseInsensitiveExact(newCode)
        }).lean();
        if (dup) {
          throw new Error(`Mã khách hàng "${newCode}" đã tồn tại.`);
        }
        updatedCustCode = newCode;
      }
    }

    // 2. Xử lý cập nhật Cấp trên
    let finalParentId = existingCust.parentId;
    let finalParentCustomerId = existingCust.parentCustomerId;

    if (payload.parentId !== undefined || payload.parentCustomerId !== undefined) {
      const rawParent = (payload.parentId !== undefined ? payload.parentId : payload.parentCustomerId || '').toString().trim();
      if (!rawParent || rawParent.toLowerCase() === 'cty') {
        finalParentId = null;
        finalParentCustomerId = null;
      } else {
        const isMongoId = mongoose.Types.ObjectId.isValid(rawParent);
        const pFilter = isMongoId
          ? { $or: [{ _id: rawParent }, { customerCode: caseInsensitiveExact(rawParent) }] }
          : { customerCode: caseInsensitiveExact(rawParent) };

        const pDoc = await CustomerModel.findOne(pFilter).lean();
        if (!pDoc) {
          throw new Error(`Khách hàng cấp trên "${rawParent}" không tồn tại.`);
        }
        if (String(pDoc._id) === String(existingCust._id) || pDoc.customerCode.toUpperCase() === updatedCustCode) {
          throw new Error('Khách hàng không thể làm cấp trên của chính mình.');
        }
        finalParentId = pDoc._id;
        finalParentCustomerId = pDoc.customerCode;
      }
    }

    // 3. Chuẩn hóa OTT Apps nếu có truyền
    let ottAppsList = existingCust.ottApps;
    if (payload.ottApps !== undefined) {
      if (Array.isArray(payload.ottApps)) {
        ottAppsList = payload.ottApps.map(a => String(a).trim()).filter(Boolean);
      } else if (typeof payload.ottApps === 'string' && payload.ottApps.trim()) {
        ottAppsList = [payload.ottApps.trim()];
      }
      if (ottAppsList.length === 0) ottAppsList = ['Telegram'];
    }

    const updatedData: any = {
      ...existingCust.toObject(),
      ...payload,
      customerCode: updatedCustCode,
      parentId: finalParentId,
      parentCustomerId: finalParentCustomerId,
      ...(payload.status !== undefined && { status: payload.status.trim().toUpperCase() }),
      ...(payload.level !== undefined && { level: normalizeCustomerLevel(payload.level) }),
      ...(payload.manageOnBehalf !== undefined && { manageOnBehalf: Boolean(payload.manageOnBehalf) }),
      ...(payload.notes !== undefined && { notes: (payload.notes || '').trim() }),
      ottApps: ottAppsList,
      updatedAt: new Date()
    };

    await CustomerModel.updateOne({ _id: existingCust._id }, updatedData);

    await HistoryService.logAction({
      userId: userContext?.userId || 'system',
      userName: userContext?.userName || 'System',
      action: 'UPDATE',
      module: 'CUSTOMER',
      objectType: 'Customer',
      objectId: existingCust.customerCode,
      oldData: existingCust.toObject(),
      newData: updatedData
    });

    wsManager.broadcast('customer.updated', updatedData);
    wsManager.broadcast('customer.updated', updatedData, `customer:${existingCust.customerCode}`);

    return updatedData;
  }

  /**
   * Lấy chi tiết khách hàng theo Mongo ObjectId hoặc Mã KH
   */
  static async getCustomerById(idOrCode: string): Promise<ICustomer | null> {
    const isObjId = mongoose.Types.ObjectId.isValid(idOrCode);
    const filter = isObjId
      ? { $or: [{ _id: idOrCode }, { customerCode: caseInsensitiveExact(idOrCode) }] }
      : { customerCode: caseInsensitiveExact(idOrCode) };

    return (await CustomerModel.findOne(filter).populate('parentId', 'customerCode status level').lean()) as ICustomer | null;
  }

  /**
   * Xóa khách hàng theo Mongo ObjectId hoặc Mã KH
   */
  static async deleteCustomer(
    idOrCode: string,
    userContext?: { userId?: string; userName?: string }
  ): Promise<{ success: boolean; message: string; customerCode: string }> {
    const isObjId = mongoose.Types.ObjectId.isValid(idOrCode);
    const filter = isObjId
      ? { $or: [{ _id: idOrCode }, { customerCode: caseInsensitiveExact(idOrCode) }] }
      : { customerCode: caseInsensitiveExact(idOrCode) };

    const cust = await CustomerModel.findOne(filter);
    if (!cust) {
      throw new Error('Khách hàng không tồn tại.');
    }

    const code = cust.customerCode;
    const oldObj = cust.toObject();

    await CustomerModel.deleteOne({ _id: cust._id });

    // Cập nhật các con đang trỏ đến khách hàng này thành mồ côi (Root)
    await CustomerModel.updateMany(
      { $or: [{ parentId: cust._id }, { parentCustomerId: caseInsensitiveExact(code) }] },
      { $set: { parentId: null, parentCustomerId: null } }
    );

    await HistoryService.logAction({
      userId: userContext?.userId || 'system',
      userName: userContext?.userName || 'System',
      action: 'DELETE',
      module: 'CUSTOMER',
      objectType: 'Customer',
      objectId: code,
      oldData: oldObj
    });

    wsManager.broadcast('customer.deleted', { customerCode: code, _id: cust._id });
    return { success: true, message: 'Đã xóa khách hàng thành công.', customerCode: code };
  }
}
