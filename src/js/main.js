import { walletManager } from './wallet';
import { tokenCreator } from './tokenCreator';
import { liquidityPoolCreator } from './liquidityPoolCreator';
import { uiState } from './uiStateManager';

class App {
    constructor() {
        this.initializeEventListeners();
        this.initializeWallet();
        this.setupUISubscriptions();
    }

    initializeEventListeners() {
        // Token creation form
        const tokenForm = document.getElementById('createTokenForm');
        if (tokenForm) {
            tokenForm.addEventListener('submit', this.handleTokenCreation.bind(this));
        }

        // Form input change listeners for fee preview
        const feeAffectingInputs = ['decimals', 'revokeMint', 'freezeAuthority'];
        feeAffectingInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', this.updateFeePreview.bind(this));
            }
        });

        // Network selection
        const networkSelect = document.getElementById('networkSelect');
        if (networkSelect) {
            networkSelect.addEventListener('change', this.handleNetworkChange.bind(this));
        }
    }

    async initializeWallet() {
        try {
            const network = document.getElementById('networkSelect')?.value || 'devnet';
            await walletManager.initialize(network);
            
            // Try to autoconnect if previous session exists
            const previousWallet = localStorage.getItem('previousWallet');
            if (previousWallet) {
                this.connectWallet(previousWallet, true);
            }
        } catch (error) {
            uiState.setError('Failed to initialize wallet connection');
            console.error('Wallet initialization failed:', error);
        }
    }

    setupUISubscriptions() {
        uiState.subscribe(state => {
            uiState.updateUIElements(state);
        });
    }

    async handleTokenCreation(event) {
        event.preventDefault();
        uiState.setLoading(true);

        try {
            if (!walletManager.wallet) {
                throw new Error('Please connect your wallet first');
            }

            // Validate network
            const currentNetwork = document.getElementById('networkSelect').value;
            if (currentNetwork !== walletManager.network) {
                throw new Error('Network mismatch. Please refresh the page and try again.');
            }

            const formData = this.getTokenFormData();
            
            // Additional validation
            if (!this.validateTokenFormData(formData)) {
                return;
            }

            // Show processing message
            uiState.addNotification({
                type: 'info',
                message: 'Creating token... This may take a few moments.',
                duration: 0 // Don't auto-dismiss
            });

            const result = await tokenCreator.createToken(formData);

            // Clear previous notification
            uiState.clearNotifications();

            // Show success message
            uiState.addNotification({
                type: 'success',
                message: `Token created successfully!\nMint address: ${result.mint}\nToken Account: ${result.tokenAccount}`,
                duration: 10000
            });

            // Clear form
            event.target.reset();
            this.updateFeePreview();

            // Update token list
            await this.refreshTokenList();

        } catch (error) {
            console.error('Token creation failed:', error);
            uiState.setError(`Token creation failed: ${error.message}`);
        } finally {
            uiState.setLoading(false);
        }
    }

    getTokenFormData() {
        return {
            tokenName: document.getElementById('tokenName').value,
            tokenSymbol: document.getElementById('tokenSymbol').value,
            totalSupply: parseFloat(document.getElementById('totalSupply').value),
            decimals: parseInt(document.getElementById('decimals').value),
            revokeMint: document.getElementById('revokeMint').checked,
            freezeAuthority: document.getElementById('freezeAuthority').checked
        };
    }

    async handleNetworkChange(event) {
        const network = event.target.value;
        uiState.setLoading(true);

        try {
            // Update UI immediately
            document.getElementById('networkStatus').textContent = `Switching to ${network}...`;
            
            // Initialize wallet with new network
            await walletManager.initialize(network);
            
            // Update UI with success
            document.getElementById('networkStatus').textContent = `Connected to ${network}`;
            
            // Refresh token list for new network
            await this.refreshTokenList();
            
            uiState.addNotification({
                type: 'success',
                message: `Successfully switched to ${network}`,
                duration: 3000
            });
        } catch (error) {
            console.error('Network change failed:', error);
            uiState.setError(`Failed to switch network: ${error.message}`);
            
            // Revert network select to previous value
            const previousNetwork = walletManager.network;
            event.target.value = previousNetwork;
            document.getElementById('networkStatus').textContent = `Connected to ${previousNetwork}`;
        } finally {
            uiState.setLoading(false);
        }
    }

    async connectWallet(walletName, isAutoConnect = false) {
        uiState.setLoading(true);

        try {
            await walletManager.connectWallet(walletName);
            uiState.setWalletConnection(true);
            
            if (!isAutoConnect) {
                localStorage.setItem('previousWallet', walletName);
            }

            uiState.addNotification({
                type: 'success',
                message: 'Wallet connected successfully',
                duration: 3000
            });

            await this.refreshTokenList();

        } catch (error) {
            uiState.setError(`Failed to connect wallet: ${error.message}`);
            localStorage.removeItem('previousWallet');
        } finally {
            uiState.setLoading(false);
        }
    }

    async refreshTokenList() {
        if (!walletManager.wallet) return;

        try {
            const tokens = await walletManager.getTokenAccounts(walletManager.wallet.publicKey);
            this.updateTokenListUI(tokens);
            uiState.updateTokenList(tokens);
        } catch (error) {
            console.error('Failed to refresh token list:', error);
        }
    }

    updateTokenListUI(tokens) {
        const tokenList = document.getElementById('tokenList');
        if (!tokenList) return;

        tokenList.innerHTML = tokens.length ? '' : '<p class="text-gray-500">No tokens found</p>';

        tokens.forEach(token => {
            const tokenElement = document.createElement('div');
            tokenElement.className = 'token-card';
            tokenElement.innerHTML = `
                <div class="token-card-header">
                    <span class="token-card-title">${token.name || 'Unknown Token'}</span>
                    <span class="token-card-symbol">${token.symbol || token.mint.slice(0, 8)}</span>
                </div>
                <div class="token-card-details">
                    <div>Balance: ${token.amount}</div>
                    <div>Decimals: ${token.decimals}</div>
                    <div class="text-xs text-gray-500">Mint: ${token.mint}</div>
                </div>
            `;
            tokenList.appendChild(tokenElement);
        });
    }

    updateFeePreview() {
        const formData = this.getTokenFormData();
        const fees = tokenCreator.FEES;
        let totalFee = fees.BASE_TOKEN_CREATION;

        if (formData.decimals !== 9) totalFee += fees.CUSTOM_DECIMALS;
        if (formData.freezeAuthority) totalFee += fees.FREEZE_AUTHORITY;
        if (formData.revokeMint) totalFee += fees.REVOKE_MINT;

        document.getElementById('baseFee').textContent = `${fees.BASE_TOKEN_CREATION} SOL`;
        document.getElementById('additionalFees').textContent = 
            `${(totalFee - fees.BASE_TOKEN_CREATION).toFixed(3)} SOL`;
        document.getElementById('totalFee').textContent = `${totalFee.toFixed(3)} SOL`;
    }

    validateTokenFormData(formData) {
        const { tokenName, tokenSymbol, totalSupply, decimals } = formData;

        if (!tokenName || tokenName.length < 2 || tokenName.length > 32) {
            uiState.setError('Token name must be between 2 and 32 characters');
            return false;
        }

        if (!tokenSymbol || tokenSymbol.length < 2 || tokenSymbol.length > 10) {
            uiState.setError('Token symbol must be between 2 and 10 characters');
            return false;
        }

        if (!totalSupply || totalSupply <= 0) {
            uiState.setError('Total supply must be greater than 0');
            return false;
        }

        if (decimals < 0 || decimals > 9) {
            uiState.setError('Decimals must be between 0 and 9');
            return false;
        }

        return true;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
