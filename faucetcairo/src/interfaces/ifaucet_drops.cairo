// src/interfaces/ifaucet_drops.cairo
use starknet::ContractAddress;

#[derive(Drop, Serde, starknet::Store)]
pub struct ClaimDetail {
    pub recipient: ContractAddress,
    pub amount: u256,
    pub timestamp: u64,
}

#[starknet::interface]
pub trait IFaucetDrops<TContractState> {
    // View functions
    fn get_name(self: @TContractState) -> felt252;
    fn get_claim_amount(self: @TContractState) -> u256;
    fn get_token(self: @TContractState) -> ContractAddress;
    fn get_start_time(self: @TContractState) -> u64;
    fn get_end_time(self: @TContractState) -> u64;
    fn is_claim_active(self: @TContractState) -> bool;
    fn get_faucet_balance(self: @TContractState) -> (u256, bool);
    fn get_use_backend(self: @TContractState) -> bool;
    fn get_owner(self: @TContractState) -> ContractAddress;
    fn get_user_claim_amount(self: @TContractState, user: ContractAddress) -> u256;
    fn user_has_custom_amount(self: @TContractState, user: ContractAddress) -> bool;
    fn get_custom_claim_amount(self: @TContractState, user: ContractAddress) -> u256;
    fn get_all_admins(self: @TContractState) -> Array<ContractAddress>;
    fn get_all_claims(self: @TContractState) -> Array<ClaimDetail>;
    fn get_admin_status(self: @TContractState, address: ContractAddress) -> bool;
    fn get_claim_status(self: @TContractState, user: ContractAddress) -> (bool, bool, bool);
    fn get_detailed_claim_status(
        self: @TContractState,
        user: ContractAddress
    ) -> (bool, bool, bool, u256, bool);

    // External functions
    fn fund(ref self: TContractState, token_amount: u256);
    fn claim(ref self: TContractState, users: Array<ContractAddress>);
    fn withdraw(ref self: TContractState, amount: u256);
    fn set_claim_parameters(
        ref self: TContractState,
        claim_amount: u256,
        start_time: u64,
        end_time: u64
    );
    fn set_whitelist(ref self: TContractState, user: ContractAddress, status: bool);
    fn set_whitelist_batch(ref self: TContractState, users: Array<ContractAddress>, status: bool);
    fn add_admin(ref self: TContractState, admin: ContractAddress);
    fn remove_admin(ref self: TContractState, admin: ContractAddress);
    fn set_custom_claim_amount(ref self: TContractState, user: ContractAddress, amount: u256);
    fn set_custom_claim_amounts_batch(
        ref self: TContractState,
        users: Array<ContractAddress>,
        amounts: Array<u256>
    );
    fn reset_claimed_single(ref self: TContractState, user: ContractAddress);
    fn reset_claimed_batch(ref self: TContractState, users: Array<ContractAddress>);
    fn reset_all_claimed(ref self: TContractState);
    fn delete_faucet(ref self: TContractState);
    fn update_name(ref self: TContractState, new_name: felt252);
    fn set_paused(ref self: TContractState, paused: bool);
}