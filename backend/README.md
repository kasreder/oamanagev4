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
KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback

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
   - Redirect URI: `http://localhost:3000/auth/kakao/callback` 등록
   - (선택) 클라이언트 시크릿 사용 설정 시 발급된 코드 → `.env`의 `KAKAO_CLIENT_SECRET`에 입력
5. **앱 키**에서 REST API 키 복사 → `.env`의 `KAKAO_CLIENT_ID`에 입력

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
| GET | `/auth/kakao` | 카카오 로그인 시작 | ❌ |
| GET | `/auth/kakao/callback` | 카카오 로그인 콜백 | ❌ |
| GET | `/auth/me` | 현재 사용자 정보 조회 | ✅ |
| POST | `/auth/logout` | 로그아웃 | ✅ |

### 기타

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/health` | 헬스 체크 |

## 🔐 사용 방법

### 1. 로그인 시작

브라우저에서 다음 URL로 접속:
```
http://localhost:3000/auth/kakao
```

### 2. 카카오 로그인 페이지

자동으로 카카오 로그인 페이지로 리다이렉트됩니다.

### 3. 로그인 완료

로그인 성공 시 설정한 프론트엔드 URL로 리다이렉트됩니다.
DB에 사용자 정보가 저장되고, 세션에 사용자 정보가 저장됩니다.

### 4. 사용자 정보 확인

```bash
curl http://localhost:3000/auth/me \
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
curl -X POST http://localhost:3000/auth/logout \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"
```

## 📂 프로젝트 구조

```
oamanagev4/
├── src/
│   ├── config/                  # 설정
│   │   └── database.ts          # DB 연결 설정
│   ├── controllers/             # 컨트롤러
│   │   └── auth.controller.ts
│   ├── middleware/              # 미들웨어
│   │   └── auth.middleware.ts
│   ├── models/                  # DB 모델
│   │   └── user.model.ts
│   ├── routes/                  # 라우트
│   │   └── auth.routes.ts
│   ├── services/                # 비즈니스 로직
│   │   └── kakaoAuth.service.ts
│   ├── types/                   # TypeScript 타입 정의
│   │   ├── kakao.ts
│   │   └── session.d.ts
│   ├── app.ts                   # Express 앱 설정
│   └── server.ts                # 서버 진입점
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
