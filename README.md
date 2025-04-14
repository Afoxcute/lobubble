# Solana Wallet & Bubblemap Bot Documentation

A comprehensive Telegram bot for generating Solana vanity wallet addresses and analyzing token distributions with Bubblemaps.

## Demo Video

Watch our walkthrough demo video:
[View Demo Video](https://drive.google.com/drive/folders/1j74KjxCiLj34nQu2TDQPXz5hBrfAlHDN?usp=sharing)

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Deployment](#deployment)
7. [Usage Guide](#usage-guide)
8. [Technical Details](#technical-details)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)

## Overview

The Solana Wallet & Bubblemap Bot is a Telegram bot designed to provide users with two primary functionalities:

1. Generation of Solana vanity wallet addresses with user-defined prefixes
2. Analysis of token distributions across multiple blockchains using Bubblemaps

The bot implements a conversational interface with comprehensive error handling, persistent data storage, and user authentication flows.

## Features

### Solana Vanity Wallet Generator

- User registration with name and email collection
- Custom wallet prefix selection (1-5 alphanumeric characters)
- Real-time generation progress updates
- Secure wallet creation with private key delivery
- Persistent wallet storage between sessions

### Token Bubblemap Analysis (Requires Registration)

- Support for 10 different blockchains
- Token holder distribution visualization
- Decentralization scoring (0-100 scale)
- Holder concentration analysis
- Interactive visualization options
- Direct image API integration with Bubblemaps
- Comprehensive token insights

## Architecture

The application follows a modular architecture with clear separation of concerns:

- **Handler Modules**: Process different types of user interactions
  - `registrationHandler.ts`: Manages the wallet registration flow
  - `bubblemapHandler.ts`: Handles bubblemap analysis requests

- **Utility Modules**: Provide core functionality
  - `userDatabase.ts`: Manages persistent user data
  - `solana.ts`: Handles Solana-specific operations
  - `bubblemap.ts`: Interfaces with the Bubblemaps API

- **Main Application**: Orchestrates the components
  - `index.ts`: Sets up the bot, health checks, and routes commands

The bot uses a conversation-based state machine to track user progress through multi-step flows.

## Installation

### Prerequisites

- Node.js (v16.0.0 or higher)
- npm (v7.0.0 or higher)
- Telegram Bot Token (from [BotFather](https://t.me/BotFather))

### Local Setup

1. Clone the repository
```bash
git clone <repository-url>
cd lobubble
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
NODE_ENV=development
PORT=3000
```

4. Build the TypeScript code
```bash
npm run build
```

5. Start the bot in development mode
```bash
npm start
```

Or run the production build:
```bash
npm run serve
```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token | Yes | - |
| `NODE_ENV` | Environment setting (`development` or `production`) | No | `development` |
| `PORT` | Port for the health check server | No | `3000` |

### Persistent Storage

User data is stored in:
- Development: `./data/users.json`
- Production: `/data/users.json`

## Deployment

### Deploying to Render

The project includes configuration for easy deployment on [Render](https://render.com/):

1. Push your code to a Git repository
2. Create a new Web Service on Render
3. Connect to your repository
4. Use these settings:
   - **Name**: `lobubble-bot` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run serve`
   - **Plan**: Free or higher

5. Add the environment variable:
   - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token

6. Deploy the service

The included `render.yaml` and `Procfile` handle the configuration automatically.

## Usage Guide

### Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Initialize the bot and display main menu |
| `/help` | Show available commands and information |
| `/register` | Start the wallet registration process |
| `/wallet` | View your registered wallet information |
| `/bubblemap` | Generate a bubblemap for a token (requires registration) |

### Wallet Registration Flow

1. Start with `/register` or the "📝 Register" button
2. Enter your name when prompted
3. Provide a valid email address
4. Enter your desired wallet prefix (1-5 alphanumeric characters)
   - Suggestions are provided (COOL, SOL, MOON)
   - Custom prefixes are supported
5. Wait for wallet generation (longer prefixes take more time)
6. Receive your wallet address and private key

### Bubblemap Analysis Flow

**Note: Requires completed wallet registration**

1. Start with `/bubblemap` or the "📊 Bubblemap" button
2. Enter the token/contract address to analyze
3. Select the blockchain from the available options
4. Wait for the analysis to complete
5. Receive:
   - Visual bubblemap image
   - Token holder distribution analysis
   - Decentralization score
   - Market information (when available)
   - Interactive viewing options

### Supported Blockchains

| Chain ID | Blockchain |
|----------|------------|
| eth | Ethereum |
| bsc | Binance Smart Chain |
| ftm | Fantom |
| avax | Avalanche |
| cro | Cronos |
| arbi | Arbitrum |
| poly | Polygon |
| base | Base |
| sol | Solana |
| sonic | Sonic |

## Technical Details

### Vanity Wallet Generation

The bot generates Solana vanity addresses by:

1. Creating random keypairs
2. Converting the public key to a base58 string
3. Checking if it starts with the user's desired prefix
4. Repeating until a matching address is found

This is a probabilistic process, with longer prefixes taking exponentially more time to generate.

### Decentralization Scoring

The decentralization score (0-100) considers several factors:

- Concentration in top holders (higher concentration = lower score)
- Number of large holders (>1% holdings)
- Presence of burn addresses
- Contract vs. wallet holdings ratio

Higher scores indicate better token distribution and potentially lower manipulation risk.

### API Integrations

- **Bubblemaps Legacy API**: Used to fetch token holder data
- **Bubblemaps Image API**: Generates visual representations of token distribution

## Security Considerations

### Private Key Handling

While the bot stores private keys for demonstration purposes, in a production environment:

1. Consider implementing end-to-end encryption for private keys
2. Offer self-custody options where keys are delivered once and not stored
3. Add optional encryption of stored keys with user-provided passwords

### User Data Protection

User data is stored in:
- JSON files in development mode
- Persistent volume-mounted files in production

Consider implementing:
- Database encryption for sensitive fields
- Regular backup procedures
- Data retention policies

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Bot not responding | Verify your `TELEGRAM_BOT_TOKEN` is correct |
| Wallet generation slow | Shorter prefixes generate faster |
| Bubblemap errors | Verify the token address and chain are correct |
| Missing user data | Check `/data` directory permissions |

### Logs

- In development: Console output
- In production: Standard output captured by hosting platform

### Getting Help

For additional assistance:
- Open an issue on the GitHub repository
- Contact the repository maintainers 