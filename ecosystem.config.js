// PM2 process config for Qkazi.
//
//   pm2 start ecosystem.config.js
//   pm2 save && pm2 startup     # survive reboots
//
// IMPORTANT: instances=1 / fork mode. The live-offers and chat SSE buses are
// in-process — running multiple instances would break cross-tab realtime
// unless you set REDIS_URL (see DEPLOY.md → "Scaling beyond one server").
module.exports = {
  apps: [
    {
      name: "qkazi",
      // Run Next's production server directly so PM2 manages the right PID.
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "/var/www/qkazi", // <-- change to your deploy path
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "600M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        // App env (DATABASE_URL, JWT_SECRET, PESAPAL_*, etc.) is read from
        // the .env file in `cwd` by Next.js itself — no need to duplicate it
        // here. NEXT_PUBLIC_* vars are baked in at build time, not here.
      },
    },
  ],
};
