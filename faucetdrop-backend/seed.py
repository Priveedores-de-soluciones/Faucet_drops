import os
import time
from dotenv import load_dotenv
from web3 import Web3
from bip_utils import Bip39SeedGenerator, Bip44, Bip44Coins, Bip44Changes

# Load .env
load_dotenv()

# --- CONFIGURATION ---
DESTINATION_ADDRESS = "0xE5f0939984009ab5fc0a905cD424f009F34502D3" 
RPC_URL = "https://forno.celo.org" 
MNEMONIC = os.getenv("MNEMONIC_PHRASE")

w3 = Web3(Web3.HTTPProvider(RPC_URL))

def sweep_batch_two():
    if not w3.is_connected():
        print("❌ Could not connect to Celo")
        return

    seed_bytes = Bip39SeedGenerator(MNEMONIC).Generate()
    bip44_mst_ctx = Bip44.FromSeed(seed_bytes, Bip44Coins.ETHEREUM)

    print(f"\n--- 🧹 ACTIVITY: SWEEPING BATCH 2 (31-50) TO {DESTINATION_ADDRESS} ---")

    for i in range(31, 51):
        # 1. Derive Private Key and Address
        addr_ctx = bip44_mst_ctx.Purpose().Coin().Account(0).Change(Bip44Changes.CHAIN_EXT).AddressIndex(i)
        priv_key = addr_ctx.PrivateKey().Raw().ToHex()
        pub_addr = addr_ctx.PublicKey().ToAddress()

        # 2. Get current balance and gas stats
        balance_wei = w3.eth.get_balance(pub_addr)
        
        if balance_wei == 0:
            print(f"[{i}] {pub_addr} | ⚠️ Skipping: Balance is 0")
            continue

        try:
            # 3. Calculate exact gas fee
            gas_limit = 21000  # Standard transfer
            gas_price = w3.eth.gas_price
            total_gas_cost = gas_limit * gas_price

            # 4. Calculate maximum sendable amount
            sendable_amount_wei = balance_wei - total_gas_cost

            if sendable_amount_wei <= 0:
                print(f"[{i}] {pub_addr} | ⚠️ Balance too low to cover gas")
                continue

            # 5. Build and Sign Transaction
            tx = {
                'nonce': w3.eth.get_transaction_count(pub_addr),
                'to': DESTINATION_ADDRESS,
                'value': sendable_amount_wei,
                'gas': gas_limit,
                'gasPrice': gas_price,
                'chainId': 42220
            }

            signed_tx = w3.eth.account.sign_transaction(tx, priv_key)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            celo_sent = w3.from_wei(sendable_amount_wei, 'ether')
            print(f"[{i}] {pub_addr} | ✅ Sent {celo_sent:.6f} CELO | Hash: {w3.to_hex(tx_hash)}")

            # Avoid nonce collisions
            time.sleep(1)

        except Exception as e:
            print(f"[{i}] {pub_addr} | ❌ Error: {e}")

if __name__ == "__main__":
    sweep_batch_two()