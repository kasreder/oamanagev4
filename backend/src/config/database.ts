import mysql from 'mysql2/promise';
import './env';

class Database {
  private static instance: Database;
  private pool: mysql.Pool;
  private initializationPromise: Promise<void>;
  private readonly dbConfig: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };

  private constructor() {
    this.dbConfig = {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'kasreder',
      database: process.env.DB_NAME || 'oa_asset_manager',
    };

    this.pool = mysql.createPool({
      ...this.dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    this.initializationPromise = this.initializeDatabase();

    console.log('✅ Database connection pool created');
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getPool(): mysql.Pool {
    return this.pool;
  }

  public async query(sql: string, values?: any[]): Promise<any> {
    try {
      await this.ensureInitialized();
      const [rows] = await this.pool.execute(sql, values);
      return rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  private async initializeDatabase(): Promise<void> {
    const { host, port, user, password, database } = this.dbConfig;

    try {
      const connection = await mysql.createConnection({
        host,
        port,
        user,
        password,
        multipleStatements: true,
      });

      await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
      );
      await connection.query(`USE \`${database}\`;`);
      await this.createTablesIfNotExists(connection);

      await connection.end();

      console.log('✅ Database and tables ensured');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTablesIfNotExists(connection: mysql.Connection): Promise<void> {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        login_method VARCHAR(50) NOT NULL DEFAULT 'kakao',
        kakao_id VARCHAR(100) NOT NULL UNIQUE,
        nickname VARCHAR(100) NOT NULL,
        email VARCHAR(255) DEFAULT NULL,
        profile_image VARCHAR(500) DEFAULT NULL,
        score INT NOT NULL DEFAULT 0,
        employee_id VARCHAR(32) UNIQUE,
        name VARCHAR(64),
        phone VARCHAR(32),
        role VARCHAR(20) DEFAULT 'user',
        provider VARCHAR(20),
        provider_id VARCHAR(128),
        sns_login ENUM('kakao', 'other'),
        department_hq VARCHAR(64),
        department_dept VARCHAR(64),
        department_team VARCHAR(64),
        department_part VARCHAR(64),
        is_active BOOLEAN DEFAULT TRUE,
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_login_method (login_method),
        INDEX idx_kakao_id (kakao_id),
        INDEX idx_email (email),
        INDEX idx_provider (provider, provider_id),
        INDEX idx_department (department_team),
        INDEX idx_active (is_active),
        INDEX idx_sns_login (sns_login),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await this.ensureUserIdUnsigned(connection);

    await connection.query(`
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
        owner_user_id BIGINT UNSIGNED,
        metadata JSON COMMENT '추가 필드',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_status (status),
        INDEX idx_type (asset_type),
        INDEX idx_owner (owner_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS inspections (
        id VARCHAR(64) PRIMARY KEY COMMENT '실사 식별자',
        asset_uid VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL,
        memo TEXT,
        scanned_at TIMESTAMP NOT NULL,
        synced BOOLEAN DEFAULT FALSE,
        user_team VARCHAR(128),
        user_id BIGINT UNSIGNED,
        asset_type VARCHAR(64),
        verified BOOLEAN DEFAULT FALSE,
        barcode_photo_url VARCHAR(256),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_uid) REFERENCES assets(uid) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_asset_scanned (asset_uid, scanned_at DESC),
        INDEX idx_synced (synced),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS signatures (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        asset_uid VARCHAR(64) NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        user_name VARCHAR(64),
        storage_location VARCHAR(256) NOT NULL,
        file_size INT,
        mime_type VARCHAR(50) DEFAULT 'image/png',
        sha256 CHAR(64) UNIQUE,
        captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_uid) REFERENCES assets(uid) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_asset_user (asset_uid, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        token VARCHAR(512) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED,
        action VARCHAR(50) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(128),
        changes JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_action (user_id, action),
        INDEX idx_resource (resource_type, resource_id),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ All tables created or already exist');
  }

  private async ensureUserIdUnsigned(connection: mysql.Connection): Promise<void> {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id';`,
      [this.dbConfig.database]
    );

    const columnType = rows?.[0]?.COLUMN_TYPE?.toLowerCase();
    if (columnType && !columnType.includes('unsigned')) {
      await connection.query(`ALTER TABLE users MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;`);
      console.log('ℹ️ Updated users.id to BIGINT UNSIGNED for FK compatibility');
    }
  }

  private async ensureInitialized(): Promise<void> {
    return this.initializationPromise;
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      const connection = await this.pool.getConnection();
      console.log('✅ Database connection test successful');
      connection.release();
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }
}

export default Database.getInstance();
