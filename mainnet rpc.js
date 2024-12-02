import { Connection, PublicKey } from '@solana/web3.js';

// Connect to Solana Mainnet
const connection = new Connection("https://api.mainnet-beta.solana.com");

// Example: Get the balance of a wallet
async function getWalletBalance(walletAddress) {
  const publicKey = new PublicKey(walletAddress);
  const balance = await connection.getBalance(publicKey);
  console.log(`Balance: ${balance / 1000000000} SOL`); // Convert lamports to SOL
}