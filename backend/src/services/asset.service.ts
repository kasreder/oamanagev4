import { AuthenticatedUser } from '../types/express';

export interface AssetOwner {
  id: number;
  name: string;
  email?: string;
}

export interface AssetMetadata {
  os?: string;
  memo?: string;
  memo2?: string;
}

export interface Asset {
  uid: string;
  name: string;
  assetType: string;
  modelName: string;
  status: string;
  location: string;
  organization?: string;
  owner?: AssetOwner;
  metadata?: AssetMetadata;
  createdAt?: string;
}

export class AssetService {
  private assets: Asset[] = [
    {
      uid: 'OA-001',
      name: '홍길동',
      assetType: '노트북',
      modelName: 'Gram 15',
      status: '사용',
      location: '본사 A동 3F',
      organization: '정보보안팀',
      owner: { id: 1, name: '홍길동', email: 'hong@example.com' },
      metadata: { os: 'Windows 11', memo: '교체 예정', memo2: '내부 메모' },
      createdAt: new Date().toISOString(),
    },
    {
      uid: 'OA-002',
      name: '김미리',
      assetType: '모니터',
      modelName: '울트라와이드',
      status: '사용',
      location: '본사 B동 5F',
      organization: '경영지원팀',
      owner: { id: 2, name: '김미리', email: 'miri@example.com' },
      metadata: { os: 'N/A', memo: '교체 대상', memo2: '삭제 예정' },
      createdAt: new Date().toISOString(),
    },
  ];

  getAssets(user?: AuthenticatedUser): Asset[] {
    return this.filterForUser(this.assets, user);
  }

  getAssetByUid(uid: string, user?: AuthenticatedUser): Asset | undefined {
    const asset = this.assets.find((item) => item.uid === uid);
    if (!asset) return undefined;
    return this.sanitizeForUser(asset, user);
  }

  createAsset(payload: Asset): Asset {
    const now = new Date().toISOString();
    const newAsset: Asset = { ...payload, createdAt: now };
    this.assets.push(newAsset);
    return newAsset;
  }

  updateAsset(uid: string, payload: Partial<Asset>): Asset | undefined {
    const index = this.assets.findIndex((item) => item.uid === uid);
    if (index === -1) return undefined;

    const updated = { ...this.assets[index], ...payload };
    this.assets[index] = updated;
    return updated;
  }

  deleteAsset(uid: string): boolean {
    const originalLength = this.assets.length;
    this.assets = this.assets.filter((item) => item.uid !== uid);
    return this.assets.length < originalLength;
  }

  private filterForUser(assets: Asset[], user?: AuthenticatedUser): Asset[] {
    if (!user) {
      return assets.map((asset) => this.sanitizeForPublic(asset));
    }
    return assets.map((asset) => this.sanitizeForUser(asset, user));
  }

  private sanitizeForUser(asset: Asset, user?: AuthenticatedUser): Asset {
    if (!user) return this.sanitizeForPublic(asset);
    return asset;
  }

  private sanitizeForPublic(asset: Asset): Asset {
    const { owner, metadata, ...rest } = asset;
    return {
      ...rest,
      metadata: {
        os: metadata?.os,
      },
    };
  }
}
