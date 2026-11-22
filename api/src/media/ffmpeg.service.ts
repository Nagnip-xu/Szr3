import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { access, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

@Injectable()
export class FfmpegService {
  private readonly bin =
    process.env.FFMPEG_PATH?.trim() ||
    process.env.FFPROBE_PATH?.trim()?.replace('ffprobe', 'ffmpeg') ||
    'ffmpeg';

  async ensureAvailable() {
    try {
      await this.run(['-version']);
    } catch {
      throw new ServiceUnavailableException(
        '未检测到 FFmpeg，请安装并加入 PATH，或设置 FFMPEG_PATH',
      );
    }
  }

  async run(args: string[]) {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(this.bin, args, { windowsHide: true });
      let stderr = '';
      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      proc.on('error', (err) => reject(err));
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr.trim() || `FFmpeg exited with code ${code}`));
      });
    });
  }

  escapeFilterPath(filePath: string) {
    return filePath.replace(/\\/g, '/').replace(/:/g, '\\:');
  }

  async ensureVideoInput(inputPath: string, outputPath: string, audioPath?: string) {
    const lower = inputPath.toLowerCase();
    const isVideo = /\.(mp4|mov|webm|mkv|avi)$/.test(lower);
    if (isVideo) return inputPath;

    await access(inputPath);
    const args = audioPath
      ? [
          '-loop',
          '1',
          '-i',
          inputPath,
          '-i',
          audioPath,
          '-c:v',
          'libx264',
          '-tune',
          'stillimage',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-shortest',
          '-y',
          outputPath,
        ]
      : [
          '-loop',
          '1',
          '-i',
          inputPath,
          '-c:v',
          'libx264',
          '-t',
          '5',
          '-pix_fmt',
          'yuv420p',
          '-y',
          outputPath,
        ];

    await this.run(args);
    return outputPath;
  }

  async burnSubtitles(inputPath: string, assPath: string, outputPath: string) {
    const subPath = this.escapeFilterPath(assPath);
    const fontDir = this.escapeFilterPath(
      process.env.FFMPEG_FONT_DIR?.trim() ?? '/usr/share/fonts/google-noto-cjk',
    );
    await this.run([
      '-i',
      inputPath,
      '-vf',
      `subtitles='${subPath}':fontsdir='${fontDir}'`,
      '-c:a',
      'copy',
      '-y',
      outputPath,
    ]);
    return outputPath;
  }

  async mixBgm(
    inputPath: string,
    bgmPath: string,
    outputPath: string,
    volume: number,
  ) {
    const vol = Math.max(0, Math.min(1, volume));
    const hasInputAudio = await this.hasAudioStream(inputPath);
    const filter = hasInputAudio
      ? `[1:a]volume=${vol}[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`
      : `[1:a]volume=${vol}[aout]`;

    const args = ['-i', inputPath, '-i', bgmPath, '-filter_complex', filter, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-shortest', '-y', outputPath];
    await this.run(args);
    return outputPath;
  }

  private async hasAudioStream(filePath: string) {
    const ffprobe =
      process.env.FFPROBE_PATH?.trim() ||
      this.bin.replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1');

    return new Promise<boolean>((resolve) => {
      const proc = spawn(
        ffprobe,
        [
          '-v',
          'error',
          '-select_streams',
          'a',
          '-show_entries',
          'stream=index',
          '-of',
          'csv=p=0',
          filePath,
        ],
        { windowsHide: true },
      );
      let stdout = '';
      proc.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      proc.on('close', () => resolve(stdout.trim().length > 0));
      proc.on('error', () => resolve(false));
    });
  }

  async copyOrTranscode(inputPath: string, outputPath: string) {
    if (inputPath === outputPath) return outputPath;
    await this.run(['-i', inputPath, '-c', 'copy', '-y', outputPath]);
    return outputPath;
  }

  async addWatermark(inputPath: string, outputPath: string, text: string) {
    const safeText = text.replace(/:/g, '\\:').replace(/'/g, "\\'");
    await this.run([
      '-i',
      inputPath,
      '-vf',
      `drawtext=text='${safeText}':fontcolor=white@0.8:fontsize=24:x=(w-text_w-24):y=24:box=1:boxcolor=black@0.35:boxborderw=8`,
      '-c:a',
      'copy',
      '-y',
      outputPath,
    ]);
    return outputPath;
  }

  /** 截取视频某一帧为 JPG */
  async extractFrame(inputPath: string, outputPath: string, atSec = 0) {
    await this.run([
      '-ss',
      String(atSec),
      '-i',
      inputPath,
      '-frames:v',
      '1',
      '-q:v',
      '2',
      '-y',
      outputPath,
    ]);
    return outputPath;
  }

  /** 在背景图上叠加封面文案 */
  async renderCoverImage(
    backgroundPath: string,
    outputPath: string,
    params: {
      text: string;
      fontSize?: number;
      color?: string;
      position?: 'top' | 'center' | 'bottom';
    },
  ) {
    const text = params.text.replace(/:/g, '\\:').replace(/'/g, "\\'");
    const fontSize = params.fontSize ?? 48;
    const color = (params.color ?? '#FFFFFF').replace('#', '0x');
    const fontFile = this.escapeFilterPath(
      process.env.FFMPEG_FONT_FILE?.trim() ??
        '/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc',
    );
    const y =
      params.position === 'top'
        ? 'h*0.12'
        : params.position === 'center'
          ? '(h-text_h)/2'
          : 'h*0.78-text_h';

    await this.run([
      '-i',
      backgroundPath,
      '-vf',
      `drawtext=fontfile='${fontFile}':text='${text}':fontcolor=${color}:fontsize=${fontSize}:x=(w-text_w)/2:y=${y}:box=1:boxcolor=black@0.45:boxborderw=12`,
      '-y',
      outputPath,
    ]);
    return outputPath;
  }

  /** 画中画叠加（overlay 在指定时间段） */
  async overlayPip(
    mainPath: string,
    overlayPath: string,
    outputPath: string,
    params: {
      position: string;
      scale: number;
      opacity: number;
      startSec: number;
      durationSec: number;
      borderRadius?: number;
    },
  ) {
    const scale = Math.max(0.1, Math.min(0.9, params.scale));
    const opacity = Math.max(0, Math.min(1, params.opacity));
    const start = Math.max(0, params.startSec);
    const end = start + Math.max(0.1, params.durationSec);

    const overlayIsImage = /\.(jpg|jpeg|png|webp)$/i.test(overlayPath);
    const overlayInput = overlayIsImage
      ? ['-loop', '1', '-i', overlayPath]
      : ['-i', overlayPath];

    const positionMap: Record<string, string> = {
      'top-left': '20:20',
      'top-right': 'W-w-20:20',
      'bottom-left': '20:H-h-20',
      'bottom-right': 'W-w-20:H-h-20',
      center: '(W-w)/2:(H-h)/2',
    };
    const xy = positionMap[params.position] ?? positionMap['bottom-right'];

    const filter = [
      `[1:v]scale=iw*${scale}:-1,format=rgba,colorchannelmixer=aa=${opacity}[pip]`,
      `[0:v][pip]overlay=${xy}:enable='between(t,${start},${end})'[vout]`,
    ].join(';');

    await this.run([
      '-i',
      mainPath,
      ...overlayInput,
      '-filter_complex',
      filter,
      '-map',
      '[vout]',
      '-map',
      '0:a?',
      '-c:v',
      'libx264',
      '-c:a',
      'copy',
      '-shortest',
      '-y',
      outputPath,
    ]);
    return outputPath;
  }

  /** 将封面图作为视频第一帧（约 0.5 秒）后接原视频 */
  async prependCoverFrame(
    coverImagePath: string,
    videoPath: string,
    outputPath: string,
    coverDurationSec = 0.5,
  ) {
    const coverVideo = `${outputPath}.cover-seg.mp4`;
    await this.run([
      '-loop',
      '1',
      '-i',
      coverImagePath,
      '-f',
      'lavfi',
      '-i',
      'anullsrc=r=44100:cl=stereo',
      '-t',
      String(coverDurationSec),
      '-vf',
      'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-shortest',
      '-y',
      coverVideo,
    ]);

    const normalized = `${outputPath}.main-norm.mp4`;
    await this.run([
      '-i',
      videoPath,
      '-vf',
      'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2',
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-y',
      normalized,
    ]);

    await this.concatVideos([coverVideo, normalized], outputPath);
    return outputPath;
  }

  async probeDurationSeconds(filePath: string) {
    if (!existsSync(filePath)) return 0;
    const ffprobe =
      process.env.FFPROBE_PATH?.trim() ||
      this.bin.replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1');

    return new Promise<number>((resolve) => {
      const proc = spawn(
        ffprobe,
        [
          '-v',
          'error',
          '-show_entries',
          'format=duration',
          '-of',
          'default=noprint_wrappers=1:nokey=1',
          filePath,
        ],
        { windowsHide: true },
      );
      let stdout = '';
      proc.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      proc.on('close', () => {
        const val = parseFloat(stdout.trim());
        resolve(Number.isFinite(val) ? Math.ceil(val) : 0);
      });
      proc.on('error', () => resolve(0));
    });
  }

  async probeVideoDimensions(filePath: string) {
    if (!existsSync(filePath)) {
      return { width: 720, height: 1280 };
    }
    const ffprobe =
      process.env.FFPROBE_PATH?.trim() ||
      this.bin.replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1');

    return new Promise<{ width: number; height: number }>((resolve) => {
      const proc = spawn(
        ffprobe,
        [
          '-v',
          'error',
          '-select_streams',
          'v:0',
          '-show_entries',
          'stream=width,height',
          '-of',
          'csv=p=0:s=x',
          filePath,
        ],
        { windowsHide: true },
      );
      let stdout = '';
      proc.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      proc.on('close', () => {
        const [widthText, heightText] = stdout.trim().split('x');
        const width = Number.parseInt(widthText ?? '', 10);
        const height = Number.parseInt(heightText ?? '', 10);
        if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
          resolve({ width, height });
          return;
        }
        resolve({ width: 720, height: 1280 });
      });
      proc.on('error', () => resolve({ width: 720, height: 1280 }));
    });
  }

  ensureParentDir(filePath: string) {
    const parent = dirname(filePath);
    if (!existsSync(parent)) {
      mkdirSync(parent, { recursive: true });
    }
  }

  /** 将长音频切分为 ≤ maxSegmentSec 秒的片段 */
  async splitAudio(
    inputPath: string,
    outputDir: string,
    maxSegmentSec = 18,
  ): Promise<string[]> {
    await access(inputPath);
    this.ensureParentDir(join(outputDir, 'placeholder'));

    const duration = await this.probeDurationSeconds(inputPath);
    if (duration <= 0) {
      throw new Error('无法读取音频时长');
    }

    if (duration <= maxSegmentSec) {
      return [inputPath];
    }

    const segmentPaths: string[] = [];
    let start = 0;
    let index = 0;

    while (start < duration - 0.05) {
      const segDuration = Math.min(maxSegmentSec, duration - start);
      const outPath = join(
        outputDir,
        `audio-seg-${String(index).padStart(3, '0')}.mp3`,
      );
      await this.run([
        '-ss',
        String(start),
        '-i',
        inputPath,
        '-t',
        String(segDuration),
        '-c:a',
        'libmp3lame',
        '-ar',
        '24000',
        '-y',
        outPath,
      ]);
      segmentPaths.push(outPath);
      start += segDuration;
      index += 1;
    }

    return segmentPaths;
  }

  /** 按顺序拼接多段 MP4 */
  async concatVideos(inputPaths: string[], outputPath: string) {
    if (inputPaths.length === 0) {
      throw new Error('没有可拼接的视频片段');
    }
    if (inputPaths.length === 1) {
      await this.copyOrTranscode(inputPaths[0], outputPath);
      return outputPath;
    }

    this.ensureParentDir(outputPath);
    const listPath = `${outputPath}.concat.txt`;
    const listContent = inputPaths
      .map((p) => {
        const normalized = p.replace(/\\/g, '/').replace(/'/g, "'\\''");
        return `file '${normalized}'`;
      })
      .join('\n');
    await writeFile(listPath, listContent, 'utf8');

    try {
      await this.run([
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        listPath,
        '-c:v',
        'libx264',
        '-c:a',
        'aac',
        '-movflags',
        '+faststart',
        '-y',
        outputPath,
      ]);
    } finally {
      try {
        const { unlink } = await import('node:fs/promises');
        await unlink(listPath);
      } catch {
        /* ignore */
      }
    }

    return outputPath;
  }
}
