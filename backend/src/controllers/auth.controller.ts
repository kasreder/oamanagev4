import { Request, Response } from 'express';
import { KakaoAuthService, KakaoReauthError } from '../services/kakaoAuth.service';
import { UserModel } from '../models/User';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export class AuthController {
  private readonly kakaoAuthService: KakaoAuthService;

  constructor() {
    this.kakaoAuthService = new KakaoAuthService();
  }

  private getCallbackUrl(req: Request): string {
    if (process.env.API_BASE_URL) {
      return `${process.env.API_BASE_URL}/api/v1/auth/kakao/callback`;
    }

    const protocol = req.protocol;
    const host = req.get('host');
    return `${protocol}://${host}/api/v1/auth/kakao/callback`;
  }

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

  kakaoLogin = (req: Request, res: Response) => {
    try {
      const redirectUri = this.getCallbackUrl(req);
      const authUrl = this.kakaoAuthService.getAuthUrl(redirectUri);
      res.redirect(authUrl);
    } catch (error) {
      console.error('Kakao login error:', error);
      res.status(500).json({
        success: false,
        message: '카카오 로그인을 시작할 수 없습니다.',
      });
    }
  };

  kakaoCallback = async (req: Request, res: Response) => {
    try {
      const { code, error } = req.query;

      if (error) {
        console.error('Kakao auth error:', error);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=cancelled`);
      }

      if (!code || typeof code !== 'string') {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
      }

      const authorizationCode = String(code);

      const queryString = req.originalUrl.includes('?')
        ? req.originalUrl.substring(req.originalUrl.indexOf('?'))
        : '';
      const redirectUri = this.getCallbackUrl(req);
      const callbackRequestUrl = `${redirectUri}${queryString}`;

      const tokenData = await this.kakaoAuthService.getAccessToken(authorizationCode, redirectUri);

      if (!tokenData?.access_token) {
        const authorizeUrl = this.kakaoAuthService.getAuthUrl(redirectUri);
        console.error('Kakao callback error: access_token 누락, 재인증 이동', {
          tokenData,
          authorizeUrl,
        });
        return res.redirect(authorizeUrl);
      }

      const userInfo = await this.kakaoAuthService.getUserInfo(tokenData.access_token);

      const userData = {
        login_method: 'kakao',
        kakao_id: String(userInfo.id),
        nickname: userInfo.properties?.nickname || userInfo.kakao_account?.profile?.nickname || '사용자',
        email: userInfo.kakao_account?.email,
        profile_image:
          userInfo.properties?.profile_image || userInfo.kakao_account?.profile?.profile_image_url,
        score: 0,
      };

      console.log('[AuthController] 사용자 DB 저장 시도', {
        kakaoId: userData.kakao_id,
        nickname: userData.nickname,
        email: userData.email,
      });

      const user = await UserModel.findOrCreate(userData);

      console.log('[AuthController] 사용자 DB 저장 완료', {
        id: user.id,
        kakaoId: user.kakao_id,
        nickname: user.nickname,
        email: user.email,
      });

      req.session.user = {
        id: user.id!,
        loginMethod: user.login_method,
        kakaoId: user.kakao_id,
        nickname: user.nickname,
        email: user.email,
        profileImage: user.profile_image,
        score: user.score,
        role: 'user',
      };

      const redirectUrl = `${process.env.FRONTEND_URL}/?code=${encodeURIComponent(authorizationCode)}`;

      const wantsJsonResponse =
        typeof req.headers.accept === 'string' && req.headers.accept.includes('application/json');

      req.session.save((err: unknown) => {
        if (err) {
          console.error('Session save error:', err);
          return res.redirect(`${process.env.FRONTEND_URL}/login?error=session`);
        }

        if (wantsJsonResponse) {
          return res.json({
            success: true,
            message: '카카오 로그인에 성공했습니다.',
            authorizationCode,
            callbackRequestUrl,
            user: req.session.user,
            redirectUrl,
            token: tokenData,
          });
        }

        res.redirect(redirectUrl);
      });
    } catch (error) {
      console.error('Kakao callback error:', error);

      const wantsJsonResponse =
        typeof req.headers.accept === 'string' && req.headers.accept.includes('application/json');

      if (error instanceof KakaoReauthError) {
        const fallbackRedirect = this.kakaoAuthService.getAuthUrl(this.getCallbackUrl(req));
        const authorizeUrl = error.authorizeUrl || fallbackRedirect;
        console.log('Kakao callback reauth needed, redirecting to authorize', {
          authorizeUrl,
          reason: error.reason,
        });

        if (wantsJsonResponse) {
          return res.status(401).json({
            success: false,
            message: error.message,
            authorizeUrl,
            reason: error.reason,
          });
        }

        const loginUrl = `${process.env.FRONTEND_URL}/login?error=${error.reason}&authorizeUrl=${encodeURIComponent(
          authorizeUrl
        )}`;
        return res.redirect(loginUrl);
      }

      res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  };

  getCurrentUser = (req: Request, res: Response) => {
    const user = req.user || req.session?.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '인증되지 않은 사용자입니다.',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  };

  logout = (req: Request, res: Response) => {
    if (!req.session) {
      return res.status(200).json({ success: true, message: '세션이 없습니다.' });
    }

    req.session.destroy((err: unknown) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({
          success: false,
          message: '로그아웃에 실패했습니다.',
        });
      }

      res.clearCookie?.('connect.sid');
      res.json({ success: true, message: '로그아웃되었습니다.' });
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
