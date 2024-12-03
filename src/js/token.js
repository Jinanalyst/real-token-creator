import { 
    Transaction, 
    SystemProgram, 
    Keypair,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL,
    PublicKey
} from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createInitializeMintInstruction,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    createMintToInstruction,
    MintLayout,
    getMinimumBalanceForRentExemption,
    createSetAuthorityInstruction,
    AuthorityType,
    createUpdateMetadataAccountInstruction
} from '@solana/spl_token';

class TokenCreator {
    constructor(walletManager) {
        this.walletManager = walletManager;
    }

    async createToken(tokenData) {
        try {
            if (!this.walletManager.isConnected) {
                throw new Error('Wallet not connected');
            }

            const {
                name,
                symbol,
                decimals,
                initialSupply,
                freezeAuthority
            } = tokenData;

            // Create mint account
            const mintKeypair = Keypair.generate();
            const lamports = await this.walletManager.connection.getMinimumBalanceForRentExemption(
                MintLayout.span
            );

            // Create transaction for token mint
            const transaction = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: this.walletManager.publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    lamports,
                    space: MintLayout.span,
                    programId: TOKEN_PROGRAM_ID
                }),
                createInitializeMintInstruction(
                    mintKeypair.publicKey,
                    decimals,
                    this.walletManager.publicKey,
                    freezeAuthority ? this.walletManager.publicKey : null,
                    TOKEN_PROGRAM_ID
                )
            );

            // Create associated token account
            const associatedTokenAccount = await getAssociatedTokenAddress(
                mintKeypair.publicKey,
                this.walletManager.publicKey,
                false,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            transaction.add(
                createAssociatedTokenAccountInstruction(
                    this.walletManager.publicKey,
                    associatedTokenAccount,
                    this.walletManager.publicKey,
                    mintKeypair.publicKey,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            );

            // Mint initial supply
            if (initialSupply > 0) {
                const mintAmount = BigInt(initialSupply * Math.pow(10, decimals));
                transaction.add(
                    createMintToInstruction(
                        mintKeypair.publicKey,
                        associatedTokenAccount,
                        this.walletManager.publicKey,
                        mintAmount,
                        [],
                        TOKEN_PROGRAM_ID
                    )
                );
            }

            // Get recent blockhash
            const { blockhash } = await this.walletManager.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = this.walletManager.publicKey;

            // Sign transaction
            transaction.sign(mintKeypair);
            const signedTransaction = await this.walletManager.signTransaction(transaction);

            // Send and confirm transaction
            const signature = await this.walletManager.connection.sendRawTransaction(
                signedTransaction.serialize()
            );
            await this.walletManager.connection.confirmTransaction(signature);

            // Store token metadata on-chain (optional)
            if (name || symbol) {
                await this.updateTokenMetadata(mintKeypair.publicKey, {
                    name,
                    symbol,
                    uri: ''
                });
            }

            // Return token details
            return {
                mintAddress: mintKeypair.publicKey.toString(),
                tokenAccount: associatedTokenAccount.toString(),
                signature
            };
        } catch (error) {
            console.error('Error creating token:', error);
            throw error;
        }
    }

    async updateTokenMetadata(mintAddress, metadata) {
        try {
            const { name, symbol, uri } = metadata;

            // Get metadata account PDA
            const [metadataAddress] = await PublicKey.findProgramAddress(
                [
                    Buffer.from('metadata'),
                    TOKEN_PROGRAM_ID.toBuffer(),
                    mintAddress.toBuffer()
                ],
                TOKEN_PROGRAM_ID
            );

            // Create transaction
            const transaction = new Transaction();

            // Add metadata instruction
            transaction.add(
                createUpdateMetadataAccountInstruction({
                    metadata: metadataAddress,
                    updateAuthority: this.walletManager.publicKey,
                    data: {
                        name,
                        symbol,
                        uri,
                        sellerFeeBasisPoints: 0,
                        creators: null,
                        collection: null,
                        uses: null
                    }
                })
            );

            // Get recent blockhash
            const { blockhash } = await this.walletManager.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = this.walletManager.publicKey;

            // Sign and send transaction
            const signedTransaction = await this.walletManager.signTransaction(transaction);
            const signature = await this.walletManager.connection.sendRawTransaction(
                signedTransaction.serialize()
            );
            await this.walletManager.connection.confirmTransaction(signature);

            return signature;
        } catch (error) {
            console.error('Error updating token metadata:', error);
            throw error;
        }
    }

    async getTokenBalance(tokenAddress) {
        try {
            const tokenAccountInfo = await this.walletManager.connection.getParsedAccountInfo(
                new PublicKey(tokenAddress)
            );
            return tokenAccountInfo.value.data.parsed.info.tokenAmount.uiAmount;
        } catch (error) {
            console.error('Error getting token balance:', error);
            throw error;
        }
    }

    async getTokenInfo(mintAddress) {
        try {
            const mintInfo = await this.walletManager.connection.getParsedAccountInfo(
                new PublicKey(mintAddress)
            );
            return mintInfo.value.data.parsed.info;
        } catch (error) {
            console.error('Error getting token info:', error);
            throw error;
        }
    }
}

export default TokenCreator;
