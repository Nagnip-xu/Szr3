import os
import sys
import paramiko

HOST = "223.109.239.11"
PORT = 11236
USER = "root"
PASSWORD = os.environ.get("GPU_SSH_PASSWORD", "")
LOCAL_SCRIPT = r"e:\Project\Szr3\scripts\deploy-duix-avatar.sh"
REMOTE_SCRIPT = "/root/deploy-duix-avatar.sh"


def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        HOST,
        port=PORT,
        username=USER,
        password=PASSWORD,
        timeout=30,
        allow_agent=False,
        look_for_keys=False,
    )

    sftp = client.open_sftp()
    with open(LOCAL_SCRIPT, "rb") as f:
        sftp.putfo(f, REMOTE_SCRIPT)
    sftp.chmod(REMOTE_SCRIPT, 0o755)
    sftp.close()

    cmd = f"bash {REMOTE_SCRIPT} 2>&1 | tee /root/duix-deploy.log"
    print(f"Running remote deploy: {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=7200)
    for line in iter(stdout.readline, ""):
        sys.stdout.write(line)
        sys.stdout.flush()
    err = stderr.read().decode("utf-8", "replace")
    if err.strip():
        print(err, file=sys.stderr)
    code = stdout.channel.recv_exit_status()
    print(f"EXIT_CODE={code}")
    client.close()
    sys.exit(code)


if __name__ == "__main__":
    main()
