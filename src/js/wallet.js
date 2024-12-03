import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { NetworkManager } from '../config/networks.js';

class WalletManager {
    constructor() {
        this.networkManager = new NetworkManager();
        this.connection = null;
        this.wallet = null;
        this.publicKey = null;
    }

    async initialize(network = 'devnet') {
        try {
            const networkConfig = this.networkManager.setNetwork(network);
            this.connection = new Connection(networkConfig.endpoint, networkConfig.config);
            
            // Check if Phantom wallet is installed
            if (!window.solana || !window.solana.isPhantom) {
                throw new Error('Phantom wallet is not installed');
            }

            // Auto-connect if previously connected
            if (window.solana.isConnected) {
                await this.connect();
            }

            // Listen for wallet connection changes
            window.solana.on('connect', () => this.handleConnect());
            window.solana.on('disconnect', () => this.handleDisconnect());
            window.solana.on('accountChanged', () => this.handleAccountChanged());

            return true;
        } catch (error) {
            console.error('Failed to initialize wallet manager:', error);
            throw error;
        }
    }

    async connect() {
        try {
            if (!window.solana) {
                throw new Error('Phantom wallet is not installed');
            }

            // Request wallet connection
            const response = await window.solana.connect();
            this.wallet = window.solana;
            this.publicKey = new PublicKey(response.publicKey.toString());

            // If on mainnet, show warning
            if (this.networkManager.isMainnet()) {
                console.warn('Connected to Mainnet Beta. Please be careful with real transactions!');
            }

            return this.publicKey;
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.wallet) {
                await this.wallet.disconnect();
                this.wallet = null;
                this.publicKey = null;
            }
        } catch (error) {
            console.error('Failed to disconnect wallet:', error);
            throw error;
        }
    }

    async switchNetwork(network) {
        try {
            // Disconnect current connection
            if (this.wallet) {
                await this.disconnect();
            }

            // Initialize new network connection
            await this.initialize(network);

            // Reconnect wallet if it was previously connected
            if (window.solana && window.solana.isConnected) {
                await this.connect();
            }

            return true;
        } catch (error) {
            console.error('Failed to switch network:', error);
            throw error;
        }
    }

    async signTransaction(transaction) {
        if (!this.wallet) {
            throw new Error('Wallet not connected');
        }

        // Add extra confirmation for mainnet transactions
        if (this.networkManager.isMainnet()) {
            const confirmed = window.confirm('You are about to sign a transaction on Mainnet. Are you sure you want to proceed?');
            if (!confirmed) {
                throw new Error('Transaction cancelled by user');
            }
        }

        return await this.wallet.signTransaction(transaction);
    }

    async signAllTransactions(transactions) {
        if (!this.wallet) {
            throw new Error('Wallet not connected');
        }

        // Add extra confirmation for mainnet transactions
        if (this.networkManager.isMainnet() && transactions.length > 0) {
            const confirmed = window.confirm(`You are about to sign ${transactions.length} transactions on Mainnet. Are you sure you want to proceed?`);
            if (!confirmed) {
                throw new Error('Transaction cancelled by user');
            }
        }

        return await this.wallet.signAllTransactions(transactions);
    }

    get isConnected() {
        return this.wallet !== null && this.publicKey !== null;
    }

    handleConnect() {
        console.log('Wallet connected');
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('walletConnected', {
            detail: { publicKey: this.publicKey }
        }));
    }

    handleDisconnect() {
        console.log('Wallet disconnected');
        this.wallet = null;
        this.publicKey = null;
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('walletDisconnected'));
    }

    handleAccountChanged() {
        console.log('Wallet account changed');
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('walletAccountChanged', {
            detail: { publicKey: this.publicKey }
        }));
    }

    getExplorerUrl(type, id) {
        return this.networkManager.getExplorerUrl() + `/${type}/${id}`;
    }
}

// Create and export a singleton instance
const walletManager = new WalletManager();
export default walletManager;
