class LiquidityPoolManager {
    constructor(walletManager) {
        this.walletManager = walletManager;
    }

    async createPool(baseToken, quoteToken, liquidityAmount, feeTier) {
        try {
            if (!this.walletManager.isConnected()) {
                throw new Error('Wallet not connected');
            }

            // Validate inputs
            if (!baseToken || !quoteToken || !liquidityAmount || !feeTier) {
                throw new Error('Missing required parameters');
            }

            // Convert fee tier to basis points
            const feeBasisPoints = parseFloat(feeTier) * 100;

            // Create pool configuration
            const poolConfig = {
                baseToken: new solanaWeb3.PublicKey(baseToken),
                quoteToken: new solanaWeb3.PublicKey(quoteToken),
                feeTier: feeBasisPoints,
                liquidityAmount: liquidityAmount,
                tickSpacing: this._getTickSpacing(feeBasisPoints)
            };

            // Get token accounts
            const baseTokenAccount = await this._getOrCreateTokenAccount(poolConfig.baseToken);
            const quoteTokenAccount = await this._getOrCreateTokenAccount(poolConfig.quoteToken);

            // Create pool transaction
            const transaction = await this._createPoolTransaction(
                poolConfig,
                baseTokenAccount,
                quoteTokenAccount
            );

            // Sign and send transaction
            const signature = await this.walletManager.signAndSendTransaction(transaction);
            console.log('Pool created! Transaction signature:', signature);

            return {
                signature,
                poolConfig
            };

        } catch (error) {
            console.error('Failed to create liquidity pool:', error);
            throw new Error(`Pool creation failed: ${error.message}`);
        }
    }

    async _getOrCreateTokenAccount(mint) {
        try {
            const ata = await splToken.Token.getAssociatedTokenAddress(
                splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
                splToken.TOKEN_PROGRAM_ID,
                mint,
                this.walletManager.wallet.publicKey
            );

            try {
                await this.walletManager.connection.getTokenAccountBalance(ata);
                return ata;
            } catch {
                // Token account doesn't exist, create it
                const transaction = new solanaWeb3.Transaction().add(
                    splToken.Token.createAssociatedTokenAccountInstruction(
                        splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
                        splToken.TOKEN_PROGRAM_ID,
                        mint,
                        ata,
                        this.walletManager.wallet.publicKey,
                        this.walletManager.wallet.publicKey
                    )
                );

                await this.walletManager.signAndSendTransaction(transaction);
                return ata;
            }
        } catch (error) {
            throw new Error(`Failed to get/create token account: ${error.message}`);
        }
    }

    async _createPoolTransaction(poolConfig, baseTokenAccount, quoteTokenAccount) {
        try {
            const userPublicKey = this.walletManager.wallet.publicKey;

            // Create pool state account
            const poolStateAccount = solanaWeb3.Keypair.generate();
            const poolStateSpace = 1024; // Adjust based on actual requirements

            // Create vault accounts for base and quote tokens
            const baseVault = solanaWeb3.Keypair.generate();
            const quoteVault = solanaWeb3.Keypair.generate();

            // Calculate rent exemption
            const rentExemption = await this.walletManager.connection.getMinimumBalanceForRentExemption(
                poolStateSpace
            );

            // Build transaction
            const transaction = new solanaWeb3.Transaction();

            // Create pool state account
            transaction.add(
                solanaWeb3.SystemProgram.createAccount({
                    fromPubkey: userPublicKey,
                    newAccountPubkey: poolStateAccount.publicKey,
                    lamports: rentExemption,
                    space: poolStateSpace,
                    programId: RAYDIUM_POOL_PROGRAM_ID
                })
            );

            // Create vault accounts
            transaction.add(
                solanaWeb3.SystemProgram.createAccount({
                    fromPubkey: userPublicKey,
                    newAccountPubkey: baseVault.publicKey,
                    lamports: await this.walletManager.connection.getMinimumBalanceForRentExemption(165),
                    space: 165,
                    programId: splToken.TOKEN_PROGRAM_ID
                }),
                solanaWeb3.SystemProgram.createAccount({
                    fromPubkey: userPublicKey,
                    newAccountPubkey: quoteVault.publicKey,
                    lamports: await this.walletManager.connection.getMinimumBalanceForRentExemption(165),
                    space: 165,
                    programId: splToken.TOKEN_PROGRAM_ID
                })
            );

            // Initialize pool
            transaction.add(
                this._createInitPoolInstruction(
                    poolConfig,
                    poolStateAccount.publicKey,
                    baseVault.publicKey,
                    quoteVault.publicKey,
                    baseTokenAccount,
                    quoteTokenAccount,
                    userPublicKey
                )
            );

            // Add necessary signers
            transaction.sign(poolStateAccount, baseVault, quoteVault);

            return transaction;
        } catch (error) {
            throw new Error(`Failed to create pool transaction: ${error.message}`);
        }
    }

    _getTickSpacing(feeBasisPoints) {
        switch (feeBasisPoints) {
            case 1: return 1;
            case 10: return 2;
            case 25: return 4;
            case 100: return 8;
            case 300: return 16;
            case 1000: return 64;
            default: return 8;
        }
    }

    _createInitPoolInstruction(
        poolConfig,
        poolStateAccount,
        baseVault,
        quoteVault,
        baseTokenAccount,
        quoteTokenAccount,
        userPublicKey
    ) {
        // This is a placeholder. You'll need to implement the actual Raydium pool initialization
        // instruction based on their SDK or program requirements
        return new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: poolStateAccount, isSigner: false, isWritable: true },
                { pubkey: baseVault, isSigner: false, isWritable: true },
                { pubkey: quoteVault, isSigner: false, isWritable: true },
                { pubkey: baseTokenAccount, isSigner: false, isWritable: true },
                { pubkey: quoteTokenAccount, isSigner: false, isWritable: true },
                { pubkey: userPublicKey, isSigner: true, isWritable: false },
                { pubkey: splToken.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: solanaWeb3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
            ],
            programId: RAYDIUM_POOL_PROGRAM_ID,
            data: Buffer.from([]) // Implement actual instruction data
        });
    }
}
