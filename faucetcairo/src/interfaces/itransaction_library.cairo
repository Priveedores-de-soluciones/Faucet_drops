// src/interfaces/itransaction_library.cairo
use starknet::ContractAddress;
use crate::libraries::transaction_library::Transaction;

#[starknet::interface]
pub trait ITransactionLibrary<TContractState> {
    fn record_transaction(
        ref self: TContractState,
        faucet_address: ContractAddress,
        transaction_type: felt252,
        initiator: ContractAddress,
        amount: u256,
        is_ether: bool,
    );
    
    fn get_all_transactions(self: @TContractState) -> Array<Transaction>;
}