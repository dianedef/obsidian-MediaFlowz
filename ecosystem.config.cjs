module.exports = {
  apps: [{
    name: "obsidian-mediaflowz",
    cwd: "/home/claude/obsidian-mediaflowz",
    script: "bash",
    args: ["-lc", "export PORT=3000 && flox activate -- bash -lc 'pnpm exec vite --port 3000 --host'"],
    env: {
      PORT: 3000
    },
    autorestart: true,
    max_restarts: 3,
    min_uptime: "10s",
    restart_delay: 2000,
    watch: false
  }]
};
