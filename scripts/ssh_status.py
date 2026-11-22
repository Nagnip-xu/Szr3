import os
import paramiko

HOST = os.environ.get("GPU_SSH_HOST", "223.109.239.11")
PORT = int(os.environ.get("GPU_SSH_PORT", "11236"))
USER = os.environ.get("GPU_SSH_USER", "root")
PASSWORD = os.environ.get("GPU_SSH_PASSWORD", "")

if not PASSWORD:
    raise SystemExit("Set GPU_SSH_PASSWORD env var")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=20, allow_agent=False, look_for_keys=False)
cmds = [
    "tail -5 /root/duix-deploy.log",
    "docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'",
    "docker images --format '{{.Repository}}:{{.Tag}} {{.Size}}' | head -5",
    "df -h / | tail -1",
]
for cmd in cmds:
    print("===", cmd, "===")
    _, stdout, _ = client.exec_command(cmd, timeout=60)
    print(stdout.read().decode("utf-8", "replace"))
client.close()
