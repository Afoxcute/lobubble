import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { handleRegistration, handleWalletStatus, handlePrefixSuggestion } from './handlers/registrationHandler';
import { handleBubblemapCommand, handleBubblemapInput, handleBubblemapCallback } from './handlers/bubblemapHandler';
import { getUser, createUser, getBubblemapHistory, BubblemapHistoryEntry } from './utils/userDatabase';
import http from 'http';

// Load environment variables from .env file
dotenv.config();

// Create a health check server for Render
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'OK', uptime: process.uptime() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`Health check server running on port ${process.env.PORT || 3000}`);
});

// Get the Telegram token from environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not set in environment variables');
  process.exit(1);
}

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Global error handler for async operations
const handleAsync = async (fn: (...args: any[]) => Promise<void>, ...args: any[]): Promise<void> => {
  try {
    await fn(...args);
  } catch (err) {
    console.error('Error in async operation:', err);
    
    // Try to notify the user if we can determine the chat ID
    try {
      const msg = args.find(arg => arg?.chat?.id) as TelegramBot.Message;
      if (msg?.chat?.id) {
        await bot.sendMessage(
          msg.chat.id,
          '❌ Sorry, an error occurred while processing your request. Please try again later.',
          getMainMenuKeyboard()
        );
      }
    } catch (notifyErr) {
      console.error('Failed to notify user of error:', notifyErr);
    }
  }
};

// Log when the bot starts
console.log('Bot started...');

// Create main menu keyboard
function getMainMenuKeyboard(): TelegramBot.SendMessageOptions {
  return {
    reply_markup: {
      keyboard: [
        [{ text: '📝 Register' }, { text: '👛 My Wallet' }],
        [{ text: 'ℹ️ Help' }, { text: '📊 Bubblemap' }],
        [{ text: '📋 History' }]
      ],
      resize_keyboard: true
    }
  };
}

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  await handleAsync(async () => {
    const chatId = msg.chat.id;
    let user = getUser(chatId);
    if (!user) {
      user = createUser(chatId, msg.from?.username);
    }
    const firstName = msg.from?.first_name || 'there';
    
    await bot.sendMessage(
      chatId,
      `👋 *Welcome to the Solana Wallet & Bubblemap Bot!*\n\n` +
      `This bot helps you generate Solana vanity wallet addresses and analyze token distributions with Bubblemaps.\n\n` +
      `Available commands:\n` +
      '• /register - Generate a Solana wallet\n' +
      '• /wallet - View your wallet info\n' +
      '• /bubblemap - Generate a token bubblemap\n' +
      '• /history - View your bubblemap history\n' +
      '• /help - Show help information',
      getMainMenuKeyboard()
    );
  }, msg);
});

// Handle /help command
bot.onText(/\/help|ℹ️ Help/, async (msg) => {
  await handleAsync(async () => {
    const chatId = msg.chat.id;
    
    await bot.sendMessage(
      chatId,
      '🤖 *Solana Wallet & Bubblemap Bot - Help*\n\n' +
      '*Available Commands*\n\n' +
      '• /start - Initialize the bot and display main menu\n' +
      '• /register - Start the wallet registration process\n' +
      '• /wallet - View your registered wallet information\n' +
      '• /bubblemap - Generate a bubblemap for a token\n' +
      '• /history - View your bubblemap analysis history\n' +
      '• /help - Show this help message\n\n' +
      '*How to Use Bubblemap Analysis*\n' +
      '1. Complete registration first using /register\n' +
      '2. Use /bubblemap to start analysis\n' +
      '3. Enter a token contract address\n' +
      '4. Select the blockchain for the token\n' +
      '5. View the generated bubblemap and analysis\n\n' +
      '*How to View History*\n' +
      '1. Use /history or click the "📋 History" button\n' +
      '2. View your most recent bubblemap analyses\n' +
      '3. Select an entry to view the full analysis again',
      getMainMenuKeyboard()
    );
  }, msg);
});

// Handle /register command
bot.onText(/\/register|📝 Register/, async (msg) => {
  await handleAsync(handleRegistration, bot, msg, '/register');
});

// Handle /wallet command
bot.onText(/\/wallet|👛 My Wallet/, async (msg) => {
  await handleAsync(async () => {
    const chatId = msg.chat.id;
    await handleWalletStatus(bot, chatId);
  }, msg);
});

// Handle /bubblemap command
bot.onText(/\/bubblemap|📊 Bubblemap/, async (msg) => {
  await handleAsync(async () => {
    const chatId = msg.chat.id;
    const text = msg.text || '';
    
    // Don't treat "📊 Bubblemap" button text as part of the command
    if (text === '📊 Bubblemap' || text === '/bubblemap') {
      // Start fresh with just the command
      await handleBubblemapCommand(bot, { ...msg, text: '/bubblemap' });
    } else {
      // Pass through the full command with parameters
      await handleBubblemapCommand(bot, msg);
    }
  }, msg);
});

// Handle /history command
bot.onText(/\/history/, async (msg) => {
  const chatId = msg.chat.id;
  
  // Check if user exists
  const user = getUser(chatId);
  if (!user) {
    await bot.sendMessage(
      chatId,
      '❌ You need to register first before using this feature.\n\n' +
      'Use /register to create your account.',
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  // Get user's bubblemap history
  const history = getBubblemapHistory(chatId);
  
  if (history.length === 0) {
    await bot.sendMessage(
      chatId,
      '📋 *Bubblemap History*\n\n' +
      'You haven\'t analyzed any tokens yet.\n\n' +
      'Use /bubblemap to analyze a token and build your history.',
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  // Format the history entries
  const historyMessage = formatBubblemapHistory(history);
  
  // Create inline keyboard for history entries
  const keyboard = createHistoryKeyboard(history);
  
  await bot.sendMessage(
    chatId,
    historyMessage,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    }
  );
});

// Handle callback queries
bot.on('callback_query', async (callbackQuery) => {
  await handleAsync(async () => {
    const message = callbackQuery.message;
    if (!message) return;
    
    const chatId = message.chat.id;
    const data = callbackQuery.data;
    
    if (!data) return;
    
    if (data.startsWith('chain_')) {
      // Handle chain selection for bubblemap
      await handleBubblemapCallback(bot, callbackQuery);
    } else {
      switch (data) {
        case 'register_start':
          await handleRegistration(bot, message, '/register');
          break;
        case 'show_wallet':
          await handleWalletStatus(bot, chatId);
          break;
        case 'cancel_registration':
          await bot.sendMessage(
            chatId, 
            'Registration canceled. You can start again anytime with the Register button.',
            getMainMenuKeyboard()
          );
          break;
        // Handle prefix suggestions
        case 'prefix_cool':
          await handlePrefixSuggestion(bot, chatId, 'COOL');
          break;
        case 'prefix_sol':
          await handlePrefixSuggestion(bot, chatId, 'SOL');
          break;
        case 'prefix_moon':
          await handlePrefixSuggestion(bot, chatId, 'MOON');
          break;
        case 'history:':
          await handleHistoryCallback(bot, callbackQuery);
          break;
        default:
          console.log(`Unknown callback data: ${data}`);
          break;
      }
    }
    
    // Answer the callback query to remove the loading state
    await bot.answerCallbackQuery(callbackQuery.id);
  }, callbackQuery);
});

// Listen for any kind of message. There are different kinds of messages
bot.on('message', async (msg) => {
  await handleAsync(async () => {
    // Skip command messages, which are handled by the specific handlers above
    if (msg.text?.startsWith('/') || 
        msg.text?.startsWith('📝') || 
        msg.text?.startsWith('👛') || 
        msg.text?.startsWith('ℹ️') ||
        msg.text?.startsWith('📊')) return;
    
    const chatId = msg.chat.id;
    const text = msg.text || '';
    
    // Check if it's a bubblemap conversation
    const isBubblemapConversation = await handleBubblemapInput(bot, msg);
    if (isBubblemapConversation) return;
    
    // Handle registration flow
    await handleRegistration(bot, msg, text);
  }, msg);
});

// Handle errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// Format bubblemap history for display
function formatBubblemapHistory(history: BubblemapHistoryEntry[]): string {
  let message = '📋 *Your Bubblemap History*\n\n';
  
  history.forEach((entry, index) => {
    const date = new Date(entry.timestamp).toLocaleDateString();
    const time = new Date(entry.timestamp).toLocaleTimeString();
    
    message += `*${index + 1}.* `;
    
    if (entry.symbol && entry.name) {
      message += `${entry.name} (${entry.symbol})`;
    } else {
      message += `Token: ${entry.tokenAddress.substring(0, 6)}...${entry.tokenAddress.substring(entry.tokenAddress.length - 4)}`;
    }
    
    message += `\nChain: ${entry.chain.toUpperCase()}\n`;
    message += `Date: ${date} ${time}\n\n`;
  });
  
  message += 'Select an entry to view the full analysis.';
  
  return message;
}

// Create inline keyboard for history entries
function createHistoryKeyboard(history: BubblemapHistoryEntry[]): TelegramBot.InlineKeyboardMarkup {
  const keyboard: TelegramBot.InlineKeyboardButton[][] = [];
  
  history.forEach((entry, index) => {
    const buttonText = entry.symbol 
      ? `${index + 1}. ${entry.symbol}`
      : `${index + 1}. ${entry.chain}:${entry.tokenAddress.substring(0, 6)}...`;
    
    keyboard.push([
      { 
        text: buttonText, 
        callback_data: `history:${entry.chain}:${entry.tokenAddress}` 
      }
    ]);
  });
  
  return { inline_keyboard: keyboard };
}

// Handle history callback
async function handleHistoryCallback(bot: TelegramBot, callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
  if (!callbackQuery.data) return;
  
  const chatId = callbackQuery.message?.chat.id;
  if (!chatId) return;
  
  // Extract chain and token from callback data
  const [, chain, tokenAddress] = callbackQuery.data.split(':');
  
  if (!chain || !tokenAddress) {
    await bot.answerCallbackQuery(callbackQuery.id, { text: 'Invalid selection' });
    return;
  }
  
  // Answer the callback query
  await bot.answerCallbackQuery(callbackQuery.id, { text: 'Fetching analysis...' });
  
  try {
    // Send loading message
    const loadingMsg = await bot.sendMessage(chatId, '⏳ Retrieving bubblemap analysis...');
    
    // Generate the bubblemap analysis again
    const { generateTokenBubblemap } = await import('./utils/bubblemap');
    const result = await generateTokenBubblemap(tokenAddress, chain);
    
    // Delete loading message
    await bot.deleteMessage(chatId, loadingMsg.message_id);
    
    // Format and send results
    let message = `*🔮 Bubblemap Analysis*\n\n`;
    
    if (result.tokenInfo) {
      message += `*Token:* ${result.tokenInfo.name || 'Unknown'} (${result.tokenInfo.symbol || 'Unknown'})\n`;
      message += `*Contract:* \`${result.tokenAddress}\`\n\n`;
    } else {
      message += `*Contract:* \`${result.tokenAddress}\`\n\n`;
    }
    
    message += `*Decentralization Score:* ${result.decentralizationScore}/100\n`;
    message += `\n*Analysis:*\n`;
    message += `• ${result.holderCount} total holders identified\n`;
    
    if (result.topHolderPercentage) {
      message += `• Top 10 wallets hold ${result.topHolderPercentage}% of supply\n`;
    }
    
    if (result.largeHolderCount) {
      message += `• ${result.largeHolderCount} wallets hold >1% of supply\n`;
    }
    
    // Risk assessment
    const score = result.decentralizationScore;
    let riskLevel = '🔴 High';
    
    if (score >= 75) {
      riskLevel = '🟢 Low';
    } else if (score >= 40) {
      riskLevel = '🟠 Medium';
    }
    
    message += `\n*Concentration Risk:* ${riskLevel}\n`;
    
    // Send image if available
    if (result.imageUrl) {
      await bot.sendPhoto(chatId, result.imageUrl, {
        caption: message,
        parse_mode: 'Markdown'
      });
    } else {
      await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown'
      });
    }
  } catch (error) {
    console.error('Error retrieving bubblemap history item:', error);
    await bot.sendMessage(
      chatId,
      '❌ Error retrieving bubblemap analysis. The token may no longer be available or the service is temporarily unavailable.',
      { parse_mode: 'Markdown' }
    );
  }
}
