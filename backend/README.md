# 언어 규칙
이 프로젝트의 모든 문서, 코드 주석, 설명, 시스템 메시지, 출력은 반드시 한국어로만 작성한다.
English is not allowed.

# OAManage V4 - 카카오 로그인 백엔드

TypeScript 기반 카카오 소셜 로그인을 구현한 백엔드 서버입니다.

## 📋 기술 스택

- **Node.js**: 22.x
- **TypeScript**: 5.9.3
- **Express**: 웹 프레임워크
- **Axios**: HTTP 클라이언트
- **express-session**: 세션 관리
- **MySQL**: 데이터베이스

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 데이터베이스 설정

MySQL을 설치하고 접근 가능한 계정을 준비하세요. 애플리케이션이 시작될 때 `DB_NAME`에 지정한 데이터베이스와 `users` 테이블을 자동으로 생성합니다. (초기 설정이 잘못되면 서버가 시작되지 않으니, 환경 변수를 정확히 입력하세요.)

### 3. 환경 변수 설정

`.env` 파일에 다음 내용을 입력하세요:

```env
# 카카오 로그인 설정
KAKAO_CLIENT_ID=여기에_REST_API_키_입력
KAKAO_CLIENT_SECRET=클라이언트_시크릿_사용_시_입력(선택)
KAKAO_REDIRECT_URI=http://localhost:3000/api/v1/auth/kakao/callback

# 퍼블릭 API 베이스 URL (리다이렉트/로그 안내용)
API_BASE_URL=http://localhost:3000

# 서버 설정
PORT=3000
SESSION_SECRET=랜덤한_시크릿_키_입력
NODE_ENV=development

# 프론트엔드 URL (CORS용)
FRONTEND_URL=http://localhost:3000

# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=여기에_MySQL_비밀번호_입력
DB_NAME=oamanage
```

### 4. 카카오 개발자 설정

1. [카카오 개발자 콘솔](https://developers.kakao.com/)에 접속
2. 애플리케이션 생성
3. **앱 설정 > 플랫폼 설정**에서 Web 플랫폼 추가
   - 사이트 도메인: `http://localhost:3000`
4. **제품 설정 > 카카오 로그인**
   - 카카오 로그인 활성화
   - Redirect URI: `http://localhost:3000/api/v1/auth/kakao/callback` 등록
   - (선택) 클라이언트 시크릿 사용 설정 시 발급된 코드 → `.env`의 `KAKAO_CLIENT_SECRET`에 입력
5. **앱 키**에서 REST API 키 복사 → `.env`의 `KAKAO_CLIENT_ID`에 입력

### 4-1. 리다이렉트 불일치 점검 방법 (localhost ↔︎ 127.0.0.1)

- 카카오 개발자 콘솔, `.env`의 `KAKAO_REDIRECT_URI`, 실제 요청 호스트(브라우저 주소창)의 **도메인 문자열이 완전히 같아야** 합니다. `localhost`와 `127.0.0.1`은 다른 값이므로 둘 중 하나를 쓰려면 모두 같은 값으로 맞추세요.
- `127.0.0.1`로 테스트하려면 다음을 모두 변경합니다.
  1. 카카오 개발자 콘솔 > Redirect URI: `http://127.0.0.1:3000/api/v1/auth/kakao/callback`
  2. `.env`의 `KAKAO_REDIRECT_URI`와 `API_BASE_URL`: `http://127.0.0.1:3000`
  3. 브라우저 접속 주소: `http://127.0.0.1:3000/api/v1/auth/kakao`
- 불일치 여부 확인 절차
  1. 서버 실행: `npm run dev`
  2. 카카오 로그인 시도 후 터미널 로그에서 `authorizeUrl`의 `redirect_uri`가 Kakao 콘솔에 등록한 값과 같은지 확인합니다. 값이 다르면 `KOE303 (Redirect URI mismatch)`가 발생합니다.
  3. 필요 시 `KAKAO_REDIRECT_URI`를 비워 두면 서버가 현재 요청 호스트를 기준으로 콜백 URL을 계산하므로, 다시 로그인해 `authorizeUrl`에 표시된 값이 브라우저 접속 주소와 일치하는지 확인합니다.

### 5. 개발 서버 실행

```bash
# 개발용 핫 리로드 서버
npm run dev

# 또는 빌드 후 프로덕션 모드 실행
npm run build
npm run start
```

서버가 `http://localhost:3000`에서 실행됩니다.

## 📡 API 엔드포인트

### 인증 관련

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|-----------|
| GET | `/` | 서버 상태 및 인증 엔드포인트 안내 | ❌ |
| GET | `/api/v1/auth/kakao` | 카카오 로그인 시작 | ❌ |
| GET | `/api/v1/auth/kakao/callback` | 카카오 로그인 콜백 | ❌ |
| GET | `/api/v1/auth/me` | 현재 사용자 정보 조회 | ✅ |
| POST | `/api/v1/auth/logout` | 로그아웃 | ✅ |

> 참고: 예전 경로인 `/auth/kakao` 또는 `/auth/kakao/callback`으로 접근해도 서버가 자동으로 `/api/v1` 프리픽스를 붙여 리다이렉트합니다.
> 카카오 개발자 콘솔과 프론트엔드 설정은 `/api/v1/auth/kakao/callback` 경로로 맞춰 주세요.

### 기타

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/health` | 헬스 체크 |

## 🔐 사용 방법

### 1. 로그인 시작

브라우저에서 다음 URL로 접속:
```
http://localhost:3000/api/v1/auth/kakao
```

### 2. 카카오 로그인 페이지

자동으로 카카오 로그인 페이지로 리다이렉트됩니다.

### 3. 로그인 완료

로그인 성공 시 설정한 프론트엔드 URL로 리다이렉트되며, 리다이렉트 URL의 쿼리 파라미터 `code`로 카카오가 반환한 일회용 인가 코드가 함께 전달됩니다. 카카오가 호출한 콜백 요청 전체 URL(예: `http://localhost:3000/api/v1/auth/kakao/callback?code=...`)도 함께 확인할 수 있습니다.
헤더 `Accept: application/json`을 포함해 콜백 엔드포인트를 호출하면 아래와 같이 JSON 응답으로도 인가 코드, 콜백 URL, 사용자 세션 정보를 확인할 수 있습니다.

```json
{
  "success": true,
  "message": "카카오 로그인에 성공했습니다.",
  "authorizationCode": "인가코드값",
  "callbackRequestUrl": "http://localhost:3000/api/v1/auth/kakao/callback?code=인가코드값",
  "user": {
    "id": 1,
    "kakaoId": "1234567890",
    "nickname": "홍길동",
    "email": "user@example.com",
    "profileImage": "http://..."
  },
  "redirectUrl": "http://localhost:3000/?code=인가코드값"
}
```

DB에 사용자 정보가 저장되고, 세션에 사용자 정보가 저장됩니다.

### 4. 사용자 정보 확인

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"
```

응답 예시:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "kakaoId": "1234567890",
    "nickname": "홍길동",
    "email": "user@example.com",
    "profileImage": "http://..."
  }
}
```

### 5. 로그아웃

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"
```

## 📂 프로젝트 구조

```
oamanagev4/
├── src/
│   ├── index.ts                 # 서버 진입점
│   ├── app.ts                   # Express 앱 설정
│   ├── config/                  # 설정 파일
│   │   ├── auth.ts              # 세션/JWT 설정
│   │   ├── database.ts          # DB 연결 설정
│   │   ├── env.ts               # 환경 변수 로드
│   │   └── social.ts            # 소셜 로그인 설정
│   ├── controllers/             # 컨트롤러
│   │   └── auth.controller.ts
│   ├── middlewares/             # 미들웨어
│   │   └── auth.middleware.ts
│   ├── models/                  # DB 모델
│   │   └── User.ts
│   ├── routes/                  # 라우트
│   │   ├── auth.routes.ts
│   │   └── index.ts
│   ├── services/                # 비즈니스 로직
│   │   └── kakaoAuth.service.ts
│   ├── repositories/            # DB 접근 계층 (계획)
│   │   └── README.md
│   ├── validators/              # 요청 검증 (계획)
│   │   └── README.md
│   ├── utils/                   # 유틸리티 (계획)
│   │   └── README.md
│   └── types/                   # TypeScript 타입 정의
│       ├── kakao.ts
│       └── session.d.ts
├── database/                    # 데이터베이스
│   ├── schema.sql               # DB 스키마
│   └── init.sh                  # DB 초기화 스크립트
├── .env                         # 환경 변수 (실제 값)
├── .env.example                 # 환경 변수 예시
├── .gitignore
├── README.md
├── nodemon.json
├── tsconfig.json
└── package.json
```

## 💾 데이터베이스 스키마

### users 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INT | 자동 증가 PK |
| kakao_id | VARCHAR(100) | 카카오 고유 ID (UNIQUE) |
| nickname | VARCHAR(100) | 닉네임 |
| email | VARCHAR(255) | 이메일 (선택) |
| profile_image | VARCHAR(500) | 프로필 이미지 URL (선택) |
| created_at | TIMESTAMP | 생성 시간 |
| updated_at | TIMESTAMP | 수정 시간 |

## 🔧 빌드 및 배포

### 빌드

```bash
npm run build
```

`dist/` 폴더에 컴파일된 JavaScript 파일이 생성됩니다.

### 프로덕션 실행

```bash
npm start
```

## 🛡️ 보안 고려사항

1. **환경 변수**: `.env` 파일을 Git에 커밋하지 마세요
2. **세션 시크릿**: 프로덕션에서는 강력한 랜덤 문자열 사용
3. **HTTPS**: 프로덕션에서는 반드시 HTTPS 사용
4. **CORS**: 신뢰할 수 있는 도메인만 허용
5. **데이터베이스**: 프로덕션에서는 별도의 DB 사용자 생성

## 📝 참고 문서

- [카카오 로그인 가이드](https://developers.kakao.com/docs/latest/ko/kakaologin/common)
- [Express 공식 문서](https://expressjs.com/)
- [TypeScript 공식 문서](https://www.typescriptlang.org/)
