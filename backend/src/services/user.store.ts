import { AuthenticatedUser } from '../types/express';

export interface UserRecord extends AuthenticatedUser {
  refreshToken?: string;
}

export class UserStore {
  private users: UserRecord[] = [];

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
