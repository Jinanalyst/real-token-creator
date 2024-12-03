import { 
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    TOKEN_PROGRAM_ID,
    getAccount,
    getMint
} from '@solana/spl-token';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { walletManager } from './wallet';

class TokenCreator {
    constructor() {
        this.FEE_ACCOUNT = new PublicKey('6zkf4DviZZkpWVEh53MrcQV6vGXGpESnNXgAvU6KpBUH');
        this.FEES = {
            BASE_TOKEN_CREATION: 0.01,
            CUSTOM_DECIMALS: 0.005,
            FREEZE_AUTHORITY: 0.005,
            REVOKE_MINT: 0.005
        };
        this.connection = walletManager.connection;
        this.wallet = walletManager.wallet;
    }

    async createToken(config) {
        try {
            const {
                tokenName,
                tokenSymbol,
                totalSupply,
                decimals = 9,
                revokeMint = false,
                freezeAuthority = false,
                metadata = null
            } = config;

            if (!walletManager.wallet) {
                throw new Error('Wallet not connected');
            }

            // Input validation
            this._validateTokenInput(config);

            // Calculate and verify fee
            const fee = await this._calculateAndVerifyFee(config);

            // Create new mint
            const mint = await createMint(
                this.connection,
                this.wallet.payer,
                this.wallet.publicKey,
                this.wallet.publicKey,
                decimals,
                undefined,
                undefined,
                TOKEN_PROGRAM_ID
            );

            // Get the token account of the wallet address, and if it does not exist, create it
            const tokenAccount = await getOrCreateAssociatedTokenAccount(
                this.connection,
                this.wallet.payer,
                mint,
                this.wallet.publicKey
            );

            // Mint tokens to the token account
            await mintTo(
                this.connection,
                this.wallet.payer,
                mint,
                tokenAccount.address,
                this.wallet.publicKey,
                totalSupply
            );

            // Add fee transfer instruction
            const transaction = new Transaction();
            const feeInstruction = SystemProgram.transfer({
                fromPubkey: walletManager.wallet.publicKey,
                toPubkey: this.FEE_ACCOUNT,
                lamports: await this._calculateAndVerifyFee({ decimals, freezeAuthority, revokeMint })
            });
            transaction.add(feeInstruction);

            // Sign and send transaction
            const signature = await this._signAndSendTransaction(transaction);

            return {
                success: true,
                signature,
                mint: mint.toBase58(),
                tokenAccount: tokenAccount.address.toBase58(),
                tokenDetails: {
                    name: tokenName,
                    symbol: tokenSymbol,
                    totalSupply,
                    decimals
                }
            };

        } catch (error) {
            console.error('Token creation failed:', error);
            throw new Error(`Token creation failed: ${error.message}`);
        }
    }

    _validateTokenInput(config) {
        const { tokenName, tokenSymbol, totalSupply, decimals } = config;

        if (!tokenName || tokenName.length < 2 || tokenName.length > 32) {
            throw new Error('Token name must be between 2 and 32 characters');
        }

        if (!tokenSymbol || tokenSymbol.length < 2 || tokenSymbol.length > 10) {
            throw new Error('Token symbol must be between 2 and 10 characters');
        }

        if (!totalSupply || totalSupply <= 0) {
            throw new Error('Total supply must be greater than 0');
        }

        if (decimals < 0 || decimals > 9) {
            throw new Error('Decimals must be between 0 and 9');
        }
    }

    async _calculateAndVerifyFee(config) {
        const { decimals, freezeAuthority, revokeMint } = config;
        let totalFee = this.FEES.BASE_TOKEN_CREATION;

        if (decimals !== 9) totalFee += this.FEES.CUSTOM_DECIMALS;
        if (freezeAuthority) totalFee += this.FEES.FREEZE_AUTHORITY;
        if (revokeMint) totalFee += this.FEES.REVOKE_MINT;

        const balance = await walletManager.getBalance(walletManager.wallet.publicKey);
        if (balance < totalFee) {
            throw new Error(`Insufficient balance. Required: ${totalFee} SOL`);
        }

        return totalFee;
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

export const tokenCreator = new TokenCreator();
