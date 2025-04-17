import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { handleRegistration, handleWalletStatus, handlePrefixSuggestion } from './handlers/registrationHandler';
import { handleBubblemapCommand, handleBubblemapConversation, handleChainSelection } from './handlers/bubblemapHandler';
import { getUser, createUser } from './utils/userDatabase';
import http from 'http';
import express from 'express';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Make sure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log(`Created logs directory: ${logsDir}`);
}

// Basic request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    telegramBot: bot ? 'running' : 'not connected'
  });
});

// Bot status endpoint
app.get('/status', (req, res) => {
  res.status(200).json({
    status: 'OK',
    botStartTime: startTime,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    users: getUserCount()
  });
});

// Root endpoint with basic info
app.get('/', (req, res) => {
  res.send(`<h1>Solana Wallet & Bubblemap Bot</h1>
    <p>Status: Online</p>
    <p>Uptime: ${Math.floor((Date.now() - startTime) / 1000)} seconds</p>
    <p><a href="/health">Health Check</a></p>`);
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

// Track bot start time
const startTime = Date.now();

// Function to get user count
function getUserCount() {
  try {
    const userArray = getAllUsers();
    return userArray.length;
  } catch (error) {
    console.error('Error getting user count:', error);
    return 0;
  }
}

// Get the Telegram token from environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not set in environment variables');
  process.exit(1);
}

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Import the missing functions
import { getAllUsers } from './utils/userDatabase';

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
        [{ text: 'ℹ️ Help' }, { text: '📊 Bubblemap' }]
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
      `Hello ${firstName}! Welcome to the Solana Wallet & Bubblemap Bot! 🚀\n\n` +
      `This bot helps you generate Solana vanity wallet addresses and analyze crypto contracts with Bubblemaps.\n\n` +
      `Use the buttons below to navigate:`,
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
      'Available commands:\n\n' +
      '📝 Register - Register and generate a Solana vanity wallet\n' +
      '👛 My Wallet - Check your wallet information\n' +
      '📊 Bubblemap - Generate a bubblemap for any contract\n' +
      'ℹ️ Help - Show available commands\n\n' +
      'You can also use text commands:\n' +
      '/start - Start the bot\n' +
      '/register - Start registration\n' +
      '/wallet - Check wallet info\n' +
      '/bubblemap - Generate bubblemap\n' +
      '/help - Show this help',
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
      await handleChainSelection(bot, callbackQuery);
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
    const isBubblemapConversation = await handleBubblemapConversation(bot, msg);
    if (isBubblemapConversation) return;
    
    // Handle registration flow
    await handleRegistration(bot, msg, text);
  }, msg);
});

// Handle errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// Handle graceful shutdown
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}. Gracefully shutting down...`);
  
  // Perform cleanup operations
  try {
    // Stop polling for updates from Telegram
    await bot.stopPolling();
    console.log('Telegram bot polling stopped');
    
    // Set a timeout to force exit if cleanup takes too long
    setTimeout(() => {
      console.log('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
    
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}
