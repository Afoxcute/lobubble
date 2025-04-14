module.exports = {
  apps: [{
    name: 'lobubble-bot',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: 'logs/error.log',
    out_file: 'logs/output.log',
    merge_logs: true,
    // Ensure restart in case of errors
    max_restarts: 10,
    restart_delay: 5000,
    // Enable graceful shutdown
    kill_timeout: 5000,
    wait_ready: true
  }]
}; 