// Function to toggle the visibility of the network options dropdown
function toggleNetworkDropdown() {
    const networkOptions = document.getElementById('network-options');
    networkOptions.classList.toggle('hidden'); // Show or hide the dropdown
}

// Function to handle network selection
async function selectNetwork(network) {
    try {
        currentNetwork = network;
        const endpoint = getNetworkEndpoint(network);
        currentConnection = new Connection(endpoint, 'confirmed');

        // Update UI
        const networkButton = document.getElementById('network-selector');
        networkButton.textContent = `Connected to ${getNetworkName(network)}`;
        
        // Hide the dropdown after selection
        const networkOptions = document.getElementById('network-options');
        networkOptions.classList.add('hidden');

        // Dispatch event for other components to know about network change
        window.dispatchEvent(new CustomEvent('networkChanged', {
            detail: { network, connection: currentConnection }
        }));

        console.log(`Successfully connected to ${network}`);
    } catch (error) {
        console.error(`Failed to connect to ${network}:`, error);
        alert(`Failed to connect to ${network}. Please try again.`);
    }
}

// Function to get current connection
export function getCurrentConnection() {
    if (!currentConnection) {
        currentConnection = new Connection(getNetworkEndpoint(currentNetwork), 'confirmed');
    }
    return currentConnection;
}

// Function to get current network
export function getCurrentNetwork() {
    return currentNetwork;
}

import { Connection } from '@solana/web3.js';
import { getNetworkEndpoint, getNetworkName, DEFAULT_NETWORK } from './src/config/networks.js';

let currentConnection = null;
let currentNetwork = DEFAULT_NETWORK;

// Initialize with default network
window.addEventListener('DOMContentLoaded', () => {
    selectNetwork(DEFAULT_NETWORK);
});