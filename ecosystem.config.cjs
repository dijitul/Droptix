// PM2 process manifest for CyberPanel deployment.
// CyberPanel's Node.js app manager can also run the app directly via
// `node .next/standalone/server.js`, but PM2 gives us clustering,
// log rotation, and zero-downtime reloads.
module.exports = {
  apps: [
    {
      name: 'droptix',
      script: '.next/standalone/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
