# Installation Guide - Solana Wallet & Bubblemap Bot

This guide provides step-by-step instructions for installing, configuring, and deploying the Solana Wallet & Bubblemap Bot.

## Quick Start

For a visual walkthrough of the setup and usage, watch our demo video:
[View Demo Video](https://drive.google.com/drive/folders/1j74KjxCiLj34nQu2TDQPXz5hBrfAlHDN?usp=sharing)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 16.0.0 or higher
  - [Download Node.js](https://nodejs.org/)
  - Verify with: `node --version`

- **npm**: Version 7.0.0 or higher (comes with Node.js)
  - Verify with: `npm --version`

- **Git**: For cloning the repository
  - [Download Git](https://git-scm.com/downloads)
  - Verify with: `git --version`

- **Telegram Bot Token**: Required for bot functionality
  - Create a bot through [BotFather](https://t.me/BotFather)
  - Follow the "/newbot" command flow to get your token

## Local Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd lobubble
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies as defined in the `package.json` file.

### 3. Configure Environment

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file and fill in your Telegram Bot Token:

```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
NODE_ENV=development
PORT=3000
```

### 4. Build the Project

Compile the TypeScript code to JavaScript:

```bash
npm run build
```

This will generate the compiled code in the `dist/` directory.

### 5. Create Data Directory

Ensure the data directory exists for persistent storage:

```bash
mkdir -p data
```

### 6. Run the Bot

For development (with live reloading):

```bash
npm start
```

For production with PM2 process management:

```bash
# Start with PM2
npm run serve:pm2

# Check running processes
npm run status

# View logs
npm run logs

# Restart the application
npm run restart

# Stop the application
npm run stop
```

For production without PM2:

```bash
npm run serve
```

### 7. PM2 Process Management

PM2 is integrated into the application for better production reliability:

#### Key Features

- **Auto-restart**: The bot automatically restarts if it crashes
- **Log Management**: Logs are stored in the `logs/` directory with:
  - `output.log`: Standard output logs
  - `error.log`: Error logs
- **Performance Monitoring**: Monitor memory usage and uptime
- **Graceful Shutdown**: Properly closes connections during restart/stop

#### Configuration

PM2 settings are defined in `ecosystem.config.js` and include:

- Memory limit (1GB max)
- Log formatting and storage
- Restart behavior and limits
- Environment variable configuration

You can modify this file to adjust these settings based on your needs.

### 8. Verify Operation

- Open Telegram and search for your bot by its username
- Start a conversation with `/start`
- Test the registration flow with `/register`

## Deployment Options

### Deploying to Render

#### 1. Prepare Your Repository

Ensure your repository contains:
- `render.yaml` file
- `Procfile`
- All required source code

#### 2. Create a New Web Service on Render

1. Sign in to your Render account
2. Click "New" and select "Web Service"
3. Connect to your GitHub repository
4. Render will automatically detect the `render.yaml` configuration

#### 3. Configure Environment Variables

Add the required environment variable:
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token

#### 4. Deploy

Click "Create Web Service" to start the deployment process. Render will:

1. Clone your repository
2. Install dependencies using `npm install`
3. Build the project using `npm run build`
4. Start the service using `npm run serve`

#### 5. Verify Deployment

Render provides a health check endpoint at `/health` which should return a status code 200 when the service is running properly.

### Manual Deployment

If deploying to another platform, ensure:

1. Node.js 16+ is available
2. Build process is executed: `npm install && npm run build`
3. Start command is: `npm run serve`
4. Environment variables are properly set
5. A persistent storage location is available for the `/data` directory

## Docker Deployment (Recommended)

Using Docker is the recommended method for deploying this application, especially on Render.

### Prerequisites for Docker Deployment

- **Docker**: Install Docker on your development machine
  - [Docker Desktop](https://www.docker.com/products/docker-desktop/)
  - Verify with: `docker --version`

- **Docker Compose** (included with Docker Desktop)
  - Verify with: `docker-compose --version`

### Local Docker Setup

1. **Build and run with Docker Compose**:
   ```bash
   # Make sure you have .env file with TELEGRAM_BOT_TOKEN
   npm run docker:compose:build
   ```

2. **Or build and run separately**:
   ```bash
   # Build the Docker image
   npm run docker:build
   
   # Run the container
   npm run docker:run
   ```

### Deploying to Render with Docker

Render has excellent support for Docker-based deployments, making it easy to deploy this application reliably.

1. **Push your repository to GitHub**

2. **Create a new Web Service on Render**:
   - Sign in to your Render account
   - Click "New" and select "Web Service"
   - Connect to your GitHub repository
   - Select "Docker" as the environment
   - Set the required environment variables:
     - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token

3. **Deploy**:
   - Click "Create Web Service"
   - Render will automatically build and deploy the Docker container
   - The deployment will:
     - Use the included Dockerfile to build the application
     - Mount a persistent disk for data storage
     - Run the health check endpoint to verify the service is running

### Docker Commands

| Command | Description |
|---------|-------------|
| `npm run docker:build` | Build the Docker image |
| `npm run docker:run` | Run the Docker container |
| `npm run docker:compose` | Run with Docker Compose |
| `npm run docker:compose:build` | Build and run with Docker Compose |

### Docker Configuration Files

- **Dockerfile**: Main configuration for building the container
- **docker-compose.yml**: Configuration for local development
- **.dockerignore**: Excludes unnecessary files from the container
- **render.yaml**: Configuration for Render deployment

## Troubleshooting

### Common Issues

#### Bot Not Responding

1. Verify your Telegram token is correct in `.env`
2. Check the console for any error messages
3. Restart the bot service

#### File Permission Errors

If you encounter file permission errors with the data directory:

```bash
# Set proper permissions
chmod 755 data
```

#### Memory Issues During Wallet Generation

Vanity wallet generation can be memory-intensive with longer prefixes:

1. Consider increasing the memory allocation if deploying to a constrained environment
2. Add memory limits to longer prefixes in the code

### Logs

- Development logs are output to the console
- On Render, logs can be viewed in the service dashboard
- For Docker, use `docker logs solana-bot` to view logs

## Updating the Bot

To update the bot to a newer version:

1. Pull the latest changes:
   ```bash
   git pull origin main
   ```

2. Install any new dependencies:
   ```bash
   npm install
   ```

3. Rebuild the application:
   ```bash
   npm run build
   ```

4. Restart the service:
   ```bash
   npm run serve
   ```

## Security Recommendations

1. **Store Environment Variables Securely**: Never commit `.env` files to your repository
2. **Regular Backups**: Back up the `/data` directory regularly
3. **HTTPS**: Ensure communication with webhooks uses HTTPS
4. **Token Security**: Keep your Telegram Bot Token secure and rotate if compromised
5. **Regular Updates**: Keep dependencies updated to mitigate security vulnerabilities

## Support

For additional assistance:
- Create an issue in the GitHub repository
- Contact the repository maintainers 