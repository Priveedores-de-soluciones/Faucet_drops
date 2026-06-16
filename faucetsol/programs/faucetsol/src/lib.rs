use anchor_lang::prelude::*;

declare_id!("HdHsjRAiAwJaYMBhatcQqTAdBMzDSzyLfDwpzCxDcJN3");

#[program]
pub mod faucetsol {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
