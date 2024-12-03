// Network selector component
export function createNetworkSelector(walletManager) {
    const networkSelector = document.createElement('select');
    networkSelector.className = 'bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500';
    
    const networks = [
        { id: 'mainnet', name: 'Mainnet' },
        { id: 'devnet', name: 'Devnet' },
        { id: 'testnet', name: 'Testnet' }
    ];

    networks.forEach(network => {
        const option = document.createElement('option');
        option.value = network.id;
        option.textContent = network.name;
        networkSelector.appendChild(option);
    });

    // Set initial value from wallet manager
    networkSelector.value = walletManager.network;

    // Handle network changes
    networkSelector.addEventListener('change', async (event) => {
        const newNetwork = event.target.value;
        try {
            await walletManager.initialize(newNetwork);
            window.showNotification('success', `Switched to ${newNetwork}`);
        } catch (error) {
            console.error('Failed to switch network:', error);
            window.showNotification('error', `Failed to switch network: ${error.message}`);
            // Revert selection
            networkSelector.value = walletManager.network;
        }
    });

    return networkSelector;
}
