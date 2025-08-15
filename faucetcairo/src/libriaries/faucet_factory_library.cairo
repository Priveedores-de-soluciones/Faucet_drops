// src/libraries/faucet_factory_library.cairo
use starknet::ContractAddress;
use super::transaction_library::Transaction;
use crate::interfaces::ifaucet_drops::{IFaucetDropsDispatcher, IFaucetDropsDispatcherTrait};

#[derive(Drop, Serde, starknet::Store)]
pub struct FaucetDetails {
    pub faucet_address: ContractAddress,
    pub owner: ContractAddress,
    pub name: felt252,
    pub claim_amount: u256,
    pub token_address: ContractAddress,
    pub start_time: u64,
    pub end_time: u64,
    pub is_claim_active: bool,
    pub balance: u256,
    pub is_ether: bool,
    pub use_backend: bool,
}

#[starknet::interface]
pub trait IFaucetFactoryLibrary<TContractState> {
    fn create_faucet(
        ref self: TContractState,
        name: felt252,
        token: ContractAddress,
        backend: ContractAddress,
        use_backend: bool,
        owner: ContractAddress,
        factory: ContractAddress,
    ) -> ContractAddress;
    
    fn record_transaction(
        ref self: TContractState,
        faucet_address: ContractAddress,
        transaction_type: felt252,
        initiator: ContractAddress,
        amount: u256,
        is_ether: bool,
        sender: ContractAddress,
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
}

#[starknet::component]
pub mod faucet_factory_library_component {
    use super::{FaucetDetails, IFaucetDropsDispatcher, IFaucetDropsDispatcherTrait, Transaction};
    use starknet::{ContractAddress, deploy_syscall, get_caller_address, get_block_timestamp};
    use starknet::class_hash::ClassHash;

    #[storage]
    struct Storage {
        faucets: LegacyMap<u32, ContractAddress>,
        faucet_count: u32,
        user_faucets: LegacyMap<(ContractAddress, u32), ContractAddress>,
        user_faucet_counts: LegacyMap<ContractAddress, u32>,
        all_transactions: LegacyMap<u32, Transaction>,
        transaction_count: u32,
        deleted_faucets: LegacyMap<ContractAddress, bool>,
        faucet_drops_class_hash: ClassHash,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        FaucetCreated: FaucetCreated,
        TransactionRecorded: TransactionRecorded,
    }

    #[derive(Drop, starknet::Event)]
    pub struct FaucetCreated {
        pub faucet: ContractAddress,
        pub owner: ContractAddress,
        pub name: felt252,
        pub token: ContractAddress,
        pub backend: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct TransactionRecorded {
        pub faucet: ContractAddress,
        pub transaction_type: felt252,
        pub initiator: ContractAddress,
        pub amount: u256,
        pub is_ether: bool,
        pub timestamp: u64,
    }

    #[embeddable_as(FaucetFactoryLibraryImpl)]
    impl FaucetFactoryLibrary<
        TContractState, +HasComponent<TContractState>
    > of super::IFaucetFactoryLibrary<ComponentState<TContractState>> {
        fn create_faucet(
            ref self: ComponentState<TContractState>,
            name: felt252,
            token: ContractAddress,
            backend: ContractAddress,
            use_backend: bool,
            owner: ContractAddress,
            factory: ContractAddress,
        ) -> ContractAddress {
            let class_hash = self.faucet_drops_class_hash.read();
            
            let mut constructor_calldata = ArrayTrait::new();
            constructor_calldata.append(name);
            constructor_calldata.append(token.into());
            constructor_calldata.append(backend.into());
            constructor_calldata.append(use_backend.into());
            constructor_calldata.append(owner.into());
            constructor_calldata.append(factory.into());

            let (faucet_address, _) = deploy_syscall(
                class_hash,
                0, // salt
                constructor_calldata.span(),
                false
            ).unwrap();

            // Add to global registry
            let count = self.faucet_count.read();
            self.faucets.write(count, faucet_address);
            self.faucet_count.write(count + 1);

            // Add to user's personal list
            let user_count = self.user_faucet_counts.read(owner);
            self.user_faucets.write((owner, user_count), faucet_address);
            self.user_faucet_counts.write(owner, user_count + 1);

            // Record transaction
            self._record_transaction_internal(
                faucet_address,
                'CreateFaucet',
                owner,
                0,
                false
            );

            self.emit(FaucetCreated {
                faucet: faucet_address,
                owner,
                name,
                token,
                backend,
            });

            faucet_address
        }

        fn record_transaction(
            ref self: ComponentState<TContractState>,
            faucet_address: ContractAddress,
            transaction_type: felt252,
            initiator: ContractAddress,
            amount: u256,
            is_ether: bool,
            sender: ContractAddress,
        ) {
            assert(!self.deleted_faucets.read(faucet_address), 'Faucet deleted');
            
            // Verify sender is a valid faucet
            let mut is_valid_faucet = false;
            let count = self.faucet_count.read();
            let mut i = 0;
            while i < count {
                if self.faucets.read(i) == sender {
                    is_valid_faucet = true;
                    break;
                }
                i += 1;
            };
            assert(is_valid_faucet, 'Invalid faucet');

            self._record_transaction_internal(
                faucet_address,
                transaction_type,
                initiator,
                amount,
                is_ether
            );
        }

        fn get_faucet_transactions(
            self: @ComponentState<TContractState>,
            faucet_address: ContractAddress
        ) -> Array<Transaction> {
            assert(!self.deleted_faucets.read(faucet_address), 'Faucet deleted');
            
            let mut result = ArrayTrait::new();
            let count = self.transaction_count.read();
            let mut i = 0;
            
            while i < count {
                let transaction = self.all_transactions.read(i);
                if transaction.faucet_address == faucet_address {
                    result.append(transaction);
                }
                i += 1;
            };
            
            result
        }

        fn get_all_transactions(self: @ComponentState<TContractState>) -> Array<Transaction> {
            let mut result = ArrayTrait::new();
            let count = self.transaction_count.read();
            let mut i = 0;
            
            while i < count {
                result.append(self.all_transactions.read(i));
                i += 1;
            };
            
            result
        }

        fn get_faucet_details(
            self: @ComponentState<TContractState>,
            faucet_address: ContractAddress
        ) -> FaucetDetails {
            assert(self._is_faucet_registered(faucet_address), 'Faucet not registered');
            assert(!self.deleted_faucets.read(faucet_address), 'Faucet deleted');
            
            let faucet = IFaucetDropsDispatcher { contract_address: faucet_address };
            let (balance, is_ether) = faucet.get_faucet_balance();
            
            FaucetDetails {
                faucet_address,
                owner: faucet.get_owner(),
                name: faucet.get_name(),
                claim_amount: faucet.get_claim_amount(),
                token_address: faucet.get_token(),
                start_time: faucet.get_start_time(),
                end_time: faucet.get_end_time(),
                is_claim_active: faucet.is_claim_active(),
                balance,
                is_ether,
                use_backend: faucet.get_use_backend(),
            }
        }

        fn get_all_faucets(self: @ComponentState<TContractState>) -> Array<ContractAddress> {
            let mut result = ArrayTrait::new();
            let count = self.faucet_count.read();
            let mut i = 0;
            
            while i < count {
                let faucet = self.faucets.read(i);
                if !self.deleted_faucets.read(faucet) {
                    result.append(faucet);
                }
                i += 1;
            };
            
            result
        }
    }

    #[generate_trait]
    impl InternalImpl<
        TContractState, +HasComponent<TContractState>
    > of InternalTrait<TContractState> {
        fn _record_transaction_internal(
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
            
            self.all_transactions.write(count, transaction);
            self.transaction_count.write(count + 1);
            
            self.emit(TransactionRecorded {
                faucet: faucet_address,
                transaction_type,
                initiator,
                amount,
                is_ether,
                timestamp,
            });
        }

        fn _is_faucet_registered(
            self: @ComponentState<TContractState>,
            faucet_address: ContractAddress
        ) -> bool {
            let count = self.faucet_count.read();
            let mut i = 0;
            while i < count {
                if self.faucets.read(i) == faucet_address {
                    return true;
                }
                i += 1;
            };
            false
        }

        fn set_faucet_drops_class_hash(
            ref self: ComponentState<TContractState>,
            class_hash: ClassHash
        ) {
            self.faucet_drops_class_hash.write(class_hash);
        }
    }
}