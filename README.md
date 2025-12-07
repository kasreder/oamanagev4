# OA Asset Manager v4

카카오 소셜 로그인을 사용하는 OA 자산 관리 백엔드 프로젝트입니다. Node.js(Express)와 TypeScript로 작성되었으며 MySQL을 사용해 사용자 정보를 저장하고, 인증 여부에 따라 자산 목록을 다르게 노출합니다. 모든 문서와 메시지는 한국어로 관리합니다.

## 프로젝트 구조

- `backend/`: 카카오 로그인 및 자산 관리 API 서버
  - `src/`: Express 애플리케이션, 인증/자산 라우트, 서비스, 설정 파일
  - `database/`: MySQL 초기 스키마(자동 생성 참고용)

## 실행 방법

1. 의존성 설치
   ```bash
   cd backend
   npm install
   ```
2. 환경 변수 파일 준비: `backend/.env.example`을 참고해 `backend/.env`를 작성합니다.
3. 개발 서버 실행
   ```bash
   npm run dev
   ```
   MySQL 연결 및 DB/테이블 생성이 끝나면 `http://localhost:3000`에서 서버가 시작됩니다.

## 주요 환경 변수

`backend/.env`에 다음 값을 설정합니다.

```env
# 카카오 OAuth
KAKAO_CLIENT_ID=REST_API_키
KAKAO_CLIENT_SECRET=필요 시 입력
KAKAO_REDIRECT_URI=http://localhost:3000/api/v1/auth/kakao/callback
API_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# 서버/세션
PORT=3000
SESSION_SECRET=랜덤_문자열
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000

# 데이터베이스
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=비밀번호
DB_NAME=oa_asset_manager
```

## API 개요

- 기본 안내: `GET /` – 동작 상태와 주요 엔드포인트 반환
- 헬스 체크: `GET /api/v1/health`
- 인증
  - `GET /api/v1/auth/kakao` – 카카오 로그인 시작
  - `GET /api/v1/auth/kakao/callback` – 카카오 콜백 처리 및 세션 저장
  - `GET /api/v1/auth/me` – 로그인 사용자 정보 조회(세션/JWT 필요)
  - `POST /api/v1/auth/logout` – 로그아웃
- 자산(샘플 인메모리 데이터)
  - `GET /api/v1/assets` – 공개 조회, 로그인 시 소유자/메모 전체 표시
  - `GET /api/v1/assets/:uid` – 단일 자산 조회
  - `POST /api/v1/assets` – 자산 생성(인증 필요)
  - `PATCH /api/v1/assets/:uid` – 자산 수정(인증 필요)
  - `DELETE /api/v1/assets/:uid` – 관리자 권한 필요

## 빌드 및 배포

프로덕션 실행 전 TypeScript를 빌드합니다.

```bash
npm run build
npm run start
```

빌드 결과물은 `backend/dist`에 생성되며, MySQL과 세션 시크릿을 프로덕션 환경에 맞춰 설정해야 합니다.
