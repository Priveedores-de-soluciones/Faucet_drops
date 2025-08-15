// src/contracts/faucet_factory.cairo
#[starknet::contract]
mod FaucetFactory {
    use crate::libraries::faucet_factory_library::faucet_factory_library_component::{
        FaucetFactoryLibraryImpl, InternalTrait as FaucetFactoryInternalTrait
    };
    use crate::libraries::faucet_factory_library::IFaucetFactoryLibrary;
    use crate::libraries::transaction_library::Transaction;
    use crate::libraries::faucet_factory_library::FaucetDetails;
    use crate::interfaces::ifaucet_factory::IFaucetFactory;
    use starknet::{ContractAddress, get_caller_address};
    use starknet::class_hash::ClassHash;
    use openzeppelin::access::ownable::OwnableComponent;

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(
        path: crate::libraries::faucet_factory_library::faucet_factory_library_component,
        storage: factory_lib,
        event: FactoryLibEvent
    );

    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[abi(embed_v0)]
    impl FaucetFactoryLibraryImpl = 
        crate::libraries::faucet_factory_library::faucet_factory_library_component::FaucetFactoryLibraryImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        factory_lib: crate::libraries::faucet_factory_library::faucet_factory_library_component::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        FactoryLibEvent: crate::libraries::faucet_factory_library::faucet_factory_library_component::Event,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.ownable.initializer(owner);
    }

    #[abi(embed_v0)]
    impl FaucetFactoryImpl of IFaucetFactory<ContractState> {
        fn create_faucet(
            ref self: ContractState,
            name: felt252,
            token: ContractAddress,
            backend: ContractAddress,
            use_backend: bool,
        ) -> ContractAddress {
            let caller = get_caller_address();
            let factory_address = starknet::get_contract_address();
            
            self.factory_lib.create_faucet(
                name,
                token,
                backend,
                use_backend,
                caller,
                factory_address
            )
        }

        fn record_transaction(
            ref self: ContractState,
            faucet_address: ContractAddress,
            transaction_type: felt252,
            initiator: ContractAddress,
            amount: u256,
            is_ether: bool,
        ) {
            let sender = get_caller_address();
            self.factory_lib.record_transaction(
                faucet_address,
                transaction_type,
                initiator,
                amount,
                is_ether,
                sender
            );
        }

        fn get_faucet_transactions(
            self: @ContractState,
            faucet_address: ContractAddress
        ) -> Array<Transaction> {
            self.factory_lib.get_faucet_transactions(faucet_address)
        }

        fn get_all_transactions(self: @ContractState) -> Array<Transaction> {
            self.factory_lib.get_all_transactions()
        }

        fn get_faucet_details(
            self: @ContractState,
            faucet_address: ContractAddress
        ) -> FaucetDetails {
            self.factory_lib.get_faucet_details(faucet_address)
        }

        fn get_all_faucets(self: @ContractState) -> Array<ContractAddress> {
            self.factory_lib.get_all_faucets()
        }

        fn set_faucet_drops_class_hash(ref self: ContractState, class_hash: ClassHash) {
            self.ownable.assert_only_owner();
            self.factory_lib.set_faucet_drops_class_hash(class_hash);
        }

        fn get_owner(self: @ContractState) -> ContractAddress {
            self.ownable.owner()
        }
    }
}