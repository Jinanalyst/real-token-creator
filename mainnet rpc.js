import { Connection, PublicKey } from '@solana/web3.js';
import { getCurrentConnection } from './network selection.js';

// Get the current connection based on selected network
function getConnection() {
    return getCurrentConnection();
}

// Example: Get the balance of a wallet
async function getWalletBalance(walletAddress) {
    try {
        const connection = getConnection();
        const publicKey = new PublicKey(walletAddress);
        const balance = await connection.getBalance(publicKey);
        return balance / 1000000000; // Convert lamports to SOL
    } catch (error) {
        console.error('Error getting wallet balance:', error);
        throw error;
    }
}

export { getConnection, getWalletBalance };