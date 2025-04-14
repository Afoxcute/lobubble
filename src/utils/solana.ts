import { Keypair } from '@solana/web3.js';
import * as bs58 from 'bs58';

// Progress callback type definition
export type ProgressCallback = (attempts: number) => Promise<void>;

// Function to generate a vanity wallet address with a specific prefix
export async function generateVanityWallet(
  prefix: string, 
  progressCallback?: ProgressCallback
): Promise<{ keypair: Keypair, attempts: number }> {
  // Set a maximum number of attempts to avoid infinite loops
  const MAX_ATTEMPTS = 1000000;
  let attempts = 0;
  
  // Normalize the prefix to lowercase
  const normalizedPrefix = prefix.toLowerCase();
  
  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    
    // Generate a new random keypair
    const keypair = Keypair.generate();
    
    // Get the public key as a string
    const publicKey = keypair.publicKey.toString();
    
    // Check if the public key starts with the specified prefix
    if (publicKey.toLowerCase().startsWith(normalizedPrefix)) {
      return { keypair, attempts };
    }
    
    // Log progress every 10,000 attempts
    if (attempts % 10000 === 0) {
      console.log(`Generated ${attempts} keypairs, still searching for prefix "${prefix}"...`);
      
      // Call the progress callback if provided
      if (progressCallback) {
        await progressCallback(attempts);
      }
    }
    
    // For demo purposes, add a small break every 1000 attempts to not completely block the event loop
    if (attempts % 1000 === 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  throw new Error(`Failed to generate a vanity wallet with prefix "${prefix}" after ${MAX_ATTEMPTS} attempts.`);
}

// Function to export the wallet to a format that can be imported elsewhere
export function exportWallet(keypair: Keypair): { publicKey: string, privateKey: string } {
  return {
    publicKey: keypair.publicKey.toString(),
    privateKey: bs58.encode(keypair.secretKey)
  };
}

// Function to get a shortened version of the address (for display purposes)
export function shortenAddress(address: string, prefixLength = 4, suffixLength = 4): string {
  if (!address) return '';
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
} 