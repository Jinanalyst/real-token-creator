// Function to connect the wallet and sign a message
async function connectWalletAndSignMessage() {
    if (window.solana && window.solana.isPhantom) {
        try {
            // Connect to Phantom wallet
            const response = await window.solana.connect();
            console.log('Connected to wallet:', response.publicKey.toString());

            // Sign a message after connection
            const message = "Please sign this message to verify your identity on SolanaMint.";
            const encodedMessage = new TextEncoder().encode(message);

            // Sign the message
            const signedMessage = await window.solana.signMessage(encodedMessage, 'utf8');
            console.log('Message signed:', signedMessage);

            // You can now use the signedMessage.signature for further verification or transactions

            alert('Wallet connected and message signed!');
        } catch (err) {
            console.log('Error connecting or signing message:', err);
            alert('Failed to connect wallet or sign message');
        }
    } else {
        alert('Please install Phantom wallet to continue');
    }
}