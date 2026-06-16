import base58
from solders.keypair import Keypair

def generate_devnet_wallet():
    # Generate a fresh keypair
    kp = Keypair()
    
    # Extract the public address and the 64-byte private key
    pubkey = kp.pubkey()
    private_key_bytes = kp.to_bytes()
    
    # Encode the private key to the base58 format Phantom and your backend expect
    private_key_b58 = base58.b58encode(private_key_bytes).decode('utf-8')
    
    print("\n✅ Devnet Wallet Generated Successfully!\n")
    print(f"Public Address: {pubkey}")
    print("-" * 50)
    print("Add this to your .env file:")
    print(f"SOLANA_PRIVATE_KEY={private_key_b58}\n")

if __name__ == "__main__":
    generate_devnet_wallet()