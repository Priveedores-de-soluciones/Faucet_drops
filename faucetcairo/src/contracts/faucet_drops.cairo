// src/contracts/faucet_drops.cairo
#[starknet::contract]
mod FaucetDrops {
    use starknet::{
        ContractAddress, get_caller_address, get_contract_address, get_block_timestamp
    };
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::security::reentrancyguard::ReentrancyGuardComponent;
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use crate::interfaces::ifaucet_drops::{IFaucetDrops, ClaimDetail};
    use crate::interfaces::ifaucet_factory::{IFaucetFactoryDispatcher, IFaucetFactoryDispatcherTrait};
    use crate::utils::constants::{
        BACKEND_FEE_PERCENT, VAULT_FEE_PERCENT, ZERO_ADDRESS,
        DEFAULT_ETH_CLAIM_AMOUNT, DEFAULT_TOKEN_CLAIM_AMOUNT, get_default_vault_address
    };

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: ReentrancyGuardComponent, storage: reentrancy_guard, event: ReentrancyGuardEvent);

    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[abi(embed_v0)]
    impl ReentrancyGuardImpl = ReentrancyGuardComponent::ReentrancyGuardImpl<ContractState>;
    impl ReentrancyGuardInternalImpl = ReentrancyGuardComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        reentrancy_guard: ReentrancyGuardComponent::Storage,
        name: felt252,
        claim_amount: u256,
        token: ContractAddress,
        start_time: u64,
        end_time: u64,
        use_backend: bool,
        has_claimed: LegacyMap<ContractAddress, bool>,
        is_whitelisted: LegacyMap<ContractAddress, bool>,
        is_admin: LegacyMap<ContractAddress, bool>,
        admins: LegacyMap<u32, ContractAddress>,
        admin_count: u32,
        custom_claim_amounts: LegacyMap<ContractAddress, u256>,
        has_custom_amount: LegacyMap<ContractAddress, bool>,
        backend: ContractAddress,
        vault_address: ContractAddress,
        factory: ContractAddress,
        deleted: bool,
        claims: LegacyMap<u32, ClaimDetail>,
        claim_count: u32,
        paused: bool,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        ReentrancyGuardEvent: ReentrancyGuardComponent::Event,
        Claimed: Claimed,
        Funded: Funded,
        Withdrawn: Withdrawn,
        ClaimParametersUpdated: ClaimParametersUpdated,
        WhitelistUpdated: WhitelistUpdated,
        FaucetCreated: FaucetCreated,
        AdminAdded: AdminAdded,
        AdminRemoved: AdminRemoved,
        ClaimReset: ClaimReset,
        BatchClaimReset: BatchClaimReset,
        BackendUpdated: BackendUpdated,
        Paused: Paused,
        FaucetDeleted: FaucetDeleted,
        NameUpdated: NameUpdated,
        CustomClaimAmountSet: CustomClaimAmountSet,
        CustomClaimAmountRemoved: CustomClaimAmountRemoved,
        BatchCustomClaimAmountsSet: BatchCustomClaimAmountsSet,
    }

    #[derive(Drop, starknet::Event)]
    struct Claimed {
        user: ContractAddress,
        amount: u256,
        is_ether: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct Funded {
        funder: ContractAddress,
        amount: u256,
        backend_fee: u256,
        vault_fee: u256,
        is_ether: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct Withdrawn {
        owner: ContractAddress,
        amount: u256,
        is_ether: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct ClaimParametersUpdated {
        claim_amount: u256,
        start_time: u64,
        end_time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct WhitelistUpdated {
        user: ContractAddress,
        status: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct FaucetCreated {
        faucet: ContractAddress,
        name: felt252,
        token: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct AdminAdded {
        admin: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct AdminRemoved {
        admin: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct ClaimReset {
        user: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct BatchClaimReset {
        user_count: u32,
    }

    #[derive(Drop, starknet::Event)]
    struct BackendUpdated {
        new_backend: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct Paused {
        paused: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct FaucetDeleted {
        faucet: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct NameUpdated {
        new_name: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct CustomClaimAmountSet {
        user: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct CustomClaimAmountRemoved {
        user: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct BatchCustomClaimAmountsSet {
        user_count: u32,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        name: felt252,
        token: ContractAddress,
        backend: ContractAddress,
        use_backend: bool,
        owner: ContractAddress,
        factory: ContractAddress,
    ) {
        self.ownable.initializer(owner);
        self.name.write(name);
        self.backend.write(backend);
        self.use_backend.write(use_backend);
        self.token.write(token);
        self.factory.write(factory);
        
        // Set default claim amount
        if token.into() == ZERO_ADDRESS {
            self.claim_amount.write(DEFAULT_ETH_CLAIM_AMOUNT);
        } else {
            self.claim_amount.write(DEFAULT_TOKEN_CLAIM_AMOUNT);
        }

        // Set vault address
        self.vault_address.write(get_default_vault_address());

        // Add owner as admin
        self.is_admin.write(owner, true);
        self.admins.write(0, owner);
        self.admin_count.write(1);

        // Add factory owner as admin
        let factory_dispatcher = IFaucetFactoryDispatcher { contract_address: factory };
        let factory_owner = factory_dispatcher.get_owner();
        self.is_admin.write(factory_owner, true);
        self.admins.write(1, factory_owner);
        self.admin_count.write(2);

        self.emit(FaucetCreated {
            faucet: get_contract_address(),
            name,
            token,
        });
        self.emit(AdminAdded { admin: owner });
        self.emit(AdminAdded { admin: factory_owner });
    }

    #[abi(embed_v0)]
    impl FaucetDropsImpl of IFaucetDrops<ContractState> {
        fn get_name(self: @ContractState) -> felt252 {
            self.name.read()
        }

        fn get_claim_amount(self: @ContractState) -> u256 {
            self.claim_amount.read()
        }

        fn get_token(self: @ContractState) -> ContractAddress {
            self.token.read()
        }

        fn get_start_time(self: @ContractState) -> u64 {
            self.start_time.read()
        }

        fn get_end_time(self: @ContractState) -> u64 {
            self.end_time.read()
        }

        fn get_use_backend(self: @ContractState) -> bool {
            self.use_backend.read()
        }

        fn get_owner(self: @ContractState) -> ContractAddress {
            self.ownable.owner()
        }

        fn is_claim_active(self: @ContractState) -> bool {
            let current_time = get_block_timestamp();
            let start = self.start_time.read();
            let end = self.end_time.read();
            let claim_amt = self.claim_amount.read();
            
            current_time >= start && current_time <= end && claim_amt > 0
        }

        fn get_faucet_balance(self: @ContractState) -> (u256, bool) {
            let token = self.token.read();
            if token.into() == ZERO_ADDRESS {
                // ETH balance - placeholder implementation
                // In a real implementation, you'd need to track ETH balance
                (0, true)
            } else {
                let token_dispatcher = IERC20Dispatcher { contract_address: token };
                let balance = token_dispatcher.balance_of(get_contract_address());
                (balance, false)
            }
        }

        fn fund(ref self: ContractState, token_amount: u256) {
            self._check_not_paused();
            self._check_not_deleted();
            self.reentrancy_guard.start();

            let token = self.token.read();
            let caller = get_caller_address();
            let contract_addr = get_contract_address();
            let backend = self.backend.read();
            let vault = self.vault_address.read();

            if token.into() == ZERO_ADDRESS {
                // Handle ETH funding - not implemented in this version
                panic!("ETH funding not implemented");
            } else {
                assert(token_amount > 0, 'Invalid amount');
                
                let backend_fee = (token_amount * BACKEND_FEE_PERCENT) / 100;
                let vault_fee = (token_amount * VAULT_FEE_PERCENT) / 100;
                let net_amount = token_amount - backend_fee - vault_fee;

                let token_dispatcher = IERC20Dispatcher { contract_address: token };

                // Transfer fees
                if backend_fee > 0 && backend.into() != ZERO_ADDRESS {
                    token_dispatcher.transfer_from(caller, backend, backend_fee);
                }
                if vault_fee > 0 && vault.into() != ZERO_ADDRESS {
                    token_dispatcher.transfer_from(caller, vault, vault_fee);
                }
                
                // Transfer net amount to contract
                token_dispatcher.transfer_from(caller, contract_addr, net_amount);

                self._record_transaction('Fund', caller, token_amount, false);
                
                self.emit(Funded {
                    funder: caller,
                    amount: token_amount,
                    backend_fee,
                    vault_fee,
                    is_ether: false,
                });
            }

            self.reentrancy_guard.end();
        }

        fn claim(ref self: ContractState, users: Array<ContractAddress>) {
            self._only_backend();
            self._check_not_paused();
            self._check_not_deleted();
            self.reentrancy_guard.start();

            assert(users.len() > 0, 'No users provided');
            
            let current_time = get_block_timestamp();
            assert(current_time >= self.start_time.read(), 'Claim period not started');
            assert(current_time <= self.end_time.read(), 'Claim period ended');
            assert(self.claim_amount.read() > 0, 'Claim amount not set');

            // Calculate total amount needed
            let mut total_amount = 0;
            let mut i = 0;
            while i < users.len() {
                total_amount += self._get_user_claim_amount(*users.at(i));
                i += 1;
            };

            // Check balance
            let token = self.token.read();
            if token.into() == ZERO_ADDRESS {
                // Check ETH balance - not implemented
                panic!("ETH claiming not implemented");
            } else {
                let token_dispatcher = IERC20Dispatcher { contract_address: token };
                let balance = token_dispatcher.balance_of(get_contract_address());
                assert(balance >= total_amount, 'Insufficient balance');
            }

            // Process claims
            i = 0;
            while i < users.len() {
                let user = *users.at(i);
                assert(user.into() != ZERO_ADDRESS, 'Invalid address');
                
                if !self.use_backend.read() {
                    assert(self.is_whitelisted.read(user), 'Not whitelisted');
                }
                assert(!self.has_claimed.read(user), 'Already claimed');

                let user_claim_amount = self._get_user_claim_amount(user);
                
                self.has_claimed.write(user, true);
                
                let claim_count = self.claim_count.read();
                self.claims.write(claim_count, ClaimDetail {
                    recipient: user,
                    amount: user_claim_amount,
                    timestamp: current_time,
                });
                self.claim_count.write(claim_count + 1);

                if token.into() == ZERO_ADDRESS {
                    // Transfer ETH - not implemented
                    panic!("ETH transfer not implemented");
                } else {
                    let token_dispatcher = IERC20Dispatcher { contract_address: token };
                    token_dispatcher.transfer(user, user_claim_amount);
                    
                    self._record_transaction('Claim', user, user_claim_amount, false);
                    self.emit(Claimed { user, amount: user_claim_amount, is_ether: false });
                }
                
                i += 1;
            };

            self.reentrancy_guard.end();
        }

        fn withdraw(ref self: ContractState, amount: u256) {
            self.ownable.assert_only_owner();
            self._check_not_paused();
            self._check_not_deleted();
            self.reentrancy_guard.start();

            assert(amount > 0, 'Invalid amount');

            let token = self.token.read();
            let owner = self.ownable.owner();

            if token.into() == ZERO_ADDRESS {
                // Withdraw ETH - not implemented
                panic!("ETH withdrawal not implemented");
            } else {
                let token_dispatcher = IERC20Dispatcher { contract_address: token };
                let balance = token_dispatcher.balance_of(get_contract_address());
                assert(balance >= amount, 'Insufficient balance');
                
                token_dispatcher.transfer(owner, amount);
                
                self._record_transaction('Withdraw', get_caller_address(), amount, false);
                self.emit(Withdrawn { owner, amount, is_ether: false });
            }

            self.reentrancy_guard.end();
        }

        fn set_claim_parameters(
            ref self: ContractState,
            claim_amount: u256,
            start_time: u64,
            end_time: u64
        ) {
            self._only_admin();
            self._check_not_paused();
            self._check_not_deleted();

            assert(claim_amount > 0, 'Invalid amount');
            assert(start_time >= get_block_timestamp(), 'Invalid time');
            assert(end_time > start_time, 'Invalid time');

            self.claim_amount.write(claim_amount);
            self.start_time.write(start_time);
            self.end_time.write(end_time);

            self._record_transaction('SetClaimParameters', get_caller_address(), claim_amount, false);
            self.emit(ClaimParametersUpdated { claim_amount, start_time, end_time });
        }

        fn set_whitelist(ref self: ContractState, user: ContractAddress, status: bool) {
            self._only_admin();
            self._check_not_paused();
            self._check_not_deleted();

            assert(user.into() != ZERO_ADDRESS, 'Invalid address');
            self.is_whitelisted.write(user, status);

            self._record_transaction('SetWhitelist', get_caller_address(), if status { 1 } else { 0 }, false);
            self.emit(WhitelistUpdated { user, status });
        }

        fn set_whitelist_batch(
            ref self: ContractState,
            users: Array<ContractAddress>,
            status: bool
        ) {
            self._only_admin();
            self._check_not_paused();
            self._check_not_deleted();

            assert(users.len() > 0, 'No users provided');

            let mut i = 0;
            while i < users.len() {
                let user = *users.at(i);
                assert(user.into() != ZERO_ADDRESS, 'Invalid address');
                self.is_whitelisted.write(user, status);
                
                self._record_transaction('SetWhitelistBatch', get_caller_address(), if status { 1 } else { 0 }, false);
                self.emit(WhitelistUpdated { user, status });
                i += 1;
            };
        }

        fn add_admin(ref self: ContractState, admin: ContractAddress) {
            self.ownable.assert_only_owner();
            self._check_not_deleted();

            assert(admin.into() != ZERO_ADDRESS, 'Invalid address');
            assert(!self.is_admin.read(admin), 'Already admin');

            self.is_admin.write(admin, true);
            let count = self.admin_count.read();
            self.admins.write(count, admin);
            self.admin_count.write(count + 1);

            self._record_transaction('AddAdmin', get_caller_address(), 0, false);
            self.emit(AdminAdded { admin });
        }

        fn remove_admin(ref self: ContractState, admin: ContractAddress) {
            self.ownable.assert_only_owner();
            self._check_not_deleted();

            assert(admin.into() != ZERO_ADDRESS, 'Invalid address');
            
            let factory = self.factory.read();
            let factory_dispatcher = IFaucetFactoryDispatcher { contract_address: factory };
            let factory_owner = factory_dispatcher.get_owner();
            assert(admin != factory_owner, 'Cannot remove factory owner');
            assert(self.is_admin.read(admin), 'Not admin');

            self.is_admin.write(admin, false);

            // Remove from admins array
            let count = self.admin_count.read();
            let mut i = 0;
            while i < count {
                if self.admins.read(i) == admin {
                    // Move last admin to this position
                    self.admins.write(i, self.admins.read(count - 1));
                    self.admin_count.write(count - 1);
                    break;
                }
                i += 1;
            };

            self._record_transaction('RemoveAdmin', get_caller_address(), 0, false);
            self.emit(AdminRemoved { admin });
        }

        fn set_custom_claim_amount(ref self: ContractState, user: ContractAddress, amount: u256) {
            self._only_admin();
            self._check_not_paused();
            self._check_not_deleted();

            assert(user.into() != ZERO_ADDRESS, 'Invalid address');

            if amount == 0 {
                self.custom_claim_amounts.write(user, 0);
                self.has_custom_amount.write(user, false);
                self._record_transaction('RemoveCustomClaimAmount', get_caller_address(), 0, false);
                self.emit(CustomClaimAmountRemoved { user });
            } else {
                self.custom_claim_amounts.write(user, amount);
                self.has_custom_amount.write(user, true);
                self._record_transaction('SetCustomClaimAmount', get_caller_address(), amount, false);
                self.emit(CustomClaimAmountSet { user, amount });
            }
        }

        fn set_custom_claim_amounts_batch(
            ref self: ContractState,
            users: Array<ContractAddress>,
            amounts: Array<u256>
        ) {
            self._only_admin();
            self._check_not_paused();
            self._check_not_deleted();

            assert(users.len() > 0, 'No users provided');
            assert(users.len() == amounts.len(), 'Array length mismatch');

            let mut set_count = 0;
            let mut i = 0;
            while i < users.len() {
                let user = *users.at(i);
                let amount = *amounts.at(i);
                assert(user.into() != ZERO_ADDRESS, 'Invalid address');

                if amount == 0 {
                    if self.has_custom_amount.read(user) {
                        self.custom_claim_amounts.write(user, 0);
                        self.has_custom_amount.write(user, false);
                        self.emit(CustomClaimAmountRemoved { user });
                        set_count += 1;
                    }
                } else {
                    self.custom_claim_amounts.write(user, amount);
                    self.has_custom_amount.write(user, true);
                    self.emit(CustomClaimAmountSet { user, amount });
                    set_count += 1;
                }
                i += 1;
            };

            self._record_transaction('SetCustomClaimAmountsBatch', get_caller_address(), set_count.into(), false);
            self.emit(BatchCustomClaimAmountsSet { user_count: set_count });
        }

        fn get_user_claim_amount(self: @ContractState, user: ContractAddress) -> u256 {
            self._get_user_claim_amount(user)
        }

        fn user_has_custom_amount(self: @ContractState, user: ContractAddress) -> bool {
            self._check_not_deleted();
            self.has_custom_amount.read(user)
        }

        fn get_custom_claim_amount(self: @ContractState, user: ContractAddress) -> u256 {
            self._check_not_deleted();
            self.custom_claim_amounts.read(user)
        }

        fn get_all_admins(self: @ContractState) -> Array<ContractAddress> {
            self._check_not_deleted();
            let mut result = ArrayTrait::new();
            let count = self.admin_count.read();
            let mut i = 0;
            while i < count {
                result.append(self.admins.read(i));
                i += 1;
            };
            result
        }

        fn get_all_claims(self: @ContractState) -> Array<ClaimDetail> {
            self._check_not_deleted();
            let mut result = ArrayTrait::new();
            let count = self.claim_count.read();
            let mut i = 0;
            while i < count {
                result.append(self.claims.read(i));
                i += 1;
            };
            result
        }

        fn reset_claimed_single(ref self: ContractState, user: ContractAddress) {
            self._only_admin();
            self._check_not_paused();
            self._check_not_deleted();

            assert(user.into() != ZERO_ADDRESS, 'Invalid address');
            assert(self.has_claimed.read(user), 'Not claimed');
            
            self.has_claimed.write(user, false);
            self._record_transaction('ResetClaimedSingle', get_caller_address(), 0, false);
            self.emit(ClaimReset { user });
        }

        fn reset_claimed_batch(ref self: ContractState, users: Array<ContractAddress>) {
            self._only_admin();
            self._check_not_paused();
            self._check_not_deleted();

            assert(users.len() > 0, 'No users provided');

            let mut reset_count = 0;
            let mut i = 0;
            while i < users.len() {
                let user = *users.at(i);
                if user.into() != ZERO_ADDRESS && self.has_claimed.read(user) {
                    self.has_claimed.write(user, false);
                    self.emit(ClaimReset { user });
                    reset_count += 1;
                }
                i += 1;
            };

            self._record_transaction('ResetClaimedBatch', get_caller_address(), reset_count.into(), false);
            self.emit(BatchClaimReset { user_count: reset_count });
        }

        fn reset_all_claimed(ref self: ContractState) {
            self._only_admin();
            self._check_not_paused();
            self._check_not_deleted();

            let mut reset_count = 0;
            let claim_count = self.claim_count.read();
            let mut i = 0;
            while i < claim_count {
                let claim = self.claims.read(i);
                let user = claim.recipient;
                if self.has_claimed.read(user) {
                    self.has_claimed.write(user, false);
                    self.emit(ClaimReset { user });
                    reset_count += 1;
                }
                i += 1;
            };

            self._record_transaction('ResetAllClaimed', get_caller_address(), reset_count.into(), false);
            self.emit(BatchClaimReset { user_count: reset_count });
        }

        fn delete_faucet(ref self: ContractState) {
            self._only_admin();
            self._check_not_deleted();

            self.deleted.write(true);
            self._record_transaction('DeleteFaucet', get_caller_address(), 0, false);
            self.emit(FaucetDeleted { faucet: get_contract_address() });

            // Transfer remaining funds to owner
            let token = self.token.read();
            let owner = self.ownable.owner();

            if token.into() == ZERO_ADDRESS {
                // Transfer ETH - not implemented
                panic!("ETH transfer not implemented");
            } else {
                let token_dispatcher = IERC20Dispatcher { contract_address: token };
                let balance = token_dispatcher.balance_of(get_contract_address());
                if balance > 0 {
                    token_dispatcher.transfer(owner, balance);
                }
            }

            self.paused.write(true);
        }

        fn update_name(ref self: ContractState, new_name: felt252) {
            self._only_admin();
            self._check_not_paused();
            self._check_not_deleted();

            assert(new_name != 0, 'Empty name');
            self.name.write(new_name);
            self._record_transaction('UpdateName', get_caller_address(), 0, false);
            self.emit(NameUpdated { new_name });
        }

        fn get_admin_status(self: @ContractState, address: ContractAddress) -> bool {
            self._check_not_deleted();
            self.is_admin.read(address)
        }

        fn get_claim_status(self: @ContractState, user: ContractAddress) -> (bool, bool, bool) {
            self._check_not_deleted();
            let claimed = self.has_claimed.read(user);
            let whitelisted = self.is_whitelisted.read(user);
            let can_claim = (self.use_backend.read() || whitelisted) && !claimed && self.is_claim_active();
            (claimed, whitelisted, can_claim)
        }

        fn get_detailed_claim_status(
            self: @ContractState,
            user: ContractAddress
        ) -> (bool, bool, bool, u256, bool) {
            self._check_not_deleted();
            let claimed = self.has_claimed.read(user);
            let whitelisted = self.is_whitelisted.read(user);
            let can_claim = (self.use_backend.read() || whitelisted) && !claimed && self.is_claim_active();
            let claim_amount_for_user = self._get_user_claim_amount(user);
            let has_custom = self.has_custom_amount.read(user);
            (claimed, whitelisted, can_claim, claim_amount_for_user, has_custom)
        }

        fn set_paused(ref self: ContractState, paused: bool) {
            self._only_admin();
            self._check_not_deleted();

            self.paused.write(paused);
            self._record_transaction('SetPaused', get_caller_address(), if paused { 1 } else { 0 }, false);
            self.emit(Paused { paused });
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _only_backend(self: @ContractState) {
            let caller = get_caller_address();
            let backend = self.backend.read();
            assert(caller == backend, 'Only backend');
        }

        fn _only_admin(self: @ContractState) {
            let caller = get_caller_address();
            let backend = self.backend.read();
            let owner = self.ownable.owner();
            let factory = self.factory.read();
            let factory_dispatcher = IFaucetFactoryDispatcher { contract_address: factory };
            let factory_owner = factory_dispatcher.get_owner();
            
            let is_admin = self.is_admin.read(caller);
            assert(
                is_admin || caller == backend || caller == owner || caller == factory_owner,
                'Only admin'
            );
        }

        fn _check_not_paused(self: @ContractState) {
            assert(!self.paused.read(), 'Contract paused');
        }

        fn _check_not_deleted(self: @ContractState) {
            assert(!self.deleted.read(), 'Faucet deleted');
        }

        fn _get_user_claim_amount(self: @ContractState, user: ContractAddress) -> u256 {
            if self.has_custom_amount.read(user) {
                self.custom_claim_amounts.read(user)
            } else {
                self.claim_amount.read()
            }
        }

        fn _record_transaction(
            self: @ContractState,
            transaction_type: felt252,
            initiator: ContractAddress,
            amount: u256,
            is_ether: bool,
        ) {
            let factory = self.factory.read();
            let factory_dispatcher = IFaucetFactoryDispatcher { contract_address: factory };
            factory_dispatcher.record_transaction(
                get_contract_address(),
                transaction_type,
                initiator,
                amount,
                is_ether,
            );
        }
    }
}