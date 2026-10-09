import { AuditHistoryModel } from '../database/db';
import { IAuditHistory, AuditAction } from '../types';
import { wsManager } from '../websocket/gateway';

export class HistoryService {
  static async logAction(params: {
    userId?: string;
    userName?: string;
    action: AuditAction;
    module: 'ACCOUNT' | 'CUSTOMER' | 'SYSTEM_ACCOUNT' | 'NOTE' | 'USER' | 'CONFIG' | 'AUTH';
    objectType: string;
    objectId: string;
    oldData?: any;
    newData?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<IAuditHistory> {
    const historyItem: IAuditHistory = {
      historyId: `HIST_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: params.userId || 'system',
      userName: params.userName || 'System',
      action: params.action,
      module: params.module,
      objectType: params.objectType,
      objectId: params.objectId,
      oldData: params.oldData ? JSON.parse(JSON.stringify(params.oldData)) : null,
      newData: params.newData ? JSON.parse(JSON.stringify(params.newData)) : null,
      ipAddress: params.ipAddress || '127.0.0.1',
      userAgent: params.userAgent || 'ASM System',
      createdAt: new Date()
    };

    try {
      const doc = await AuditHistoryModel.create(historyItem);
      const createdObj = doc.toObject();
      wsManager.broadcast('history.created', createdObj);
      return createdObj;
    } catch (err) {
      console.error('[HistoryService] MongoDB write error:', err);
      wsManager.broadcast('history.created', historyItem);
      return historyItem;
    }
  }

  static async getHistory(query: {
    page?: number;
    limit?: number;
    module?: string;
    action?: string;
    objectId?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    let results = (await AuditHistoryModel.find().lean().exec()) as IAuditHistory[];

    if (query.module) {
      results = results.filter(h => h.module === query.module);
    }
    if (query.action) {
      results = results.filter(h => h.action === query.action);
    }
    if (query.objectId) {
      results = results.filter(h => h.objectId === query.objectId);
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      results = results.filter(h => 
        h.userName.toLowerCase().includes(q) ||
        h.objectId.toLowerCase().includes(q) ||
        h.action.toLowerCase().includes(q) ||
        h.historyId.toLowerCase().includes(q)
      );
    }

    results.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

    const total = results.length;
    const items = results.slice((page - 1) * limit, page * limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}
