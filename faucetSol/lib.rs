use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("719GaXbsBWwskSVKZDykUMX6mur7BiCVjNSSWS7KMwtp"); // REPLACE THIS WITH YOUR DEPLOYED PROGRAM ID

#[program]
pub mod faucet_drops {
    use super::*;

    // ----------------------------------------------------------------
    // 1. CORE FUNCTIONS
    // ----------------------------------------------------------------

    pub fn initialize_faucet(
        ctx: Context<InitializeFaucet>,
        name: String,
        claim_amount: u64,
        start_time: i64,
        end_time: i64,
        faucet_type: u8, // 0 = Whitelist, 1 = Backend/Code, 2 = Custom
        bumps: FaucetBumps,
    ) -> Result<()> {
        let faucet = &mut ctx.accounts.faucet;
        let authority = &ctx.accounts.authority;

        require!(name.len() < 32, FaucetError::NameTooLong);
        require!(end_time > start_time, FaucetError::InvalidTimeRange);

        faucet.authority = authority.key();
        faucet.token_mint = ctx.accounts.token_mint.key();
        faucet.token_vault = ctx.accounts.token_vault.key();
        faucet.backend_signer = ctx.accounts.backend_signer.key();
        faucet.fee_vault = ctx.accounts.fee_vault.key();

        faucet.name = name;
        faucet.claim_amount = claim_amount;
        faucet.start_time = start_time;
        faucet.end_time = end_time;
        faucet.faucet_type = faucet_type;
        faucet.paused = false;
        faucet.bump = bumps.faucet;

        emit!(FaucetCreated {
            faucet: faucet.key(),
            authority: faucet.authority,
            name: faucet.name.clone(),
            mint: faucet.token_mint,
        });

        Ok(())
    }

    pub fn fund_faucet(ctx: Context<FundFaucet>, amount: u64) -> Result<()> {
        let faucet = &ctx.accounts.faucet;

        // Fee Calculation: 1% Backend, 2% Platform
        let backend_fee = (amount * 1) / 100;
        let platform_fee = (amount * 2) / 100;
        let deposit_amount = amount - backend_fee - platform_fee;

        // 1. To Backend Wallet
        if backend_fee > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.funder_token_account.to_account_info(),
                to: ctx.accounts.backend_wallet.to_account_info(),
                authority: ctx.accounts.funder.to_account_info(),
            };
            token::transfer(
                CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
                backend_fee,
            )?;
        }

        // 2. To Platform Vault
        if platform_fee > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.funder_token_account.to_account_info(),
                to: ctx.accounts.platform_fee_account.to_account_info(),
                authority: ctx.accounts.funder.to_account_info(),
            };
            token::transfer(
                CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
                platform_fee,
            )?;
        }

        // 3. To Faucet Vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.funder_token_account.to_account_info(),
            to: ctx.accounts.token_vault.to_account_info(),
            authority: ctx.accounts.funder.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
            deposit_amount,
        )?;

        emit!(Funded {
            faucet: faucet.key(),
            amount: amount,
            funder: ctx.accounts.funder.key(),
        });

        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let faucet = &ctx.accounts.faucet;
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        require!(!faucet.paused, FaucetError::Paused);
        require!(current_time >= faucet.start_time, FaucetError::NotStarted);
        require!(current_time <= faucet.end_time, FaucetError::Ended);

        let mut transfer_amount = faucet.claim_amount;

        // Type 0: DropList (Whitelist Standard)
        if faucet.faucet_type == 0 {
            require!(
                ctx.accounts.whitelist_entry.is_some(),
                FaucetError::NotWhitelisted
            );
            let entry = ctx.accounts.whitelist_entry.as_ref().unwrap();
            require!(entry.is_whitelisted, FaucetError::NotWhitelisted);
        }
        // Type 1: DropCode (Backend Signature)
        else if faucet.faucet_type == 1 {
            require!(
                ctx.accounts.backend_signer.key() == faucet.backend_signer,
                FaucetError::UnauthorizedBackend
            );
            require!(
                ctx.accounts.backend_signer.is_signer,
                FaucetError::UnauthorizedBackend
            );
        }
        // Type 2: Custom (Whitelist with Custom Amounts)
        else if faucet.faucet_type == 2 {
            require!(
                ctx.accounts.whitelist_entry.is_some(),
                FaucetError::NotWhitelisted
            );
            let entry = ctx.accounts.whitelist_entry.as_ref().unwrap();
            transfer_amount = entry.custom_amount;
            require!(transfer_amount > 0, FaucetError::InvalidAmount);
        }

        // Record Claim
        let claim_status = &mut ctx.accounts.claim_status;
        claim_status.claimer = ctx.accounts.recipient.key();
        claim_status.amount = transfer_amount;
        claim_status.claim_time = current_time;
        claim_status.claimed = true;

        // Sign Transfer
        let faucet_seed = faucet.name.as_bytes();
        let authority_seeds = &[
            b"faucet",
            faucet.authority.as_ref(),
            faucet_seed,
            &[faucet.bump],
        ];
        let signer = &[&authority_seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.token_vault.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: faucet.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer,
            ),
            transfer_amount,
        )?;

        emit!(Claimed {
            faucet: faucet.key(),
            user: ctx.accounts.recipient.key(),
            amount: transfer_amount
        });

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let faucet = &ctx.accounts.faucet;

        let faucet_seed = faucet.name.as_bytes();
        let authority_seeds = &[
            b"faucet",
            faucet.authority.as_ref(),
            faucet_seed,
            &[faucet.bump],
        ];
        let signer = &[&authority_seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.token_vault.to_account_info(),
            to: ctx.accounts.admin_token_account.to_account_info(),
            authority: faucet.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer,
            ),
            amount,
        )?;

        Ok(())
    }

    // ----------------------------------------------------------------
    // 2. MANAGEMENT / UPDATE FUNCTIONS
    // ----------------------------------------------------------------

    // Add user to whitelist (Used for Type 0 and Type 2)
    // To batch add, the Frontend loops this instruction in a single transaction
    pub fn add_to_whitelist(ctx: Context<AddToWhitelist>, custom_amount: u64) -> Result<()> {
        let entry = &mut ctx.accounts.whitelist_entry;
        entry.is_whitelisted = true;
        entry.custom_amount = custom_amount;
        Ok(())
    }

    // Remove user from whitelist
    pub fn remove_from_whitelist(ctx: Context<AddToWhitelist>) -> Result<()> {
        let entry = &mut ctx.accounts.whitelist_entry;
        entry.is_whitelisted = false;
        entry.custom_amount = 0;
        Ok(())
    }

    pub fn update_faucet_config(
        ctx: Context<UpdateFaucet>,
        new_amount: u64,
        new_start_time: i64,
        new_end_time: i64,
        new_backend_signer: Option<Pubkey>,
    ) -> Result<()> {
        let faucet = &mut ctx.accounts.faucet;
        require!(new_end_time > new_start_time, FaucetError::InvalidTimeRange);

        faucet.claim_amount = new_amount;
        faucet.start_time = new_start_time;
        faucet.end_time = new_end_time;

        if let Some(backend) = new_backend_signer {
            faucet.backend_signer = backend;
        }
        Ok(())
    }

    pub fn set_paused(ctx: Context<UpdateFaucet>, paused: bool) -> Result<()> {
        let faucet = &mut ctx.accounts.faucet;
        faucet.paused = paused;
        Ok(())
    }

    pub fn update_name(ctx: Context<UpdateFaucet>, new_name: String) -> Result<()> {
        let faucet = &mut ctx.accounts.faucet;
        require!(new_name.len() < 32, FaucetError::NameTooLong);
        faucet.name = new_name;
        Ok(())
    }

    pub fn transfer_authority(ctx: Context<UpdateFaucet>, new_authority: Pubkey) -> Result<()> {
        let faucet = &mut ctx.accounts.faucet;
        faucet.authority = new_authority;
        Ok(())
    }
}

// ----------------------------------------------------------------
// 3. ACCOUNT STRUCTS (VALIDATION)
// ----------------------------------------------------------------

#[derive(Accounts)]
#[instruction(name: String, claim_amount: u64, start_time: i64, end_time: i64, faucet_type: u8, bumps: FaucetBumps)]
pub struct InitializeFaucet<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: The backend server key
    pub backend_signer: UncheckedAccount<'info>,
    /// CHECK: The centralized fee vault
    pub fee_vault: UncheckedAccount<'info>,

    pub token_mint: Account<'info, token::Mint>,

    #[account(
        init,
        payer = authority,
        // Space calc: Discriminator(8) + Pubkey(32)*5 + StringPrefix(4)+Content(32) + u64(8)*4 + u8(1)*2
        space = 8 + 32 + 32 + 32 + 32 + 32 + (4+32) + 8 + 8 + 8 + 1 + 1 + 1, 
        seeds = [b"faucet", authority.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub faucet: Account<'info, FaucetState>,

    #[account(
        init,
        payer = authority,
        token::mint = token_mint,
        token::authority = faucet,
        seeds = [b"vault", faucet.key().as_ref()],
        bump
    )]
    pub token_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct FundFaucet<'info> {
    #[account(mut)]
    pub funder: Signer<'info>,
    #[account(mut)]
    pub faucet: Account<'info, FaucetState>,
    #[account(mut)]
    pub funder_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub backend_wallet: Account<'info, TokenAccount>,
    #[account(mut)]
    pub platform_fee_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AddToWhitelist<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority)]
    pub faucet: Account<'info, FaucetState>,
    /// CHECK: The user being whitelisted
    pub user: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + 1 + 8,
        seeds = [b"whitelist", faucet.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub whitelist_entry: Account<'info, WhitelistEntry>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Verified in logic if type is Backend
    pub backend_signer: UncheckedAccount<'info>,
    #[account(mut)]
    pub recipient: SystemAccount<'info>,
    #[account(mut)]
    pub faucet: Account<'info, FaucetState>,
    #[account(mut)]
    pub token_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 8 + 8 + 1,
        seeds = [b"claim", faucet.key().as_ref(), recipient.key().as_ref()],
        bump
    )]
    pub claim_status: Account<'info, ClaimStatus>,

    #[account(
        seeds = [b"whitelist", faucet.key().as_ref(), recipient.key().as_ref()],
        bump,
    )]
    pub whitelist_entry: Option<Account<'info, WhitelistEntry>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority)]
    pub faucet: Account<'info, FaucetState>,
    #[account(mut)]
    pub token_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub admin_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateFaucet<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority)]
    pub faucet: Account<'info, FaucetState>,
}

// ----------------------------------------------------------------
// 4. STATE DATA STRUCTURES
// ----------------------------------------------------------------

#[account]
pub struct FaucetState {
    pub authority: Pubkey,      // 32
    pub token_mint: Pubkey,     // 32
    pub token_vault: Pubkey,    // 32
    pub backend_signer: Pubkey, // 32
    pub fee_vault: Pubkey,      // 32
    pub name: String,           // 4 + 32 (max)
    pub claim_amount: u64,      // 8
    pub start_time: i64,        // 8
    pub end_time: i64,          // 8
    pub faucet_type: u8,        // 1
    pub paused: bool,           // 1
    pub bump: u8,               // 1
}

#[account]
pub struct ClaimStatus {
    pub claimer: Pubkey,
    pub amount: u64,
    pub claim_time: i64,
    pub claimed: bool,
}

#[account]
pub struct WhitelistEntry {
    pub is_whitelisted: bool,
    pub custom_amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct FaucetBumps {
    pub faucet: u8,
}

// ----------------------------------------------------------------
// 5. EVENTS & ERRORS
// ----------------------------------------------------------------

#[event]
pub struct FaucetCreated {
    pub faucet: Pubkey,
    pub authority: Pubkey,
    pub name: String,
    pub mint: Pubkey,
}

#[event]
pub struct Claimed {
    pub faucet: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
}

#[event]
pub struct Funded {
    pub faucet: Pubkey,
    pub amount: u64,
    pub funder: Pubkey,
}

#[error_code]
pub enum FaucetError {
    #[msg("Faucet name too long")]
    NameTooLong,
    #[msg("End time must be after start time")]
    InvalidTimeRange,
    #[msg("Faucet is paused")]
    Paused,
    #[msg("Claim period has not started")]
    NotStarted,
    #[msg("Claim period has ended")]
    Ended,
    #[msg("User is not whitelisted")]
    NotWhitelisted,
    #[msg("Unauthorized backend signer")]
    UnauthorizedBackend,
    #[msg("Invalid claim amount")]
    InvalidAmount,
}
