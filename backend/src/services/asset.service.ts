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
  updatedAt?: string;
}

class AssetStore {
  private assets: Asset[] = [];

  list(): Asset[] {
    return [...this.assets];
  }

  findByUid(uid: string): Asset | undefined {
    return this.assets.find((item) => item.uid === uid);
  }

  upsert(asset: Asset): Asset {
    const index = this.assets.findIndex((item) => item.uid === asset.uid);
    const timestamp = new Date().toISOString();
    const record = { ...asset, updatedAt: timestamp, createdAt: asset.createdAt || timestamp };

    if (index === -1) {
      this.assets.push(record);
    } else {
      this.assets[index] = record;
    }

    return record;
  }

  delete(uid: string): boolean {
    const originalLength = this.assets.length;
    this.assets = this.assets.filter((item) => item.uid !== uid);
    return this.assets.length < originalLength;
  }
}

export class AssetService {
  constructor(private readonly repository = new AssetStore()) {}

  list(user?: AuthenticatedUser): Asset[] {
    return this.filterForUser(this.repository.list(), user);
  }

  find(uid: string, user?: AuthenticatedUser): Asset | undefined {
    const asset = this.repository.findByUid(uid);
    if (!asset) return undefined;
    return this.sanitizeForUser(asset, user);
  }

  create(payload: Asset): Asset {
    return this.repository.upsert(payload);
  }

  update(uid: string, payload: Partial<Asset>): Asset | undefined {
    const existing = this.repository.findByUid(uid);
    if (!existing) return undefined;

    return this.repository.upsert({ ...existing, ...payload, uid });
  }

  remove(uid: string): boolean {
    return this.repository.delete(uid);
  }

  private filterForUser(assets: Asset[], user?: AuthenticatedUser): Asset[] {
    if (!user) {
      return assets.map((asset) => this.sanitizeForPublic(asset));
    }
    return assets.map((asset) => this.sanitizeForUser(asset, user));
  }

  private sanitizeForUser(asset: Asset, user?: AuthenticatedUser): Asset {
    if (!user) return this.sanitizeForPublic(asset);
    if (user.role === 'admin') return asset;
    return { ...asset, owner: undefined, metadata: { os: asset.metadata?.os, memo: asset.metadata?.memo } };
  }

  private sanitizeForPublic(asset: Asset): Asset {
    const { owner, metadata, ...rest } = asset;
    return {
      ...rest,
      metadata: { os: metadata?.os },
    };
  }
}
