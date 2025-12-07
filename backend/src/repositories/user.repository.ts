import { AuthenticatedUser } from '../types/express';

export interface UserRecord extends AuthenticatedUser {
  refreshToken?: string;
}

const seedUsers: UserRecord[] = [
  {
    id: 1,
    provider: 'kakao',
    nickname: '홍길동',
    email: 'hong@example.com',
    role: 'user',
    score: 10,
  },
  {
    id: 2,
    provider: 'google',
    nickname: '관리자',
    email: 'admin@example.com',
    role: 'admin',
    score: 100,
  },
];

export class UserRepository {
  private users: UserRecord[] = [...seedUsers];

  findById(id: number): UserRecord | undefined {
    return this.users.find((user) => user.id === id);
  }

  findByProviderId(provider: string, email?: string): UserRecord | undefined {
    if (!email) return undefined;
    return this.users.find((user) => user.provider === provider && user.email === email);
  }

  upsert(user: UserRecord): UserRecord {
    const index = this.users.findIndex((item) => item.id === user.id);
    if (index === -1) {
      this.users.push(user);
      return user;
    }

    this.users[index] = { ...this.users[index], ...user };
    return this.users[index];
  }

  saveRefreshToken(id: number, token: string): void {
    const user = this.findById(id);
    if (user) {
      user.refreshToken = token;
    }
  }
}
