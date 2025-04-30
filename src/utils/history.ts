import { BubblemapResponse } from './bubblemap';

export interface BubblemapHistoryEntry {
  tokenAddress: string;
  chain: string;
  timestamp: number;
  tokenName: string;
  tokenSymbol: string;
  decentralizationScore?: number;
}

// In-memory storage for bubblemap history
const bubblemapHistory = new Map<number, BubblemapHistoryEntry[]>();

/**
 * Add a new entry to the user's bubblemap history
 * @param userId Telegram user ID
 * @param tokenAddress Contract address
 * @param chain Blockchain chain
 * @param bubblemapData Full bubblemap data
 * @param decentralizationScore Optional decentralization score
 */
export function addToHistory(
  userId: number,
  tokenAddress: string,
  chain: string,
  bubblemapData: BubblemapResponse,
  decentralizationScore?: number
): void {
  const entry: BubblemapHistoryEntry = {
    tokenAddress,
    chain,
    timestamp: Date.now(),
    tokenName: bubblemapData.full_name || 'Unknown Token',
    tokenSymbol: bubblemapData.symbol,
    decentralizationScore
  };

  // Get existing history or create new array
  const userHistory = bubblemapHistory.get(userId) || [];
  
  // Add new entry at the beginning
  userHistory.unshift(entry);
  
  // Keep only the last 10 entries
  if (userHistory.length > 10) {
    userHistory.length = 10;
  }
  
  // Update history
  bubblemapHistory.set(userId, userHistory);
}

/**
 * Get user's bubblemap history
 * @param userId Telegram user ID
 * @returns Array of history entries
 */
export function getHistory(userId: number): BubblemapHistoryEntry[] {
  return bubblemapHistory.get(userId) || [];
}

/**
 * Format history entry for display
 * @param entry History entry
 * @returns Formatted string
 */
export function formatHistoryEntry(entry: BubblemapHistoryEntry): string {
  const date = new Date(entry.timestamp).toLocaleString();
  const scoreText = entry.decentralizationScore !== undefined 
    ? `\nScore: ${entry.decentralizationScore}/100` 
    : '';
    
  return (
    `*${entry.tokenName}* (${entry.tokenSymbol})\n` +
    `Chain: ${entry.chain.toUpperCase()}\n` +
    `Address: \`${entry.tokenAddress}\`\n` +
    `Date: ${date}${scoreText}\n`
  );
}

/**
 * Format entire history for display
 * @param userId Telegram user ID
 * @returns Formatted history string
 */
export function formatHistory(userId: number): string {
  const history = getHistory(userId);
  
  if (history.length === 0) {
    return '📊 *Your Bubblemap History*\n\nNo history available yet. Generate some bubblemaps to see them here!';
  }
  
  const entries = history.map((entry, index) => 
    `*${index + 1}.* ${formatHistoryEntry(entry)}`
  ).join('\n');
  
  return `📊 *Your Bubblemap History*\n\n${entries}`;
}

/**
 * Clear history for a specific user
 * @param userId Telegram user ID
 */
export function clearHistory(userId: number): void {
  bubblemapHistory.delete(userId);
} 