import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export class AuthController {
  socialLogin = (req: Request, res: Response) => {
    const provider = req.params.provider as 'kakao' | 'naver' | 'google' | 'teams' | 'local';
    const { email } = req.body;

    const { user, tokens } = authService.socialLogin(provider, email);

    res.json({
      success: true,
      provider,
      user,
      tokens,
    });
  };

  refresh = (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'refreshToken이 필요합니다.' });
    }

    const tokens = authService.refresh(refreshToken);

    if (!tokens) {
      return res.status(401).json({ success: false, error: 'INVALID_TOKEN', message: '토큰이 유효하지 않습니다.' });
    }

    res.json({ success: true, tokens });
  };
}
