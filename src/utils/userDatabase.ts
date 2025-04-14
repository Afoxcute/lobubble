// Simple in-memory database for users
// In a production app, you would use a real database like MongoDB, PostgreSQL, etc.

export interface UserInfo {
  chatId: number;
  username?: string;
  name?: string;
  email?: string;
  walletAddress?: string;
  walletPrivateKey?: string; // In a real app, you would never store this! This is just for demonstration
  vanityPrefix?: string;
  registrationComplete: boolean;
  currentStep: RegistrationStep;
}

export enum RegistrationStep {
  None = 'NONE',
  AskName = 'ASK_NAME',
  AskEmail = 'ASK_EMAIL',
  AskVanityPrefix = 'ASK_VANITY_PREFIX',
  Generating = 'GENERATING',
  Complete = 'COMPLETE',
}

// Store users in memory
const users: Record<number, UserInfo> = {};

export function getUser(chatId: number): UserInfo | undefined {
  return users[chatId];
}

export function createUser(chatId: number, username?: string): UserInfo {
  const user: UserInfo = {
    chatId,
    username,
    registrationComplete: false,
    currentStep: RegistrationStep.None,
  };
  
  users[chatId] = user;
  return user;
}

export function updateUser(chatId: number, updates: Partial<UserInfo>): UserInfo {
  // Create the user if they don't exist yet
  if (!users[chatId]) {
    console.log(`User with chatId ${chatId} not found, creating a new user record`);
    createUser(chatId);
  }
  
  users[chatId] = {
    ...users[chatId],
    ...updates,
  };
  
  return users[chatId];
}

export function setRegistrationStep(chatId: number, step: RegistrationStep): UserInfo {
  // Create the user if they don't exist yet
  if (!users[chatId]) {
    console.log(`User with chatId ${chatId} not found, creating a new user record`);
    createUser(chatId);
  }
  
  users[chatId].currentStep = step;
  return users[chatId];
}

export function getAllUsers(): UserInfo[] {
  return Object.values(users);
}

export function getUserByWalletAddress(walletAddress: string): UserInfo | undefined {
  return Object.values(users).find(user => user.walletAddress === walletAddress);
} 