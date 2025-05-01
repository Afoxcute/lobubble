import TelegramBot from 'node-telegram-bot-api';
import { getMainMenuKeyboard } from './registrationHandler';

export async function handleHelpCommand(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  
  const helpText = `
🤖 *Bubblemap Bot Commands*

/start - Start the bot and show the main menu
/register - Create a Solana wallet for bubblemap analysis
/wallet - View your wallet details and balance
/bubblemap - Analyze token ownership structure with bubblemaps
/history - View your past bubblemap analyses
/help - Show this help message

*How to use:*

1️⃣ Use /register to set up your Solana wallet
2️⃣ Use /bubblemap + token address to analyze a token
3️⃣ Use /history to view your past analyses
4️⃣ Use /wallet to check your wallet status

Example: /bubblemap 4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R solana
`;

  await bot.sendMessage(chatId, helpText, { 
    parse_mode: 'Markdown',
    ...getMainMenuKeyboard()
  });
} 