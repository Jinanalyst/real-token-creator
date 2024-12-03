// Using global solanaWeb3 from CDN
class WalletManager {
    constructor() {
        this.connection = null;
        this.wallet = null;
        this.network = 'devnet';
        this.networkConfigs = {
            devnet: 'https://api.devnet.solana.com',
            testnet: 'https://api.testnet.solana.com',
            mainnet: 'https://api.mainnet-beta.solana.com'
        };
        // Map our network names to wallet network names
        this.networkMap = {
            devnet: 'devnet',
            testnet: 'testnet',
            mainnet: 'mainnet-beta'
        };
        this.connectionConfig = {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: 60000
        };
        this.autoReconnectEnabled = true;
        this._healthCheckInterval = null;
        this.publicKey = null;
    }

    async initialize(network = 'devnet') {
        try {
            // Set initial network
            this.network = network;
            
            // Create new connection
            this.connection = new solanaWeb3.Connection(
                this.networkConfigs[network],
                { commitment: 'confirmed' }
            );

            // Test connection
            await this.connection.getVersion();

            // If wallet is already connected, try to switch its network
            if (this.wallet && this.wallet.isConnected) {
                try {
                    await this.switchNetwork(network);
                } catch (err) {
                    console.warn('Failed to switch wallet network:', err);
                    // Continue even if wallet switch fails
                }
            }

            return true;
        } catch (error) {
            console.error('Failed to initialize:', error);
            throw new Error(`Connection failed: ${error.message}`);
        }
    }

    async connectWallet(walletName) {
        try {
            let wallet;
            
            // Check for available wallets with improved detection
            if (walletName === 'phantom') {
                if (!window.phantom?.solana?.isPhantom && !window.solana?.isPhantom) {
                    throw new Error("Phantom wallet is not installed");
                }
                wallet = window.phantom?.solana || window.solana;
            } else if (walletName === 'solflare') {
                // First try window.solflare
                if (window.solflare?.isSolflare) {
                    wallet = window.solflare;
                }
                // Then try window.solana with Solflare check
                else if (window.solana?.isSolflare) {
                    wallet = window.solana;
                }
                // If neither exists, wallet is not installed
                else {
                    throw new Error("Solflare wallet is not installed");
                }
            }

            if (!wallet) {
                throw new Error(`${walletName} wallet not found`);
            }

            // Check if wallet is already connected
            try {
                const connected = await wallet.isConnected();
                if (connected && this.wallet === wallet && this.publicKey) {
                    return wallet;
                }
            } catch (error) {
                console.error('Error checking wallet connection:', error);
            }

            // Disconnect any existing wallet connection
            if (this.wallet) {
                await this.disconnect();
            }

            try {
                this.wallet = wallet;
                
                // Try to get existing public key first
                let publicKey = wallet.publicKey;
                
                // If no existing public key, try to connect
                if (!publicKey) {
                    const resp = await wallet.connect();
                    publicKey = resp?.publicKey || wallet.publicKey;
                }
                
                if (!publicKey) {
                    throw new Error('No public key available after connection');
                }
                
                this.publicKey = publicKey;
                
                // Set up wallet change listeners
                this.setupWalletListeners(wallet);
                
                // Ensure wallet is on the correct network
                await this.switchNetwork(this.network);
                
                return wallet;

            } catch (error) {
                console.error('Error in wallet connection process:', error);
                throw error;
            }
        } catch (err) {
            console.error("Error connecting to wallet:", err);
            throw err;
        }
    }

    async setupWalletListeners(wallet) {
        if (!wallet) return;
        
        // Remove existing listeners if any
        if (typeof wallet.removeAllListeners === 'function') {
            wallet.removeAllListeners('accountChanged');
            wallet.removeAllListeners('disconnect');
        }

        // Add wallet change listener
        wallet.on('accountChanged', async (newPublicKey) => {
            try {
                if (newPublicKey) {
                    this.publicKey = newPublicKey;
                } else {
                    await this.disconnect();
                }
            } catch (error) {
                console.error('Error in accountChanged handler:', error);
                await this.disconnect();
            }
        });

        // Add disconnect listener
        wallet.on('disconnect', async () => {
            await this.disconnect();
        });
    }

    async refreshConnection() {
        if (!this.wallet) return;
        
        try {
            // Check if wallet is still available
            if (typeof this.wallet.connect === 'function') {
                await this.wallet.connect();
            }
        } catch (error) {
            console.error('Failed to refresh wallet connection:', error);
            // If refresh fails, disconnect
            await this.disconnect();
        }
    }

    startConnectionHealthCheck() {
        // Clear any existing interval
        if (this._healthCheckInterval) {
            clearInterval(this._healthCheckInterval);
        }
        
        // Check connection health every 30 seconds
        this._healthCheckInterval = setInterval(async () => {
            try {
                await this.connection.getVersion();
            } catch (error) {
                console.error('Connection health check failed:', error);
                // Attempt to re-initialize connection
                try {
                    await this.initialize(this.network);
                } catch (reinitError) {
                    console.error('Failed to re-initialize connection:', reinitError);
                }
            }
        }, 30000);
    }

    stopConnectionHealthCheck() {
        if (this._healthCheckInterval) {
            clearInterval(this._healthCheckInterval);
            this._healthCheckInterval = null;
        }
    }

    async handleNetworkChange(newNetwork) {
        try {
            // Map Solflare network names back to our network names
            const networkMap = {
                'mainnet-beta': 'mainnet',
                'testnet': 'testnet',
                'devnet': 'devnet'
            };
            
            const mappedNetwork = networkMap[newNetwork] || newNetwork;
            
            // Update connection for new network
            this.network = mappedNetwork;
            this.connection = new solanaWeb3.Connection(this.networkConfigs[mappedNetwork], this.connectionConfig);
            
            // Dispatch event for UI update
            window.dispatchEvent(new CustomEvent('networkChanged', {
                detail: { network: mappedNetwork }
            }));
        } catch (error) {
            console.error('Failed to handle network change:', error);
            throw error;
        }
    }

    async getBalance(address) {
        try {
            const publicKey = address ? new solanaWeb3.PublicKey(address) : this.wallet?.publicKey;
            if (!publicKey) {
                throw new Error('No wallet connected');
            }
            const balance = await this.connection.getBalance(publicKey);
            return balance / solanaWeb3.LAMPORTS_PER_SOL; // Convert lamports to SOL
        } catch (error) {
            console.error('Failed to get balance:', error);
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

    isConnected() {
        return this.wallet !== null && this.wallet.isConnected;
    }

    getPublicKey() {
        return this.wallet?.publicKey;
    }

    async signAndSendTransaction(transaction) {
        if (!this.wallet || !this.wallet.publicKey) {
            throw new Error('Wallet not connected');
        }

        try {
            // Get recent blockhash
            const { blockhash } = await this.connection.getRecentBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = this.wallet.publicKey;

            // Sign and send transaction
            const signed = await this.wallet.signTransaction(transaction);
            const signature = await this.connection.sendRawTransaction(signed.serialize());
            await this.connection.confirmTransaction(signature);
            return signature;
        } catch (error) {
            console.error('Failed to sign and send transaction:', error);
            throw error;
        }
    }

    async getMinimumBalanceForRentExemption(size) {
        return await this.connection.getMinimumBalanceForRentExemption(size);
    }

    async getRecentBlockhash() {
        return await this.connection.getRecentBlockhash();
    }

    async switchNetwork(network) {
        try {
            if (!this.wallet) {
                throw new Error('No wallet connected');
            }

            // Validate network
            if (!this.networkConfigs[network]) {
                throw new Error('Invalid network');
            }

            // Try to switch network in wallet
            if (this.wallet.isPhantom) {
                try {
                    await window.solana.request({
                        method: 'wallet_switchNetwork',
                        params: {
                            network: network
                        }
                    });
                } catch (err) {
                    console.warn('Automatic network switch failed:', err);
                    // Continue with connection update even if wallet switch fails
                }
            } else if (this.wallet.isSolflare) {
                try {
                    await this.wallet.switchNetwork(network);
                } catch (err) {
                    console.warn('Automatic network switch failed:', err);
                    // Continue with connection update even if wallet switch fails
                }
            }

            // Update connection regardless of wallet switch result
            this.network = network;
            this.connection = new solanaWeb3.Connection(
                this.networkConfigs[network],
                { commitment: 'confirmed' }
            );

            // Verify connection is working
            await this.connection.getVersion();

            return true;
        } catch (error) {
            console.error('Network switch failed:', error);
            throw new Error(`Failed to switch network: ${error.message}`);
        }
    }
}

// Create and export a singleton instance
window.walletManager = new WalletManager();
