// tests/test_factory.cairo
use core::result::ResultTrait;
use starknet::{ContractAddress, contract_address_const, testing};
use starknet::testing::{set_caller_address, set_contract_address};

use faucet_cairo::contracts::faucet_factory::{FaucetFactory, IFaucetFactoryDispatcher, IFaucetFactoryDispatcherTrait};
use faucet_cairo::contracts::faucet_drops::{FaucetDrops, IFaucetDropsDispatcher, IFaucetDropsDispatcherTrait};

fn setup() -> (IFaucetFactoryDispatcher, ContractAddress) {
    let owner = contract_address_const::<0x1>();
    set_caller_address(owner);
    
    // Deploy factory
    let factory = deploy_factory(owner);
    
    // Deploy faucet drops to get class hash
    let faucet_drops_class_hash = FaucetDrops::TEST_CLASS_HASH;
    
    // Set the class hash in factory
    factory.set_faucet_drops_class_hash(faucet_drops_class_hash);
    
    (factory, owner)
}

fn deploy_factory(owner: ContractAddress) -> IFaucetFactoryDispatcher {
    let mut calldata = array![owner.into()];
    
    let (contract_address, _) = starknet::testing::deploy_contract(
        FaucetFactory::TEST_CLASS_HASH,
        calldata.span()
    );
    
    IFaucetFactoryDispatcher { contract_address }
}

#[test]
fn test_factory_deployment() {
    let (factory, owner) = setup();
    
    assert(factory.get_owner() == owner, 'Wrong factory owner');
}

#[test]
fn test_create_faucet() {
    let (factory, owner) = setup();
    
    let name = 'TestFaucet';
    let token = contract_address_const::<0x123>();
    let backend = contract_address_const::<0x456>();
    let use_backend = true;
    
    let faucet_address = factory.create_faucet(name, token, backend, use_backend);
    
    assert(faucet_address.is_non_zero(), 'Faucet not created');
    
    // Verify faucet details
    let faucet_details = factory.get_faucet_details(faucet_address);
    assert(faucet_details.name == name, 'Wrong name');
    assert(faucet_details.token_address == token, 'Wrong token');
    assert(faucet_details.owner == owner, 'Wrong owner');
    assert(faucet_details.use_backend == use_backend, 'Wrong backend setting');
}

#[test]
fn test_get_all_faucets() {
    let (factory, _) = setup();
    
    // Create multiple faucets
    let faucet1 = factory.create_faucet(
        'Faucet1',
        contract_address_const::<0x123>(),
        contract_address_const::<0x456>(),
        true
    );
    
    let faucet2 = factory.create_faucet(
        'Faucet2', 
        contract_address_const::<0x789>(),
        contract_address_const::<0xabc>(),
        false
    );
    
    let all_faucets = factory.get_all_faucets();
    assert(all_faucets.len() == 2, 'Wrong faucet count');
    assert(*all_faucets.at(0) == faucet1, 'Wrong first faucet');
    assert(*all_faucets.at(1) == faucet2, 'Wrong second faucet');
}

#[test]
fn test_transaction_recording() {
    let (factory, _) = setup();
    
    // Create a faucet first
    let faucet_address = factory.create_faucet(
        'TestFaucet',
        contract_address_const::<0x123>(),
        contract_address_const::<0x456>(),
        true
    );
    
    // Get transactions for this faucet
    let transactions = factory.get_faucet_transactions(faucet_address);
    
    // Should have at least the creation transaction
    assert(transactions.len() >= 1, 'No transactions recorded');
    
    let first_tx = transactions.at(0);
    assert(first_tx.transaction_type == 'CreateFaucet', 'Wrong transaction type');
    assert(first_tx.faucet_address == faucet_address, 'Wrong faucet address');
}

#[test]
#[should_panic(expected: ('Only owner',))]
fn test_unauthorized_class_hash_set() {
    let (factory, _) = setup();
    
    // Try to set class hash from non-owner account
    let unauthorized = contract_address_const::<0x999>();
    set_caller_address(unauthorized);
    
    factory.set_faucet_drops_class_hash(FaucetDrops::TEST_CLASS_HASH);
}