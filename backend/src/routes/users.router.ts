import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel } from '../database/db';
import { IUser } from '../types';
import { HistoryService } from '../services/history.service';

const router = Router();

// GET /api/users
router.get('/', async (req: Request, res: Response) => {
  const users = (await UserModel.find().select('-password').lean().exec()) as IUser[];
  return res.json(users);
});

// POST /api/users
router.post('/', async (req: Request, res: Response) => {
  const { username, password, fullName, email, role, department, status } = req.body;
  if (!username || !password || !fullName) {
    return res.status(400).json({ message: 'Username, password, and fullName are required.' });
  }

  const existing = await UserModel.findOne({ username }).lean();
  if (existing) {
    return res.status(400).json({ message: 'Tên người dùng đã được sử dụng.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    username: username.trim(),
    password: hashedPassword,
    fullName: fullName.trim(),
    email: email || `${username}@asm.vn`,
    role: role || 'OPERATOR',
    department: department || 'Vận Hành',
    status: status || 'ACTIVE',
    createdAt: new Date()
  };

  const doc = await UserModel.create(newUser);
  const createdObj = doc.toObject();

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: 'CREATE',
    module: 'USER',
    objectType: 'User',
    objectId: username,
    newData: { username, fullName, role, department }
  });

  const { password: _, ...result } = createdObj;
  return res.status(201).json(result);
});

// PUT /api/users/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = mongoose.Types.ObjectId.isValid(id) ? { $or: [{ _id: id }, { username: id }] } : { username: id };
  const existingUser = await UserModel.findOne(query).lean();

  if (!existingUser) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const updatePayload = { ...req.body };
  if (updatePayload.password) {
    updatePayload.password = bcrypt.hashSync(updatePayload.password, 10);
  } else {
    delete updatePayload.password;
  }

  await UserModel.updateOne({ _id: existingUser._id }, { ...updatePayload, updatedAt: new Date() });
  const updatedDoc = await UserModel.findById(existingUser._id).select('-password').lean();

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: 'UPDATE',
    module: 'USER',
    objectType: 'User',
    objectId: existingUser.username,
    oldData: existingUser,
    newData: updatedDoc
  });

  return res.json(updatedDoc);
});

// DELETE /api/users/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = mongoose.Types.ObjectId.isValid(id) ? { $or: [{ _id: id }, { username: id }] } : { username: id };
  const existingUser = await UserModel.findOne(query).lean();

  if (!existingUser) {
    return res.status(404).json({ message: 'User not found.' });
  }

  await UserModel.deleteOne({ _id: existingUser._id });

  await HistoryService.logAction({
    userId: (req as any).user?.userId,
    userName: (req as any).user?.username,
    action: 'DELETE',
    module: 'USER',
    objectType: 'User',
    objectId: existingUser.username,
    oldData: existingUser
  });

  return res.json({ message: 'Đã xóa người dùng thành công.' });
});

export default router;

