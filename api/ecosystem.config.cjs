module.exports = {
  apps: [
    {
      name: "ganji-wallet-api",
      script: "./dist/src/index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      merge_logs: true,
      max_memory_restart: "500M",
      exp_backoff_restart_delay: 100,
    },
  ],
};
