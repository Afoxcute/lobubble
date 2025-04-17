FROM node:16-alpine
# Create app directory
WORKDIR /app
# Copy package files
COPY package*.json ./
# Install dependencies
RUN npm install
RUN npm install -g pm2
# Copy source files
COPY . .
# Build the application
RUN npm run build
# Create data directory with proper permissions
RUN mkdir -p /data /app/logs
RUN chmod 777 /data /app/logs
# Set environment variable for production
ENV NODE_ENV=production
ENV PORT=3000
# Set PM2 to ignore signals (making it more resilient)
ENV PM2_KILL_TIMEOUT=10000
ENV PM2_KILL_SIGNAL=SIGKILL
# Create a PM2 config with no-shutdown settings
RUN echo '{ \
  "apps": [{ \
    "name": "lobubble-bot", \
    "script": "dist/index.js", \
    "instances": 1, \
    "autorestart": true, \
    "max_restarts": 50, \
    "restart_delay": 3000, \
    "max_memory_restart": "1G", \
    "exp_backoff_restart_delay": 100, \
    "watch": false, \
    "merge_logs": true, \
    "error_file": "/app/logs/error.log", \
    "out_file": "/app/logs/output.log", \
    "log_date_format": "YYYY-MM-DD HH:mm:ss Z", \
    "kill_timeout": 10000, \
    "shutdown_with_message": false, \
    "treekill": false, \
    "listen_timeout": 50000, \
    "wait_ready": false \
  }] \
}' > ecosystem.docker.json
# Create a wrapper script to keep the container running
RUN echo '#!/bin/sh \n\
pm2-runtime start ecosystem.docker.json --env production \n\
while true; do \n\
  sleep 10 \n\
  pm2 ping > /dev/null || pm2-runtime start ecosystem.docker.json --env production \n\
done' > /app/start.sh
RUN chmod +x /app/start.sh
# Expose port
EXPOSE 3000
# Use the wrapper script to ensure the bot keeps running
CMD ["/app/start.sh"]
