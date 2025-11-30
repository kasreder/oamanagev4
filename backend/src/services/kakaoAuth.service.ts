import axios from 'axios';
import { KakaoTokenResponse, KakaoUserInfo } from '../types/kakao';
import { kakaoConfig } from '../config/social';

export class KakaoAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly tokenUrl = 'https://kauth.kakao.com/oauth/token';
  private readonly userInfoUrl = 'https://kapi.kakao.com/v2/user/me';

  constructor() {
    this.clientId = kakaoConfig.clientId;
    this.clientSecret = kakaoConfig.clientSecret;
    this.redirectUri = kakaoConfig.redirectUri;

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
  }

  /**
   * 카카오 로그인 페이지 URL 생성
   */
  getAuthUrl(): string {
    if (!this.clientId || !this.redirectUri) {
      throw new Error('카카오 설정이 없습니다. 환경 변수를 확인하세요.');
    }

    const baseUrl = 'https://kauth.kakao.com/oauth/authorize';
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * 인가 코드로 액세스 토큰 요청
   */
  async getAccessToken(code: string): Promise<KakaoTokenResponse> {
    if (!this.clientId || !this.redirectUri) {
      throw new Error('카카오 설정이 없습니다. 환경 변수를 확인하세요.');
    }

    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        code,
      });

      if (this.clientSecret) {
        params.append('client_secret', this.clientSecret);
      }

      const response = await axios.post<KakaoTokenResponse>(
        this.tokenUrl,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Kakao token error:', error.response?.data);
        throw new Error(
          `Failed to get access token: ${error.response?.data?.error_description || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * 액세스 토큰으로 사용자 정보 조회
   */
  async getUserInfo(accessToken: string): Promise<KakaoUserInfo> {
    try {
      const response = await axios.get<KakaoUserInfo>(this.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Kakao user info error:', error.response?.data);
        throw new Error(
          `Failed to get user info: ${error.response?.data?.msg || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * 로그아웃 (카카오 연결 끊기는 아님, 세션만 제거)
   */
  async logout(accessToken: string): Promise<void> {
    try {
      await axios.post(
        'https://kapi.kakao.com/v1/user/logout',
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Kakao logout error:', error.response?.data);
      }
      // 로그아웃 실패해도 세션은 제거됨
    }
  }
}
