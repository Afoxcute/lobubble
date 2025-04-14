# Solana Wallet & Bubblemap Bot

A Telegram bot that allows users to generate Solana vanity wallet addresses and analyze token distributions with Bubblemaps.

## Features

### Solana Vanity Wallet Generator
- Create custom Solana wallet addresses with user-defined prefixes
- Walk users through a simple registration process
- Generate and securely provide wallet public/private keys

### Token Bubblemap Analysis
- Analyze token distribution across multiple blockchains
- Provide visual bubblemap showing token holder relationships
- Calculate a decentralization score based on distribution metrics
- Generate insightful analysis about token concentration

## Setup

1. Clone the repository
```bash
git clone <repository-url>
cd lobubble
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory with the following content:
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

4. Build the project
```bash
npm run build
```

5. Start the bot
```bash
npm run serve
```

## Deployment on Render

This project is configured for easy deployment on [Render](https://render.com/).

### Deployment Steps

1. Create a new account or sign in to Render
2. Click "New" and select "Web Service"
3. Connect your GitHub repository
4. Use the following settings:
   - **Name**: lobubble-bot (or your preferred name)
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run serve`
   - **Plan**: Free

5. Add the following environment variable:
   - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token

6. Click "Create Web Service"

The deployment will automatically use the `render.yaml` configuration file in the repository.

## Available Commands

- `/start` - Start the bot
- `/register` - Start registration for a vanity wallet
- `/wallet` - Check wallet information
- `/bubblemap` - Generate bubblemap for any contract
- `/help` - Show available commands

## Supported Blockchains for Bubblemap

- Ethereum (eth)
- Binance Smart Chain (bsc)
- Fantom (ftm)
- Avalanche (avax)
- Cronos (cro)
- Arbitrum (arbi)
- Polygon (poly)
- Base (base)
- Solana (sol)
- Sonic (sonic)

## License

ISC 