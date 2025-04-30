import { getUser } from './userDatabase';

export interface HistoryEntry {
  timestamp: number;
  type: 'bubblemap' | 'wallet' | 'registration';
  data: {
    tokenAddress?: string;
    chain?: string;
    action?: string;
  };
}

// Store history in memory (in a real app, you'd want to persist this to a database)
const userHistory = new Map<number, HistoryEntry[]>();

export function addHistoryEntry(chatId: number, entry: Omit<HistoryEntry, 'timestamp'>): void {
  const user = getUser(chatId);
  if (!user) return;

  const history = userHistory.get(chatId) || [];
  history.push({
    ...entry,
    timestamp: Date.now()
  });

  // Keep only the last 10 entries
  if (history.length > 10) {
    history.shift();
  }

  userHistory.set(chatId, history);
}

export function getHistory(chatId: number): HistoryEntry[] {
  return userHistory.get(chatId) || [];
}

export function formatHistory(history: HistoryEntry[]): string {
  if (history.length === 0) {
    return 'No history available.';
  }

  return history.map((entry, index) => {
    const date = new Date(entry.timestamp).toLocaleString();
    switch (entry.type) {
      case 'bubblemap':
        return `${index + 1}. 📊 Bubblemap: ${entry.data.tokenAddress} (${entry.data.chain?.toUpperCase()}) - ${date}`;
      case 'wallet':
        return `${index + 1}. 👛 Wallet: ${entry.data.action} - ${date}`;
      case 'registration':
        return `${index + 1}. 📝 Registration: ${entry.data.action} - ${date}`;
      default:
        return `${index + 1}. Unknown action - ${date}`;
    }
  }).join('\n');
} 