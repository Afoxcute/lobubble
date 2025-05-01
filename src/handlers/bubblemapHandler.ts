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
import { getUser, addBubblemapToHistory } from '../utils/userDatabase';
import { generateTokenBubblemap, TokenBubblemapResult } from '../utils/bubblemap';

// Store in-progress bubblemap requests to handle the conversation flow
interface BubblemapRequest {
  tokenAddress?: string;
  chain?: string;
  stage: 'START' | 'WAITING_FOR_TOKEN' | 'WAITING_FOR_CHAIN' | 'COMPLETED';
}

const userBubblemapRequests = new Map<number, BubblemapRequest>();

// Map to store the current state for each user
const userStates: Map<number, {
  step: 'initial' | 'asking_token' | 'asking_blockchain',
  tokenAddress?: string,
  blockchain?: string
}> = new Map();

// Available blockchains for bubblemap
const availableBlockchains: Record<string, string> = {
  eth: 'Ethereum',
  bsc: 'Binance Smart Chain',
  ftm: 'Fantom',
  avax: 'Avalanche',
  cro: 'Cronos',
  arbi: 'Arbitrum',
  poly: 'Polygon',
  base: 'Base',
  sol: 'Solana',
  sonic: 'Sonic'
};

// Generate the blockchain selection keyboard
function getBlockchainKeyboard(): TelegramBot.InlineKeyboardMarkup {
  const keyboard: TelegramBot.InlineKeyboardButton[][] = [];
  let row: TelegramBot.InlineKeyboardButton[] = [];
  
  Object.entries(availableBlockchains).forEach(([value, text], index) => {
    row.push({ text, callback_data: `chain:${value}` });
    
    // Create rows of 2 buttons each
    if (row.length === 2 || index === Object.keys(availableBlockchains).length - 1) {
      keyboard.push([...row]);
      row = [];
    }
  });
  
  // Add a cancel button at the bottom
  keyboard.push([{ text: '❌ Cancel', callback_data: 'bubblemap:cancel' }]);
  
  return { inline_keyboard: keyboard };
}

// Main handler for /bubblemap command
export async function handleBubblemapCommand(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const user = getUser(chatId);
  
  // Check if user is registered
  if (!user || !user.registrationComplete) {
    await bot.sendMessage(chatId, 
      "⚠️ You need to register first before using the Bubblemap feature.\n\n" +
      "Please use the /register command to complete your registration.");
    return;
  }
  
  // Initialize or reset user state
  userStates.set(chatId, { step: 'asking_token' });
  
  await bot.sendMessage(chatId,
    "🔍 Please enter the token contract address you want to analyze.\n\n" +
    "Example: `0x1f9840a85d5af5bf1d1762f925bdaddc4201f984` (UNI token)", {
    parse_mode: 'Markdown'
  });
}

// Handle user input for bubble map flow
export async function handleBubblemapInput(bot: TelegramBot, msg: TelegramBot.Message): Promise<boolean> {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  
  if (!text) return false;
  
  const state = userStates.get(chatId);
  if (!state) return false;
  
  // Handle token address input
  if (state.step === 'asking_token') {
    // Simple validation for token address
    if (!/^[a-zA-Z0-9]{20,64}$/.test(text)) {
      await bot.sendMessage(chatId, 
        "⚠️ Invalid token address format. Please enter a valid contract address.\n\n" +
        "Example: `0x1f9840a85d5af5bf1d1762f925bdaddc4201f984`", {
        parse_mode: 'Markdown'
      });
      return true;
    }
    
    // Update state with token address
    userStates.set(chatId, { 
      ...state, 
      step: 'asking_blockchain',
      tokenAddress: text
    });
    
    // Ask for blockchain selection
    await bot.sendMessage(chatId,
      "🌐 Select the blockchain for this token:", {
      reply_markup: getBlockchainKeyboard()
    });
    
    return true;
  }
  
  return false;
}

// Handle callback queries for bubblemap
export async function handleBubblemapCallback(bot: TelegramBot, callbackQuery: TelegramBot.CallbackQuery): Promise<boolean> {
  if (!callbackQuery.data) return false;
  
  const chatId = callbackQuery.message?.chat.id;
  if (!chatId) return false;
  
  // Handle cancel button
  if (callbackQuery.data === 'bubblemap:cancel') {
    userStates.delete(chatId);
    await bot.answerCallbackQuery(callbackQuery.id, { text: "Bubblemap generation cancelled" });
    await bot.sendMessage(chatId, "❌ Bubblemap generation cancelled.");
    return true;
  }
  
  // Handle blockchain selection
  if (callbackQuery.data.startsWith('chain:')) {
    const blockchain = callbackQuery.data.replace('chain:', '');
    const state = userStates.get(chatId);
    
    if (!state || !state.tokenAddress) return false;
    
    // Answer the callback query with properly typed blockchain access
    await bot.answerCallbackQuery(callbackQuery.id, { 
      text: `${availableBlockchains[blockchain] || blockchain} selected` 
    });
    
    // Update message to show selection with properly typed blockchain access
    await bot.editMessageText(
      `🔍 Analyzing ${state.tokenAddress} on ${availableBlockchains[blockchain] || blockchain}...`, {
      chat_id: chatId,
      message_id: callbackQuery.message?.message_id
    });
    
    try {
      // Show processing message
      const processingMsg = await bot.sendMessage(chatId, 
        "⏳ Generating bubblemap...\n\n" +
        "This may take up to 30 seconds depending on the token and blockchain.");
      
      // Generate bubblemap
      const result = await generateTokenBubblemap(state.tokenAddress, blockchain);
      
      // Add to user's bubblemap history
      addBubblemapToHistory(
        chatId,
        state.tokenAddress,
        blockchain,
        result.tokenInfo?.symbol,
        result.tokenInfo?.name
      );
      
      // Delete processing message
      await bot.deleteMessage(chatId, processingMsg.message_id);
      
      // Send results
      await sendBubblemapResults(bot, chatId, result);
    } catch (error) {
      console.error('Error generating bubblemap:', error);
      await bot.sendMessage(chatId, 
        "❌ Error generating bubblemap. This could be due to:\n\n" +
        "• Invalid token address\n" +
        "• Token not found on the selected blockchain\n" +
        "• API service temporarily unavailable\n\n" +
        "Please try again later or with a different token.");
    }
    
    // Clear user state after processing
    userStates.delete(chatId);
    
    return true;
  }
  
  return false;
}

// Format and send bubblemap results
async function sendBubblemapResults(bot: TelegramBot, chatId: number, result: TokenBubblemapResult): Promise<void> {
  // Token information
  let caption = `*🔮 Bubblemap Analysis*\n\n`;
  
  if (result.tokenInfo) {
    caption += `*Token:* ${result.tokenInfo.name || 'Unknown'} (${result.tokenInfo.symbol || 'Unknown'})\n`;
    caption += `*Contract:* \`${result.tokenAddress}\`\n\n`;
  } else {
    caption += `*Contract:* \`${result.tokenAddress}\`\n\n`;
  }
  
  // Decentralization score
  caption += `*Decentralization Score:* ${result.decentralizationScore}/100\n`;
  
  // Analysis
  caption += `\n*Analysis:*\n`;
  caption += `• ${result.holderCount} total holders identified\n`;
  
  if (result.topHolderPercentage) {
    caption += `• Top 10 wallets hold ${result.topHolderPercentage}% of supply\n`;
  }
  
  if (result.largeHolderCount) {
    caption += `• ${result.largeHolderCount} wallets hold >1% of supply\n`;
  }
  
  // Risk assessment
  const score = result.decentralizationScore;
  let riskLevel = '🔴 High';
  
  if (score >= 75) {
    riskLevel = '🟢 Low';
  } else if (score >= 40) {
    riskLevel = '🟠 Medium';
  }
  
  caption += `\n*Concentration Risk:* ${riskLevel}\n`;
  
  // Send image if available
  if (result.imageUrl) {
    await bot.sendPhoto(chatId, result.imageUrl, {
      caption,
      parse_mode: 'Markdown'
    });
  } else {
    await bot.sendMessage(chatId, caption, {
      parse_mode: 'Markdown'
    });
  }
  
  // Send follow-up message with additional options
  await bot.sendMessage(chatId, 
    "🌐 *Want to explore further?*\n\n" +
    "You can view this token on Bubblemap's website for interactive exploration and more detailed analysis.",
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ 
            text: '🔗 View on Bubblemap', 
            url: `https://bubblemap.io/token/${result.tokenAddress}?chain=${result.blockchain}` 
          }]
        ]
      }
    }
  );
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