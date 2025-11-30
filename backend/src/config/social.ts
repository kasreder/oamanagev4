import './env';

export const kakaoConfig = {
  clientId: process.env.KAKAO_CLIENT_ID || '',
  clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
  redirectUri: process.env.KAKAO_REDIRECT_URI || '',
};
