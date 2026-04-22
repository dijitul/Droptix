// PM2 process manifest for CyberPanel deployment.
// Two apps: the Next.js web server + a BullMQ worker for emails, webhook
// retries, and scan-reconcile jobs. Web runs in cluster mode (one process
// per CPU), worker runs as a single process (BullMQ handles concurrency).
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
      error_file: 'logs/web-error.log',
      out_file: 'logs/web-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'droptix-worker',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'src/server/workers/index.ts',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '384M',
      env: { NODE_ENV: 'production' },
      error_file: 'logs/worker-error.log',
      out_file: 'logs/worker-out.log',
      merge_logs: true,
      time: true,
      restart_delay: 5000,
    },
  ],
};
