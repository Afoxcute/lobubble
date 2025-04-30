// Simple in-memory database for users
// In a production app, you would use a real database like MongoDB, PostgreSQL, etc.

import fs from 'fs';
import path from 'path';

export enum RegistrationStep {
  None = 'none',
  AskName = 'ask_name',
  AskEmail = 'ask_email',
  AskVanityPrefix = 'ask_vanity_prefix',
  Generating = 'generating',
  Complete = 'complete'
}

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
}

// In-memory database for users
let users: Map<number, UserInfo> = new Map();

// Determine data directory based on environment
const DATA_DIR = process.env.NODE_ENV === 'production' ? '/data' : './data';
const USER_DB_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Created data directory: ${DATA_DIR}`);
  }
} catch (error) {
  console.error('Error creating data directory:', error);
}

// Load users from file if exists
function loadUsers() {
  try {
    if (fs.existsSync(USER_DB_FILE)) {
      const data = fs.readFileSync(USER_DB_FILE, 'utf8');
      const userArray: UserInfo[] = JSON.parse(data);
      
      // Convert array to Map
      users = new Map(userArray.map(user => [user.chatId, user]));
      console.log(`Loaded ${users.size} users from database`);
    } else {
      console.log('No existing user database found, starting fresh');
    }
  } catch (error) {
    console.error('Error loading user database:', error);
    // Continue with empty users Map
  }
}

// Save users to file
function saveUsers() {
  try {
    const userArray = Array.from(users.values());
    fs.writeFileSync(USER_DB_FILE, JSON.stringify(userArray, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving user database:', error);
  }
}

// Initialize by loading existing users
loadUsers();

// Get user by chat ID
export function getUser(chatId: number): UserInfo | undefined {
  return users.get(chatId);
}

// Create a new user
export function createUser(chatId: number, username?: string): UserInfo {
  const newUser: UserInfo = {
    chatId,
    username,
    registrationComplete: false,
    currentStep: RegistrationStep.None
  };
  
  users.set(chatId, newUser);
  saveUsers(); // Save after creating a new user
  
  return newUser;
}

// Update user information
export function updateUser(chatId: number, updates: Partial<UserInfo>): UserInfo {
  const user = users.get(chatId);
  
  if (!user) {
    throw new Error(`User with chat ID ${chatId} not found`);
  }
  
  const updatedUser = { ...user, ...updates };
  users.set(chatId, updatedUser);
  saveUsers(); // Save after updating a user
  
  return updatedUser;
}

// Set the registration step for a user
export function setRegistrationStep(chatId: number, step: RegistrationStep): void {
  const user = users.get(chatId);
  
  if (!user) {
    throw new Error(`User with chat ID ${chatId} not found`);
  }
  
  user.currentStep = step;
  saveUsers(); // Save after updating registration step
}

// Get all users (for admin purposes)
export function getAllUsers(): UserInfo[] {
  return Array.from(users.values());
}

// For testing and development - reset all users
export function clearAllUsers(): void {
  users.clear();
  saveUsers();
}

export function getUserByWalletAddress(walletAddress: string): UserInfo | undefined {
  return Array.from(users.values()).find(user => user.walletAddress === walletAddress);
} 