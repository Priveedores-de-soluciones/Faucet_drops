// tests/test_faucet_drops.cairo
use core::result::ResultTrait;
use starknet::{ContractAddress, contract_address_const, testing};
use starknet::testing::{set_caller_address, set_contract_address, set_block_timestamp};

use faucet_cairo::contracts::faucet_drops::{FaucetDrops, IFaucetDropsDispatcher, IFaucetDropsDispatcherTrait};
use faucet_cairo::interfaces::ifaucet_drops::ClaimDetail;
use faucet_cairo::utils::constants::{DEFAULT_TOKEN_CLAIM_AMOUNT};

// Mock ERC20 for testing
#[starknet::interface]
trait IERC20<TContractState> {
    fn name(self: @TContractState) -> felt252;
    fn symbol(self: @TContractState) -> felt252;
    fn decimals(self: @TContractState) -> u8;
    fn total_supply(self: @TContractState) -> u256;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
}

#[starknet::contract]
mod MockERC20 {
    use super::IERC20;
    use starknet::ContractAddress;
    use starknet::get_caller_address;

    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        decimals: u8,
        total_supply: u256,
        balances: LegacyMap<ContractAddress, u256>,
        allowances: LegacyMap<(ContractAddress, ContractAddress), u256>,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        name: felt252,
        symbol: felt252,
        decimals: u8,
        initial_supply: u256,
        recipient: ContractAddress
    ) {
        self.name.write(name);
        self.symbol.write(symbol);
        self.decimals.write(decimals);
        self.total_supply.write(initial_supply);
        self.balances.write(recipient, initial_supply);
    }

    #[abi(embed_v0)]
    impl ERC20Impl of IERC20<ContractState> {
        fn name(self: @ContractState) -> felt252 {
            self.name.read()
        }

        fn symbol(self: @ContractState) -> felt252 {
            self.symbol.read()
        }

        fn decimals(self: @ContractState) -> u8 {
            self.decimals.read()
        }

        fn total_supply(self: @ContractState) -> u256 {
            self.total_supply.read()
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        fn allowance(self: @ContractState, owner: ContractAddress, spender: ContractAddress) -> u256 {
            self.allowances.read((owner, spender))
        }

        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let sender = get_caller_address();
            self._transfer(sender, recipient, amount);
            true
        }

        fn transfer_from(ref self: ContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool {
            let caller = get_caller_address();
            let current_allowance = self.allowances.read((sender, caller));
            
            if current_allowance != 0xffffffffffffffffffffffffffffffff {
                assert(current_allowance >= amount, 'Insufficient allowance');
                self.allowances.write((sender, caller), current_allowance - amount);
            }
            
            self._transfer(sender, recipient, amount);
            true
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let caller = get_caller_address();
            self.allowances.write((caller, spender), amount);
            true
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _transfer(ref self: ContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) {
            let sender_balance = self.balances.read(sender);
            assert(sender_balance >= amount, 'Insufficient balance');
            
            self.balances.write(sender, sender_balance - amount);
            let recipient_balance = self.balances.read(recipient);
            self.balances.write(recipient, recipient_balance + amount);
        }
    }
}

fn setup() -> (IFaucetDropsDispatcher, ContractAddress, ContractAddress, ContractAddress) {
    let owner = contract_address_const::<0x1>();
    let backend = contract_address_const::<0x2>();
    let factory = contract_address_const::<0x3>();
    
    // Deploy mock token
    let token = deploy_mock_token(owner);
    
    // Deploy faucet
    let faucet = deploy_faucet(owner, token, backend, factory);
    
    (faucet, owner, backend, token)
}

fn deploy_mock_token(owner: ContractAddress) -> ContractAddress {
    let mut calldata = array![
        'TestToken',          // name
        'TT',                 // symbol
        18,                   // decimals
        1000000000000000000000000_u256.low.into(), // initial_supply low
        1000000000000000000000000_u256.high.into(), // initial_supply high
        owner.into()          // recipient
    ];
    
    let (contract_address, _) = starknet::testing::deploy_contract(
        MockERC20::TEST_CLASS_HASH,
        calldata.span()
    );
    
    contract_address
}

fn deploy_faucet(
    owner: ContractAddress,
    token: ContractAddress,
    backend: ContractAddress,
    factory: ContractAddress
) -> IFaucetDropsDispatcher {
    let mut calldata = array![
        'TestFaucet',        // name
        token.into(),        // token
        backend.into(),      // backend
        true.into(),         // use_backend
        owner.into(),        // owner
        factory.into()       // factory
    ];
    
    let (contract_address, _) = starknet::testing::deploy_contract(
        FaucetDrops::TEST_CLASS_HASH,
        calldata.span()
    );
    
    IFaucetDropsDispatcher { contract_address }
}

#[test]
fn test_faucet_deployment() {
    let (faucet, owner, backend, token) = setup();
    
    assert(faucet.get_name() == 'TestFaucet', 'Wrong name');
    assert(faucet.get_token() == token, 'Wrong token');
    assert(faucet.get_owner() == owner, 'Wrong owner');
    assert(faucet.get_use_backend(), 'Backend should be enabled');
    assert(faucet.get_claim_amount() == DEFAULT_TOKEN_CLAIM_AMOUNT, 'Wrong default claim amount');
}

#[test]
fn test_admin_management() {
    let (faucet, owner, _, _) = setup();
    
    // Test adding admin
    let new_admin = contract_address_const::<0x4>();
    set_caller_address(owner);
    faucet.add_admin(new_admin);
    
    assert(faucet.get_admin_status(new_admin), 'Admin not added');
    
    // Test removing admin
    faucet.remove_admin(new_admin);
    assert(!faucet.get_admin_status(new_admin), 'Admin not removed');
}

#[test]
fn test_claim_parameters() {
    let (faucet, owner, _, _) = setup();
    
    set_caller_address(owner);
    
    let claim_amount = 500000000000000000000; // 500 tokens
    let start_time = 1703980800_u64;
    let end_time = 1735516800_u64;
    
    faucet.set_claim_parameters(claim_amount, start_time, end_time);
    
    assert(faucet.get_claim_amount() == claim_amount, 'Wrong claim amount');
    assert(faucet.get_start_time() == start_time, 'Wrong start time');
    assert(faucet.get_end_time() == end_time, 'Wrong end time');
}

#[test]
fn test_whitelist_management() {
    let (faucet, owner, _, _) = setup();
    
    set_caller_address(owner);
    
    let user = contract_address_const::<0x5>();
    
    // Test adding to whitelist
    faucet.set_whitelist(user, true);
    let (_, whitelisted, _) = faucet.get_claim_status(user);
    assert(whitelisted, 'User not whitelisted');
    
    // Test removing from whitelist
    faucet.set_whitelist(user, false);
    let (_, whitelisted, _) = faucet.get_claim_status(user);
    assert(!whitelisted, 'User still whitelisted');
}

#[test]
fn test_custom_claim_amounts() {
    let (faucet, owner, _, _) = setup();
    
    set_caller_address(owner);
    
    let user = contract_address_const::<0x6>();
    let custom_amount = 1000000000000000000000; // 1000 tokens
    
    // Set custom amount
    faucet.set_custom_claim_amount(user, custom_amount);
    
    assert(faucet.user_has_custom_amount(user), 'Custom amount not set');
    assert(faucet.get_custom_claim_amount(user) == custom_amount, 'Wrong custom amount');
    assert(faucet.get_user_claim_amount(user) == custom_amount, 'Wrong user claim amount');
    
    // Remove custom amount
    faucet.set_custom_claim_amount(user, 0);
    assert(!faucet.user_has_custom_amount(user), 'Custom amount not removed');
}

#[test]
fn test_funding() {
    let (faucet, owner, _, token) = setup();
    
    set_caller_address(owner);
    
    // First approve the faucet to spend tokens
    let token_dispatcher = IERC20Dispatcher { contract_address: token };
    let fund_amount = 10000000000000000000000; // 10,000 tokens
    
    token_dispatcher.approve(faucet.contract_address, fund_amount);
    
    // Fund the faucet
    faucet.fund(fund_amount);
    
    // Check balance (should be less due to fees)
    let (balance, is_ether) = faucet.get_faucet_balance();
    assert(!is_ether, 'Should not be ether');
    assert(balance > 0, 'Faucet not funded');
    assert(balance < fund_amount, 'Fees not deducted'); // Should be less due to fees
}

#[test]
fn test_claim_process() {
    let (faucet, owner, backend, token) = setup();
    
    // Setup claim parameters
    set_caller_address(owner);
    let current_time = 1703980800_u64;
    let claim_amount = 100000000000000000000; // 100 tokens
    
    faucet.set_claim_parameters(claim_amount, current_time, current_time + 86400); // 1 day period
    
    // Fund the faucet first
    let token_dispatcher = IERC20Dispatcher { contract_address: token };
    let fund_amount = 10000000000000000000000; // 10,000 tokens
    token_dispatcher.approve(faucet.contract_address, fund_amount);
    faucet.fund(fund_amount);
    
    // Set up users
    let user1 = contract_address_const::<0x7>();
    let user2 = contract_address_const::<0x8>();
    
    // For testing, we need to use backend mode or whitelist users
    // Since use_backend is true, users don't need to be whitelisted
    
    // Set current time to be within claim period
    set_block_timestamp(current_time + 100);
    
    // Process claims (only backend can do this)
    set_caller_address(backend);
    let mut users = ArrayTrait::new();
    users.append(user1);
    users.append(user2);
    
    faucet.claim(users);
    
    // Check claim status
    let (claimed1, _, _) = faucet.get_claim_status(user1);
    let (claimed2, _, _) = faucet.get_claim_status(user2);
    
    assert(claimed1, 'User1 not marked as claimed');
    assert(claimed2, 'User2 not marked as claimed');
    
    // Check token balances
    assert(token_dispatcher.balance_of(user1) == claim_amount, 'User1 wrong balance');
    assert(token_dispatcher.balance_of(user2) == claim_amount, 'User2 wrong balance');
}

#[test]
fn test_withdrawal() {
    let (faucet, owner, _, token) = setup();
    
    set_caller_address(owner);
    
    // Fund the faucet first
    let token_dispatcher = IERC20Dispatcher { contract_address: token };
    let fund_amount = 10000000000000000000000; // 10,000 tokens
    token_dispatcher.approve(faucet.contract_address, fund_amount);
    faucet.fund(fund_amount);
    
    // Get initial owner balance
    let initial_balance = token_dispatcher.balance_of(owner);
    
    // Withdraw some funds
    let withdraw_amount = 1000000000000000000000; // 1,000 tokens
    faucet.withdraw(withdraw_amount);
    
    // Check owner balance increased
    let final_balance = token_dispatcher.balance_of(owner);
    assert(final_balance == initial_balance + withdraw_amount, 'Withdrawal failed');
}

#[test]
fn test_pause_functionality() {
    let (faucet, owner, _, _) = setup();
    
    set_caller_address(owner);
    
    // Pause the faucet
    faucet.set_paused(true);
    
    // Try to fund (should fail)
    // Note: This would require the actual pause check in fund function
}

#[test]
#[should_panic(expected: ('Only backend',))]
fn test_unauthorized_claim() {
    let (faucet, owner, _, _) = setup();
    
    set_caller_address(owner); // Not the backend
    
    let mut users = ArrayTrait::new();
    users.append(contract_address_const::<0x9>());
    
    faucet.claim(users); // Should fail
}

#[test]
#[should_panic(expected: ('Only owner',))]
fn test_unauthorized_admin_add() {
    let (faucet, _, _, _) = setup();
    
    let unauthorized = contract_address_const::<0xa>();
    set_caller_address(unauthorized);
    
    faucet.add_admin(contract_address_const::<0xb>()); // Should fail
}

#[test]
fn test_batch_operations() {
    let (faucet, owner, _, _) = setup();
    
    set_caller_address(owner);
    
    // Test batch whitelist
    let mut users = ArrayTrait::new();
    users.append(contract_address_const::<0xc>());
    users.append(contract_address_const::<0xd>());
    users.append(contract_address_const::<0xe>());
    
    faucet.set_whitelist_batch(users, true);
    
    // Verify all users are whitelisted
    let (_, whitelisted1, _) = faucet.get_claim_status(contract_address_const::<0xc>());
    let (_, whitelisted2, _) = faucet.get_claim_status(contract_address_const::<0xd>());
    let (_, whitelisted3, _) = faucet.get_claim_status(contract_address_const::<0xe>());
    
    assert(whitelisted1, 'User 1 not whitelisted');
    assert(whitelisted2, 'User 2 not whitelisted');
    assert(whitelisted3, 'User 3 not whitelisted');
}