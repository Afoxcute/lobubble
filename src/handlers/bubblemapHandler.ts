import TelegramBot from 'node-telegram-bot-api';
import { 
  fetchBubblemapData, 
  generateBubblemapUrl,
  formatBubblemapSummary,
  createBubblemapWebAppButton,
  calculateDecentralizationScore,
  generateInsights,
  getScreenshotUrl,
  AVAILABLE_CHAINS
} from '../utils/bubblemap';
import { getUser } from '../utils/userDatabase';

// Store in-progress bubblemap requests to handle the conversation flow
interface BubblemapRequest {
  tokenAddress?: string;
  chain?: string;
  stage: 'START' | 'WAITING_FOR_TOKEN' | 'WAITING_FOR_CHAIN' | 'COMPLETED';
}

const userBubblemapRequests = new Map<number, BubblemapRequest>();

// Main handler for /bubblemap command
export async function handleBubblemapCommand(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  
  // Check if user has a registered wallet
  const user = getUser(chatId);
  
  if (!user || !user.registrationComplete) {
    await bot.sendMessage(
      chatId,
      '❌ *Access Restricted*\n\nYou need to register and create a wallet before using the Bubblemap feature.\n\nPlease use the 📝 Register button or /register command first.',
      { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📝 Register Now', callback_data: 'register_start' }]
          ]
        }
      }
    );
    return;
  }
  
  // Clear any existing requests for this user to start fresh
  userBubblemapRequests.delete(chatId);
  
  // Check if there's an address in the command
  const parts = text.split(' ');
  if (parts.length > 1) {
    // Format: /bubblemap 0x123... eth
    const tokenAddress = parts[1].trim();
    
    // Basic validation
    if (tokenAddress.length < 5) {
      await bot.sendMessage(
        chatId,
        '❌ Invalid contract address. Please provide a valid contract address.',
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    const chain = parts.length > 2 ? parts[2].toLowerCase().trim() : '';
    
    if (chain && AVAILABLE_CHAINS.includes(chain)) {
      // We have both address and valid chain
      userBubblemapRequests.set(chatId, { 
        tokenAddress, 
        chain, 
        stage: 'COMPLETED' 
      });
      
      await generateBubblemap(bot, chatId, tokenAddress, chain);
    } else {
      // Have address but need chain
      userBubblemapRequests.set(chatId, { 
        tokenAddress,
        stage: 'WAITING_FOR_CHAIN' 
      });
      
      await promptForChain(bot, chatId, tokenAddress);
    }
  } else {
    // Start the conversation flow
    userBubblemapRequests.set(chatId, { stage: 'WAITING_FOR_TOKEN' });
    
    await bot.sendMessage(
      chatId,
      '🔍 *Bubblemap Generator*\n\n' +
      'Please enter the contract address you want to generate a bubblemap for:',
      { parse_mode: 'Markdown' }
    );
  }
}

// Handler for bubblemap conversation flow
export async function handleBubblemapConversation(bot: TelegramBot, msg: TelegramBot.Message): Promise<boolean> {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  
  // Check if the user has an active bubblemap request
  const request = userBubblemapRequests.get(chatId);
  if (!request) return false;
  
  // Check if user has a registered wallet
  const user = getUser(chatId);
  
  if (!user || !user.registrationComplete) {
    await bot.sendMessage(
      chatId,
      '❌ *Access Restricted*\n\nYou need to register and create a wallet before using the Bubblemap feature.\n\nPlease use the 📝 Register button or /register command first.',
      { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📝 Register Now', callback_data: 'register_start' }]
          ]
        }
      }
    );
    userBubblemapRequests.delete(chatId); // Clear the request
    return true;
  }
  
  switch (request.stage) {
    case 'WAITING_FOR_TOKEN':
      // User is inputting a token address
      userBubblemapRequests.set(chatId, {
        ...request,
        tokenAddress: text,
        stage: 'WAITING_FOR_CHAIN'
      });
      
      await promptForChain(bot, chatId, text);
      return true;
      
    case 'WAITING_FOR_CHAIN':
      // User is selecting a chain
      const chain = text.toLowerCase();
      
      if (AVAILABLE_CHAINS.includes(chain)) {
        const { tokenAddress } = request;
        if (tokenAddress) {
          await generateBubblemap(bot, chatId, tokenAddress, chain);
          
          // Mark as completed
          userBubblemapRequests.set(chatId, {
            ...request,
            chain,
            stage: 'COMPLETED'
          });
        }
      } else {
        // Invalid chain
        await bot.sendMessage(
          chatId,
          `❌ Invalid chain: "${text}"\n\n` +
          `Available chains: ${AVAILABLE_CHAINS.join(', ')}\n\n` +
          'Please select a valid chain:',
          getChainKeyboard()
        );
      }
      return true;
      
    default:
      return false;
  }
}

// Handle chain selection callback
export async function handleChainSelection(bot: TelegramBot, callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
  const message = callbackQuery.message;
  if (!message) return;
  
  const chatId = message.chat.id;
  const data = callbackQuery.data || '';
  
  if (!data.startsWith('chain_')) return;
  
  // Extract the chain from the callback data
  const chain = data.replace('chain_', '');
  
  // Find the user's bubblemap request
  const request = userBubblemapRequests.get(chatId);
  
  // Answer the callback query first to stop the loading state
  await bot.answerCallbackQuery(callbackQuery.id);
  
  // If we have a request with a token address, process it
  if (request && request.tokenAddress) {
    try {
      // Update the message to show we're generating
      await bot.editMessageText(
        `🔄 Processing your request for chain: ${chain.toUpperCase()}...`,
        {
          chat_id: chatId,
          message_id: message.message_id,
          parse_mode: 'Markdown'
        }
      );
      
      // Generate the bubblemap
      await generateBubblemap(bot, chatId, request.tokenAddress, chain);
      
      // Mark as completed
      userBubblemapRequests.set(chatId, {
        ...request,
        chain,
        stage: 'COMPLETED'
      });
    } catch (error) {
      console.error('Error handling chain selection:', error);
      
      // Send error message
      await bot.sendMessage(
        chatId,
        '❌ An error occurred while processing your selection. Please try again.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Try Again', callback_data: `chain_${chain}` }]
            ]
          }
        }
      );
    }
  } else {
    // No active request found
    await bot.sendMessage(
      chatId,
      '❌ Your bubblemap request has expired. Please start a new request with /bubblemap',
      { parse_mode: 'Markdown' }
    );
  }
}

// Generate keyboard for chain selection
function getChainKeyboard(): TelegramBot.SendMessageOptions {
  const keyboard: TelegramBot.InlineKeyboardButton[][] = [];
  const rowSize = 3;
  
  // Create rows of buttons
  for (let i = 0; i < AVAILABLE_CHAINS.length; i += rowSize) {
    const row = AVAILABLE_CHAINS.slice(i, i + rowSize).map(chain => ({
      text: chain.toUpperCase(),
      callback_data: `chain_${chain}`
    }));
    keyboard.push(row);
  }
  
  return {
    reply_markup: {
      inline_keyboard: keyboard
    }
  };
}

// Prompt user to select a chain
async function promptForChain(bot: TelegramBot, chatId: number, tokenAddress: string): Promise<void> {
  await bot.sendMessage(
    chatId,
    `📊 Contract address received: \`${tokenAddress}\`\n\n` +
    'Please select the blockchain this contract is on:',
    {
      parse_mode: 'Markdown',
      ...getChainKeyboard()
    }
  );
}

// Generate and send bubblemap for the given token address and chain
async function generateBubblemap(bot: TelegramBot, chatId: number, tokenAddress: string, chain: string): Promise<void> {
  let loadingMsg: TelegramBot.Message | null = null;
  
  try {
    // Send loading message
    loadingMsg = await bot.sendMessage(
      chatId,
      `🔄 Generating comprehensive bubblemap visualization for contract \`${tokenAddress}\` on ${chain.toUpperCase()}...\n\nPlease be patient as we create a detailed visual analysis.`,
      { parse_mode: 'Markdown' }
    );
    
    // Fetch bubblemap data
    const bubblemapData = await fetchBubblemapData(tokenAddress, chain);
    
    // Calculate decentralization score
    const decentralizationScore = calculateDecentralizationScore(bubblemapData);
    
    // Generate insights without market data
    const insightsText = generateInsights(bubblemapData, decentralizationScore);
    
    // Create a summary message
    const tokenSummary = formatBubblemapSummary(bubblemapData);
    
    // Create the full message
    const fullMessage = 
      `${tokenSummary}\n\n` +
      `*Decentralization Score*: ${decentralizationScore}/100\n\n` +
      `*Insights*:\n${insightsText}\n\n` +
      `Click below to view interactive bubblemap:`;
    
    // Get bubblemap screenshot URL
    const screenshotUrl = getScreenshotUrl(tokenAddress, chain);
    
    // Update loading message to show progress
    await bot.editMessageText(
      `🖼️ Bubblemap analysis complete! Generating visualization...\n\nWe're fetching a high-quality image of the token's bubblemap directly from the API.`,
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      }
    );
    
    // Try to send the screenshot image using multiple methods
    let screenshotSent = false;
    
    // First try: Direct URL with sendPhoto
    try {
      await bot.sendPhoto(
        chatId,
        screenshotUrl,
        {
          caption: `🫧 Bubblemap for ${bubblemapData.full_name || bubblemapData.symbol} (${chain.toUpperCase()})`,
          parse_mode: 'Markdown'
        }
      );
      screenshotSent = true;
    } catch (photoError) {
      console.error('Error sending bubblemap screenshot with direct URL, trying with file upload', photoError);
      
      // Second try: Try with a different screenshot service or method
      try {
        // Alternative option: Full URL to the actual bubblemap page
        const directUrl = generateBubblemapUrl(tokenAddress, chain);
        await bot.sendMessage(
          chatId,
          `📊 [Click here to view the interactive bubblemap visualization](${directUrl})`,
          {
            parse_mode: 'Markdown',
            disable_web_page_preview: false
          }
        );
        screenshotSent = true;
      } catch (secondError) {
        console.error('Error sending bubblemap link, will include in analysis message', secondError);
      }
    }
    
    // Then send the detailed analysis
    const analysisMessage = screenshotSent ? 
      fullMessage : 
      `${fullMessage}\n\n📸 [Click here to view the bubblemap visualization](${generateBubblemapUrl(tokenAddress, chain)})`;
      
    try {
      // Try to edit the loading message with the analysis
      if (loadingMsg) {
        await bot.editMessageText(
          analysisMessage,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: createBubblemapWebAppButton(tokenAddress, chain)
          }
        );
      }
    } catch (editError) {
      console.error('Error editing message, sending new one:', editError);
      
      // If editing fails, send a new message
      await bot.sendMessage(
        chatId,
        analysisMessage,
        {
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
          reply_markup: createBubblemapWebAppButton(tokenAddress, chain)
        }
      );
    }
  } catch (error) {
    let errorMessage = 'Failed to generate bubblemap.';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Check if we need to edit the loading message or send a new one
    if (loadingMsg) {
      try {
        // Try to edit existing message
        await bot.editMessageText(
          `❌ ${errorMessage}\n\nPlease try again with a different contract address or chain.`,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
          }
        );
      } catch (editError) {
        // If edit fails, send new message
        await bot.sendMessage(
          chatId,
          `❌ ${errorMessage}\n\nPlease try again with a different contract address or chain.`
        );
      }
    } else {
      // No loading message, just send a new message
      await bot.sendMessage(
        chatId,
        `❌ ${errorMessage}\n\nPlease try again with a different contract address or chain.`
      );
    }
  }
}

// Handler for bubblemap-related callbacks
export async function handleBubblemapCallback(bot: TelegramBot, query: TelegramBot.CallbackQuery): Promise<boolean> {
  const chatId = query.message?.chat.id;
  if (!chatId || !query.data) return false;
  
  // Check if this is bubblemap related
  if (!query.data.startsWith('bubblemap_')) return false;
  
  // Check if user has a registered wallet
  const user = getUser(chatId);
  
  if (!user || !user.registrationComplete) {
    await bot.answerCallbackQuery(query.id, { 
      text: '❌ You need to register and create a wallet before using Bubblemap',
      show_alert: true 
    });
    
    await bot.sendMessage(
      chatId,
      '❌ *Access Restricted*\n\nYou need to register and create a wallet before using the Bubblemap feature.\n\nPlease use the 📝 Register button or /register command first.',
      { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📝 Register Now', callback_data: 'register_start' }]
          ]
        }
      }
    );
    
    return true;
  }
  
  const parts = query.data.split('_');
  const action = parts[1];

  // Handle based on action type
  // This is a placeholder implementation - you should replace with actual bubblemap callback handling
  if (action === 'close') {
    await bot.deleteMessage(chatId, query.message?.message_id || 0);
    return true;
  }
  
  await bot.answerCallbackQuery(query.id);
  return true;
} 