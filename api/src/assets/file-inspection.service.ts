import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Socket } from 'node:net';

const ALLOWED: Record<string, string[]> = {
  '.mp4': ['video/mp4'], '.mov': ['video/quicktime'], '.webm': ['video/webm'],
  '.mp3': ['audio/mpeg'], '.wav': ['audio/wav'], '.ogg': ['audio/ogg'],
  '.png': ['image/png'], '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'], '.webp': ['image/webp'],
};

@Injectable()
export class FileInspectionService {
  async inspect(filename: string, buffer: Buffer) {
    const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    const detected = this.detect(buffer);
    if (!ALLOWED[extension] || !detected || !ALLOWED[extension].includes(detected)) {
      throw new BadRequestException('文件扩展名与内容不匹配，或文件类型不受支持');
    }
    if (process.env.VIRUS_SCAN_ENABLED?.trim() === 'true') await this.scan(buffer);
    return { extension, mimeType: detected };
  }

  private detect(buffer: Buffer) {
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
    if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
    if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WAVE') return 'audio/wav';
    if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
    if (buffer.subarray(0, 4).toString() === 'OggS') return 'audio/ogg';
    if (buffer.subarray(0, 4).toString() === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)) return 'audio/mpeg';
    if (buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'video/webm';
    if (buffer.subarray(4, 8).toString() === 'ftyp') {
      return buffer.subarray(8, 12).toString() === 'qt  ' ? 'video/quicktime' : 'video/mp4';
    }
    return null;
  }

  private scan(buffer: Buffer) {
    const host = process.env.CLAMAV_HOST?.trim() || '127.0.0.1';
    const port = Number(process.env.CLAMAV_PORT?.trim() || '3310');
    return new Promise<void>((resolve, reject) => {
      const socket = new Socket();
      let response = '';
      socket.setTimeout(30_000);
      socket.on('data', (chunk: Buffer) => { response += chunk.toString(); });
      socket.on('error', () => reject(new ServiceUnavailableException('病毒扫描服务不可用')));
      socket.on('timeout', () => { socket.destroy(); reject(new ServiceUnavailableException('病毒扫描超时')); });
      socket.on('close', () => {
        if (response.includes('FOUND')) reject(new BadRequestException('文件未通过病毒扫描'));
        else if (response.includes('OK')) resolve();
        else reject(new ServiceUnavailableException('病毒扫描未返回有效结果'));
      });
      socket.connect(port, host, () => {
        socket.write('zINSTREAM\0');
        socket.write(Buffer.from([0, 0, 0, buffer.length >>> 24, (buffer.length >>> 16) & 255, (buffer.length >>> 8) & 255, buffer.length & 255]));
        socket.write(buffer);
        socket.end(Buffer.alloc(4));
      });
    });
  }
}
