import { Request, Response } from 'express';
import { KakaoAuthService } from '../services/kakaoAuth.service';
import { UserModel } from '../models/User';

export class AuthController {
  private kakaoAuthService: KakaoAuthService;

  constructor() {
    this.kakaoAuthService = new KakaoAuthService();
  }

  private getCallbackUrl(req: Request): string {
    const apiBaseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return `${apiBaseUrl}/api/v1/auth/kakao/callback`;
  }

  /**
   * 카카오 로그인 시작 (카카오 로그인 페이지로 리다이렉트)
   */
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

  /**
   * 카카오 로그인 콜백 처리
   */
  kakaoCallback = async (req: Request, res: Response) => {
    try {
      const { code, error } = req.query;

      // 사용자가 카카오 로그인을 취소한 경우
      if (error) {
        console.error('Kakao auth error:', error);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=cancelled`);
      }

      // 인가 코드가 없는 경우
      if (!code || typeof code !== 'string') {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
      }

      const authorizationCode = String(code);

      const queryString = req.originalUrl.includes('?')
        ? req.originalUrl.substring(req.originalUrl.indexOf('?'))
        : '';
      const redirectUri = this.getCallbackUrl(req);
      const callbackRequestUrl = `${redirectUri}${queryString}`;

      // 1. 인가 코드로 액세스 토큰 받기
      const tokenData = await this.kakaoAuthService.getAccessToken(
        authorizationCode,
        redirectUri
      );

      // 2. 액세스 토큰으로 사용자 정보 받기
      const userInfo = await this.kakaoAuthService.getUserInfo(tokenData.access_token);

      // 3. DB에서 사용자 찾거나 생성
      const user = await UserModel.findOrCreate({
        kakao_id: String(userInfo.id),
        nickname:
          userInfo.properties?.nickname ||
          userInfo.kakao_account?.profile?.nickname ||
          '사용자',
        email: userInfo.kakao_account?.email,
        profile_image:
          userInfo.properties?.profile_image ||
          userInfo.kakao_account?.profile?.profile_image_url,
      });

      // 4. 세션에 사용자 정보 저장
      req.session.user = {
        id: user.id!,
        kakaoId: user.kakao_id,
        nickname: user.nickname,
        email: user.email,
        profileImage: user.profile_image,
        role: 'user',
      };

      // 세션 저장 후 메인 페이지로 리다이렉트
      const redirectUrl = `${process.env.FRONTEND_URL}/?code=${encodeURIComponent(
        authorizationCode
      )}`;

      const wantsJsonResponse =
        typeof req.headers.accept === 'string' &&
        req.headers.accept.includes('application/json');

      req.session.save((err) => {
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
          });
        }

        res.redirect(redirectUrl);
      });
    } catch (error) {
      console.error('Kakao callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  };

  /**
   * 현재 로그인한 사용자 정보 조회
   */
  getCurrentUser = (req: Request, res: Response) => {
    const user = req.user || req.session.user;
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

  /**
   * 로그아웃
   */
  logout = (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({
          success: false,
          message: '로그아웃에 실패했습니다.',
        });
      }

      res.clearCookie('connect.sid');
      res.json({
        success: true,
        message: '정상적으로 로그아웃되었습니다.',
      });
    });
  };
}
