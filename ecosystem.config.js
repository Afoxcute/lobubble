module.exports = {
  apps: [{
    name: 'lobubble-bot',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 3000,
    max_restarts: 10,
    min_uptime: '1m',
    exp_backoff_restart_delay: 100,
    merge_logs: true,
    error_file: '/app/logs/error.log',
    out_file: '/app/logs/out.log',
    time: true,
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}; 