import { Request, Response } from 'express';
import { UserRepository } from '../repositories/user.repository';

const users = new UserRepository();

export class UserController {
  me = (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
    }

    const user = users.findById(req.user.id);
    res.json({ success: true, data: user });
  };

  updateMe = (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
    }

    const user = users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '사용자를 찾을 수 없습니다.' });
    }

    const updated = users.upsert({ ...user, nickname: req.body.nickname ?? user.nickname, email: req.body.email ?? user.email });

    res.json({ success: true, data: updated });
  };
}
