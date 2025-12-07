import axios from 'axios';
import { KakaoTokenResponse, KakaoUserInfo } from '../types/kakao';
import { kakaoConfig } from '../config/social';

export class KakaoReauthError extends Error {
  constructor(message: string, public readonly authorizeUrl: string) {
    super(message);
    this.name = 'KakaoReauthError';
  }
}

export class KakaoAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly scope: string;
  private readonly tokenUrl = 'https://kauth.kakao.com/oauth/token';
  private readonly userInfoUrl = 'https://kapi.kakao.com/v2/user/me';

  constructor() {
    this.clientId = kakaoConfig.clientId;
    this.clientSecret = kakaoConfig.clientSecret;
    this.redirectUri = kakaoConfig.redirectUri;
    this.scope = kakaoConfig.scope;

    if (!this.clientId || !this.redirectUri) {
      console.warn(
        '카카오 설정이 누락되었습니다. KAKAO_CLIENT_ID KAKAO_REDIRECT_URI를 .env에 설정하세요.'
      );
    }

    if (!this.clientSecret) {
      console.info(
        '카카오 클라이언트 시크릿이 비어 있습니다. 카카오 개발자 콘솔에서 보안을 사용 설정했다면 KAKAO_CLIENT_SECRET 환경 변수를 추가하세요.'
      );
    }

    console.log('[KakaoAuthService] 초기화 완료', {
      hasClientId: !!this.clientId,
      hasRedirectUri: !!this.redirectUri,
      hasClientSecret: !!this.clientSecret,
      hasScope: !!this.scope,
      tokenUrl: this.tokenUrl,
      userInfoUrl: this.userInfoUrl,
    });
  }

  /**
   * 카카오 로그인 페이지 URL 생성
   */
  getAuthUrl(customRedirectUri?: string): string {
    const redirectUri = customRedirectUri || this.redirectUri;

    if (!this.clientId || !redirectUri) {
      throw new Error('카카오 설정이 없습니다. 환경 변수를 확인하세요.');
    }

    console.log('[KakaoAuthService] getAuthUrl 호출', {
      redirectUri,
      hasClientId: !!this.clientId,
      customRedirectUsed: !!customRedirectUri,
    });

    const baseUrl = 'https://kauth.kakao.com/oauth/authorize';
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
    });

    if (this.scope) {
      params.append('scope', this.scope);
    }

    console.log('[KakaoAuthService] 생성된 인증 URL 파라미터', {
      baseUrl,
      redirectUri,
      responseType: params.get('response_type'),
      scope: params.get('scope'),
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * 인가 코드로 액세스 토큰 요청
   */
  async getAccessToken(code: string, customRedirectUri?: string): Promise<KakaoTokenResponse> {
    const redirectUri = customRedirectUri || this.redirectUri;

    if (!this.clientId || !redirectUri) {
      throw new Error('카카오 설정이 없습니다. 환경 변수를 확인하세요.');
    }

    try {
      console.log('[KakaoAuthService] getAccessToken 시작', {
        redirectUri,
        hasClientId: !!this.clientId,
        hasClientSecret: !!this.clientSecret,
        customRedirectUsed: !!customRedirectUri,
        codePreview: code?.slice(0, 5),
      });

      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        redirect_uri: redirectUri,
        code,
      });

      if (this.clientSecret) {
        params.append('client_secret', this.clientSecret);
        console.log('[KakaoAuthService] 클라이언트 시크릿 포함하여 토큰 요청');
      }

      const response = await axios.post<KakaoTokenResponse | string>(
        this.tokenUrl,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      console.log('[KakaoAuthService] 토큰 원본 응답 데이터', response.data);

      if (typeof response.data === 'string') {
        const authorizeUrl = this.getAuthUrl(redirectUri);
        console.error('[KakaoAuthService] HTML 응답 수신, 토큰이 아닌 로그인 페이지 반환', {
          authorizeUrl,
        });
        throw new KakaoReauthError(
          '카카오에서 토큰 대신 로그인 페이지를 반환했습니다. 다시 로그인해주세요.',
          authorizeUrl
        );
      }

      if (!response.data?.access_token) {
        const authorizeUrl = this.getAuthUrl(redirectUri);
        console.error('[KakaoAuthService] access_token 없음, 재인증 필요', {
          data: response.data,
          authorizeUrl,
        });
        throw new KakaoReauthError(
          '카카오에서 access_token을 받지 못했습니다. 다시 로그인해주세요.',
          authorizeUrl
        );
      }
      console.log('[KakaoAuthService] 토큰 요청 성공', {
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type,
        refreshToken: !!response.data.refresh_token,
        scope: response.data.scope,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const authorizeUrl = this.getAuthUrl(redirectUri);
        console.error('[KakaoAuthService] Kakao token error', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
          authorizeUrl,
        });

        if (error.response?.status === 429 || error.response?.data?.error === 'TOO_MANY_ATTEMPTS') {
          throw new Error('카카오가 로그인 시도가 너무 많다고 응답했습니다. 잠시 후 다시 시도해주세요.');
        }

        if (error.response?.status === 401 || error.response?.data?.error === 'invalid_grant') {
          throw new KakaoReauthError(
            '카카오 인가 코드가 만료되었습니다. 다시 로그인해주세요.',
            authorizeUrl
          );
        }

        throw new Error(
          `Failed to get access token: ${error.response?.data?.error_description || error.message}`
        );
      }

      console.error('[KakaoAuthService] 토큰 요청 중 알 수 없는 오류', error);
      throw error;
    }
  }

  /**
   * 액세스 토큰으로 사용자 정보 조회
   */
  async getUserInfo(accessToken: string): Promise<KakaoUserInfo> {
    try {
      console.log('[KakaoAuthService] getUserInfo 시작', {
        accessTokenPreview: accessToken?.slice(0, 10),
        userInfoUrl: this.userInfoUrl,
      });

      const response = await axios.get<KakaoUserInfo>(this.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      });

      console.log('[KakaoAuthService] 사용자 정보 조회 성공', {
        id: response.data.id,
        hasKakaoAccount: !!response.data.kakao_account,
        hasProfile: !!response.data.kakao_account?.profile,
      });

      if (!response.data.kakao_account || !response.data.kakao_account.profile) {
        const authorizeUrl = this.getAuthUrl();
        console.warn('[KakaoAuthService] 필수 동의 정보 누락, 재동의 필요', {
          hasKakaoAccount: !!response.data.kakao_account,
          hasProfile: !!response.data.kakao_account?.profile,
          authorizeUrl,
          scope: this.scope,
        });

        throw new KakaoReauthError(
          '카카오 프로필 동의 항목이 누락되어 사용자 정보를 받을 수 없습니다. 로그인 화면에서 프로필 제공에 동의해주세요.',
          authorizeUrl
        );
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const authorizeUrl = this.getAuthUrl();
        console.error('[KakaoAuthService] Kakao user info error', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
          authorizeUrl,
        });

        if (error.response?.status === 401) {
          throw new KakaoReauthError('액세스 토큰이 유효하지 않습니다. 다시 로그인해주세요.', authorizeUrl);
        }

        throw new Error(
          `Failed to get user info: ${error.response?.data?.msg || error.message}`
        );
      }

      console.error('[KakaoAuthService] 사용자 정보 조회 중 알 수 없는 오류', error);
      throw error;
    }
  }

  /**
   * 로그아웃 (카카오 연결 끊기는 아님, 세션만 제거)
   */
  async logout(accessToken: string): Promise<void> {
    try {
      console.log('[KakaoAuthService] logout 시작', {
        accessTokenPreview: accessToken?.slice(0, 10),
      });

      await axios.post(
        'https://kapi.kakao.com/v1/user/logout',
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log('[KakaoAuthService] 로그아웃 요청 완료');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[KakaoAuthService] Kakao logout error', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
        });
      }

      console.warn('[KakaoAuthService] 로그아웃 중 예외 발생, 세션은 제거됩니다.', error);
      // 로그아웃 실패해도 세션은 제거됨
    }
  }
}
