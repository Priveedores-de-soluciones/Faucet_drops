// src/libraries/transaction_library.cairo
use starknet::ContractAddress;

#[derive(Drop, Serde, starknet::Store)]
pub struct Transaction {
    pub faucet_address: ContractAddress,
    pub transaction_type: felt252,
    pub initiator: ContractAddress,
    pub amount: u256,
    pub is_ether: bool,
    pub timestamp: u64,
}

#[starknet::component]
pub mod transaction_library_component {
    use super::Transaction;
    use starknet::{ContractAddress, get_block_timestamp};
    use crate::interfaces::itransaction_library::ITransactionLibrary;

    #[storage]
    struct Storage {
        transactions: LegacyMap<u32, Transaction>,
        transaction_count: u32,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        TransactionRecorded: TransactionRecorded,
    }

    #[derive(Drop, starknet::Event)]
    pub struct TransactionRecorded {
        pub faucet_address: ContractAddress,
        pub transaction_type: felt252,
        pub initiator: ContractAddress,
        pub amount: u256,
        pub is_ether: bool,
        pub timestamp: u64,
    }

    #[embeddable_as(TransactionLibraryImpl)]
    impl TransactionLibrary<
        TContractState, +HasComponent<TContractState>
    > of ITransactionLibrary<ComponentState<TContractState>> {
        fn record_transaction(
            ref self: ComponentState<TContractState>,
            faucet_address: ContractAddress,
            transaction_type: felt252,
            initiator: ContractAddress,
            amount: u256,
            is_ether: bool,
        ) {
            let timestamp = get_block_timestamp();
            let count = self.transaction_count.read();
            
            let transaction = Transaction {
                faucet_address,
                transaction_type,
                initiator,
                amount,
                is_ether,
                timestamp,
            };
            
            self.transactions.write(count, transaction);
            self.transaction_count.write(count + 1);
            
            self.emit(TransactionRecorded {
                faucet_address,
                transaction_type,
                initiator,
                amount,
                is_ether,
                timestamp,
            });
        }

        fn get_all_transactions(self: @ComponentState<TContractState>) -> Array<Transaction> {
            let mut transactions = ArrayTrait::new();
            let count = self.transaction_count.read();
            let mut i = 0;
            
            while i < count {
                transactions.append(self.transactions.read(i));
                i += 1;
            };
            
            transactions
        }
    }
}