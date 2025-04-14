# Telegram Bot with Solana Wallet Generator and Bubblemap Analyzer

A Telegram bot built with Node.js and TypeScript that can generate Solana vanity wallet addresses and create Bubblemaps for crypto contracts.

## Features

- Registration flow for users
- Solana vanity wallet address generation
- Contract bubblemap visualization with Bubblemaps API
- Start command: `/start` - Displays a welcome message
- Help command: `/help` - Shows available commands
- Wallet command: `/wallet` - Displays wallet information
- Bubblemap command: `/bubblemap` - Generate bubblemap for any contract

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Telegram Bot Token (obtained from [@BotFather](https://t.me/BotFather))

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory based on `.env.example`:
   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   ```
4. Replace `your_telegram_bot_token` with the token you received from @BotFather

## Development

Run the bot in development mode:

```
npm start
```

## Build for Production

Build the TypeScript code:

```
npm run build
```

Run the compiled JavaScript:

```
npm run serve
```

## User Registration Flow

The bot guides users through a registration process to generate a Solana vanity wallet address:

1. Use the `/register` command to start
2. Enter your name
3. Enter your email address
4. Specify a vanity prefix (1-5 alphanumeric characters)
5. The bot will generate a Solana wallet address that starts with your chosen prefix
6. Use `/wallet` to view your wallet information at any time

## Bubblemap Generation

The bot can analyze any crypto contract address and generate a bubblemap visualization:

1. Use the `/bubblemap` command to start
2. Enter the contract address you want to analyze
3. Select the blockchain (eth, bsc, sol, etc.)
4. The bot will generate and display a bubblemap summary with the top token holders
5. Click the link to view the full interactive bubblemap on Bubblemaps.io

### Supported Blockchains

The following blockchains are supported for bubblemap generation:
- Ethereum (eth)
- Binance Smart Chain (bsc)
- Solana (sol)
- Polygon (poly)
- Avalanche (avax)
- Fantom (ftm)
- Arbitrum (arbi)
- Cronos (cro)
- Base (base)
- Sonic (sonic)

## How Vanity Addresses Work

Vanity addresses are Solana wallet addresses that start with specific characters of your choice. The bot generates random keypairs until it finds one with a public key that starts with your chosen prefix.

Note: The longer the prefix, the longer it takes to generate the address. The current implementation limits prefixes to 5 characters maximum.

## How to get a Telegram Bot Token

1. Start a chat with [@BotFather](https://t.me/BotFather) on Telegram
2. Send the `/newbot` command
3. Follow the instructions to create a new bot
4. BotFather will give you a token for your new bot
5. Copy this token to your `.env` file

## Security Notice

This bot stores wallet private keys in memory for demonstration purposes only. In a production environment, you should never store private keys on the server. Users should be responsible for securing their own private keys.

## License

ISC 