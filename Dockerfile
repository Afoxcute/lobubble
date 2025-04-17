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
# Create an improved PM2 config with better restart settings
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
    "log_date_format": "YYYY-MM-DD HH:mm:ss Z" \
  }] \
}' > ecosystem.docker.json
# Expose port
EXPOSE 3000
# Run the application directly with PM2 runtime for Docker
CMD ["pm2-runtime", "ecosystem.docker.json"]
