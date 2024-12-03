class UIStateManager {
    constructor() {
        this.state = {
            isWalletConnected: false,
            currentNetwork: 'devnet',
            loading: false,
            error: null,
            notifications: [],
            currentTransaction: null,
            tokenList: [],
            poolList: []
        };
        
        this.listeners = new Set();
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this._notifyListeners();
    }

    setLoading(loading) {
        this.setState({ loading });
    }

    setError(error) {
        this.setState({ 
            error: error ? error.message || error : null,
            loading: false 
        });
        if (error) {
            this.addNotification({
                type: 'error',
                message: error.message || error,
                duration: 5000
            });
        }
    }

    clearError() {
        this.setState({ error: null });
    }

    addNotification(notification) {
        const id = Date.now();
        const newNotification = { ...notification, id };
        this.setState({
            notifications: [...this.state.notifications, newNotification]
        });

        if (notification.duration) {
            setTimeout(() => this.removeNotification(id), notification.duration);
        }
    }

    removeNotification(id) {
        this.setState({
            notifications: this.state.notifications.filter(n => n.id !== id)
        });
    }

    setCurrentTransaction(transaction) {
        this.setState({ currentTransaction: transaction });
    }

    updateTokenList(tokens) {
        this.setState({ tokenList: tokens });
    }

    updatePoolList(pools) {
        this.setState({ poolList: pools });
    }

    setWalletConnection(isConnected) {
        this.setState({ isWalletConnected: isConnected });
    }

    setNetwork(network) {
        this.setState({ currentNetwork: network });
    }

    _notifyListeners() {
        this.listeners.forEach(listener => listener(this.state));
    }

    // UI Helper Methods
    showLoadingSpinner() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.remove('hidden');
        }
    }

    hideLoadingSpinner() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.add('hidden');
        }
    }

    updateUIElements(state) {
        // Update wallet connection status
        const walletButton = document.getElementById('connectWalletButton');
        if (walletButton) {
            walletButton.textContent = state.isWalletConnected ? 
                'Wallet Connected' : 'Connect Wallet';
            walletButton.classList.toggle('bg-green-500', state.isWalletConnected);
        }

        // Update network selector
        const networkSelect = document.getElementById('networkSelect');
        if (networkSelect) {
            networkSelect.value = state.currentNetwork;
        }

        // Update loading state
        if (state.loading) {
            this.showLoadingSpinner();
        } else {
            this.hideLoadingSpinner();
        }

        // Update error display
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.textContent = state.error || '';
            errorContainer.classList.toggle('hidden', !state.error);
        }

        // Update notifications
        this._updateNotifications(state.notifications);
    }

    _updateNotifications(notifications) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        container.innerHTML = '';
        notifications.forEach(notification => {
            const element = document.createElement('div');
            element.className = `notification ${notification.type} p-4 rounded-lg mb-2`;
            element.textContent = notification.message;
            container.appendChild(element);
        });
    }
}

export const uiState = new UIStateManager();
