import TelegramBot from 'node-telegram-bot-api';
import {
  UserInfo,
  RegistrationStep,
  getUser,
  createUser,
  updateUser,
  setRegistrationStep
} from '../utils/userDatabase';
import { generateVanityWallet, exportWallet, shortenAddress } from '../utils/solana';

// Regular expressions for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VANITY_PREFIX_REGEX = /^[a-zA-Z0-9]{1,5}$/;

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

// Custom keyboard for cancel option during registration
function getCancelKeyboard(): TelegramBot.SendMessageOptions {
  return {
    reply_markup: {
      keyboard: [
        [{ text: '❌ Cancel Registration' }]
      ],
      resize_keyboard: true
    }
  };
}

export async function handleRegistration(bot: TelegramBot, msg: TelegramBot.Message, text: string): Promise<void> {
  const chatId = msg.chat.id;
  const username = msg.from?.username;
  
  // Check for cancel request
  if (text === '❌ Cancel Registration') {
    updateUser(chatId, { currentStep: RegistrationStep.None });
    await bot.sendMessage(
      chatId,
      'Registration canceled. You can start again anytime.',
      getMainMenuKeyboard()
    );
    return;
  }
  
  // Get user or create if not exists
  let user = getUser(chatId);
  if (!user) {
    user = createUser(chatId, username);
    // Start registration process
    startRegistration(bot, chatId);
    return;
  }
  
  // Process user input based on current registration step
  switch (user.currentStep) {
    case RegistrationStep.AskName:
      await handleNameInput(bot, chatId, text);
      break;
    case RegistrationStep.AskEmail:
      await handleEmailInput(bot, chatId, text);
      break;
    case RegistrationStep.AskVanityPrefix:
      await handleVanityPrefixInput(bot, chatId, text);
      break;
    case RegistrationStep.None:
      if (text.toLowerCase() === '/register' || text === '📝 Register') {
        if (user.registrationComplete) {
          // If user already has a wallet, show options
          await bot.sendMessage(
            chatId,
            'You already have a registered wallet.\n\n' +
            `Address: ${shortenAddress(user.walletAddress || '')}\n\n` +
            'What would you like to do?',
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '👛 View Wallet Details', callback_data: 'show_wallet' }],
                  [{ text: '🔄 Generate New Wallet', callback_data: 'register_start' }]
                ]
              }
            }
          );
        } else {
          startRegistration(bot, chatId);
        }
      }
      break;
    default:
      break;
  }
}

// Start the registration process
async function startRegistration(bot: TelegramBot, chatId: number): Promise<void> {
  setRegistrationStep(chatId, RegistrationStep.AskName);
  await bot.sendMessage(
    chatId,
    '🚀 Welcome to the Solana wallet generator!\n\n' +
    'Let\'s create your vanity wallet in 3 easy steps:\n' +
    '1️⃣ Your name\n' +
    '2️⃣ Your email\n' +
    '3️⃣ Your desired wallet prefix\n\n' +
    'First, please enter your name:',
    getCancelKeyboard()
  );
}

// Handle name input
async function handleNameInput(bot: TelegramBot, chatId: number, text: string): Promise<void> {
  // Update user info with name
  updateUser(chatId, { name: text });
  
  // Move to next step
  setRegistrationStep(chatId, RegistrationStep.AskEmail);
  await bot.sendMessage(
    chatId,
    `Thanks, ${text}! 👍\n\n` +
    `Next, please enter your email address:`,
    getCancelKeyboard()
  );
}

// Handle email input
async function handleEmailInput(bot: TelegramBot, chatId: number, text: string): Promise<void> {
  // Validate email
  if (!EMAIL_REGEX.test(text)) {
    await bot.sendMessage(
      chatId,
      '❌ That doesn\'t look like a valid email address. Please try again:',
      getCancelKeyboard()
    );
    return;
  }
  
  // Update user info with email
  updateUser(chatId, { email: text });
  
  // Move to next step
  setRegistrationStep(chatId, RegistrationStep.AskVanityPrefix);
  await bot.sendMessage(
    chatId,
    '✅ Email saved!\n\n' +
    'Finally, please enter a prefix for your Solana vanity wallet address (1-5 alphanumeric characters):\n\n' +
    'For example, if you enter "abc", your address might look like "abc12345..."\n\n' +
    '⚠️ Note: Longer prefixes will take more time to generate.',
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'COOL', callback_data: 'prefix_cool' },
            { text: 'SOL', callback_data: 'prefix_sol' },
            { text: 'MOON', callback_data: 'prefix_moon' }
          ]
        ]
      },
      ...getCancelKeyboard()
    }
  );
}

// Handle prefix suggestion callbacks
export async function handlePrefixSuggestion(bot: TelegramBot, chatId: number, prefix: string): Promise<void> {
  let user = getUser(chatId);
  // Create user if not exists
  if (!user) {
    user = createUser(chatId);
    setRegistrationStep(chatId, RegistrationStep.AskVanityPrefix);
  }
  
  // Proceed with vanity prefix input
  await handleVanityPrefixInput(bot, chatId, prefix);
}

// Handle vanity prefix input
async function handleVanityPrefixInput(bot: TelegramBot, chatId: number, text: string): Promise<void> {
  // Validate vanity prefix (1-5 alphanumeric characters)
  if (!VANITY_PREFIX_REGEX.test(text)) {
    await bot.sendMessage(
      chatId,
      '❌ Invalid prefix. Please enter 1-5 alphanumeric characters (letters and numbers only):',
      getCancelKeyboard()
    );
    return;
  }
  
  // Update user with vanity prefix
  updateUser(chatId, { vanityPrefix: text });
  
  // Set status to generating
  setRegistrationStep(chatId, RegistrationStep.Generating);
  
  // Send a message indicating that generation is in progress
  const progressMessage = await bot.sendMessage(
    chatId, 
    `🔍 Generating your vanity wallet address with prefix "${text}"...\n\n` +
    `This may take a moment. Please wait...`
  );
  
  try {
    // Array of loading animations
    const loadingAnimations = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let animationIndex = 0;
    
    // Progress callback to update the message with current attempts
    const updateProgress = async (attempts: number): Promise<void> => {
      animationIndex = (animationIndex + 1) % loadingAnimations.length;
      const animation = loadingAnimations[animationIndex];
      
      await bot.editMessageText(
        `${animation} Searching for address with prefix "${text}"...\n` +
        `Attempts: ${attempts.toLocaleString()}\n\n` +
        `This might take some time depending on the prefix length.`,
        {
          chat_id: chatId,
          message_id: progressMessage.message_id
        }
      );
    };
    
    // Generate the vanity wallet with progress updates
    const { keypair, attempts } = await generateVanityWallet(text, updateProgress);
    const walletInfo = exportWallet(keypair);
    
    // Update user with wallet information
    updateUser(chatId, {
      walletAddress: walletInfo.publicKey,
      walletPrivateKey: walletInfo.privateKey,
      registrationComplete: true,
      currentStep: RegistrationStep.Complete
    });
    
    // Update the progress message with success
    await bot.editMessageText(
      `✅ Found your wallet address with prefix "${text}" after ${attempts.toLocaleString()} attempts!`,
      {
        chat_id: chatId,
        message_id: progressMessage.message_id
      }
    );
    
    // Send success message with wallet info
    await bot.sendMessage(
      chatId,
      `✅ Success! Your Solana wallet has been generated.\n\n` +
      `Your wallet address is:\n\`${walletInfo.publicKey}\`\n\n` +
      `Here's your private key (never share this with anyone!):\n\`${walletInfo.privateKey}\`\n\n` +
      `Make sure to save this information in a secure place!`,
      {
        parse_mode: 'Markdown',
        ...getMainMenuKeyboard()
      }
    );
    
  } catch (error) {
    console.error('Error generating vanity wallet:', error);
    await bot.sendMessage(
      chatId,
      `❌ Sorry, there was an error generating your vanity wallet. Please try again with /register.`,
      getMainMenuKeyboard()
    );
    setRegistrationStep(chatId, RegistrationStep.None);
  }
}

// Command to check wallet status
export async function handleWalletStatus(bot: TelegramBot, chatId: number): Promise<void> {
  // Get user or create if not exists
  let user = getUser(chatId);
  if (!user) {
    user = createUser(chatId);
  }
  
  if (!user.registrationComplete) {
    await bot.sendMessage(
      chatId,
      '❌ You don\'t have a registered wallet yet.\n\nUse the 📝 Register button to create one.',
      getMainMenuKeyboard()
    );
    return;
  }
  
  // Display wallet info in a formatted card
  await bot.sendMessage(
    chatId,
    `💳 *Your Solana Wallet Information*\n\n` +
    `*Name:* ${user.name}\n` +
    `*Email:* ${user.email}\n` +
    `*Vanity Prefix:* ${user.vanityPrefix}\n\n` +
    `*Wallet Address:*\n\`${user.walletAddress}\`\n\n` +
    `*Short Address:* \`${shortenAddress(user.walletAddress || '')}\`\n\n` +
    `[View on Solana Explorer](https://explorer.solana.com/address/${user.walletAddress})`,
    {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      ...getMainMenuKeyboard()
    }
  );
} 