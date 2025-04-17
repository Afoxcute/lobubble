FROM node:16-alpine

# Install PM2 globally
RUN npm install pm2 -g

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

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

# Expose port
EXPOSE 3000

# Use PM2 to start the application and keep it alive
CMD ["pm2-runtime", "ecosystem.config.js", "--env", "production"] 