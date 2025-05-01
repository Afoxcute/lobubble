import TelegramBot from 'node-telegram-bot-api';

export async function handleHelpCommand(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  
  const helpMessage = 
    '*🤖 Solana Wallet & Bubblemap Bot Help*\n\n' +
    '*Available Commands:*\n' +
    '/start - Start the bot and show main menu\n' +
    '/help - Show this help message\n' +
    '/register - Create your Solana wallet\n' +
    '/wallet - View your wallet details\n' +
    '/bubblemap - Generate token ownership visualization\n' + 
    '/history - View your bubblemap analysis history\n\n' +
    
    '*How to Use:*\n' +
    '1. 📝 Register to create your Solana wallet\n' +
    '2. 👛 Check your wallet status anytime\n' +
    '3. 📊 Generate bubblemaps by providing token addresses\n' + 
    '4. 📋 Access your history of bubblemap analyses\n\n' +
    
    '*Bubblemap Analysis:*\n' +
    'Type `/bubblemap [token_address] [chain]` to analyze any token\n' +
    'Chains: solana, ethereum, arbitrum, base, optimism, polygon\n\n' +
    
    '*History Command:*\n' +
    'Use `/history` to view all tokens you\'ve previously analyzed\n' +
    'Click on any "Bubblemap" link to quickly re-analyze a token\n\n' +
    
    '*Need Help?*\n' +
    'Contact support at support@botname.com';

  await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
} 