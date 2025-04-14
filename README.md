# LoBubble - Solana Token Analysis Bot

A Telegram bot for analyzing Solana tokens using Bubblemaps, featuring wallet generation and token distribution analysis.

## Features

- 🫧 Bubblemap visualization for token analysis
- 💹 Token market information and insights
- 📊 Decentralization scoring system
- 👛 Solana vanity wallet generation
- 📱 Interactive Telegram mini-app support

## Configuration

The bot uses environment variables for configuration. Create a `.env` file in the root directory with the following variables:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
PORT=3000  # Server port for the bot
```

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create and configure the `.env` file as described above
4. Build the project:
```bash
npm run build
```

5. Start the bot:
```bash
npm start
```

## Development

To run the bot in development mode with hot reloading:
```bash
npm run start
```

## Commands

- `/start` - Initialize the bot
- `/register` - Register and create a Solana wallet
- `/wallet` - View wallet information
- `/bubblemap` - Generate token analysis bubblemap
- `/help` - Show available commands

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token from BotFather | Required |
| `PORT` | Server port for the bot | 3000 |

## License

ISC 