import { Injectable } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { DuixVoiceProfile } from './duix.types';

export interface StoredCustomVoice extends DuixVoiceProfile {
  id: string;
  createdAt: string;
}

@Injectable()
export class CustomVoiceService {
  private voicesDir(organizationId: string) {
    return join(
      process.env.STORAGE_ROOT?.trim() ?? join(process.cwd(), 'storage'),
      organizationId,
      'voices',
    );
  }

  private indexPath(organizationId: string) {
    return join(this.voicesDir(organizationId), 'index.json');
  }

  async list(organizationId: string): Promise<StoredCustomVoice[]> {
    const path = this.indexPath(organizationId);
    if (!existsSync(path)) return [];
    try {
      const raw = await readFile(path, 'utf8');
      return JSON.parse(raw) as StoredCustomVoice[];
    } catch {
      return [];
    }
  }

  async get(organizationId: string, voiceId: string) {
    const voices = await this.list(organizationId);
    return voices.find((v) => v.id === voiceId) ?? null;
  }

  async add(
    organizationId: string,
    params: {
      name: string;
      referenceAudio: string;
      referenceText: string;
    },
  ): Promise<StoredCustomVoice> {
    const dir = this.voicesDir(organizationId);
    await mkdir(dir, { recursive: true });

    const voice: StoredCustomVoice = {
      id: `custom-${randomUUID().slice(0, 8)}`,
      speaker: `szr3-${randomUUID().slice(0, 8)}`,
      name: params.name.trim() || '我的音色',
      tag: '自定义克隆音',
      referenceAudio: params.referenceAudio,
      referenceText: params.referenceText,
      createdAt: new Date().toISOString(),
    };

    const voices = await this.list(organizationId);
    voices.unshift(voice);
    await writeFile(this.indexPath(organizationId), JSON.stringify(voices, null, 2));

    return voice;
  }

  async remove(organizationId: string, voiceId: string) {
    const voices = await this.list(organizationId);
    const next = voices.filter((v) => v.id !== voiceId);
    await mkdir(this.voicesDir(organizationId), { recursive: true });
    await writeFile(this.indexPath(organizationId), JSON.stringify(next, null, 2));
    return { removed: voices.length - next.length };
  }
}
