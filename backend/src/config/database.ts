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
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          kakao_id VARCHAR(100) NOT NULL UNIQUE,
          nickname VARCHAR(100) NOT NULL,
          email VARCHAR(255) DEFAULT NULL,
          profile_image VARCHAR(500) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_kakao_id (kakao_id),
          INDEX idx_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.end();

      console.log('✅ Database and tables ensured');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
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
