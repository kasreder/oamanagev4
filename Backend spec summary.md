
# 백엔드 개발 명세 통합 문서

> OA Asset Manager 백엔드 개발을 위한 모든 명세를 한 곳에 정리

## 📋 목차
1. [기술 스택 요약](#기술-스택-요약)
2. [데이터베이스 스키마](#데이터베이스-스키마)
3. [API 엔드포인트](#api-엔드포인트)
4. [개발 순서](#개발-순서)
5. [파일 구조](#파일-구조)

---

## 기술 스택 요약

### 핵심 기술
- **Runtime**: Node.js 22.x
- **Language**: TypeScript 5.3.x
- **Framework**: Express 4.18.x
- **Database**: MySQL 8.x
- **ORM**: mysql2 (Raw SQL) 또는 TypeORM

### 주요 라이브러리
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "mysql2": "^3.6.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "dotenv": "^16.3.0",
    "cors": "^2.8.0",
    "multer": "^1.4.0",
    "joi": "^17.11.0",
    "axios": "^1.6.0",
    "winston": "^3.11.0",
    "helmet": "^7.1.0",
    "compression": "^1.7.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^22.0.0",
    "@types/express": "^4.17.0",
    "ts-node": "^10.9.0",
    "nodemon": "^3.0.0",
    "jest": "^29.7.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

---

## 데이터베이스 스키마

### 테이블 관계도
```
user (1) ────< asset_assignments >──── (M) assets
  │                                        │
  │                                        │
  └──────────< inspections >───────────────┘
                   │
                   └────< signatures
```

### 자동 테이블 생성 전략

백엔드 서버 시작 시 **자동으로 테이블을 생성**합니다.

#### 구현 방법: CREATE TABLE IF NOT EXISTS

```typescript
// src/config/database.ts
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import logger from '@/utils/logger';

dotenv.config();

export const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  waitForConnections: true,
  queueLimit: 0,
});

/**
 * 데이터베이스 연결 테스트
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await db.getConnection();
    logger.info('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    return false;
  }
};

/**
 * 테이블 자동 생성
 */
export const createTablesIfNotExists = async (): Promise<void> => {
  try {
    logger.info('🔄 Checking and creating tables...');
    
    // 1. user 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS user (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        employee_id VARCHAR(32) UNIQUE NOT NULL COMMENT '사번',
        name VARCHAR(64) NOT NULL COMMENT '사용자 이름',
        email VARCHAR(128) UNIQUE COMMENT '이메일',
        phone VARCHAR(32) COMMENT '전화번호',
        role VARCHAR(20) DEFAULT 'user' COMMENT 'user, admin',
        provider VARCHAR(20) COMMENT 'kakao, naver, google, teams',
        provider_id VARCHAR(128) COMMENT '플랫폼별 고유 ID',
        department_hq VARCHAR(64) COMMENT '본부',
        department_dept VARCHAR(64) COMMENT '부서',
        department_team VARCHAR(64) COMMENT '팀',
        department_part VARCHAR(64) COMMENT '파트',
        is_active BOOLEAN DEFAULT TRUE,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_provider (provider, provider_id),
        INDEX idx_department (department_team),
        INDEX idx_active (is_active),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    // 2. assets 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS assets (
        uid VARCHAR(64) PRIMARY KEY COMMENT '자산 관리 코드',
        name VARCHAR(128) COMMENT '자산 이름',
        asset_type VARCHAR(64) COMMENT '장비 분류',
        model_name VARCHAR(128) COMMENT '모델명',
        serial_number VARCHAR(128) COMMENT '시리얼 넘버',
        vendor VARCHAR(128) COMMENT '제조사',
        status VARCHAR(32) DEFAULT '사용' COMMENT '자산 상태',
        location_text VARCHAR(256),
        building VARCHAR(64),
        floor VARCHAR(32),
        location_row INT,
        location_col INT,
        owner_user_id BIGINT,
        metadata JSON COMMENT '추가 필드',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_user_id) REFERENCES user(id) ON DELETE SET NULL,
        INDEX idx_status (status),
        INDEX idx_type (asset_type),
        INDEX idx_owner (owner_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    // 3. inspections 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS inspections (
        id VARCHAR(64) PRIMARY KEY COMMENT '실사 식별자',
        asset_uid VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL,
        memo TEXT,
        scanned_at TIMESTAMP NOT NULL,
        synced BOOLEAN DEFAULT FALSE,
        user_team VARCHAR(128),
        user_id BIGINT,
        asset_type VARCHAR(64),
        verified BOOLEAN DEFAULT FALSE,
        barcode_photo_url VARCHAR(256),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_uid) REFERENCES assets(uid) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL,
        INDEX idx_asset_scanned (asset_uid, scanned_at DESC),
        INDEX idx_synced (synced),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    // 4. signatures 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS signatures (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        asset_uid VARCHAR(64) NOT NULL,
        user_id BIGINT NOT NULL,
        user_name VARCHAR(64),
        storage_location VARCHAR(256) NOT NULL,
        file_size INT,
        mime_type VARCHAR(50) DEFAULT 'image/png',
        sha256 CHAR(64) UNIQUE,
        captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_uid) REFERENCES assets(uid) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
        INDEX idx_asset_user (asset_uid, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    // 5. refresh_tokens 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        token VARCHAR(512) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    // 6. audit_logs 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT,
        action VARCHAR(50) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(128),
        changes JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL,
        INDEX idx_user_action (user_id, action),
        INDEX idx_resource (resource_type, resource_id),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    logger.info('✅ All tables created or already exist');
  } catch (error) {
    logger.error('❌ Failed to create tables:', error);
    throw error;
  }
};

/**
 * 데이터베이스 초기화 (테이블 생성 포함)
 */
export const initializeDatabase = async (): Promise<void> => {
  // 1. 연결 테스트
  const connected = await testConnection();
  if (!connected) {
    throw new Error('Database connection failed');
  }
  
  // 2. 테이블 자동 생성
  await createTablesIfNotExists();
};
```

#### 서버 시작 시 자동 초기화

```typescript
// src/index.ts
import express, { Application } from 'express';
import dotenv from 'dotenv';
import { initializeDatabase } from '@/config/database';
import logger from '@/utils/logger';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
// ... (생략)

/**
 * 서버 시작
 */
const startServer = async () => {
  try {
    // 🔥 데이터베이스 자동 초기화 (테이블 생성 포함)
    await initializeDatabase();
    
    app.listen(PORT, () => {
      logger.info(`🚀 Server is running on http://127.0.0.1:${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🗄️  Database: ${process.env.DB_NAME}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
```

### 서버 시작 로그 예시

```
✅ Database connected successfully
🔄 Checking and creating tables...
✅ All tables created or already exist
🚀 Server is running on http://127.0.0.1:3000
📊 Environment: development
🗄️  Database: oa_asset_manager
```

### 1. user 테이블
```sql
CREATE TABLE user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id VARCHAR(32) UNIQUE NOT NULL COMMENT '사번',
  name VARCHAR(64) NOT NULL COMMENT '사용자 이름',
  email VARCHAR(128) UNIQUE COMMENT '이메일',
  phone VARCHAR(32) COMMENT '전화번호',
  
  -- 소셜 로그인
  provider VARCHAR(20) COMMENT 'kakao, naver, google, teams',
  provider_id VARCHAR(128) COMMENT '플랫폼별 고유 ID',
  
  -- 조직 정보
  department_hq VARCHAR(64) COMMENT '본부',
  department_dept VARCHAR(64) COMMENT '부서',
  department_team VARCHAR(64) COMMENT '팀',
  department_part VARCHAR(64) COMMENT '파트',
  
  -- 상태
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_provider (provider, provider_id),
  INDEX idx_department (department_team),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. assets 테이블
```sql
CREATE TABLE assets (
  uid VARCHAR(64) PRIMARY KEY COMMENT '자산 관리 코드',
  name VARCHAR(128) COMMENT '자산 이름',
  asset_type VARCHAR(64) COMMENT '장비 분류',
  model_name VARCHAR(128) COMMENT '모델명',
  serial_number VARCHAR(128) COMMENT '시리얼 넘버',
  vendor VARCHAR(128) COMMENT '제조사',
  status VARCHAR(32) DEFAULT '사용' COMMENT '자산 상태',
  
  -- 위치
  location_text VARCHAR(256),
  building VARCHAR(64),
  floor VARCHAR(32),
  location_row INT,
  location_col INT,
  
  -- 소유자
  owner_user_id BIGINT,
  
  -- 메타데이터 (JSON)
  metadata JSON COMMENT '추가 필드',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (owner_user_id) REFERENCES user(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_type (asset_type),
  INDEX idx_owner (owner_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3. inspections 테이블
```sql
CREATE TABLE inspections (
  id VARCHAR(64) PRIMARY KEY COMMENT '실사 식별자',
  asset_uid VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  memo TEXT,
  scanned_at TIMESTAMP NOT NULL,
  synced BOOLEAN DEFAULT FALSE,
  
  -- 실사자
  user_team VARCHAR(128),
  user_id BIGINT,
  
  -- 자산 스냅샷
  asset_type VARCHAR(64),
  
  -- 인증
  verified BOOLEAN DEFAULT FALSE,
  barcode_photo_url VARCHAR(256),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (asset_uid) REFERENCES assets(uid) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL,
  INDEX idx_asset_scanned (asset_uid, scanned_at DESC),
  INDEX idx_synced (synced),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4. signatures 테이블
```sql
CREATE TABLE signatures (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  asset_uid VARCHAR(64) NOT NULL,
  user_id BIGINT NOT NULL,
  user_name VARCHAR(64),
  
  -- 파일 정보
  storage_location VARCHAR(256) NOT NULL,
  file_size INT,
  mime_type VARCHAR(50) DEFAULT 'image/png',
  sha256 CHAR(64) UNIQUE,
  
  captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (asset_uid) REFERENCES assets(uid) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  INDEX idx_asset_user (asset_uid, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5. refresh_tokens 테이블
```sql
CREATE TABLE refresh_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  token VARCHAR(512) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 6. audit_logs 테이블
```sql
CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(128),
  changes JSON,
  
  -- 요청 정보
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL,
  INDEX idx_user_action (user_id, action),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## API 엔드포인트

### 인증 전략 및 접근 제어

### 인증 정책
앱은 **부분적 공개 접근(Partial Public Access)** 정책을 따릅니다.

#### 공개 접근 가능 (인증 불필요)
```
✅ 로그인 없이 접근 가능한 엔드포인트
```

| 엔드포인트 | 설명 | 제한사항 |
|-----------|------|---------|
| `GET /api/v1/health` | 헬스 체크 | 없음 |
| `GET /api/v1/assets` | 자산 목록 조회 (읽기 전용) | 페이지당 20개, 민감 정보 제외 |
| `GET /api/v1/assets/:uid` | 자산 상세 조회 (읽기 전용) | 소유자 정보 제외 |
| `GET /api/v1/references/assets` | 자산 UID 자동완성 | 기본 정보만 |
| `POST /api/v1/auth/social/*` | 소셜 로그인 | 없음 |
| `POST /api/v1/auth/refresh` | 토큰 갱신 | Refresh 토큰 필요 |

#### 인증 필요 (JWT 토큰 필수)
```
🔒 로그인 후에만 접근 가능
```

| 엔드포인트 | 설명 | 권한 |
|-----------|------|------|
| `POST /api/v1/assets` | 자산 등록/수정 | 일반 사용자 |
| `DELETE /api/v1/assets/:uid` | 자산 삭제 | 관리자만 |
| `POST /api/v1/inspections` | 실사 등록 | 일반 사용자 |
| `PATCH /api/v1/inspections/:id` | 실사 수정 | 본인 또는 관리자 |
| `DELETE /api/v1/inspections/:id` | 실사 삭제 | 본인 또는 관리자 |
| `POST /api/v1/verifications/*/signatures` | 서명 업로드 | 일반 사용자 |
| `GET /api/v1/users/me` | 내 정보 조회 | 본인 |
| `PATCH /api/v1/users/me` | 내 정보 수정 | 본인 |

### 미들웨어 전략

#### 1. Optional Auth Middleware (선택적 인증)
```typescript
// src/middlewares/optional-auth.middleware.ts
/**
 * 토큰이 있으면 검증하고, 없어도 진행
 * req.user가 있으면 → 인증된 사용자
 * req.user가 없으면 → 게스트 사용자
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      req.user = decoded as User;
    } catch (error) {
      // 토큰이 유효하지 않아도 에러 없이 진행
      req.user = undefined;
    }
  }
  
  next();
};
```

#### 2. Required Auth Middleware (필수 인증)
```typescript
// src/middlewares/auth.middleware.ts
/**
 * 토큰이 반드시 필요
 * 없거나 유효하지 않으면 401 에러
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: '인증이 필요합니다' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded as User;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'INVALID_TOKEN', message: '유효하지 않은 토큰입니다' });
  }
};
```

#### 3. Admin Only Middleware (관리자 전용)
```typescript
// src/middlewares/admin.middleware.ts
/**
 * 관리자 권한 필요
 * 일반 사용자는 403 에러
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'FORBIDDEN', message: '관리자 권한이 필요합니다' });
  }
  
  next();
};
```

### 라우트별 미들웨어 적용

```typescript
// src/routes/asset.routes.ts
import { Router } from 'express';
import { optionalAuth } from '@/middlewares/optional-auth.middleware';
import { requireAuth } from '@/middlewares/auth.middleware';
import { requireAdmin } from '@/middlewares/admin.middleware';

const router = Router();

// 공개 접근 (선택적 인증)
router.get('/', optionalAuth, assetController.getAssets);
router.get('/:uid', optionalAuth, assetController.getAssetByUid);

// 인증 필요
router.post('/', requireAuth, assetController.createAsset);
router.patch('/:uid', requireAuth, assetController.updateAsset);

// 관리자 전용
router.delete('/:uid', requireAuth, requireAdmin, assetController.deleteAsset);
```

### 공개 API 응답 데이터 제한

#### 게스트 사용자 (미인증)
```typescript
// 민감 정보 제외한 응답
{
  "uid": "OA-001",
  "assetType": "노트북",
  "modelName": "Gram 15",
  "status": "사용",
  "location": "본사 A동 3F",
  // owner 정보 제외
  // metadata 제한적 노출
  "metadata": {
    "os": "Windows 11"
    // memo, memo2 제외
  }
}
```

#### 인증된 사용자
```typescript
// 전체 정보 포함
{
  "uid": "OA-001",
  "name": "홍길동",
  "assetType": "노트북",
  "modelName": "Gram 15",
  "status": "사용",
  "location": "본사 A동 3F",
  "organization": "정보보안팀",
  "owner": {
    "id": 1,
    "name": "홍길동",
    "email": "hong@example.com"
  },
  "metadata": {
    "os": "Windows 11",
    "memo": "교체 예정",
    "memo2": "내부 메모"
  }
}
```

### 서비스 레이어에서 데이터 필터링

```typescript
// src/services/asset.service.ts
export class AssetService {
  async getAssets(filters: any, user?: User) {
    const assets = await this.assetRepository.findAll(filters);
    
    // 게스트 사용자면 민감 정보 제거
    if (!user) {
      return assets.map(asset => this.sanitizeForPublic(asset));
    }
    
    // 인증된 사용자는 전체 정보 반환
    return assets;
  }
  
  private sanitizeForPublic(asset: Asset) {
    const { owner, metadata, ...publicData } = asset;
    
    return {
      ...publicData,
      metadata: {
        os: metadata?.os,
        // 민감 정보 제외
      }
    };
  }
}
```

### user 테이블에 role 컬럼 추가

```sql
-- migrations/001_create_user.sql 수정
CREATE TABLE user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(64) NOT NULL,
  email VARCHAR(128) UNIQUE,
  phone VARCHAR(32),
  
  -- 권한 추가
  role VARCHAR(20) DEFAULT 'user' COMMENT 'user, admin',
  
  -- 소셜 로그인
  provider VARCHAR(20),
  provider_id VARCHAR(128),
  
  -- ... 나머지 컬럼
  
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 권한 레벨

| 역할 | 권한 | 설명 |
|------|------|------|
| **guest** | 읽기 전용 (제한적) | 로그인하지 않은 사용자, 기본 자산 정보만 조회 |
| **user** | 읽기 + 쓰기 | 로그인한 일반 사용자, 자산/실사 등록 및 수정 가능 |
| **admin** | 모든 권한 | 관리자, 삭제 및 모든 데이터 접근 가능 |

### CORS 설정 (공개 접근 지원)

```typescript
// src/app.ts
import cors from 'cors';

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Rate Limiting (공개 API 보호)

```typescript
// src/middlewares/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';

// 공개 API용 제한
export const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100 요청
  message: { error: 'TOO_MANY_REQUESTS', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }
});

// 인증 API용 제한 (더 엄격)
export const authApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 최대 5회 로그인 시도
  message: { error: 'TOO_MANY_ATTEMPTS', message: '로그인 시도가 너무 많습니다.' }
});
```

```typescript
// src/routes/index.ts
import { publicApiLimiter, authApiLimiter } from '@/middlewares/rate-limit.middleware';

// 공개 API에 Rate Limit 적용
router.use('/assets', publicApiLimiter);
router.use('/auth', authApiLimiter);
```

## 소셜 로그인 OAuth 플로우 및 리다이렉트 URI

### OAuth 2.0 인증 플로우

```
사용자 → Flutter 앱 → SNS OAuth 서버 → Callback URL → 백엔드 서버 → Flutter 앱
```

#### 상세 플로우

1. **Flutter 앱**: 소셜 로그인 버튼 클릭
2. **SNS SDK**: OAuth 인증 화면 열기 (웹뷰 또는 브라우저)
3. **사용자**: SNS 계정으로 로그인 및 권한 승인
4. **SNS 서버**: 인증 성공 후 Redirect URI로 리다이렉트
5. **Callback 처리**: Authorization Code 또는 Access Token 획득
6. **Flutter → 백엔드**: Access Token을 백엔드로 전송
7. **백엔드**: Token 검증 → 사용자 정보 조회 → JWT 발급
8. **Flutter**: JWT 저장 및 로그인 완료

### 리다이렉트 URI 설정

#### 개발 환경 (127.0.0.1)
```env
KAKAO_REDIRECT_URI=http://127.0.0.1:3000/api/v1/auth/kakao/callback
NAVER_REDIRECT_URI=http://127.0.0.1:3000/api/v1/auth/naver/callback
GOOGLE_REDIRECT_URI=http://127.0.0.1:3000/api/v1/auth/google/callback
TEAMS_REDIRECT_URI=http://127.0.0.1:3000/api/v1/auth/teams/callback
```

#### 프로덕션 환경
```env
KAKAO_REDIRECT_URI=https://api.yourdomain.com/api/v1/auth/kakao/callback
NAVER_REDIRECT_URI=https://api.yourdomain.com/api/v1/auth/naver/callback
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/v1/auth/google/callback
TEAMS_REDIRECT_URI=https://api.yourdomain.com/api/v1/auth/teams/callback
```

### 각 플랫폼별 앱 등록 가이드

#### 1. 카카오 (Kakao Developers)
- **등록 사이트**: https://developers.kakao.com/
- **설정 경로**: 내 애플리케이션 → 앱 선택 → 제품 설정 → 카카오 로그인
- **필요 정보**: REST API 키, Redirect URI
- **요청 권한**: 프로필 정보, 카카오계정(이메일)

#### 2. 네이버 (Naver Developers)
- **등록 사이트**: https://developers.naver.com/apps
- **설정 경로**: Application → 내 애플리케이션 → API 설정
- **필요 정보**: Client ID, Client Secret, Callback URL
- **요청 권한**: 회원이름, 이메일 주소, 프로필 사진

#### 3. 구글 (Google Cloud Console)
- **등록 사이트**: https://console.cloud.google.com/
- **설정 경로**: API 및 서비스 → 사용자 인증 정보 → OAuth 2.0 클라이언트 ID
- **필요 정보**: Client ID, Client Secret, 승인된 리디렉션 URI
- **요청 권한**: openid, profile, email

#### 4. Microsoft Teams (Azure Portal)
- **등록 사이트**: https://portal.azure.com/
- **설정 경로**: Azure Active Directory → 앱 등록 → 새 등록
- **필요 정보**: Application ID, Client Secret, Tenant ID, Redirect URI
- **요청 권한**: User.Read, email, profile

### Callback 엔드포인트 구현 예시

```typescript
// src/routes/auth.routes.ts
router.get('/kakao/callback', authController.kakaoCallback);
router.get('/naver/callback', authController.naverCallback);
router.get('/google/callback', authController.googleCallback);
router.get('/teams/callback', authController.teamsCallback);

// src/controllers/auth.controller.ts
export const kakaoCallback = async (req: Request, res: Response) => {
  const { code } = req.query;
  
  // 1. Authorization Code로 Access Token 요청
  const tokenResponse = await axios.post('https://kauth.kakao.com/oauth/token', {
    grant_type: 'authorization_code',
    client_id: process.env.KAKAO_REST_API_KEY,
    redirect_uri: process.env.KAKAO_REDIRECT_URI,
    code,
  });
  
  // 2. Access Token으로 사용자 정보 조회
  // 3. 사용자 생성 또는 조회
  // 4. JWT 토큰 생성
  // 5. Flutter 앱으로 리다이렉트 (Deep Link)
  res.redirect(`myapp://auth/callback?token=${jwt}`);
};
```

### 브라우저 테스트 URL

```
# 카카오
https://kauth.kakao.com/oauth/authorize?client_id={REST_API_KEY}&redirect_uri=http://127.0.0.1:3000/api/v1/auth/kakao/callback&response_type=code

# 네이버
https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id={CLIENT_ID}&redirect_uri=http://127.0.0.1:3000/api/v1/auth/naver/callback&state=RANDOM

# 구글
https://accounts.google.com/o/oauth2/v2/auth?client_id={CLIENT_ID}&redirect_uri=http://127.0.0.1:3000/api/v1/auth/google/callback&response_type=code&scope=openid%20profile%20email
```

## 인증 (Authentication)

### 1. OAuth 콜백 (모바일 앱 연동)
```
GET /api/v1/auth/kakao/callback
GET /api/v1/auth/naver/callback
GET /api/v1/auth/google/callback
GET /api/v1/auth/teams/callback
```
**Query Parameters:**
- `code`, `state`: OAuth 2.0 Authorization Code Flow에서 전달되는 값
- `access_token`: 일부 SDK(카카오, Teams 등)에서 Implicit Flow로 내려주는 토큰
- `error`, `error_description`: 인증 실패 시 오류 정보

**동작:**
- 쿼리 파라미터를 검증하고 `APP_AUTH_CALLBACK_URI`(기본값 `myapp://auth/callback`)로 302 Redirect
- 성공 시 `status=success`와 함께 `code` 또는 `access_token` 전달
- 실패 시 `status=error`와 함께 `error`, `error_description` 전달

### 2. 소셜 로그인 토큰 교환
```
POST /api/v1/auth/social/{provider}
```
**Path Variable:**
- `provider`: `kakao|naver|google|teams`
  - 실제 구현에서는 `backend/src/services/auth.service.ts`의 `SUPPORTED_PROVIDERS` 상수로 관리하며 **네 가지 제공자를 모두 사용**합니다.
  - 새 소셜 로그인을 추가하거나 제거하려면 `SUPPORTED_PROVIDERS`와 `backend/src/config/social.ts`에 있는 각 Provider 설정을 함께 수정해야 합니다.

**Request Body:**
```json
{
  "accessToken": "플랫폼_액세스_토큰",
  "provider": "kakao"
}
```
- `accessToken`은 필수, body의 `provider`가 존재할 경우 URL의 provider와 일치해야 함

**Response:**
```json
{
  "access_token": "jwt_access_token",
  "refresh_token": "jwt_refresh_token",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "name": "홍길동",
    "email": "hong@example.com",
    "provider": "kakao",
    "role": "user",
    "employeeId": "KAKAO-1a2b3c4d5e6f"
  }
}
```
- 로그인 성공 시 기존 Refresh 토큰은 모두 폐기되고 새 Refresh 토큰으로 교체됨

#### 3. 토큰 갱신
```
POST /api/v1/auth/refresh
```
**Request Body:**
```json
{
  "refresh_token": "refresh_token_value"
}
```

**Response:**
```json
{
  "access_token": "새로운_access_token",
  "refresh_token": "새로운_refresh_token",
  "expires_in": 3600
}
```
- 전달된 Refresh 토큰의 만료 여부를 검증한 뒤 Access/Refresh 토큰을 모두 재발급

#### 4. 로그아웃
```
POST /api/v1/auth/logout
Headers: Authorization: Bearer <token>
```
- **Request Body (optional):**
```json
{
  "refreshToken": "선택적으로 전달"
}
```
- Refresh 토큰을 전달하면 해당 토큰만 삭제, 미전달 시 사용자 계정의 Refresh 토큰을 모두 폐기

---

### 자산 (Assets)

#### 1. 자산 목록 조회
```
GET /api/v1/assets?q=검색어&status=사용&team=팀명&page=0&pageSize=20
```
**Response:**
```json
{
  "items": [
    {
      "uid": "OA-001",
      "name": "홍길동",
      "assetType": "노트북",
      "modelName": "Gram 15",
      "status": "사용",
      "location": "본사 A동 3F",
      "organization": "정보보안팀",
      "metadata": { "os": "Windows 11" },
      "owner": { "id": 1, "name": "홍길동" }
    }
  ],
  "page": 0,
  "pageSize": 20,
  "total": 240
}
```

#### 2. 자산 상세 조회
```
GET /api/v1/assets/{uid}
```

#### 3. 자산 등록/수정
```
POST /api/v1/assets
```
**Request:**
```json
{
  "uid": "OA-001",
  "name": "홍길동",
  "assetType": "노트북",
  "status": "사용",
  "modelName": "Gram 15",
  "serialNumber": "SN123",
  "location": "본사 A동 3F",
  "organization": "정보보안팀",
  "metadata": { "os": "Windows 11" }
}
```

#### 4. 자산 삭제
```
DELETE /api/v1/assets/{uid}
```

---

### 실사 (Inspections)

#### 1. 실사 목록 조회
```
GET /api/v1/inspections?assetUid=OA-001&synced=false&page=0&pageSize=20
```

#### 2. 실사 등록
```
POST /api/v1/inspections
```
**Request:**
```json
{
  "assetUid": "OA-001",
  "status": "사용",
  "memo": "점검 완료",
  "scannedAt": "2024-02-01T09:12:00Z",
  "userTeam": "정보보안팀",
  "verified": true
}
```

#### 3. 실사 수정
```
PATCH /api/v1/inspections/{id}
```

#### 4. 실사 삭제
```
DELETE /api/v1/inspections/{id}
```

---

### 인증/서명 (Verifications)

#### 1. 인증 목록 조회
```
GET /api/v1/verifications
```

#### 2. 인증 상세 조회
```
GET /api/v1/verifications/{assetUid}
```

#### 3. 서명 업로드
```
POST /api/v1/verifications/{assetUid}/signatures
Content-Type: multipart/form-data

Fields:
- file: PNG 이미지
- userId: 사용자 ID
- userName: 사용자 이름
```

#### 4. 서명 다운로드
```
GET /api/v1/verifications/{assetUid}/signatures
```

---

### 사용자 (Users)

#### 1. 현재 사용자 정보
```
GET /api/v1/users/me
Headers: Authorization: Bearer <token>
```

#### 2. 사용자 정보 수정
```
PATCH /api/v1/users/me
```

#### 3. 사용자 검색 (자동완성)
```
GET /api/v1/references/users?q=검색어&team=팀명
```

---

## 개발 순서

### Phase 1: 프로젝트 초기 설정 (30분)
```bash
# 체크리스트
□ 프로젝트 폴더 생성
□ package.json 설정
□ TypeScript 설정 (tsconfig.json)
□ ESLint & Prettier 설정
□ .env 파일 설정
□ .gitignore 설정
□ Git 초기화 및 첫 커밋
```

**커밋 예시:**
```
chore: 프로젝트 초기 설정
- package.json 의존성 추가
- TypeScript 설정
- ESLint, Prettier 설정
- 환경 변수 템플릿 생성
```

---

### Phase 2: 데이터베이스 설정 (30분)
```bash
# 체크리스트
□ MySQL 데이터베이스 생성
□ DB 연결 설정 (src/config/database.ts)
  - testConnection()
  - createTablesIfNotExists() (6개 테이블 CREATE TABLE IF NOT EXISTS)
  - initializeDatabase()
□ 테스트 연결
```

**커밋 예시:**
```
feat: 데이터베이스 자동 초기화 구현
- MySQL 연결 설정
- 서버 시작 시 자동 테이블 생성 (CREATE TABLE IF NOT EXISTS)
- 6개 테이블 정의 (user, assets, inspections, signatures, refresh_tokens, audit_logs)
```

**참고:** 
- 서버 시작 시 테이블이 없으면 자동으로 생성됩니다
- 별도의 마이그레이션 파일이나 SQL 스크립트 불필요

---

### Phase 3: 기본 서버 구조 (1시간)
```bash
# 체크리스트
□ src/index.ts (서버 엔트리)
□ src/app.ts (Express 앱 설정)
□ src/config/
  - database.ts
  - auth.ts
  - social.ts
□ src/middlewares/
  - error.middleware.ts
  - logger.middleware.ts
  - auth.middleware.ts (필수 인증)
  - optional-auth.middleware.ts (선택적 인증) ⭐ NEW
  - admin.middleware.ts (관리자 전용) ⭐ NEW
  - rate-limit.middleware.ts (API 제한) ⭐ NEW
□ src/utils/
  - logger.ts
  - jwt.util.ts
□ src/types/
  - express.d.ts
  - api.types.ts
```

**커밋 예시:**
```
feat: Express 서버 기본 구조
- 서버 엔트리 포인트
- 미들웨어 설정 (인증, 선택적 인증, 관리자)
- 에러 핸들러
- Rate Limiting
- 로거 유틸리티
```

---

### Phase 4: 인증 시스템 (2-3시간)
```bash
# 체크리스트
□ src/models/User.ts
□ src/repositories/user.repository.ts
□ src/services/auth.service.ts
  - JWT 생성/검증
  - 소셜 로그인 통합
    - 카카오 검증
    - 네이버 검증
    - 구글 검증
    - 팀즈 검증
  - Refresh 토큰 관리
□ src/controllers/auth.controller.ts
□ src/routes/auth.routes.ts
□ src/validators/auth.validator.ts
```

**커밋 예시:**
```
feat: 인증 시스템 구현
- JWT 토큰 생성/검증
- 소셜 로그인 통합 (카카오, 네이버, 구글, 팀즈)
- Refresh 토큰 관리
- 인증 미들웨어
```

---

### Phase 5: 자산 관리 API (2시간)
```bash
# 체크리스트
□ src/models/Asset.ts
□ src/repositories/asset.repository.ts
  - findAll (페이징, 필터링, 검색)
  - findByUid
  - create
  - update
  - delete (soft delete)
□ src/services/asset.service.ts
□ src/controllers/asset.controller.ts
□ src/routes/asset.routes.ts
□ src/validators/asset.validator.ts
```

**커밋 예시:**
```
feat: 자산 관리 API 구현
- 자산 CRUD 엔드포인트
- 검색 및 필터링
- 페이지네이션
```

---

### Phase 6: 실사 관리 API (1.5시간)
```bash
# 체크리스트
□ src/models/Inspection.ts
□ src/repositories/inspection.repository.ts
□ src/services/inspection.service.ts
□ src/controllers/inspection.controller.ts
□ src/routes/inspection.routes.ts
□ src/validators/inspection.validator.ts
```

**커밋 예시:**
```
feat: 실사 관리 API 구현
- 실사 CRUD 엔드포인트
- 동기화 상태 관리
- 자산-실사 관계 처리
```

---

### Phase 7: 인증/서명 API (2시간)
```bash
# 체크리스트
□ src/models/Signature.ts
□ src/repositories/signature.repository.ts
□ src/services/signature.service.ts
  - 파일 업로드 처리 (multer)
  - 이미지 검증 (크기, 형식)
  - 파일 저장 (로컬/S3)
  - 서명 조회
□ src/controllers/verification.controller.ts
□ src/routes/verification.routes.ts
□ src/middlewares/upload.middleware.ts
```

**커밋 예시:**
```
feat: 인증/서명 API 구현
- 서명 이미지 업로드
- 파일 검증 및 저장
- 인증 상태 조회
```

---

### Phase 8: 보조 기능 (1시간)
```bash
# 체크리스트
□ src/services/audit.service.ts (감사 로그)
□ src/controllers/reference.controller.ts
  - 사용자 검색
  - 자산 UID 자동완성
□ src/routes/reference.routes.ts
□ Health check 엔드포인트
```

**커밋 예시:**
```
feat: 보조 서비스 구현
- 감사 로그 기록
- 자동완성 API
- Health check
```

---

### Phase 9: 테스트 (2시간)
```bash
# 체크리스트
□ test/unit/services/auth.service.test.ts
□ test/unit/repositories/user.repository.test.ts
□ test/integration/auth.test.ts
□ test/integration/assets.test.ts
□ Jest 설정
```

**커밋 예시:**
```
test: API 테스트 케이스 작성
- 인증 API 테스트
- 자산 API 테스트
- 통합 테스트
```

---

## 파일 구조

```
backend/
├── src/
│   ├── index.ts                # 서버 진입점 (app을 불러와 포트 리스닝)
│   ├── app.ts                  # Express 앱, CORS/세션/라우트 설정
│   ├── config/
│   │   ├── env.ts              # .env 강제 로드 (프로젝트 루트 고정)
│   │   ├── auth.ts             # 세션 및 JWT 설정
│   │   ├── database.ts         # MySQL 풀 생성, DB/테이블 자동 생성
│   │   └── social.ts           # 카카오 OAuth 설정
│   ├── controllers/
│   │   └── auth.controller.ts  # 카카오 로그인/콜백/세션 조회/로그아웃
│   ├── middlewares/
│   │   └── auth.middleware.ts  # 인증 미들웨어 (계획/스켈레톤)
│   ├── models/
│   │   └── User.ts             # 사용자 모델 타입 정의
│   ├── routes/
│   │   ├── index.ts            # 기본 라우트 묶음
│   │   └── auth.routes.ts      # /auth 하위 라우트 선언
│   ├── services/
│   │   └── kakaoAuth.service.ts # 카카오 토큰 교환/사용자 저장 로직
│   ├── repositories/README.md  # 저장소 계층 가이드(계획)
│   ├── validators/README.md    # 요청 검증 가이드(계획)
│   ├── utils/README.md         # 유틸 가이드(계획)
│   └── types/
│       ├── kakao.ts            # 카카오 API 응답 타입 정의
│       └── session.d.ts        # express-session 커스텀 타입
├── database/schema.sql         # user 테이블 스키마
├── nodemon.json                # 개발용 ts-node 실행 설정
├── package.json                # 의존성 및 스크립트
├── tsconfig.json               # TypeScript 설정
├── README.md                   # 프로젝트 설명
└── Backend spec summary.md     # 백엔드 명세 (본 문서)
```

---

## 환경 변수 (.env)

```env
# 애플리케이션 기본 설정
NODE_ENV=development
PORT=3000
API_BASE_URL=http://127.0.0.1:3000
FRONTEND_URL=http://127.0.0.1:3000

# 세션/JWT
SESSION_SECRET=your-secret-key
JWT_SECRET=change-this-secret
JWT_EXPIRES_IN=1h

# 카카오 로그인 설정
KAKAO_CLIENT_ID=REST_API_키
KAKAO_CLIENT_SECRET=클라이언트_시크릿_옵션
KAKAO_REDIRECT_URI=http://127.0.0.1:3000/api/v1/auth/kakao/callback

# 데이터베이스 설정
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=kasreder
DB_NAME=oa_asset_manager
```

---

## TypeScript 실행 방법 ⚠️ 중요

### TypeScript는 직접 실행할 수 없습니다!
TypeScript는 JavaScript로 **컴파일**이 필요합니다.

### 실행 방식 비교

| 언어 | 직접 실행 | 컴파일 필요 |
|------|----------|------------|
| **JavaScript** | `node index.js` ✅ | 불필요 |
| **TypeScript** | `node index.ts` ❌ | 필수 |

### 개발 시 실행 (ts-node 사용)
```bash
# nodemon + ts-node로 자동 재시작
npm run dev

# 내부 동작:
# → nodemon이 파일 변경 감지
# → ts-node가 TypeScript를 메모리에서 즉시 컴파일 & 실행
```

### 프로덕션 실행 (컴파일 후 실행)
```bash
# 1단계: TypeScript → JavaScript 컴파일
npm run build
# 결과: src/*.ts → dist/*.js 생성

# 2단계: 컴파일된 JavaScript 실행
npm start
# 실제 실행: node dist/index.js
```

### nodemon.json 설정 (이미 포함됨)
```json
{
  "watch": ["src"],
  "ext": "ts,json",
  "exec": "ts-node -r tsconfig-paths/register src/index.ts",
  "env": {
    "NODE_ENV": "development"
  }
}
```

## 실행 명령어

### 개발 명령어
```bash
# 개발 서버 실행 (자동 재시작)
npm run dev

# 타입 체크만 (컴파일 안함)
npm run type-check

# 린트 체크
npm run lint

# 린트 자동 수정
npm run lint:fix

# 코드 포맷팅
npm run format
```

### 빌드 & 실행
```bash
# TypeScript → JavaScript 컴파일
npm run build

# 컴파일 결과물 삭제 후 재빌드
npm run rebuild

# 프로덕션 실행
npm start

# 또는 환경 변수와 함께
npm run start:prod
```

### 테스트
```bash
# 전체 테스트 실행
npm test

# 테스트 Watch 모드
npm run test:watch

# 테스트 커버리지
npm run test:coverage
```

### 데이터베이스
```bash
# 시드 데이터 생성 (선택)
npm run db:seed
```

**참고:** 
- `npm run dev` 실행 시 테이블이 자동으로 생성됩니다
- 별도의 마이그레이션 명령어는 필요하지 않습니다

### 실행 흐름 예시

#### 개발 모드 (npm run dev)
```
파일 저장
   ↓
nodemon 감지
   ↓
ts-node 실행
   ↓
메모리에서 컴파일
   ↓
즉시 실행
   ↓
콘솔 출력: 🚀 Server is running...
```

#### 프로덕션 모드 (npm run build → npm start)
```
npm run build
   ↓
tsc 컴파일러 실행
   ↓
src/*.ts → dist/*.js 생성
   ↓
npm start
   ↓
node dist/index.js 실행
   ↓
서버 시작
```

---

## 빠른 시작 가이드 🚀

### 1️⃣ 초기 설정 (처음 한 번만)
```bash
# 프로젝트 폴더 생성
mkdir oa-asset-backend
cd oa-asset-backend

# Git 초기화
git init

# package.json 생성
npm init -y

# 의존성 설치 (한 줄로)
npm install express mysql2 jsonwebtoken bcrypt dotenv cors multer joi express-validator axios winston helmet compression && npm install -D typescript @types/node @types/express @types/jsonwebtoken @types/bcrypt @types/cors @types/multer @types/joi ts-node nodemon tsconfig-paths eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier eslint-plugin-prettier jest @types/jest ts-jest supertest @types/supertest

# TypeScript 설정 생성
npx tsc --init

# 환경 변수 파일 생성
cp .env.example .env
# .env 파일 수정 (DB 비밀번호 등)
```

### 2️⃣ MySQL 데이터베이스 생성
```bash
mysql -u root -p
```
```sql
CREATE DATABASE oa_asset_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

**중요:** 테이블은 서버 시작 시 자동으로 생성됩니다! 수동 생성 불필요.

### 3️⃣ 환경 변수 설정
```bash
# .env 파일 편집
vi .env

# 또는
nano .env
```

필수 설정:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=oa_asset_manager

AUTO_MIGRATE=true  # 자동 테이블 생성 활성화
```

### 4️⃣ 개발 서버 실행 (테이블 자동 생성 포함)
```bash
npm run dev
```

**성공 시 출력:**
```
✅ Database connected successfully
🔄 Checking and creating tables...
✅ All tables created or already exist
🚀 Server is running on http://127.0.0.1:3000
📊 Environment: development
🗄️  Database: oa_asset_manager
```

### 5️⃣ API 테스트
```bash
# Health Check
curl http://127.0.0.1:3000/api/v1/health

# 예상 응답
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 트러블슈팅 🔧

### 문제 1: TypeScript 경로 별칭 오류
```
Error: Cannot find module '@/config/database'
```
**해결:**
```bash
npm install -D tsconfig-paths
# package.json의 dev 스크립트에 -r tsconfig-paths/register 추가 확인
```

### 문제 2: MySQL 연결 실패
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**해결:**
```bash
# MySQL 서비스 시작
# macOS
brew services start mysql

# Linux
sudo systemctl start mysql

# Windows
net start MySQL80

# .env 파일의 DB 설정 재확인
```

### 문제 3: 포트 이미 사용 중
```
Error: listen EADDRINUSE: address already in use :::3000
```
**해결:**
```bash
# 사용 중인 프로세스 찾기
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# 프로세스 종료 또는 .env에서 PORT 변경
PORT=3001
```

### 문제 4: 모듈을 찾을 수 없음
```
Error: Cannot find module 'express'
```
**해결:**
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

---

## 개발 체크리스트 ✅

### 매 개발 세션 시작 시
- [ ] `.env` 파일 최신 상태 확인
- [ ] MySQL 서버 실행 중인지 확인
- [ ] `git pull` (팀 작업 시)
- [ ] `npm run dev` 실행
- [ ] Health check API 호출 (`/health`)

### 새 기능 개발 시
- [ ] 브랜치 생성 (`git checkout -b feature/기능명`)
- [ ] Model 작성
- [ ] Repository 작성
- [ ] Service 작성
- [ ] Controller 작성
- [ ] Route 등록
- [ ] Validator 작성
- [ ] 테스트 작성
- [ ] 커밋 (`feat: 기능 설명`)

### 커밋 전 체크
- [ ] `npm run lint` (린트 체크)
- [ ] `npm run type-check` (타입 체크)
- [ ] `npm test` (테스트 실행)
- [ ] 민감 정보 제거 확인
- [ ] Conventional Commits 규칙 준수

---

## 다음 단계

이제 개발을 시작할 준비가 되었습니다!

**시작 명령어:**
```
@backend_spec_summary.md 참고해서
Phase 1부터 시작하자.
각 단계마다 커밋하고, 완료되면 다음 Phase 알려줘.
```
