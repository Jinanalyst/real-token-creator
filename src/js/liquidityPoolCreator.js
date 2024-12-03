import { PublicKey, Transaction } from '@solana/web3.js';
import { 
  Liquidity,
  Token,
  TokenAmount,
  Token as RaydiumToken,
  Percent,
  Currency,
  TokenAccount,
  LiquidityPoolKeys,
  jsonInfo2PoolKeys,
  Fraction,
  ONE
} from '@raydium-io/raydium-sdk';

class LiquidityPoolCreator {
    constructor() {
        this.FEES = {
            BASE_POOL_CREATION: 0.02,
            CUSTOM_RATIO: 0.01,
            HIGH_FEE_TIER: 0.01
        };
        this.FEE_TIERS = {
            LOW: 0.0001,    // 0.01%
            MEDIUM: 0.0025, // 0.25%
            HIGH: 0.01      // 1%
        };
    }

    async createPool(config) {
        try {
            const {
                baseToken,
                quoteToken,
                initialLiquidity,
                feeTier = this.FEE_TIERS.MEDIUM,
                customRatio = false,
                baseTokenAmount,
                quoteTokenAmount,
                minOrderSize = 0.1,
                tickSize = 0.01
            } = config;

            // Validate inputs
            this._validatePoolInput(config);

            // Calculate and verify fee
            const fee = await this._calculateAndVerifyFee(config);

            // Get token accounts
            const baseTokenAccount = await this._getOrCreateTokenAccount(baseToken);
            const quoteTokenAccount = await this._getOrCreateTokenAccount(quoteToken);

            // Create pool transaction
            const transaction = await this._createPoolTransaction({
                baseToken,
                quoteToken,
                baseTokenAccount,
                quoteTokenAccount,
                initialLiquidity,
                feeTier,
                customRatio,
                baseTokenAmount,
                quoteTokenAmount,
                minOrderSize,
                tickSize
            });

            // Sign and send transaction
            const signature = await this._signAndSendTransaction(transaction);

            return {
                success: true,
                signature,
                poolDetails: {
                    baseToken,
                    quoteToken,
                    feeTier,
                    initialLiquidity
                }
            };

        } catch (error) {
            console.error('Pool creation failed:', error);
            throw new Error(`Pool creation failed: ${error.message}`);
        }
    }

    _validatePoolInput(config) {
        const {
            baseToken,
            quoteToken,
            initialLiquidity,
            feeTier,
            minOrderSize,
            tickSize
        } = config;

        if (!baseToken || !quoteToken) {
            throw new Error('Both base and quote tokens are required');
        }

        if (baseToken === quoteToken) {
            throw new Error('Base and quote tokens must be different');
        }

        if (!initialLiquidity || initialLiquidity <= 0) {
            throw new Error('Initial liquidity must be greater than 0');
        }

        if (!Object.values(this.FEE_TIERS).includes(feeTier)) {
            throw new Error('Invalid fee tier');
        }

        if (minOrderSize <= 0 || tickSize <= 0) {
            throw new Error('Min order size and tick size must be greater than 0');
        }
    }

    async _calculateAndVerifyFee(config) {
        const { feeTier, customRatio } = config;
        let totalFee = this.FEES.BASE_POOL_CREATION;

        if (customRatio) totalFee += this.FEES.CUSTOM_RATIO;
        if (feeTier === this.FEE_TIERS.HIGH) totalFee += this.FEES.HIGH_FEE_TIER;

        const balance = await walletManager.getBalance(walletManager.wallet.publicKey);
        if (balance < totalFee) {
            throw new Error(`Insufficient balance. Required: ${totalFee} SOL`);
        }

        return totalFee;
    }

    async _getOrCreateTokenAccount(tokenMint) {
        try {
            const tokenMintPubkey = new PublicKey(tokenMint);
            const tokenAccounts = await walletManager.getTokenAccounts(walletManager.wallet.publicKey);
            
            const existingAccount = tokenAccounts.find(
                account => account.mint === tokenMint
            );

            if (existingAccount) {
                return existingAccount;
            }

            // Create new token account if none exists
            return await Token.createAssociatedTokenAccount(
                walletManager.connection,
                walletManager.wallet.publicKey,
                tokenMintPubkey,
                walletManager.wallet.publicKey
            );

        } catch (error) {
            console.error('Failed to get/create token account:', error);
            throw error;
        }
    }

    async _createPoolTransaction(config) {
        const {
            baseToken,
            quoteToken,
            baseTokenAccount,
            quoteTokenAccount,
            initialLiquidity,
            feeTier,
            customRatio,
            baseTokenAmount,
            quoteTokenAmount,
            minOrderSize,
            tickSize
        } = config;

        // Create Raydium pool configuration
        const baseTokenInfo = new RaydiumToken(baseToken.chainId, baseToken.mint, baseToken.decimals, baseToken.symbol, baseToken.name);
        const quoteTokenInfo = new RaydiumToken(quoteToken.chainId, quoteToken.mint, quoteToken.decimals, quoteToken.symbol, quoteToken.name);

        // Create pool settings
        const poolKeys = await Liquidity.makeCreatePoolInstructionSimple({
            connection: walletManager.connection,
            wallet: walletManager.wallet.publicKey,
            baseToken: baseTokenInfo,
            quoteToken: quoteTokenInfo,
            startPrice: new Fraction(1),
            slippage: new Percent(0, 100)
        });

        // Create pool transaction
        return await Liquidity.makeCreatePoolTransaction({
            connection: walletManager.connection,
            wallet: walletManager.wallet,
            baseToken: baseTokenInfo,
            quoteToken: quoteTokenInfo,
            baseTokenAccount,
            quoteTokenAccount,
            poolConfig: {
                baseMint: new PublicKey(baseToken),
                quoteMint: new PublicKey(quoteToken),
                baseAmount: baseTokenAmount || initialLiquidity,
                quoteAmount: quoteTokenAmount || initialLiquidity,
                feeTier,
                minOrderSize,
                tickSize
            },
            programId: await this._getRaydiumProgramId()
        });
    }

    async _getRaydiumProgramId() {
        const network = walletManager.network;
        const programIds = {
            mainnet: 'RaydiumPoolId_MainNet',
            devnet: 'RaydiumPoolId_DevNet',
            testnet: 'RaydiumPoolId_TestNet'
        };

        return new PublicKey(programIds[network]);
    }

    async _signAndSendTransaction(transaction) {
        try {
            transaction.recentBlockhash = (
                await walletManager.connection.getRecentBlockhash()
            ).blockhash;
            transaction.feePayer = walletManager.wallet.publicKey;

            const signed = await walletManager.signTransaction(transaction);
            const signature = await walletManager.connection.sendRawTransaction(
                signed.serialize()
            );

            await walletManager.connection.confirmTransaction(signature);
            return signature;

        } catch (error) {
            console.error('Transaction failed:', error);
            throw new Error('Failed to process transaction');
        }
    }
}

export const liquidityPoolCreator = new LiquidityPoolCreator();
