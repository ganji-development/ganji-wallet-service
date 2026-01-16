#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;

declare_id!("BTQyLHZd6PPTu5jY2wWUxxYAmWKRVyadSMZwhLmX4gvn"); // Placeholder: update after 'anchor keys list'

#[program]
pub mod license_checker {
    use super::*;

    /// 1. Issue a new license.
    /// Must be signed by the authority (Ganji Service) to prevent unauthorized issuance.
    pub fn issue_license(
        ctx: Context<IssueLicense>,
        software_id: u64,
        duration_seconds: i64,
    ) -> Result<()> {
        let license = &mut ctx.accounts.license_account;
        let clock = Clock::get()?;

        license.owner = ctx.accounts.user.key();
        license.authority = ctx.accounts.authority.key();
        license.software_id = software_id;
        license.purchase_timestamp = clock.unix_timestamp;
        license.expiration_timestamp = clock.unix_timestamp + duration_seconds;
        license.is_active = true;
        license.bump = ctx.bumps.license_account;

        msg!("License issued for software ID: {}", software_id);
        msg!("Owner: {}", license.owner);
        msg!("Expires at: {}", license.expiration_timestamp);

        Ok(())
    }

    /// 2. Renew existing license.
    /// Only the authority can renew (after verifying payment in GNJ).
    pub fn renew_license(ctx: Context<RenewLicense>, duration_seconds: i64) -> Result<()> {
        let license = &mut ctx.accounts.license_account;
        let clock = Clock::get()?;

        let start_time = if license.expiration_timestamp > clock.unix_timestamp {
            license.expiration_timestamp
        } else {
            clock.unix_timestamp
        };

        license.expiration_timestamp = start_time + duration_seconds;
        license.is_active = true;
        license.purchase_timestamp = clock.unix_timestamp;

        msg!("License renewed for owner: {}", license.owner);
        msg!("New expiry: {}", license.expiration_timestamp);

        Ok(())
    }

    /// 3. Revoke/Deactivate license manual (e.g., chargeback or terms violation)
    pub fn set_active_status(ctx: Context<UpdateStatus>, status: bool) -> Result<()> {
        let license = &mut ctx.accounts.license_account;
        license.is_active = status;
        msg!("License status updated to: {}", status);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(software_id: u64)]
pub struct IssueLicense<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + LicenseAccount::INIT_SPACE,
        seeds = [b"license", user.key().as_ref(), software_id.to_le_bytes().as_ref()],
        bump
    )]
    pub license_account: Account<'info, LicenseAccount>,

    /// The user wallet getting the license
    /// CHECK: This is just a public key we are issuing to. They don't need to sign if Authority pays.
    pub user: SystemAccount<'info>,

    /// The authorized wallet (Your Service) that must sign to approve the license
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RenewLicense<'info> {
    #[account(
        mut,
        seeds = [b"license", license_account.owner.as_ref(), license_account.software_id.to_le_bytes().as_ref()],
        bump = license_account.bump,
        constraint = license_account.authority == authority.key() @ ErrorCode::UnauthorizedAuthority
    )]
    pub license_account: Account<'info, LicenseAccount>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateStatus<'info> {
    #[account(
        mut,
        seeds = [b"license", license_account.owner.as_ref(), license_account.software_id.to_le_bytes().as_ref()],
        bump = license_account.bump,
        constraint = license_account.authority == authority.key() @ ErrorCode::UnauthorizedAuthority
    )]
    pub license_account: Account<'info, LicenseAccount>,

    pub authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct LicenseAccount {
    pub owner: Pubkey,             // 32
    pub authority: Pubkey,         // 32
    pub software_id: u64,          // 8
    pub purchase_timestamp: i64,   // 8
    pub expiration_timestamp: i64, // 8
    pub is_active: bool,           // 1
    pub bump: u8,                  // 1
}

#[error_code]
pub enum ErrorCode {
    #[msg("Only the authorized service wallet can perform this action.")]
    UnauthorizedAuthority,
    #[msg("The license is not marked as active.")]
    LicenseNotActive,
    #[msg("The license has expired.")]
    LicenseExpired,
}
