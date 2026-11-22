import { Injectable } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface StoredCustomAvatar {
  id: string;
  name: string;
  referenceVideoUrl: string;
  previewUrl: string;
  createdAt: string;
}

@Injectable()
export class CustomAvatarService {
  private avatarsDir(organizationId: string) {
    return join(
      process.env.STORAGE_ROOT?.trim() ?? join(process.cwd(), 'storage'),
      organizationId,
      'avatars',
    );
  }

  private indexPath(organizationId: string) {
    return join(this.avatarsDir(organizationId), 'index.json');
  }

  async list(organizationId: string): Promise<StoredCustomAvatar[]> {
    const path = this.indexPath(organizationId);
    if (!existsSync(path)) return [];
    try {
      const raw = await readFile(path, 'utf8');
      return JSON.parse(raw) as StoredCustomAvatar[];
    } catch {
      return [];
    }
  }

  async get(organizationId: string, avatarId: string) {
    const avatars = await this.list(organizationId);
    return avatars.find((a) => a.id === avatarId) ?? null;
  }

  async add(
    organizationId: string,
    params: {
      name: string;
      referenceVideoUrl: string;
      previewUrl: string;
    },
  ): Promise<StoredCustomAvatar> {
    const dir = this.avatarsDir(organizationId);
    await mkdir(dir, { recursive: true });

    const avatar: StoredCustomAvatar = {
      id: `custom-${randomUUID().slice(0, 8)}`,
      name: params.name.trim() || '我的数字人',
      referenceVideoUrl: params.referenceVideoUrl,
      previewUrl: params.previewUrl,
      createdAt: new Date().toISOString(),
    };

    const avatars = await this.list(organizationId);
    avatars.unshift(avatar);
    await writeFile(this.indexPath(organizationId), JSON.stringify(avatars, null, 2));

    return avatar;
  }

  async remove(organizationId: string, avatarId: string) {
    const avatars = await this.list(organizationId);
    const avatar = avatars.find((a) => a.id === avatarId);
    if (!avatar) return null;

    await mkdir(this.avatarsDir(organizationId), { recursive: true });
    await writeFile(
      this.indexPath(organizationId),
      JSON.stringify(
        avatars.filter((a) => a.id !== avatarId),
        null,
        2,
      ),
    );

    return avatar;
  }
}
