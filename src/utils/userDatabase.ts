// Simple in-memory database for users
// In a production app, you would use a real database like MongoDB, PostgreSQL, etc.

import fs from 'fs';
import path from 'path';

// Define the registration steps
export enum RegistrationStep {
  None = 'none',
  AskName = 'ask_name',
  AskEmail = 'ask_email',
  AskVanityPrefix = 'ask_vanity_prefix',
  Generating = 'generating',
  Complete = 'complete'
}

// Define the bubblemap history entry
export interface BubblemapHistoryEntry {
  tokenAddress: string;
  chain: string;
  symbol?: string;
  name?: string;
  timestamp: number;
}

// Define user information structure
export interface UserInfo {
  chatId: number;
  username?: string;
  name?: string;
  email?: string;
  vanityPrefix?: string;
  walletAddress?: string;
  walletPrivateKey?: string;
  registrationComplete: boolean;
  currentStep: RegistrationStep;
  bubblemapHistory: BubblemapHistoryEntry[];
}

// Define the database file path
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize the database file if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
}

// Load the database from file
let users: Record<number, UserInfo> = {};
try {
  const data = fs.readFileSync(DB_FILE, 'utf-8');
  users = JSON.parse(data);
} catch (error) {
  console.error('Error loading user database:', error);
  // If there's an error, initialize with an empty object
  users = {};
}

// Save the database to file
function saveUsers(): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving user database:', error);
  }
}

// Get a user by chatId
export function getUser(chatId: number): UserInfo | null {
  return users[chatId] || null;
}

// Create a new user
export function createUser(chatId: number, username?: string): UserInfo {
  const user: UserInfo = {
    chatId,
    username,
    registrationComplete: false,
    currentStep: RegistrationStep.None,
    bubblemapHistory: []
  };
  
  users[chatId] = user;
  saveUsers();
  
  return user;
}

// Update user information
export function updateUser(chatId: number, updates: Partial<UserInfo>): UserInfo {
  const user = users[chatId] || createUser(chatId);
  const updatedUser = { ...user, ...updates };
  
  users[chatId] = updatedUser;
  saveUsers();
  
  return updatedUser;
}

// Set the registration step for a user
export function setRegistrationStep(chatId: number, step: RegistrationStep): UserInfo {
  return updateUser(chatId, { currentStep: step });
}

// Add a bubblemap entry to user history
export function addBubblemapToHistory(
  chatId: number, 
  tokenAddress: string, 
  chain: string,
  symbol?: string,
  name?: string
): UserInfo {
  const user = users[chatId] || createUser(chatId);
  
  // Create new history entry
  const historyEntry: BubblemapHistoryEntry = {
    tokenAddress,
    chain,
    symbol,
    name,
    timestamp: Date.now()
  };
  
  // Add to history (newest first)
  const updatedHistory = [historyEntry, ...user.bubblemapHistory];
  
  // Limit to 20 entries to keep storage reasonable
  const limitedHistory = updatedHistory.slice(0, 20);
  
  return updateUser(chatId, { bubblemapHistory: limitedHistory });
}

// Get user bubblemap history
export function getBubblemapHistory(chatId: number): BubblemapHistoryEntry[] {
  const user = users[chatId];
  return user?.bubblemapHistory || [];
}

// Clear bubblemap history for a user
export function clearBubblemapHistory(chatId: number): UserInfo {
  return updateUser(chatId, { bubblemapHistory: [] });
}

// Get all users (for admin purposes)
export function getAllUsers(): UserInfo[] {
  return Object.values(users);
}

// Clear all users (for testing and development)
export function clearAllUsers(): void {
  Object.keys(users).forEach(key => delete users[Number(key)]);
  saveUsers();
}

export function getUserByWalletAddress(walletAddress: string): UserInfo | undefined {
  return Object.values(users).find(user => user.walletAddress === walletAddress);
} 