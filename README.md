# OAManage V4 - 카카오 로그인 & 자산 백엔드

TypeScript 기반으로 카카오 소셜 로그인을 처리하고, 간단한 자산 관리 API를 제공하는 Express 서버입니다. 세션 기반 로그인과 선택적 Bearer 토큰 검증을 모두 지원하며, MySQL을 자동 초기화합니다.

## 📋 주요 특징
- **카카오 OAuth**: 인가 코드 → 액세스 토큰 → 사용자 정보 조회 후 세션 저장
- **데이터베이스 자동 생성**: 애플리케이션 부팅 시 데이터베이스와 `users` 테이블 생성 및 연결 테스트 수행
- **자산 API**: 목록/단건 조회는 공개(민감 필드 마스킹), 생성·수정은 인증 필요, 삭제는 관리자 전용
- **보안/운영 기능**: CORS 허용 도메인 환경 변수 설정, 메모리 레이트 리미터 적용 (인증 API 5회/15분, 기타 100회/15분)

## ⚙️ 개발 환경
- Node.js 22.x
- TypeScript 5.7.x
- Express 4.21.x
- Axios, express-session, mysql2

## 🚀 시작하기
> 모든 명령은 `backend` 디렉터리에서 실행합니다.

### 1. 의존성 설치
```bash
cd backend
npm install
```

### 2. 환경 변수 설정
`.env.example`을 참고하여 `.env` 파일을 생성합니다.

| 이름 | 설명 | 기본값 |
| --- | --- | --- |
| KAKAO_CLIENT_ID | 카카오 REST API 키 | (없음) |
| KAKAO_CLIENT_SECRET | 카카오 클라이언트 시크릿 (선택) | (없음) |
| KAKAO_REDIRECT_URI | 카카오 콜백 URI | `http://localhost:3000/api/v1/auth/kakao/callback` |
| API_BASE_URL | 퍼블릭 API 베이스 URL (리다이렉트 안내용) | `http://localhost:3000` |
| PORT | 서버 포트 | `3000` |
| SESSION_SECRET | 세션 서명 시크릿 | `your-secret-key` |
| JWT_SECRET | Bearer 토큰 검증 시크릿 (선택) | `change-this-secret` |
| JWT_EXPIRES_IN | 토큰 만료 시간 (선택) | `1h` |
| NODE_ENV | 실행 모드 | `development` |
| FRONTEND_URL | 프론트엔드 주소 (리다이렉트/CORS) | `http://localhost:3000` |
| ALLOWED_ORIGINS | 허용 CORS 오리진 목록(콤마 구분) | `*` |
| DB_HOST | DB 호스트 | `127.0.0.1` |
| DB_PORT | DB 포트 | `3306` |
| DB_USER | DB 사용자 | `root` |
| DB_PASSWORD | DB 비밀번호 | `kasreder` |
| DB_NAME | DB 이름 | `oa_asset_manager` |

### 3. 데이터베이스 준비
- MySQL이 실행 중이고 접근 가능한 계정 정보를 `.env`에 입력하세요.
- 서버가 시작될 때 지정한 DB와 `users` 테이블을 자동으로 생성합니다. 실패 시 서버가 종료되므로 환경 변수를 먼저 확인하세요.
- 초기 스키마를 직접 실행하려면 `backend/database/schema.sql`을 참고하세요.

### 4. 서버 실행
```bash
# 개발용 (핫 리로드)
npm run dev

# 빌드 후 프로덕션 실행
npm run build
npm run start
```
서버는 기본적으로 `http://localhost:3000`에서 동작합니다.

## 📡 API 개요
- 기본 경로: `/api/v1`
- 루트(`GET /`): 서버 상태 및 주요 엔드포인트 안내 JSON 반환
- 구 버전 호환: `/auth/kakao` 및 `/auth/kakao/callback` 요청은 `/api/v1/auth/...`로 308 리다이렉트

### 헬스 체크
| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/v1/health` | 서버 상태 확인 |

### 인증
| Method | Endpoint | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/api/v1/auth/kakao` | 카카오 로그인 시작 (카카오 로그인 페이지로 리다이렉트) | ❌ |
| GET | `/api/v1/auth/kakao/callback` | 카카오 로그인 콜백 처리 | ❌ |
| GET | `/api/v1/auth/me` | 현재 로그인한 사용자 정보 조회 | ✅ 세션 또는 Bearer |
| POST | `/api/v1/auth/logout` | 세션 종료 및 쿠키 삭제 | ✅ 세션 또는 Bearer |

- **인증 방식**: 카카오 로그인 성공 시 세션(`connect.sid`)에 사용자 정보가 저장됩니다. `Authorization: Bearer <JWT>` 헤더가 있으면 `JWT_SECRET`으로 유효성을 확인합니다(토큰 발급은 제공하지 않음).

### 자산
| Method | Endpoint | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/api/v1/assets` | 자산 목록 조회(비로그인 시 소유자/민감 필드 마스킹) | ❌(선택적) |
| GET | `/api/v1/assets/:uid` | 자산 단건 조회 | ❌(선택적) |
| POST | `/api/v1/assets` | 자산 생성 | ✅ |
| PATCH | `/api/v1/assets/:uid` | 자산 수정 | ✅ |
| DELETE | `/api/v1/assets/:uid` | 자산 삭제 | ✅ (관리자만) |

- 비로그인 사용자는 `owner`, 비공개 메모 등의 필드가 제거된 데이터만 받을 수 있습니다.
- 현재 자산 데이터는 메모리에 저장된 샘플을 사용하며, 인증 시 원본 필드에 모두 접근할 수 있습니다.

### 레이트 리미팅
- `/api/v1/auth/*`: 15분 동안 IP당 5회
- 기타 `/api/v1` 요청: 15분 동안 IP당 100회

## 🧭 프로젝트 구조
```
oamanagev4/
├── README.md
└── backend/
    ├── src/
    │   ├── index.ts              # 서버 진입점(부팅 & 로그)
    │   ├── app.ts                # Express 설정, CORS, 세션, 라우트
    │   ├── config/               # 환경, DB, 인증 설정
    │   ├── controllers/          # Auth/Asset 컨트롤러
    │   ├── middlewares/          # 인증, 레이트 리미트 미들웨어
    │   ├── routes/               # /api/v1 라우트 정의
    │   ├── services/             # Kakao 연동, 자산 서비스
    │   ├── models/               # User 모델 (MySQL)
    │   └── utils/ & types/       # JWT 검증, 타입 정의
    ├── database/                 # DB 스키마 참고 파일
    ├── package.json
    └── tsconfig.json
```

## 🛡️ 보안 및 운영 팁
1. `.env`는 Git에 커밋하지 마세요.
2. 프로덕션에서는 강력한 `SESSION_SECRET`과 `JWT_SECRET`을 사용하고 HTTPS를 활성화하세요.
3. `ALLOWED_ORIGINS`에 신뢰할 수 있는 도메인만 등록하세요.
4. DB는 전용 계정/권한을 사용하고, 백업 주기를 설정하세요.
