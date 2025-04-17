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

# Create a simplified PM2 config
RUN echo '{ "apps": [{ "name": "lobubble-bot", "script": "dist/index.js", "instances": 1, "autorestart": true, "max_restarts": 10, "restart_delay": 5000, "max_memory_restart": "1G" }] }' > ecosystem.docker.json

# Expose port
EXPOSE 3000

# Start using PM2 in no-daemon mode
CMD ["pm2-runtime", "start", "ecosystem.docker.json"] 