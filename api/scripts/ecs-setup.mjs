import { Client } from 'ssh2';

const script = `set -e
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
fi
dnf install -y curl git tar gzip nginx
dnf install -y https://mirrors.rpmfusion.org/free/el/rpmfusion-free-release-8.noarch.rpm
dnf install -y ffmpeg
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
systemctl enable nginx
systemctl start nginx
node --version
npm --version
nginx -v
ffmpeg -version | head -n 1
swapon --show
`;

const conn = new Client();
conn.on('ready', () => conn.exec(script, (error, stream) => {
  if (error) throw error;
  stream.pipe(process.stdout);
  stream.stderr.pipe(process.stderr);
  stream.on('close', () => conn.end());
}));
conn.on('error', (error) => { console.error(`SSH_ERR: ${error.message}`); process.exit(1); });
conn.connect({ host: process.env.ECS_HOST, port: 22, username: 'root', password: process.env.ECS_PASSWORD, readyTimeout: 30_000 });
