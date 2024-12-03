class TokenManager {
    constructor(walletManager) {
        this.walletManager = walletManager;
    }

    async createToken(name, symbol, decimals, initialSupply) {
        try {
            if (!this.walletManager.isConnected()) {
                throw new Error('Wallet not connected');
            }

            // Convert initialSupply to the correct decimal places
            const supply = initialSupply * Math.pow(10, decimals);

            // Create mint account
            const mint = web3.Keypair.generate();
            console.log('Creating mint account:', mint.publicKey.toString());

            // Get minimum rent for mint account
            const lamports = await this.walletManager.connection.getMinimumBalanceForRentExemption(
                web3.MintLayout.span
            );

            // Create transaction for token creation
            const transaction = new web3.Transaction().add(
                // Create mint account
                web3.SystemProgram.createAccount({
                    fromPubkey: this.walletManager.wallet.publicKey,
                    newAccountPubkey: mint.publicKey,
                    space: web3.MintLayout.span,
                    lamports,
                    programId: web3.TOKEN_PROGRAM_ID
                }),
                // Initialize mint
                web3.TokenProgram.initializeMint({
                    mint: mint.publicKey,
                    decimals: decimals,
                    mintAuthority: this.walletManager.wallet.publicKey
                }),
                // Create associated token account
                web3.TokenProgram.createAssociatedTokenAccount({
                    mint: mint.publicKey,
                    owner: this.walletManager.wallet.publicKey
                }),
                // Mint initial supply
                web3.TokenProgram.mintTo({
                    mint: mint.publicKey,
                    destination: await web3.Token.getAssociatedTokenAddress(
                        mint.publicKey,
                        this.walletManager.wallet.publicKey
                    ),
                    amount: supply,
                    authority: this.walletManager.wallet.publicKey
                })
            );

            // Sign and send transaction
            const signature = await this.walletManager.wallet.signAndSendTransaction(transaction, [mint]);
            console.log('Token created! Transaction signature:', signature);

            // Wait for confirmation
            await this.walletManager.connection.confirmTransaction(signature);

            return {
                mint: mint.publicKey.toString(),
                signature: signature
            };
        } catch (error) {
            console.error('Failed to create token:', error);
            throw new Error(`Token creation failed: ${error.message}`);
        }
    }

    async getTokenBalance(mintAddress) {
        try {
            const mint = new web3.PublicKey(mintAddress);
            const tokenAccount = await web3.Token.getAssociatedTokenAddress(
                mint,
                this.walletManager.wallet.publicKey
            );

            const balance = await this.walletManager.connection.getTokenAccountBalance(tokenAccount);
            return balance.value.uiAmount;
        } catch (error) {
            console.error('Failed to get token balance:', error);
            throw new Error(`Failed to get token balance: ${error.message}`);
        }
    }
}
