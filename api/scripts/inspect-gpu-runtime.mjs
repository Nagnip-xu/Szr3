import { Client } from 'ssh2';

const conn = new Client();
const command = [
  "docker ps --format '{{.Names}} {{.Status}}' | grep duix",
  "echo '=== NVIDIA ==='",
  "nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu --format=csv,noheader",
  "echo '=== LISTENERS ==='",
  "ss -tlnp | grep -E '8383|18180|10095'",
  "echo '=== TTS LOG ==='",
  "docker logs --tail 120 duix-avatar-tts 2>&1",
  "echo '=== DISK ==='",
  "df -h / /root/duix_avatar_data 2>/dev/null",
  "echo '=== VOICE FILES ==='",
  "find /root/duix_avatar_data/voice/data/origin_audio -maxdepth 1 -type f -printf '%f %s bytes\\n' 2>/dev/null",
].join('; ');

conn
  .on('ready', () => {
    conn.exec(command, (error, stream) => {
      if (error) throw error;
      stream.pipe(process.stdout);
      stream.stderr.pipe(process.stderr);
      stream.on('close', () => conn.end());
    });
  })
  .on('error', (error) => {
    console.error(`SSH_ERR: ${error.message}`);
    process.exitCode = 1;
  })
  .connect({
    host: process.env.GPU_SSH_HOST,
    port: Number(process.env.GPU_SSH_PORT ?? 22),
    username: process.env.GPU_SSH_USER ?? 'root',
    password: process.env.GPU_SSH_PASSWORD,
    readyTimeout: 30_000,
  });
