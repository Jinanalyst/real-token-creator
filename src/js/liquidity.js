import { 
    Connection, 
    PublicKey, 
    Transaction, 
    SystemProgram,
    LAMPORTS_PER_SOL
} from '@solana/web3.js';

import {
    Token,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';

class LiquidityManager {
    constructor(walletManager) {
        this.walletManager = walletManager;
    }

    async createLiquidityPool(poolData) {
        try {
            if (!this.walletManager.isConnected) {
                throw new Error('Wallet not connected');
            }

            const {
                tokenAAddress,
                tokenBAddress,
                tokenAAmount,
                tokenBAmount
            } = poolData;

            // Validate token addresses
            const tokenA = new PublicKey(tokenAAddress);
            const tokenB = new PublicKey(tokenBAddress);

            // Get associated token accounts for both tokens
            const tokenAAccount = await Token.getAssociatedTokenAddress(
                ASSOCIATED_TOKEN_PROGRAM_ID,
                TOKEN_PROGRAM_ID,
                tokenA,
                this.walletManager.publicKey,
                false
            );

            const tokenBAccount = await Token.getAssociatedTokenAddress(
                ASSOCIATED_TOKEN_PROGRAM_ID,
                TOKEN_PROGRAM_ID,
                tokenB,
                this.walletManager.publicKey,
                false
            );

            // Create pool token mint
            const poolTokenMint = PublicKey.findProgramAddress(
                [Buffer.from('pool_token_mint')],
                TOKEN_PROGRAM_ID
            )[0];

            const lamports = await this.walletManager.connection.getMinimumBalanceForRentExemption(
                Token.MintLayout.span
            );

            // Create transaction for pool creation
            const transaction = new Transaction();

            // Create pool token mint account
            transaction.add(
                SystemProgram.createAccount({
                    fromPubkey: this.walletManager.publicKey,
                    newAccountPubkey: poolTokenMint,
                    lamports,
                    space: Token.MintLayout.span,
                    programId: TOKEN_PROGRAM_ID
                }),
                Token.createInitializeMintInstruction(
                    poolTokenMint,
                    9, // Pool tokens typically use 9 decimals
                    this.walletManager.publicKey,
                    this.walletManager.publicKey,
                    TOKEN_PROGRAM_ID
                )
            );

            // Create pool token account
            const poolTokenAccount = await Token.getAssociatedTokenAddress(
                ASSOCIATED_TOKEN_PROGRAM_ID,
                TOKEN_PROGRAM_ID,
                poolTokenMint,
                this.walletManager.publicKey,
                false
            );

            transaction.add(
                Token.createAssociatedTokenAccountInstruction(
                    this.walletManager.publicKey,
                    poolTokenAccount,
                    this.walletManager.publicKey,
                    poolTokenMint,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            );

            // Transfer tokens to pool
            const tokenADecimals = await this.getTokenDecimals(tokenA);
            const tokenBDecimals = await this.getTokenDecimals(tokenB);

            const tokenATransferAmount = BigInt(tokenAAmount * Math.pow(10, tokenADecimals));
            const tokenBTransferAmount = BigInt(tokenBAmount * Math.pow(10, tokenBDecimals));

            transaction.add(
                Token.createTransferInstruction(
                    tokenAAccount,
                    poolTokenAccount,
                    this.walletManager.publicKey,
                    tokenATransferAmount,
                    [],
                    TOKEN_PROGRAM_ID
                ),
                Token.createTransferInstruction(
                    tokenBAccount,
                    poolTokenAccount,
                    this.walletManager.publicKey,
                    tokenBTransferAmount,
                    [],
                    TOKEN_PROGRAM_ID
                )
            );

            // Get recent blockhash
            const { blockhash } = await this.walletManager.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = this.walletManager.publicKey;

            // Sign transaction
            const signedTransaction = await this.walletManager.signTransaction(transaction);

            // Send and confirm transaction
            const signature = await this.walletManager.connection.sendRawTransaction(
                signedTransaction.serialize()
            );
            await this.walletManager.connection.confirmTransaction(signature);

            return {
                poolAddress: poolTokenMint.toString(),
                poolTokenAccount: poolTokenAccount.toString(),
                signature
            };
        } catch (error) {
            console.error('Error creating liquidity pool:', error);
            throw error;
        }
    }

    async getTokenDecimals(tokenMint) {
        try {
            const mintInfo = await this.walletManager.connection.getParsedAccountInfo(tokenMint);
            return mintInfo.value.data.parsed.info.decimals;
        } catch (error) {
            console.error('Error getting token decimals:', error);
            throw error;
        }
    }

    async getPoolInfo(poolAddress) {
        try {
            const poolInfo = await this.walletManager.connection.getParsedAccountInfo(
                new PublicKey(poolAddress)
            );
            return poolInfo.value.data.parsed.info;
        } catch (error) {
            console.error('Error getting pool info:', error);
            throw error;
        }
    }
}

export default LiquidityManager;
