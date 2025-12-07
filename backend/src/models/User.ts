import db from '../config/database';

export interface User {
  id?: number;
  login_method: string;
  kakao_id: string;
  nickname: string;
  email?: string;
  profile_image?: string;
  score: number;
  created_at?: Date;
  updated_at?: Date;
}

export class UserModel {
  /**
   * 카카오 ID로 사용자 찾기
   */
  static async findByKakaoId(kakaoId: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE kakao_id = ?';
    const rows = await db.query(sql, [kakaoId]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * ID로 사용자 찾기
   */
  static async findById(id: number): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const rows = await db.query(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 새 사용자 생성
   */
  static async create(user: User): Promise<User> {
    const sql = `
      INSERT INTO users (login_method, kakao_id, nickname, email, profile_image, score)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await db.query(sql, [
      user.login_method,
      user.kakao_id,
      user.nickname,
      user.email || null,
      user.profile_image || null,
      user.score,
    ]);

    return {
      id: result.insertId,
      ...user,
    };
  }

  /**
   * 사용자 정보 업데이트
   */
  static async update(id: number, user: Partial<User>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (user.login_method) {
      fields.push('login_method = ?');
      values.push(user.login_method);
    }
    if (user.nickname) {
      fields.push('nickname = ?');
      values.push(user.nickname);
    }
    if (user.email !== undefined) {
      fields.push('email = ?');
      values.push(user.email);
    }
    if (user.profile_image !== undefined) {
      fields.push('profile_image = ?');
      values.push(user.profile_image);
    }
    if (user.score !== undefined) {
      fields.push('score = ?');
      values.push(user.score);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = NOW()');
    values.push(id);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const result = await db.query(sql, values);

    return result.affectedRows > 0;
  }

  /**
   * 사용자 삭제
   */
  static async delete(id: number): Promise<boolean> {
    const sql = 'DELETE FROM users WHERE id = ?';
    const result = await db.query(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * 카카오 ID로 사용자 찾거나 생성
   */
  static async findOrCreate(userData: User): Promise<User> {
    const existingUser = await this.findByKakaoId(userData.kakao_id);

    if (existingUser) {
      // 기존 사용자 정보는 닉네임을 유지하고 필요한 정보만 업데이트
      await this.update(existingUser.id!, {
        email: userData.email,
        profile_image: userData.profile_image,
      });
      console.log('[UserModel] 기존 사용자 정보 업데이트 (닉네임 유지)', {
        id: existingUser.id,
        kakaoId: existingUser.kakao_id,
        nickname: existingUser.nickname,
        email: userData.email,
      });
      return (await this.findById(existingUser.id!))!;
    }

    // 새 사용자 생성
    const createdUser = await this.create(userData);
    console.log('[UserModel] 새 사용자 생성', {
      id: createdUser.id,
      kakaoId: createdUser.kakao_id,
      nickname: createdUser.nickname,
      email: createdUser.email,
    });
    return createdUser;
  }
}
