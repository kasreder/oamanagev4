import { Asset } from '../services/asset.service';

export class AssetRepository {
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
      updatedAt: new Date().toISOString(),
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
      updatedAt: new Date().toISOString(),
    },
  ];

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
