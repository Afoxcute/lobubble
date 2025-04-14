# Technical Documentation - Solana Wallet & Bubblemap Bot

This document provides detailed technical information about the implementation, dependencies, and methodologies used in the Solana Wallet & Bubblemap Bot.

## Dependencies

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `node-telegram-bot-api` | ^0.64.0 | Telegram Bot API client |
| `dotenv` | ^16.3.1 | Environment variable management |
| `@solana/web3.js` | ^1.87.6 | Solana blockchain interaction |
| `bs58` | ^5.0.0 | Base58 encoding/decoding for Solana addresses |
| `axios` | ^1.6.0 | HTTP client for API requests |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.8.3 | TypeScript language support |
| `ts-node` | ^10.9.2 | TypeScript execution environment |
| `@types/node` | ^22.14.1 | Node.js type definitions |
| `@types/node-telegram-bot-api` | ^0.64.8 | Type definitions for Telegram Bot API |

## Project Structure

```
/
├── src/                      # Source code
│   ├── handlers/             # Command handlers
│   │   ├── registrationHandler.ts
│   │   └── bubblemapHandler.ts
│   ├── utils/                # Utility functions
│   │   ├── bubblemap.ts
│   │   ├── solana.ts
│   │   └── userDatabase.ts
│   └── index.ts              # Main application entry point
├── dist/                     # Compiled JavaScript (generated)
├── data/                     # Data storage directory
├── .env                      # Environment variables (not in repo)
├── .env.example              # Example environment configuration
├── tsconfig.json             # TypeScript configuration
├── package.json              # NPM package definition
├── Procfile                  # Process file for deployment
└── render.yaml               # Render deployment configuration
```

## Core Components

### Telegram Bot Integration

The bot uses `node-telegram-bot-api` to interact with the Telegram Bot API. Key components include:

- **Webhook Setup**: Uses long polling in development and webhooks in production
- **Command Handling**: Processes both direct commands (`/command`) and button interactions
- **Reply Markup**: Implements both inline keyboards and custom reply keyboards
- **Conversation Management**: Tracks user state through multi-step processes

### Solana Integration

The Solana functionality is implemented using `@solana/web3.js` in `src/utils/solana.ts`:

```typescript
// Key method for wallet generation
export async function generateVanityWallet(
  prefix: string,
  progressCallback?: (attempts: number) => Promise<void>
): Promise<{ keypair: Keypair; attempts: number }> {
  // Convert prefix to lowercase for case-insensitive matching
  prefix = prefix.toLowerCase();
  
  let attempts = 0;
  let keypair: Keypair;
  let publicKey: string;
  
  // Progress update frequency
  const updateInterval = 1000;
  let lastUpdate = 0;

  while (true) {
    // Generate a new random keypair
    keypair = Keypair.generate();
    
    // Convert public key to string and check prefix
    publicKey = keypair.publicKey.toBase58().toLowerCase();
    attempts++;
    
    // Check if this keypair's public key starts with our desired prefix
    if (publicKey.startsWith(prefix)) {
      break; // Found a matching keypair
    }
    
    // Update progress periodically
    if (progressCallback && attempts % updateInterval === 0) {
      await progressCallback(attempts);
      lastUpdate = attempts;
    }
  }

  // Final progress update
  if (progressCallback && attempts !== lastUpdate) {
    await progressCallback(attempts);
  }
  
  return { keypair, attempts };
}
```

### Bubblemaps API Integration

The Bubblemaps functionality is implemented in `src/utils/bubblemap.ts`:

#### Key APIs Used:

1. **Bubblemap Data API**
   - Endpoint: `https://api-legacy.bubblemaps.io/map-data`
   - Parameters: `token` (address), `chain` (blockchain)
   - Returns: Token holder data including nodes and links

2. **Bubblemap Image API**
   - Endpoint: `https://app.bubblemaps.io/api/v1/token/{chain}/{tokenAddress}/image`
   - Parameters: `size` (large), timestamp for cache busting
   - Returns: Visual representation of token holder relationships

#### Decentralization Scoring Algorithm:

```typescript
export function calculateDecentralizationScore(data: BubblemapResponse): number {
  // Get percentage held by top 5 holders
  const top5Percentage = data.nodes
    .slice(0, 5)
    .reduce((sum, node) => sum + node.percentage, 0);
  
  // Count holders with more than 1%
  const largeHolders = data.nodes.filter(node => node.percentage > 1).length;
  
  // Check for burn addresses
  const burnAddresses = data.nodes.filter(node => 
    (node.name?.toLowerCase().includes('dead') || 
     node.name?.toLowerCase().includes('burn') ||
     node.name?.toLowerCase().includes('null') ||
     node.address.toLowerCase() === '0x000000000000000000000000000000000000dead') &&
    node.percentage > 1
  );
  
  const burnPercentage = burnAddresses.reduce((sum, node) => sum + node.percentage, 0);
  
  // Calculate base score (inversely proportional to concentration)
  let score = 100 - (top5Percentage * 0.8);
  
  // Adjust for number of large holders (more is better, with diminishing returns)
  score += Math.min(largeHolders, 10) * 0.5;
  
  // Adjust for burn addresses (some burning is good for decentralization)
  score += Math.min(burnPercentage * 0.3, 10);
  
  // Ensure score is within 0-100 range
  score = Math.max(0, Math.min(100, score));
  
  return Math.round(score * 10) / 10; // Round to one decimal place
}
```

### Persistent Storage

The user database is implemented in `src/utils/userDatabase.ts`. It uses:

- **In-Memory Map**: For active session storage
- **JSON File Storage**: For persistence between restarts
- **Environment-Aware Paths**: Different storage locations based on environment

Key storage methods:

```typescript
// Save users to file
function saveUsers() {
  try {
    const userArray = Array.from(users.values());
    fs.writeFileSync(USER_DB_FILE, JSON.stringify(userArray, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving user database:', error);
  }
}

// Load users from file
function loadUsers() {
  try {
    if (fs.existsSync(USER_DB_FILE)) {
      const data = fs.readFileSync(USER_DB_FILE, 'utf8');
      const userArray: UserInfo[] = JSON.parse(data);
      
      // Convert array to Map
      users = new Map(userArray.map(user => [user.chatId, user]));
      console.log(`Loaded ${users.size} users from database`);
    }
  } catch (error) {
    console.error('Error loading user database:', error);
  }
}
```

## State Management

The bot implements a state machine approach for managing conversations:

### Registration States

```typescript
export enum RegistrationStep {
  None = 'none',
  AskName = 'ask_name',
  AskEmail = 'ask_email',
  AskVanityPrefix = 'ask_vanity_prefix',
  Generating = 'generating',
  Complete = 'complete'
}
```

### Bubblemap Request States

```typescript
interface BubblemapRequest {
  tokenAddress?: string;
  chain?: string;
  stage: 'START' | 'WAITING_FOR_TOKEN' | 'WAITING_FOR_CHAIN' | 'COMPLETED';
}
```

## Error Handling

The application implements comprehensive error handling:

1. **Global Async Handler**: Wraps all async operations to prevent unhandled rejections
2. **API Error Handling**: Specific handling for Bubblemaps API errors with user-friendly messages
3. **Validation Checks**: Input validation for emails, wallet prefixes, and blockchain chains
4. **Graceful Degradation**: Alternative approaches when primary methods fail (e.g., for screenshots)

## Performance Considerations

### Wallet Generation

- **CPU Intensive**: Vanity address generation is computationally expensive
- **Progress Updates**: Real-time feedback provided to users
- **Length Limitations**: Prefix limited to 5 characters to prevent excessive CPU usage

### API Usage

- **Cached Screenshots**: Timestamp parameters to bypass caching
- **Error Fallbacks**: Alternative rendering approaches when primary methods fail
- **Data Parsing**: Efficient handling of large token holder datasets

## Deployment Architecture

### Health Checks

A dedicated HTTP server runs alongside the bot to provide health checks:

```typescript
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
```

### Render Configuration

The `render.yaml` file configures the deployment:

```yaml
services:
  - type: web
    name: lobubble-bot
    env: node
    region: Frankfurt
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm run serve
    envVars:
      - key: TELEGRAM_BOT_TOKEN
        sync: false
    healthCheckPath: /health
```

## Future Improvements

Potential areas for enhancement:

1. **Database Migration**: Replace JSON file storage with a proper database (MongoDB, PostgreSQL)
2. **Enhanced Security**: Implement encryption for stored private keys
3. **Rate Limiting**: Add protection against excessive API usage
4. **Extended Blockchain Support**: Add support for additional blockchains
5. **User Analytics**: Track usage patterns to improve the user experience
6. **Caching Layer**: Implement caching for frequently requested bubblemaps
7. **Admin Interface**: Create an administrative dashboard for monitoring and management 