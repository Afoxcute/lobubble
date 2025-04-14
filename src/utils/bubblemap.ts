import axios from 'axios';

// Define interfaces for token market data
export interface TokenMarketData {
  price?: number;
  marketCap?: number;
  volume24h?: number;
  priceChange24h?: number;
  totalSupply?: number;
  fullyDilutedValuation?: number;
}

// Add interface for enhanced bubblemap data
export interface EnhancedBubblemapData {
  bubblemapData: BubblemapResponse;
  decentralizationScore?: number;
  insightsText?: string;
  screenshotUrl?: string;
}

// Define interfaces for the Bubblemap API response
export interface BubblemapNode {
  address: string;
  amount: number;
  is_contract: boolean;
  name?: string;
  percentage: number;
  transaction_count: number;
  transfer_X721_count: number | null;
  transfer_count: number;
}

export interface BubblemapLink {
  backward: number;
  forward: number;
  source: number;
  target: number;
}

export interface TokenLink {
  address: string;
  decimals?: number;
  name: string;
  symbol: string;
  links: BubblemapLink[];
}

export interface BubblemapResponse {
  version: number;
  chain: string;
  token_address: string;
  dt_update: string;
  full_name: string;
  symbol: string;
  is_X721: boolean;
  metadata: {
    max_amount: number;
    min_amount: number;
  };
  nodes: BubblemapNode[];
  links: BubblemapLink[];
  token_links: TokenLink[];
}

// Available blockchain chains
export const AVAILABLE_CHAINS = [
  'eth', 'bsc', 'ftm', 'avax', 'cro', 
  'arbi', 'poly', 'base', 'sol', 'sonic'
];

/**
 * Fetch bubblemap data from the Bubblemaps Legacy API
 * @param tokenAddress Contract address to generate a map for
 * @param chain Blockchain chain (eth, bsc, etc.)
 * @returns Promise with the bubblemap data response
 */
export async function fetchBubblemapData(
  tokenAddress: string, 
  chain: string
): Promise<BubblemapResponse> {
  // Validate chain
  if (!AVAILABLE_CHAINS.includes(chain)) {
    throw new Error(`Invalid chain: ${chain}. Available chains: ${AVAILABLE_CHAINS.join(', ')}`);
  }

  try {
    const response = await axios.get('https://api-legacy.bubblemaps.io/map-data', {
      params: {
        token: tokenAddress,
        chain: chain
      }
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new Error('Map not computed yet. Only pre-computed maps are available through this bot.');
    } else {
      console.error('Bubblemap API error:', error);
      throw new Error('Failed to fetch bubblemap data. Please check the token address and chain.');
    }
  }
}

/**
 * Generate a bubblemap URL for direct viewing
 * @param tokenAddress Contract address to generate a map for
 * @param chain Blockchain chain (eth, bsc, etc.)
 * @returns URL to view the bubblemap
 */
export function generateBubblemapUrl(tokenAddress: string, chain: string): string {
  return `https://app.bubblemaps.io/${chain}/token/${tokenAddress}`;
}

/**
 * Format the bubblemap data into a readable summary
 * @param data Bubblemap response data
 * @returns Formatted summary text
 */
export function formatBubblemapSummary(data: BubblemapResponse): string {
  // Calculate total percentage of top 5 holders
  const top5HoldersPercentage = data.nodes
    .slice(0, 5)
    .reduce((sum, node) => sum + node.percentage, 0);

  // Format top 5 holders into readable text
  const top5HoldersText = data.nodes
    .slice(0, 5)
    .map((node, index) => {
      const name = node.name || `Address: ${shortenAddress(node.address)}`;
      return `${index + 1}. ${name}: ${node.percentage.toFixed(2)}% (${node.is_contract ? '📄 Contract' : '👤 Wallet'})`;
    })
    .join('\n');

  return (
    `*${data.full_name || 'Token'}* (${data.symbol})\n\n` +
    `*Chain:* ${data.chain.toUpperCase()}\n` +
    `*Contract:* \`${data.token_address}\`\n` +
    `*Last Updated:* ${new Date(data.dt_update).toLocaleString()}\n` +
    `*Type:* ${data.is_X721 ? 'NFT Collection' : 'Token'}\n\n` +
    `*Top 5 Holders (${top5HoldersPercentage.toFixed(2)}%):*\n${top5HoldersText}\n\n` +
    `*Total Holders Analyzed:* ${data.nodes.length}\n` +
    `*Total Links:* ${data.links.length}`
  );
}

/**
 * Shorten an address for display purposes
 * @param address The address to shorten
 * @returns Shortened address (e.g. 0x1234...abcd)
 */
function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Add these new functions for Telegram mini app support

/**
 * Generate a Telegram mini app URL for viewing bubblemaps inside Telegram
 * @param tokenAddress Contract address to generate a map for
 * @param chain Blockchain chain (eth, bsc, etc.)
 * @returns URL that can be opened as a Telegram mini app
 */
export function generateTelegramMiniAppUrl(tokenAddress: string, chain: string): string {
  // Encode the parameters for safety
  const encodedToken = encodeURIComponent(tokenAddress);
  const encodedChain = encodeURIComponent(chain);
  
  // Return a URL that can be opened within Telegram's in-app browser
  // Note: This URL would need to point to a web app specifically designed to be a Telegram mini app
  // For now, we'll use the direct app URL with special parameters for potential in-app detection
  return `https://app.bubblemaps.io/${encodedChain}/token/${encodedToken}?utm_source=telegram&view=compact`;
}

/**
 * Create Telegram inline keyboard with web app button for bubblemap
 * @param tokenAddress Contract address to generate a map for
 * @param chain Blockchain chain (eth, bsc, etc.)
 * @returns Inline keyboard markup with web app button
 */
export function createBubblemapWebAppButton(tokenAddress: string, chain: string): any {
  const appUrl = generateTelegramMiniAppUrl(tokenAddress, chain);
  
  // Create a keyboard with a web_app button that opens within Telegram
  return {
    inline_keyboard: [
      [
        {
          text: '🫧 View Bubblemap in Telegram',
          web_app: { url: appUrl }
        }
      ],
      [
        {
          text: '🔍 Open in Browser',
          url: generateBubblemapUrl(tokenAddress, chain)
        }
      ]
    ]
  };
}

/**
 * Calculate a decentralization score based on token distribution
 * @param data Bubblemap response data
 * @returns Score between 0-100, higher is more decentralized
 */
export function calculateDecentralizationScore(data: BubblemapResponse): number {
  // Score is heavily influenced by:
  // 1. Concentration in top holders
  // 2. Number of large holders (>1%)
  // 3. Presence of burn addresses
  
  // Get percentage held by top 5 holders
  const top5Percentage = data.nodes
    .slice(0, 5)
    .reduce((sum, node) => sum + node.percentage, 0);
  
  // Count holders with more than 1%
  const largeHolders = data.nodes.filter(node => node.percentage > 1).length;
  
  // Check for burn addresses (often have "dead", "burn", or "null" in name)
  const burnAddresses = data.nodes.filter(node => 
    (node.name?.toLowerCase().includes('dead') || 
     node.name?.toLowerCase().includes('burn') ||
     node.name?.toLowerCase().includes('null') ||
     node.address.toLowerCase() === '0x000000000000000000000000000000000000dead') &&
    node.percentage > 1
  );
  
  const burnPercentage = burnAddresses.reduce((sum, node) => sum + node.percentage, 0);
  
  // Calculate a base score inversely proportional to concentration
  // Lower concentration = higher score
  let score = 100 - (top5Percentage * 0.8);
  
  // Adjust for number of large holders (more is generally better)
  // But diminishing returns after 10 holders
  score += Math.min(largeHolders, 10) * 0.5;
  
  // Adjust for burn addresses (burning tokens is generally good for decentralization)
  // But only up to a point
  score += Math.min(burnPercentage * 0.3, 10);
  
  // Ensure score is within 0-100 range
  score = Math.max(0, Math.min(100, score));
  
  return Math.round(score * 10) / 10; // Round to one decimal place
}

/**
 * Generate insights based on the token's data
 */
export function generateInsights(data: BubblemapResponse, decentralizationScore?: number): string {
  const insights: string[] = [];
  
  // Check concentration
  const top5Percentage = data.nodes
    .slice(0, 5)
    .reduce((sum, node) => sum + node.percentage, 0);
  
  if (top5Percentage > 70) {
    insights.push('⚠️ *High concentration risk*: Top 5 holders control over 70% of tokens.');
  } else if (top5Percentage < 30) {
    insights.push('✅ *Good distribution*: Top 5 holders control less than 30% of tokens.');
  }
  
  // Check for burn addresses
  const burnAddresses = data.nodes.filter(node => 
    (node.name?.toLowerCase().includes('dead') || 
     node.name?.toLowerCase().includes('burn') ||
     node.name?.toLowerCase().includes('null') ||
     node.address.toLowerCase() === '0x000000000000000000000000000000000000dead')
  );
  
  if (burnAddresses.length > 0) {
    const burnPercentage = burnAddresses.reduce((sum, node) => sum + node.percentage, 0);
    if (burnPercentage > 30) {
      insights.push(`🔥 *Significant burn*: ${burnPercentage.toFixed(2)}% of tokens are in burn addresses.`);
    } else if (burnPercentage > 0) {
      insights.push(`🔥 *Token burning*: ${burnPercentage.toFixed(2)}% of tokens have been burned.`);
    }
  }
  
  // Check for many contracts
  const contracts = data.nodes.filter(node => node.is_contract);
  const contractPercentage = contracts.reduce((sum, node) => sum + node.percentage, 0);
  
  if (contractPercentage > 60) {
    insights.push(`📄 *High contract holdings*: ${contractPercentage.toFixed(2)}% of tokens are held in contracts.`);
  }
  
  // Check decentralization score
  if (decentralizationScore !== undefined) {
    if (decentralizationScore > 70) {
      insights.push(`🌟 *Good decentralization score*: ${decentralizationScore}/100`);
    } else if (decentralizationScore < 30) {
      insights.push(`⚠️ *Poor decentralization score*: ${decentralizationScore}/100`);
    } else {
      insights.push(`ℹ️ *Average decentralization score*: ${decentralizationScore}/100`);
    }
  }
  
  return insights.length > 0 ? insights.join('\n') : 'No specific insights available for this token.';
}

/**
 * Get a screenshot URL for the bubblemap
 * @param tokenAddress Contract address to generate a map for
 * @param chain Blockchain chain (eth, bsc, etc.)
 * @returns URL for a screenshot image that can be fetched
 */
export function getScreenshotUrl(tokenAddress: string, chain: string): string {
  // Try a direct approach using the bubblemap image endpoint if available
  // This is a more reliable way to get the bubblemap image directly from their image API
  // The timestamp parameter helps bypass caching
  return `https://app.bubblemaps.io/api/v1/token/${chain}/${tokenAddress}/image?size=large&t=${Date.now()}`;
} 