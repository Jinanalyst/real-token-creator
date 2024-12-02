async function connectWallet() {
    if (window.solana && window.solana.isPhantom) {
        try {
            const response = await window.solana.connect();
            console.log('Connected to wallet:', response.publicKey.toString());
            return response.publicKey;
        } catch (err) {
            console.log('Error connecting to wallet:', err);
            alert('Failed to connect wallet');
        }
    } else {
        alert('Please install Phantom wallet to continue');
    }
}