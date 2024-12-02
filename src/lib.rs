use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    msg,
    program::invoke,
};
use std::str::FromStr; // Import the FromStr trait for Pubkey parsing

#[derive(BorshDeserialize, BorshSerialize)]
pub struct TokenCreationInstruction {
    // Define any parameters here (e.g., token name, symbol, etc.)
}

entrypoint!(process_instruction);

fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    // Deserialize the instruction data
    let _instruction: TokenCreationInstruction = TokenCreationInstruction::try_from_slice(instruction_data)?;

    // Extract accounts from the input
    let accounts_iter = &mut accounts.iter();
    let payer_account = next_account_info(accounts_iter)?;
    let _creator_account = next_account_info(accounts_iter)?;

    // Ensure the payer is the signer
    if !payer_account.is_signer {
        msg!("Payer must sign the transaction");
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Define the fee amount: 0.001 SOL in lamports
    let fee_amount = (0.001 * 10_000_000_000.0) as u64; // Convert the float to u64

    // Recipient address for the fee
    let recipient_pubkey = Pubkey::from_str("6zkf4DviZZkpWVEh53MrcQV6vGXGpESnNXgAvU6KpBUH")
        .map_err(|_| ProgramError::InvalidArgument)?;

    // Create the transfer instruction to send the fee
    let transfer_instruction = system_instruction::transfer(
        payer_account.key,
        &recipient_pubkey,
        fee_amount,
    );

    // Execute the transfer instruction to send the fee to the recipient
    invoke(
        &transfer_instruction,
        &[payer_account.clone(), _creator_account.clone()],
    )?;

    msg!("Fee of 0.001 SOL successfully sent to the recipient");

    Ok(())
}