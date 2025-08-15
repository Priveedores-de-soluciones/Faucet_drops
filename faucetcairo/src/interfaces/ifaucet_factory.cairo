// src/interfaces/ifaucet_factory.cairo
use starknet::{ContractAddress, class_hash::ClassHash};
use crate::libraries::transaction_library::Transaction;
use crate::libraries::faucet_factory_library::FaucetDetails;

#[starknet::interface]
pub trait IFaucetFactory<TContractState> {
    fn create_faucet(
        ref self: TContractState,
        name: felt252,
        token: ContractAddress,
        backend: ContractAddress,
        use_backend: bool,
    ) -> ContractAddress;
    
    fn record_transaction(
        ref self: TContractState,
        faucet_address: ContractAddress,
        transaction_type: felt252,
        initiator: ContractAddress,
        amount: u256,
        is_ether: bool,
    );
    
    fn get_faucet_transactions(
        self: @TContractState,
        faucet_address: ContractAddress
    ) -> Array<Transaction>;
    
    fn get_all_transactions(self: @TContractState) -> Array<Transaction>;
    
    fn get_faucet_details(
        self: @TContractState,
        faucet_address: ContractAddress
    ) -> FaucetDetails;
    
    fn get_all_faucets(self: @TContractState) -> Array<ContractAddress>;
    
    fn set_faucet_drops_class_hash(ref self: TContractState, class_hash: ClassHash);
    
    fn get_owner(self: @TContractState) -> ContractAddress;
}