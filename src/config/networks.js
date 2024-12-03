import { clusterApiUrl } from '@solana/web3.js';

// Network configurations
const NETWORK_CONFIG = {
    mainnet: {
        name: 'mainnet-beta',
        endpoint: 'https://api.mainnet-beta.solana.com',
        displayName: 'Mainnet',
        explorerUrl: 'https://explorer.solana.com',
        config: {
            commitment: 'confirmed',
            wsEndpoint: 'wss://api.mainnet-beta.solana.com/',
            confirmTransactionInitialTimeout: 120000
        }
    },
    devnet: {
        name: 'devnet',
        endpoint: 'https://api.devnet.solana.com',
        displayName: 'Devnet',
        explorerUrl: 'https://explorer.solana.com/?cluster=devnet',
        config: {
            commitment: 'confirmed',
            wsEndpoint: 'wss://api.devnet.solana.com/',
            confirmTransactionInitialTimeout: 60000
        }
    },
    testnet: {
        name: 'testnet',
        endpoint: 'https://api.testnet.solana.com',
        displayName: 'Testnet',
        explorerUrl: 'https://explorer.solana.com/?cluster=testnet',
        config: {
            commitment: 'confirmed',
            wsEndpoint: 'wss://api.testnet.solana.com/',
            confirmTransactionInitialTimeout: 60000
        }
    }
};

class NetworkManager {
    constructor() {
        this.currentNetwork = 'devnet';
    }

    setNetwork(network) {
        if (!NETWORK_CONFIG[network]) {
            throw new Error(`Invalid network: ${network}`);
        }
        this.currentNetwork = network;
        return NETWORK_CONFIG[network];
    }

    getCurrentNetwork() {
        return NETWORK_CONFIG[this.currentNetwork];
    }

    getNetworkConfig() {
        return NETWORK_CONFIG[this.currentNetwork].config;
    }

    getExplorerUrl() {
        return NETWORK_CONFIG[this.currentNetwork].explorerUrl;
    }

    getTransactionUrl(signature) {
        return `${this.getExplorerUrl()}/tx/${signature}`;
    }

    getAddressUrl(address) {
        return `${this.getExplorerUrl()}/address/${address}`;
    }

    isMainnet() {
        return this.currentNetwork === 'mainnet';
    }

    requiresMainnet(operation) {
        if (!this.isMainnet()) {
            throw new Error(`${operation} is only available on mainnet`);
        }
    }

    validateNetwork(operation, allowedNetworks) {
        if (!allowedNetworks.includes(this.currentNetwork)) {
            throw new Error(`${operation} is not available on ${NETWORK_CONFIG[this.currentNetwork].displayName}`);
        }
    }
}

// Default network
export const DEFAULT_NETWORK = 'devnet';

/**
 * Get the RPC endpoint for a given network
 * @param {string} network - Network name (mainnet, devnet, testnet)
 * @returns {string} RPC endpoint URL
 */
export function getEndpoint(network = DEFAULT_NETWORK) {
    // First try custom endpoint
    const config = NETWORK_CONFIG[network];
    if (config && config.endpoint) {
        return config.endpoint;
    }
    
    // Fallback to clusterApiUrl
    try {
        return clusterApiUrl(network);
    } catch (error) {
        console.error(`Invalid network: ${network}`);
        return clusterApiUrl(DEFAULT_NETWORK);
    }
}

/**
 * Get network configuration
 * @param {string} network - Network name
 * @returns {Object} Network configuration
 */
export function getNetworkConfig(network) {
    return NETWORK_CONFIG[network] || NETWORK_CONFIG.devnet;
}

/**
 * Get network endpoint
 * @param {string} network - Network name
 * @returns {string} RPC endpoint URL
 */
export function getNetworkEndpoint(network) {
    return getNetworkConfig(network).endpoint;
}

/**
 * Get network explorer
 * @param {string} network - Network name
 * @returns {string} Explorer URL for the network
 */
export function getNetworkExplorer(network) {
    return getNetworkConfig(network).explorerUrl;
}

/**
 * Get network display name
 * @param {string} network - Network name
 * @returns {string} Display name for the network
 */
export function getNetworkName(network) {
    return getNetworkConfig(network).displayName;
}

/**
 * Check if a network is valid
 * @param {string} network - Network to validate
 * @returns {boolean} True if network is valid
 */
export function isValidNetwork(network) {
    return network in NETWORK_CONFIG;
}

/**
 * Get all available networks
 * @returns {string[]} List of available networks
 */
export function getAvailableNetworks() {
    return Object.keys(NETWORK_CONFIG);
}

/**
 * Get all networks
 * @returns {Object} All network configurations
 */
export function getAllNetworks() {
    return NETWORK_CONFIG;
}

export { NetworkManager };
