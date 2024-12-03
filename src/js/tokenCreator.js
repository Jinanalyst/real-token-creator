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

            // Create new mint with retries
            let mint;
            let retries = 3;
            while (retries > 0) {
                try {
                    mint = await createMint(
                        this.connection,
                        this.wallet.payer,
                        this.wallet.publicKey,
                        freezeAuthority ? this.wallet.publicKey : null,
                        decimals,
                        undefined,
                        {
                            commitment: 'confirmed',
                            preflightCommitment: 'processed'
                        },
                        TOKEN_PROGRAM_ID
                    );
                    break;
                } catch (err) {
                    console.error(`Mint creation attempt failed (${retries} retries left):`, err);
                    retries--;
                    if (retries === 0) throw err;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            // Get or create token account with retries
            let tokenAccount;
            retries = 3;
            while (retries > 0) {
                try {
                    tokenAccount = await getOrCreateAssociatedTokenAccount(
                        this.connection,
                        this.wallet.payer,
                        mint,
                        this.wallet.publicKey,
                        false,
                        'confirmed',
                        {
                            commitment: 'confirmed',
                            preflightCommitment: 'processed'
                        }
                    );
                    break;
                } catch (err) {
                    console.error(`Token account creation attempt failed (${retries} retries left):`, err);
                    retries--;
                    if (retries === 0) throw err;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            // Mint tokens with retries
            retries = 3;
            while (retries > 0) {
                try {
                    await mintTo(
                        this.connection,
                        this.wallet.payer,
                        mint,
                        tokenAccount.address,
                        this.wallet.publicKey,
                        totalSupply,
                        [],
                        {
                            commitment: 'confirmed',
                            preflightCommitment: 'processed'
                        }
                    );
                    break;
                } catch (err) {
                    console.error(`Token minting attempt failed (${retries} retries left):`, err);
                    retries--;
                    if (retries === 0) throw err;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            // Add fee transfer instruction
            const transaction = new Transaction();
            const feeInstruction = SystemProgram.transfer({
                fromPubkey: this.wallet.publicKey,
                toPubkey: this.FEE_ACCOUNT,
                lamports: fee * 1000000000
            });
            transaction.add(feeInstruction);

            // Sign and send transaction
            const signature = await this._signAndSendTransaction(transaction);

            // Wait for confirmation
            await this.connection.confirmTransaction(signature, 'confirmed');

            return {
                success: true,
                signature,
                mint: mint.toBase58(),
                tokenAccount: tokenAccount.address.toBase58(),
                tokenDetails: {
                    name: tokenName,
                    symbol: tokenSymbol,
                    totalSupply,
                    decimals,
                    freezeAuthority: freezeAuthority
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
        try {
            const { decimals, freezeAuthority, revokeMint } = config;
            let totalFee = this.FEES.BASE_TOKEN_CREATION;

            if (decimals !== 9) totalFee += this.FEES.CUSTOM_DECIMALS;
            if (freezeAuthority) totalFee += this.FEES.FREEZE_AUTHORITY;
            if (revokeMint) totalFee += this.FEES.REVOKE_MINT;

            // Get latest balance
            const balance = await this.connection.getBalance(
                this.wallet.publicKey,
                'confirmed'
            );
            
            const balanceInSol = balance / 1000000000; // Convert lamports to SOL
            
            // Add buffer for transaction fees
            const requiredBalance = totalFee + 0.01; // Add 0.01 SOL buffer for transaction fees
            
            if (balanceInSol < requiredBalance) {
                throw new Error(
                    `Insufficient balance. Required: ${requiredBalance.toFixed(4)} SOL (including transaction fees), ` +
                    `Available: ${balanceInSol.toFixed(4)} SOL`
                );
            }

            return totalFee;
        } catch (error) {
            console.error('Fee calculation failed:', error);
            throw new Error(`Fee calculation failed: ${error.message}`);
        }
    }

    async _signAndSendTransaction(transaction) {
        try {
            // Get latest blockhash
            const { blockhash, lastValidBlockHeight } = 
                await this.connection.getLatestBlockhash('confirmed');
            
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = this.wallet.publicKey;

            // Sign transaction
            const signed = await this.wallet.signTransaction(transaction);
            
            // Send with retry logic
            let signature;
            let retries = 3;
            while (retries > 0) {
                try {
                    signature = await this.connection.sendRawTransaction(
                        signed.serialize(),
                        {
                            skipPreflight: false,
                            preflightCommitment: 'processed',
                            maxRetries: 5
                        }
                    );
                    
                    // Wait for confirmation with timeout
                    const confirmation = await this.connection.confirmTransaction({
                        blockhash,
                        lastValidBlockHeight,
                        signature
                    }, 'confirmed');
                    
                    if (confirmation.value.err) {
                        throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
                    }
                    
                    break;
                } catch (err) {
                    console.error(`Transaction attempt failed (${retries} retries left):`, err);
                    retries--;
                    if (retries === 0) throw err;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            return signature;
        } catch (error) {
            console.error('Transaction failed:', error);
            throw new Error(`Transaction failed: ${error.message}`);
        }
    }
}

export const tokenCreator = new TokenCreator();
