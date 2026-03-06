"""
config.py — Environment variables, constants, chain configs, and shared clients.
Import this module everywhere you need settings or the supabase client.
"""
from __future__ import annotations

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config as StarletteConfig

load_dotenv()

# ── Private key / RPC (from your existing config.py or env) ──────────────────
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "0x" + "0" * 64)

def get_rpc_url(chain_id: int) -> str:
    return os.getenv(f"RPC_URL_{chain_id}") or "http://127.0.0.1:8545"

# ── External service keys ─────────────────────────────────────────────────────
ALCHEMY_API_KEY   = os.getenv("ALCHEMY_API_KEY", "")
GEMINI_API_KEY    = os.getenv("GEMINI_API_KEY", "")
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
DISCORD_API_URL   = "https://discord.com/api/v10"
TELEGRAM_API_URL  = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)
REWARD_API_URL = "https://faucetdrop-backend.onrender.com/api/quiz/dispatch-rewards"
PROXY_URL = os.getenv("PROXY_URL", "")

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "")

# ── Platform constants ────────────────────────────────────────────────────────
PLATFORM_OWNER = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785"

SESSION_SECRET = os.getenv("SESSION_SECRET", "some-random-secret-key-change-this")

# ── Supported chain IDs ───────────────────────────────────────────────────────
VALID_CHAIN_IDS = [
    1, 42220, 44787, 62320,
    1135, 4202,
    8453, 84532,
    42161, 421614,
    137, 56, 43114,
]

# ── Chain metadata ────────────────────────────────────────────────────────────
CHAIN_INFO = {
    1:      {"name": "Ethereum Mainnet",      "native_token": "ETH"},
    11155111: {"name": "Ethereum Sepolia",    "native_token": "ETH"},
    56:     {"name": "BNB Mainnet",            "native_token": "BNB"},
    97:     {"name": "BNB Testnet",            "native_token": "BNB"},
    42220:  {"name": "Celo Mainnet",           "native_token": "CELO"},
    44787:  {"name": "Celo Testnet",           "native_token": "CELO"},
   
    42161:  {"name": "Arbitrum One",           "native_token": "ETH"},
    421614: {"name": "Arbitrum Sepolia",       "native_token": "ETH"},
    8453:   {"name": "Base",                   "native_token": "ETH"},
    84532:  {"name": "Base Testnet",           "native_token": "ETH"},
    137:    {"name": "Polygon Mainnet",        "native_token": "MATIC"},
    80001:  {"name": "Polygon Mumbai",         "native_token": "MATIC"},
    80002:  {"name": "Polygon Amoy",           "native_token": "MATIC"},
    1135:   {"name": "Lisk",                   "native_token": "LISK"},
    4202:   {"name": "Lisk Testnet",           "native_token": "LISK"},
    62320:  {"name": "Custom Network",         "native_token": "ETH"},
}

CHAIN_CONFIGS = {
    1:     {"name": "Ethereum Mainnet",  "nativeCurrency": {"symbol": "ETH",  "decimals": 18}},
    56:    {"name": "BNB Mainnet",       "nativeCurrency": {"symbol": "BNB",  "decimals": 18}},
    42220: {"name": "Celo Mainnet",      "nativeCurrency": {"symbol": "CELO", "decimals": 18}},
    42161: {"name": "Arbitrum One",      "nativeCurrency": {"symbol": "ETH",  "decimals": 18}},
    1135:  {"name": "Lisk",              "nativeCurrency": {"symbol": "LISK", "decimals": 18}},
    8453:  {"name": "Base",              "nativeCurrency": {"symbol": "ETH",  "decimals": 18}},
}

USDT_CONTRACTS = {
    42220: "0x7F561a9b25dC8a547deC3ca8D851CcC4A54e5665",
}

# ── Token address lists per chain ─────────────────────────────────────────────
CHAIN_TOKEN_MAP: dict[int, list[str]] = {
    42220: [
        "0x765DE816845861e75A25fCA122bb6898B8B1282a",
        "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
        "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
        "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
        "0x639A647fbe20b6c8ac19E48E2de44ea792c62c5C",
        "0xE2702Bd97ee33c88c8f6f92DA3B733608aa76F71",
        "0x32A9FE697a32135BFd313a6Ac28792DaE4D9979d",
        "0x4f604735c1cf31399c6e711d5962b2b3e0225ad3",
        "0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a",
    ],
    1135: [
        "0xac485391EB2d7D88253a7F1eF18C37f4242D1A24",
        "0x05D032ac25d322df992303dCa074EE7392C117b9",
        "0xF242275d3a6527d877f2c927a82D9b057609cc71",
    ],
    42161: [
        "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        "0x912CE59144191C1204E64559FE8253a0e49E6548",
    ],
    8453: [
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed",
    ],
    56: [
        "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        "0x55d398326f99059fF775485246999027B3197955",
        "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    ],
    43114: [
        "0xB97EF9Ef8734C71904D8002F84F3AeBA1fC9776",
        "0xc7198437980c041c805A1EDcbA50c1Ce5db951",
        "0xA7D7079b0FEaD91EecF1a4CfaF1B048d2A9a7c71",
    ],
}

# ── Supabase client (singleton) ───────────────────────────────────────────────
def _init_supabase() -> Client:
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "")
    if not url or not key:
        print("FATAL: SUPABASE_URL or SUPABASE_KEY not set.")
    return create_client(url, key)

supabase: Client = _init_supabase()

# ── OAuth (Discord) ───────────────────────────────────────────────────────────
starlette_config = StarletteConfig(environ=os.environ)
oauth = OAuth(starlette_config)
oauth.register(
    name="discord",
    client_id=starlette_config("DISCORD_CLIENT_ID", default=""),
    client_secret=starlette_config("DISCORD_CLIENT_SECRET", default=""),
    authorize_url="https://discord.com/api/oauth2/authorize",
    access_token_url="https://discord.com/api/oauth2/token",
    api_base_url="https://discord.com/api/",
    client_kwargs={"scope": "identify guilds guilds.members.read"},
)

# ── On-chain backend signer keys ──────────────────────────────────────────────
BACKEND_PRIVATE_KEY_A = os.getenv("BACKEND_PRIVATE_KEY_A", PRIVATE_KEY)
BACKUP_PRIVATE_KEY_B  = os.getenv("BACKUP_PRIVATE_KEY_B", "")

# ── Tx / RPC tuning ───────────────────────────────────────────────────────────
RPC_TIMEOUT        = int(os.getenv("RPC_TIMEOUT_SECONDS", "30"))
TX_WAIT_TIMEOUT    = int(os.getenv("TX_WAIT_TIMEOUT_SECONDS", "120"))
MAX_GAS_MULTIPLIER = float(os.getenv("MAX_GAS_MULTIPLIER", "1.2"))
