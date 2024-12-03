class UIStateManager {
    constructor() {
        this.state = {
            loading: false,
            error: null,
            network: 'devnet',
            walletConnected: false,
            notifications: []
        };
        this.subscribers = [];
        this.notificationTimeout = null;
    }

    subscribe(callback) {
        this.subscribers.push(callback);
        callback(this.state);
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notifySubscribers();
    }

    setLoading(loading) {
        this.setState({ loading });
        this.updateLoadingUI(loading);
    }

    setError(error) {
        if (error) {
            console.error('UI Error:', error);
            const errorMessage = error instanceof Error ? error.message : error;
            this.addNotification({
                type: 'error',
                message: errorMessage,
                duration: 5000
            });
        }
        this.setState({ error: error || null });
    }

    setNetwork(network) {
        this.setState({ network });
        this.updateNetworkUI(network);
    }

    setWalletConnection(connected) {
        this.setState({ walletConnected: connected });
        this.updateWalletUI(connected);
    }

    addNotification(notification) {
        const id = Date.now();
        const newNotification = {
            id,
            ...notification,
            timestamp: new Date()
        };

        // Clear existing notifications of the same type
        const filteredNotifications = this.state.notifications.filter(n => n.type !== notification.type);
        
        this.setState({
            notifications: [...filteredNotifications, newNotification]
        });

        this.showNotification(newNotification);

        // Auto-dismiss if duration is set
        if (notification.duration > 0) {
            setTimeout(() => {
                this.removeNotification(id);
            }, notification.duration);
        }

        return id;
    }

    removeNotification(id) {
        this.setState({
            notifications: this.state.notifications.filter(n => n.id !== id)
        });
    }

    clearNotifications() {
        this.setState({ notifications: [] });
        const notificationContainer = document.getElementById('notificationContainer');
        if (notificationContainer) {
            notificationContainer.innerHTML = '';
        }
    }

    showNotification(notification) {
        const container = this.getOrCreateNotificationContainer();
        const notificationElement = this.createNotificationElement(notification);
        
        // Remove existing notification of same type if exists
        const existingNotification = container.querySelector(`[data-type="${notification.type}"]`);
        if (existingNotification) {
            container.removeChild(existingNotification);
        }
        
        container.appendChild(notificationElement);
    }

    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `notification notification-${notification.type}`;
        element.setAttribute('data-type', notification.type);
        element.setAttribute('data-id', notification.id);
        
        const message = document.createElement('span');
        message.textContent = notification.message;
        element.appendChild(message);
        
        if (notification.duration > 0) {
            const closeButton = document.createElement('button');
            closeButton.className = 'notification-close';
            closeButton.textContent = '×';
            closeButton.onclick = () => this.removeNotification(notification.id);
            element.appendChild(closeButton);
        }
        
        return element;
    }

    getOrCreateNotificationContainer() {
        let container = document.getElementById('notificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationContainer';
            document.body.appendChild(container);
        }
        return container;
    }

    updateLoadingUI(loading) {
        const loadingElement = document.getElementById('loadingIndicator');
        const overlay = document.getElementById('loadingOverlay');
        
        if (loadingElement) {
            loadingElement.style.display = loading ? 'block' : 'none';
        }
        
        if (overlay) {
            overlay.style.display = loading ? 'block' : 'none';
        }
    }

    updateNetworkUI(network) {
        const networkStatus = document.getElementById('networkStatus');
        const networkSelect = document.getElementById('networkSelect');
        
        if (networkStatus) {
            networkStatus.textContent = `Connected to ${network}`;
            networkStatus.className = `network-status network-${network}`;
        }
        
        if (networkSelect) {
            networkSelect.value = network;
        }
    }

    updateWalletUI(connected) {
        const connectButton = document.getElementById('connectWalletButton');
        const walletStatus = document.getElementById('walletStatus');
        
        if (connectButton) {
            connectButton.textContent = connected ? 'Disconnect Wallet' : 'Connect Wallet';
        }
        
        if (walletStatus) {
            walletStatus.textContent = connected ? 'Wallet Connected' : 'Wallet Disconnected';
            walletStatus.className = `wallet-status ${connected ? 'connected' : 'disconnected'}`;
        }
    }

    notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.state));
    }
}

export const uiState = new UIStateManager();
