import TelegramBot from 'node-telegram-bot-api';
import { getHistory, formatHistory } from '../utils/history';

export async function handleHelpCommand(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  if (text.toLowerCase() === '/history') {
    // Show user's history
    const history = getHistory(chatId);
    await bot.sendMessage(
      chatId,
      `📜 *Your Recent Activity*\n\n${formatHistory(history)}`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Main help message
  await bot.sendMessage(
    chatId,
    `🤖 *Welcome to the Solana Wallet & Bubblemap Bot!*\n\n` +
    `*Available Commands:*\n\n` +
    `📝 */register* - Start the registration process to create your Solana wallet\n` +
    `👛 */wallet* - View your wallet information and balance\n` +
    `📊 */bubblemap <token_address> <chain>* - Generate a bubblemap for any token\n` +
    `📜 */history* - View your recent activity history\n` +
    `ℹ️ */help* - Show this help message\n\n` +
    `*Examples:*\n` +
    `• /bubblemap 0x123... eth\n` +
    `• /wallet\n` +
    `• /history\n\n` +
    `*Supported Chains:*\n` +
    `ETH, BSC, FTM, AVAX, CRO, ARBI, POLY, BASE, SOL, SONIC\n\n` +
    `Need more help? Just ask! 😊`,
    { parse_mode: 'Markdown' }
  );
} 