// src/utils/constants.cairo
use starknet::ContractAddress;

pub const BACKEND_FEE_PERCENT: u256 = 1;
pub const VAULT_FEE_PERCENT: u256 = 2;
pub const ZERO_ADDRESS: felt252 = 0;

// Default claim amounts
pub const DEFAULT_ETH_CLAIM_AMOUNT: u256 = 10000000000000000; // 0.01 ETH in wei
pub const DEFAULT_TOKEN_CLAIM_AMOUNT: u256 = 100000000000000000000; // 100 tokens with 18 decimals

// Default vault address (replace with actual address)
pub fn get_default_vault_address() -> ContractAddress {
    starknet::contract_address_const::<0x97841b00B8Ad031FB30495eCeF2B2DbB6FCaCE30>()
}