import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../database/db';
import { HistoryService } from '../services/history.service';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'asm_prod_secure_jwt_secret_key_2026_x89a';

router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username và mật khẩu là bắt buộc.' });
  }

  const user = await UserModel.findOne({ username }).lean().exec();

  if (!user) {
    return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không chính xác.' });
  }

  const isValidPassword = bcrypt.compareSync(password, user.password || '');
  if (!isValidPassword) {
    return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không chính xác.' });
  }

  if (user.status === 'INACTIVE') {
    return res.status(403).json({ message: 'Tài khoản hiện đang bị vô hiệu hóa.' });
  }

  const token = jwt.sign(
    { userId: user._id?.toString(), username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  // Update last login timestamp in MongoDB
  await UserModel.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

  await HistoryService.logAction({
    userId: user._id?.toString(),
    userName: user.username,
    action: 'LOGIN',
    module: 'AUTH',
    objectType: 'User',
    objectId: user._id?.toString() || user.username,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  const { password: _, ...userWithoutPass } = user;
  return res.json({
    token,
    user: userWithoutPass
  });
});

router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findOne({ $or: [{ _id: decoded.userId }, { username: decoded.username }] }).select('-password').lean();

    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json(user);
  } catch (e) {
    return res.status(401).json({ message: 'Token invalid or expired.' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  return res.json({ message: 'Logged out successfully.' });
});

export default router;
