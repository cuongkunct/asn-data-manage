import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { CustomerNoteModel } from '../database/db';
import { ICustomerNote } from '../types';
import { HistoryService } from '../services/history.service';
import { wsManager } from '../websocket/gateway';

const router = Router();

// GET /api/notes
router.get('/', async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const search = (req.query.search as string || '').trim().toLowerCase();
  const customerCode = (req.query.customer_code as string || req.query.customerCode as string || '').trim().toLowerCase();
  const applicableCustomer = (req.query.applicable_customer as string || req.query.applicableCustomer as string || '').trim().toLowerCase();
  const accountId = req.query.account_id as string || req.query.accountId as string;
  const noteType = req.query.note_type as string || req.query.noteType as string;

  let notes = (await CustomerNoteModel.find().lean().exec()) as ICustomerNote[];

  if (customerCode) {
    notes = notes.filter(n => (n.customerCode || '').toLowerCase().includes(customerCode));
  }
  if (applicableCustomer) {
    notes = notes.filter(n => (n.applicableCustomer || '').toLowerCase().includes(applicableCustomer));
  }
  if (accountId) {
    notes = notes.filter(n => n.accountId && n.accountId.toLowerCase().includes(accountId.toLowerCase()));
  }
  if (noteType && noteType !== 'ALL') {
    notes = notes.filter(n => n.noteType === noteType);
  }
  if (search) {
    notes = notes.filter(n => 
      (n.content || '').toLowerCase().includes(search) ||
      (n.customerCode || '').toLowerCase().includes(search) ||
      (n.applicableCustomer || '').toLowerCase().includes(search) ||
      (n.requirement && n.requirement.toLowerCase().includes(search)) ||
      (n.specialNote && n.specialNote.toLowerCase().includes(search))
    );
  }

  notes.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const total = notes.length;
  const items = notes.slice((page - 1) * limit, page * limit);

  return res.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  });
});

// POST /api/notes
router.post('/', async (req: Request, res: Response) => {
  const { customerCode, applicableCustomer, accountId, noteType, requirement, specialNote, content, createdBy } = req.body;

  if (!customerCode || !content) {
    return res.status(400).json({ message: 'customerCode and content are required.' });
  }

  const count = await CustomerNoteModel.countDocuments();
  const noteId = `NOTE_${String(count + 1).padStart(3, '0')}`;

  const newNote: ICustomerNote = {
    noteId,
    customerCode,
    applicableCustomer: applicableCustomer || `Áp dụng cho ${customerCode}`,
    accountId: accountId || '',
    noteType: noteType || 'TEXT',
    requirement: requirement || '',
    specialNote: specialNote || '',
    content,
    createdBy: (req as any).user?.username || createdBy || 'operator1',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const doc = await CustomerNoteModel.create(newNote);
  const createdObj = doc.toObject();

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: 'CREATE',
    module: 'NOTE',
    objectType: 'CustomerNote',
    objectId: noteId,
    newData: createdObj
  });

  wsManager.broadcast('note.created', createdObj);
  wsManager.broadcast('note.created', createdObj, `customer:${customerCode}`);

  return res.status(201).json(createdObj);
});

// PUT /api/notes/:id
router.put('/:id', async (req: Request, res: Response) => {
  const idOrCode = req.params.id;
  const isObjId = mongoose.Types.ObjectId.isValid(idOrCode);
  const filter = isObjId ? { $or: [{ _id: idOrCode }, { noteId: idOrCode }] } : { noteId: idOrCode };
  const existingNote = await CustomerNoteModel.findOne(filter).lean();

  if (!existingNote) {
    return res.status(404).json({ message: 'Ghi chú không tồn tại.' });
  }

  const updated: ICustomerNote = {
    ...existingNote,
    ...req.body,
    updatedAt: new Date()
  };

  await CustomerNoteModel.updateOne({ _id: existingNote._id }, updated);

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: 'UPDATE',
    module: 'NOTE',
    objectType: 'CustomerNote',
    objectId: existingNote.noteId,
    oldData: existingNote,
    newData: updated
  });

  wsManager.broadcast('note.updated', updated);

  return res.json(updated);
});

// DELETE /api/notes/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const idOrCode = req.params.id;
  const isObjId = mongoose.Types.ObjectId.isValid(idOrCode);
  const filter = isObjId ? { $or: [{ _id: idOrCode }, { noteId: idOrCode }] } : { noteId: idOrCode };
  const existingNote = await CustomerNoteModel.findOne(filter).lean();

  if (!existingNote) {
    return res.status(404).json({ message: 'Ghi chú không tồn tại.' });
  }

  await CustomerNoteModel.deleteOne({ _id: existingNote._id });

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: 'DELETE',
    module: 'NOTE',
    objectType: 'CustomerNote',
    objectId: idOrCode,
    oldData: existingNote
  });

  wsManager.broadcast('note.deleted', { noteId: idOrCode });

  return res.json({ message: 'Xóa ghi chú thành công.' });
});

export default router;
