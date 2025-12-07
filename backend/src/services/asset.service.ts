import { AuthenticatedUser } from '../types/express';
import { AssetRepository } from '../repositories/asset.repository';

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

export class AssetService {
  constructor(private readonly repository = new AssetRepository()) {}

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
