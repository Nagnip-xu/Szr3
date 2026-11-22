import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      return [l.slice(0, i).trim(), v];
    }),
);

function runSsh(cmd) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let out = '';
    conn
      .on('ready', () => {
        conn.exec(cmd, { pty: true }, (err, stream) => {
          if (err) return reject(err);
          stream.on('data', (d) => (out += d.toString()));
          stream.stderr.on('data', (d) => (out += d.toString()));
          stream.on('close', () => {
            conn.end();
            resolve(out);
          });
        });
      })
      .on('error', reject)
      .connect({
        host: env.GPU_SSH_HOST,
        port: Number(env.GPU_SSH_PORT ?? 22),
        username: env.GPU_SSH_USER ?? 'root',
        password: env.GPU_SSH_PASSWORD,
        readyTimeout: 180_000,
      });
  });
}

const cmd = [
  'OLD=$(docker ps -aq --filter name=duix-avatar-gen-video | head -1)',
  'echo old=$OLD',
  'docker stop $OLD 2>/dev/null || true',
  'docker rm -f $OLD 2>/dev/null || true',
  'docker rm -f duix-avatar-gen-video e77cb3761c73_duix-avatar-gen-video 2>/dev/null || true',
  'echo ===RUN===',
  'docker run -d --name duix-avatar-gen-video --restart always --runtime=nvidia --gpus all --privileged --shm-size=8g -e NVIDIA_VISIBLE_DEVICES=all -e NVIDIA_DRIVER_CAPABILITIES=compute,utility,video -e PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512 -v /root/duix_avatar_data/face2face:/code/data -p 8383:8383 --network deploy_ai_network guiji2025/duix.avatar python /code/app_local.py',
  'sleep 8',
  'echo ===PS===',
  'docker ps --filter name=duix-avatar --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"',
  'echo ===TORCH===',
  'docker exec duix-avatar-gen-video python -c "import torch; print(\'cuda\', torch.cuda.is_available(), torch.cuda.device_count(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else \'none\')"',
  'echo ===NETWORKS===',
  'docker network ls | grep -i ai',
].join(' ; ');

console.log(await runSsh(cmd));
