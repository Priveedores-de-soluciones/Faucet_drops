from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from web3 import Web3
from dotenv import load_dotenv
from fastapi import File, UploadFile
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from collections import defaultdict
from typing import List, Dict, Any, Optional
import asyncio, os, requests
from supabase import create_client, Client
import os
from fastapi import Form         
import uuid
import mimetypes
import httpx
from abi import (FAUCET_ABI, FACTORY_ABI, QUEST_FACTORY_ABI_MINIMAL, CHECKIN_ABI, ERC20_ABI, QUEST_ABI, QUIZ_ABI,QUIZ_FACTORY_ABI,QUEST_FACTORY_ABI)
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import hashlib
import secrets
import re
import hashlib
import secrets
from datetime import datetime, timezone, timedelta

load_dotenv()

app = FastAPI(title="FaucetDrop Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


BLOG_ADMIN_USERNAME = os.getenv("BLOG_ADMIN_USERNAME","")
BLOG_ADMIN_PASSWORD = os.getenv("BLOG_ADMIN_PASSWORD", "")
BLOG_SECRET_KEY     = os.getenv("BLOG_SECRET_KEY", "")
DATABASE_URL        = os.getenv("DATABASE_URL", "")

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_session_token() -> str:
    return secrets.token_urlsafe(32)

def is_valid_session(token: str) -> bool:
    if not token:
        return False
    try:
        result = supabase.table("blog_sessions")\
            .select("token, expires_at")\
            .eq("token", token)\
            .single()\
            .execute()
        if not result.data:
            return False
        new_expiry = datetime.now(timezone.utc) + timedelta(days=365)
        supabase.table("blog_sessions").update({
            "expires_at": new_expiry.isoformat()
        }).eq("token", token).execute()
        return True
    except Exception:
        return False

def create_session(token: str):
    expires_at = datetime.now(timezone.utc) + timedelta(days=365)
    supabase.table("blog_sessions").upsert({
        "token": token,
        "expires_at": expires_at.isoformat()
    }).execute()
    return expires_at

def delete_session(token: str):
    supabase.table("blog_sessions")\
        .delete()\
        .eq("token", token)\
        .execute()

class CreateSpinnerRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    participants: List[str]
    owner_address: Optional[str] = None

class TrackVisitRequest(BaseModel):
    path:        str        = "/"
    referrer:    Optional[str] = None
    user_agent:  Optional[str] = None
    fingerprint: Optional[str] = None

class UpdateSpinnerRequest(BaseModel):
    participants: List[str]
    winners: Optional[List[str]] = None
    caller_address: Optional[str] = None

class BlogLoginRequest(BaseModel):
    username: str
    password: str

class CreateBlogRequest(BaseModel):
    title: str
    content: str
    excerpt: str = ""
    coverImageUrl: str = ""
    tags: List[str] = []
    authorName: str = ""
    authorAvatar: str = ""
    authorHandle: str = ""
    sourceUrl: str = ""
    sessionToken: str

class ExtractUrlRequest(BaseModel):
    url: str
    sessionToken: str

class DeleteBlogRequest(BaseModel):
    sessionToken: str

class FaucetMetaResponse(BaseModel):
    faucet_address: str
    chain_id: int
    network_name: str
    factory_address: Optional[str]
    factory_type: Optional[str]
    faucet_name: Optional[str]
    token_symbol: Optional[str]
    is_ether: bool
    is_claim_active: bool
    owner_address: Optional[str]
    start_time: Optional[int]
    updated_at: Optional[str]
    slug: Optional[str]

class FaucetDetailResponse(BaseModel):
    faucet_address: str
    chain_id: int
    network_name: str
    factory_address: Optional[str]
    factory_type: Optional[str]
    faucet_name: Optional[str]
    token_address: Optional[str]
    token_symbol: Optional[str]
    token_decimals: int
    is_ether: bool
    balance: str
    claim_amount: str
    start_time: Optional[int]
    end_time: Optional[int]
    is_claim_active: bool
    is_paused: bool
    owner_address: Optional[str]
    use_backend: bool
    slug: Optional[str]
    image_url: Optional[str]
    description: Optional[str]
    updated_at: Optional[str]


class NetworkFaucetsResponse(BaseModel):
    chain_id: int
    network_name: str
    total: int
    faucets: List[FaucetMetaResponse]


class DashboardResponse(BaseModel):
    total_claims: int
    total_unique_users: int
    total_faucets: int
    total_transactions: int
    claims_pie_data: List[Dict]
    faucet_rankings: List[Dict]
    users_chart: List[Dict]
    network_transactions: List[Dict]
    network_faucets: List[Dict]
    last_updated: str

# ====================== CHAIN CONFIGS ======================

NETWORK_COLORS: Dict[str, str] = {
    "Celo":      "#35D07F",
    "Lisk":      "#0D4477",
    "Arbitrum":  "#28A0F0",
    "Base":      "#0052FF",
    "BNB":       "#F3BA2F",
}

CHAIN_CONFIGS: Dict[int, Dict] = {
    42220: {
        "name": "Celo",
        "rpcUrls": ["https://forno.celo.org"],
        "factoryAddresses": ["0x17cFed7fEce35a9A71D60Fbb5CA52237103A21FB", "0xB8De8f37B263324C44FD4874a7FB7A0C59D8C58E", "0xc26c4Ea50fd3b63B6564A5963fdE4a3A474d4024", "0x9D6f441b31FBa22700bb3217229eb89b13FB49de", "0xE3Ac30fa32E727386a147Fe08b4899Da4115202f", "0xF8707b53a2bEc818E96471DDdb34a09F28E0dE6D", "0x8D1306b3970278b3AB64D1CE75377BDdf00f61da", "0x8cA5975Ded3B2f93E188c05dD6eb16d89b14aeA5", "0xc9c89f695C7fa9D9AbA3B297C9b0d86C5A74f534"],
        "Quests": ["0x2Eb9692785e089DD7588b0D3220B5dD154eF2699","0x28E06CBD5E22B0f4E39D277457Be13E160fC742F"],
        "quiz":   ["0x45aF94C51188C2f1cBAa060Bd9Ee4a37e416Ed1F","0xF9e41c0b83c580d3259C7aAB30256a94082E7A1e"],
        "nativeCurrency": {"symbol": "CELO", "decimals": 18},
        "blockExplorer": "https://celoscan.io/",
    },
    1135: {
        "name": "Lisk",
        "rpcUrls": ["https://rpc.api.lisk.com"],
        "factoryAddresses": ["0x96E9911df17e94F7048cCbF7eccc8D9b5eDeCb5C", "0x4F5Cf906b9b2Bf4245dba9F7d2d7F086a2a441C2", "0x21E855A5f0E6cF8d0CfE8780eb18e818950dafb7", "0xd6Cb67dF496fF739c4eBA2448C1B0B44F4Cf0a7C", "0x0837EACf85472891F350cba74937cB02D90E60A4"],
        "Quests": ["0xE9a7637f11F22c55061936Bc97b9aFEAC2e93C2E","0xc7889C58B51574d32C83b2e2F60d5eC145103Eb3"],
        "quiz":   ["0x8BD9AD5C66Ca2BE1A728e4d139d92103615bcA7C","0x6D0d7DD8b5E80BfeCa9060703c3768440467D12e"],
        "nativeCurrency": {"symbol": "ETH", "decimals": 18},
        "blockExplorer": "https://blockscout.lisk.com/",
    },
    42161: {
        "name": "Arbitrum",
        "rpcUrls": ["https://arb1.arbitrum.io/rpc"],
        "Quests": ["0x069ad2047FaEC364eb5009E8E783Ec1D9ae08629","0x72680B6ad792a0069B3Bd5Acfd76182f3c63b703"],
        "quiz": ["0x3C4ce82625Aa9dc0Efb199bCf5553Af32d27e555"],
        "factoryAddresses": ["0x0a5C19B5c0f4B9260f0F8966d26bC05AAea2009C", "0x42355492298A89eb1EF7FB2fFE4555D979f1Eee9", "0x9D6f441b31FBa22700bb3217229eb89b13FB49de"],
        "nativeCurrency": {"symbol": "ETH", "decimals": 18},
        "blockExplorer": "https://arbiscan.io/",
    },
    8453: {
        "name": "Base",
        "rpcUrls": ["https://base.publicnode.com"],
        "factoryAddresses": ["0x945431302922b69D500671201CEE62900624C6d5", "0xda191fb5Ca50fC95226f7FC91C792927FC968CA9", "0x587b840140321DD8002111282748acAdaa8fA206"],
        "Quests": ["0xb0B955e9B4a98A1323cE099A97632D5c4fc5d210"],
        "quiz":   ["0xE88028BC2bF2C4bb6eC6C0587d3248b79cAA5198","0xd942A4188122D81A37FC34743b7b395C2889d049"],
        "nativeCurrency": {"symbol": "ETH", "decimals": 18},
        "blockExplorer": "https://basescan.org/",
    },
    56: {
        "name": "BNB",
        "rpcUrls": ["https://bnb-mainnet.g.alchemy.com/v2/sXHCrL5-xwYkPtkRC_WTEZHvIkOVTbw-"],
        "factoryAddresses": ["0xFE7DB2549d0c03A4E3557e77c8d798585dD80Cc1", "0x0F779235237Fc136c6EE9dD9bC2545404CDeAB36", "0x4B8c7A12660C4847c65662a953F517198fBFc0ED"],
        "Quests": ["0xBcA0AB3a9705C82DfBb92c4BAcFd5C2175511d54", "0x7E8D2A012cF5356e77f9eeccdddb942E72800f76"],
        "quiz":   ["0xBfbE657a1FB5Fbc1fFadfB5A79EBAfC7D2637d06","0xfdA2585D9Cf1AF2F079C0FC169e6914f64a2A51C"],
        "nativeCurrency": {"symbol": "BNB", "decimals": 18},
        "blockExplorer": "https://bscscan.com/",
    },
    11142220: {
        "name": "Testnet",
        "rpcUrls": [
            "https://forno.celo-sepolia.celo-testnet.org",
            "https://celo-sepolia.g.alchemy.com/v2/sXHCrL5-xwYkPtkRC_WTEZHvIkOVTbw-",
            "https://celo-sepolia.infura.io/v3/e9fa8c3350054dafa40019a5b604679f",
        ],
        "factoryAddresses": ["0x69a12ecB86A9510c70CEB72d209A7d8b034ca5fE"],
        "Quests": [""],
        "quiz":   [""],
        "nativeCurrency": {"symbol": "ETH", "decimals": 18},
        "blockExplorer": "https://celo-sepolia.blockscout.com/",
    }
}

CHAIN_CONFIGS_V2: Dict[int, Dict] = {
    42220: {
        "name": "Celo",
        "rpcUrls": CHAIN_CONFIGS[42220]["rpcUrls"],
        "factories": {
            "0x17cFed7fEce35a9A71D60Fbb5CA52237103A21FB": "dropcode",
            "0x9D6f441b31FBa22700bb3217229eb89b13FB49de": "dropcode",
            "0xE3Ac30fa32E727386a147Fe08b4899Da4115202f": "dropcode",
            "0xF8707b53a2bEc818E96471DDdb34a09F28E0dE6D": "droplist",
            "0x8D1306b3970278b3AB64D1CE75377BDdf00f61da": "dropcode",
            "0x8cA5975Ded3B2f93E188c05dD6eb16d89b14aeA5": "custom",
            "0xc9c89f695C7fa9D9AbA3B297C9b0d86C5A74f534": "droplist",
        },
    },
    1135: {
        "name": "Lisk",
        "rpcUrls": CHAIN_CONFIGS[1135]["rpcUrls"],
        "factories": {
            "0x21E855A5f0E6cF8d0CfE8780eb18e818950dafb7": "custom",
            "0xd6Cb67dF496fF739c4eBA2448C1B0B44F4Cf0a7C": "dropcode",
            "0x0837EACf85472891F350cba74937cB02D90E60A4": "droplist",
        },
    },
    42161: {
        "name": "Arbitrum",
        "rpcUrls": CHAIN_CONFIGS[42161]["rpcUrls"],
        "factories": {
            "0x0a5C19B5c0f4B9260f0F8966d26bC05AAea2009C": "dropcode",
            "0x42355492298A89eb1EF7FB2fFE4555D979f1Eee9": "droplist",
            "0x9D6f441b31FBa22700bb3217229eb89b13FB49de": "custom",
        },
    },
    8453: {
        "name": "Base",
        "rpcUrls": CHAIN_CONFIGS[8453]["rpcUrls"],
        "factories": {
            "0x945431302922b69D500671201CEE62900624C6d5": "dropcode",
            "0xda191fb5Ca50fC95226f7FC91C792927FC968CA9": "droplist",
            "0x587b840140321DD8002111282748acAdaa8fA206": "custom",
        },
    },
    56: {
        "name": "BNB",
        "rpcUrls": CHAIN_CONFIGS[56]["rpcUrls"],
        "factories": {
            "0xFE7DB2549d0c03A4E3557e77c8d798585dD80Cc1": "dropcode",
            "0x0F779235237Fc136c6EE9dD9bC2545404CDeAB36": "droplist",
            "0x4B8c7A12660C4847c65662a953F517198fBFc0ED": "custom",
        },
    },
    11142220: {
        "name": "Testnet",
        "rpcUrls": CHAIN_CONFIGS[11142220]["rpcUrls"],
        "factories": {
            "0x69a12ecB86A9510c70CEB72d209A7d8b034ca5fE": "dropcode",
        },
    },
}

NATIVE_SYMBOLS: Dict[int, str] = {
    42220: "CELO",
    1135:  "ETH",
    42161: "ETH",
    8453:  "ETH",
    11142220: "CELO",
    56:    "BNB",
}


# ====================== SUPABASE ======================

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

supabase: Client = None
if supabase_url and supabase_key:
    supabase = create_client(supabase_url, supabase_key)
    print("✅ Supabase connected successfully")
else:
    print("⚠️  WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env")


# ====================== GLOBAL DASHBOARD CACHE ======================

dashboard_data: Dict[str, Any] = {
    "total_claims": 0,
    "total_unique_users": 0,
    "total_faucets": 0,
    "total_transactions": 0,
    "claims_pie_data": [],
    "faucet_rankings": [],
    "users_chart": [],
    "network_transactions": [],
    "network_faucets": [],
    "last_updated": None,
}


# ====================== SHARED HELPERS ======================

def get_web3(rpc_urls: list) -> Web3:
    for url in rpc_urls:
        try:
            w3 = Web3(Web3.HTTPProvider(url))
            if w3.is_connected():
                return w3
        except Exception:
            continue
    raise Exception("All RPCs failed")


def is_placeholder_address(addr: str) -> bool:
    stripped = addr.replace("0x", "").replace(".", "")
    return len(stripped) == 0 or set(stripped) == {"0"}


def safe_checksum(w3: Web3, addr: str) -> Optional[str]:
    try:
        return w3.to_checksum_address(addr)
    except Exception:
        return None


def _safe_call(contract, fn_name: str):
    try:
        return contract.functions[fn_name]().call()
    except Exception:
        return None


def _chunks(lst: List, n: int):
    for i in range(0, len(lst), n):
        yield lst[i : i + n]

def generate_slug(name: str) -> str:
    base_slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    short_uuid = uuid.uuid4().hex[:6]
    return f"{base_slug}-{short_uuid}"

async def fetch_deleted_faucets() -> set:
    """
    Fetches deleted faucets from BOTH the API endpoint AND the Supabase
    'deleted_faucets' table to ensure nothing slips through.
    """
    deleted: set = set()

    # Source 1: API endpoint
    try:
        r = requests.get("https://faucetdrop-backend.onrender.com/deleted-faucets", timeout=5)
        if r.ok:
            deleted.update(a.lower() for a in r.json().get("deletedAddresses", []))
    except Exception:
        pass

    # Source 2: Supabase deleted_faucets table (belt-and-suspenders)
    if supabase:
        try:
            rows = supabase.table("deleted_faucets").select("faucet_address").execute().data or []
            deleted.update(r["faucet_address"].lower() for r in rows if r.get("faucet_address"))
        except Exception:
            pass  # table may not exist — that's fine

    return deleted


def _is_deleted_onchain(w3: Web3, faucet_cs: str) -> bool:
    """
    Check the on-chain `deleted` flag on the faucet contract itself.
    This gates faucets even if the deleted-faucets API/DB is stale.
    """
    try:
        contract = w3.eth.contract(address=faucet_cs, abi=FAUCET_ABI)
        return bool(contract.functions.deleted().call())
    except Exception:
        return False  # if we can't read, assume not deleted


def get_faucet_name_sync(w3: Web3, addr_checksum: str) -> str:
    short = f"Faucet {addr_checksum[:6]}...{addr_checksum[-4:]}"
    try:
        contract = w3.eth.contract(address=addr_checksum, abi=FAUCET_ABI)
        name = contract.functions.name().call()
        return name if name and name.strip() else short
    except Exception:
        return short


def _try_checkin(w3: Web3, addr_checksum: str):
    try:
        contract = w3.eth.contract(address=addr_checksum, abi=CHECKIN_ABI)
        tx_count = contract.functions.getTotalTransactions().call()
        participants = [p.lower() for p in contract.functions.getAllParticipants().call() if p]
        return tx_count, participants
    except Exception:
        return 0, []


def detect_and_call(w3: Web3, address_checksum: str):
    try:
        contract = w3.eth.contract(address=address_checksum, abi=FACTORY_ABI)
        factory_txs = contract.functions.getAllTransactions().call()
        faucets = contract.functions.getAllFaucets().call()
        return ("factory", factory_txs, faucets)
    except Exception:
        pass
    try:
        contract = w3.eth.contract(address=address_checksum, abi=QUEST_FACTORY_ABI_MINIMAL)
        factory_txs = contract.functions.getAllTransactions().call()
        faucets = contract.functions.getAllQuests().call()
        return ("quest", factory_txs, faucets)
    except Exception:
        pass
    try:
        contract = w3.eth.contract(address=address_checksum, abi=CHECKIN_ABI)
        tx_count = contract.functions.getTotalTransactions().call()
        participants = contract.functions.getAllParticipants().call()
        return ("checkin", tx_count, [p.lower() for p in participants if p])
    except Exception:
        pass
    return ("unknown", None, None)


def _get_all_faucets_from_factory(w3: Web3, factory_cs: str) -> List[str]:
    for fn_name in ("getAllFaucets", "getAllQuests"):
        try:
            abi_stub = [{"inputs": [], "name": fn_name, "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}], "stateMutability": "view", "type": "function"}]
            c = w3.eth.contract(address=factory_cs, abi=abi_stub)
            return c.functions[fn_name]().call()
        except Exception:
            continue
    return []

def _make_slug(name: str, address: str) -> str:
    import re
    name_part = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    addr_suffix = address.lower()[-4:]
    return f"{name_part}-{addr_suffix}" if name_part else addr_suffix


# ====================== TOKEN SYMBOL RESOLVER ======================

def resolve_token_symbol(
    w3: Web3,
    token_addr: str,
    is_ether: bool,
    chain_id: int,
) -> tuple[str, int]:
    zero_addr = "0x0000000000000000000000000000000000000000"

    if is_ether or token_addr.lower() == zero_addr:
        return NATIVE_SYMBOLS.get(chain_id, "ETH"), 18

    try:
        tok = w3.eth.contract(
            address=w3.to_checksum_address(token_addr),
            abi=ERC20_ABI,
        )
        symbol   = _safe_call(tok, "symbol")   or "TOKEN"
        decimals = _safe_call(tok, "decimals") or 18
        return str(symbol), int(decimals)
    except Exception as e:
        print(f"      ⚠️  resolve_token_symbol({token_addr}): {e}")
        return "TOKEN", 18


# ====================== FAUCET DETAIL FETCHER ======================

def fetch_faucet_details_sync(
    w3: Web3,
    faucet_address: str,
    factory_address: str,
    factory_type: str,
    chain_id: int,
) -> Optional[Dict]:
    try:
        checksum = w3.to_checksum_address(faucet_address)
        contract = w3.eth.contract(address=checksum, abi=FAUCET_ABI)

        # Always check the on-chain deleted flag first
        deleted_flag = _safe_call(contract, "deleted") or False
        if deleted_flag:
            print(f"      🗑️  {checksum[:10]}... is deleted on-chain — skipping")
            return None

        name            = _safe_call(contract, "name")          or f"Faucet {faucet_address[:6]}...{faucet_address[-4:]}"
        owner           = _safe_call(contract, "owner")         or ""
        token_addr      = _safe_call(contract, "token")         or "0x0000000000000000000000000000000000000000"
        claim_amount    = _safe_call(contract, "claimAmount")   or 0
        start_time      = _safe_call(contract, "startTime")     or 0
        end_time        = _safe_call(contract, "endTime")       or 0
        is_claim_active = _safe_call(contract, "isClaimActive") or False
        is_paused       = _safe_call(contract, "paused")        or False
        use_backend     = _safe_call(contract, "useBackend")    or False

        balance_tuple = _safe_call(contract, "getFaucetBalance")
        balance  = str(balance_tuple[0]) if balance_tuple else "0"
        is_ether = bool(balance_tuple[1]) if balance_tuple else False

        token_symbol, token_decimals = resolve_token_symbol(
            w3, str(token_addr), is_ether, chain_id
        )

        print(
            f"      🪙  {checksum[:10]}... token={token_addr[:10]}... "
            f"is_ether={is_ether} → symbol={token_symbol} decimals={token_decimals}"
        )

        return {
            "faucet_address":  faucet_address.lower(),
            "chain_id":        chain_id,
            "network_name":    CHAIN_CONFIGS_V2.get(chain_id, {}).get("name", str(chain_id)),
            "factory_address": factory_address.lower(),
            "factory_type":    factory_type,
            "faucet_name":     name,
            "token_address":   str(token_addr).lower(),
            "token_symbol":    token_symbol,
            "token_decimals":  token_decimals,
            "is_ether":        is_ether,
            "balance":         balance,
            "claim_amount":    str(claim_amount),
            "start_time":      int(start_time),
            "end_time":        int(end_time),
            "is_claim_active": is_claim_active,
            "is_paused":       is_paused,
            "owner_address":   owner.lower() if owner else "",
            "use_backend":     use_backend,
            "slug":            _make_slug(name, faucet_address),
            "image_url":       "",
            "description":     "",
        }
    except Exception as e:
        print(f"   ⚠️  fetch_faucet_details_sync({faucet_address}): {e}")
        return None


async def _enrich_with_metadata(rows: List[Dict]) -> List[Dict]:
    async def _fetch_one(row: Dict) -> Dict:
        addr = row["faucet_address"]
        try:
            loop = asyncio.get_running_loop()
            resp = await loop.run_in_executor(
                None,
                lambda: requests.get(
                    f"https://faucetdrop-backend.onrender.com/faucet-metadata/{addr}",
                    timeout=4,
                ),
            )
            if resp.ok:
                meta = resp.json()
                row["image_url"]   = meta.get("imageUrl", "")
                row["description"] = meta.get("description", "")
        except Exception:
            pass
        return row

    return await asyncio.gather(*[_fetch_one(r) for r in rows])


# ====================== SUPABASE SAVE HELPER ======================

def save_dashboard_to_supabase(data: Dict[str, Any]) -> None:
    if not supabase:
        return

    now_iso = data.get("last_updated") or datetime.utcnow().isoformat()

    try:
        # ── 1. faucet_data ──────────────────────────────────────────────────
        faucet_rows = [
            {
                "network":  item["network"],
                "faucets":  item["faucets"],
                "chain_id": next(
                    (cid for cid, cfg in CHAIN_CONFIGS.items() if cfg["name"] == item["network"]),
                    0,
                ),
                "color":    NETWORK_COLORS.get(item["network"], "#888888"),
            }
            for item in data["network_faucets"]
        ]
        for chunk in _chunks(faucet_rows, 100):
            supabase.table("faucet_data").upsert(chunk, on_conflict="network").execute()

        # ── 2. user_data ────────────────────────────────────────────────────
        user_rows = [
            {
                "date":             item["date"],
                "new_users":        item["newUsers"],
                "cumulative_users": item["cumulativeUsers"],
            }
            for item in data["users_chart"]
        ]
        for chunk in _chunks(user_rows, 100):
            supabase.table("user_data").upsert(chunk, on_conflict="date").execute()

        # ── 3. claim_data ───────────────────────────────────────────────────
        claim_rows = [
            {
                "faucet_address":     item["faucetAddress"],
                "faucet_name":        item["faucetName"],
                "network":            item["network"],
                "chain_id":           item["chainId"],
                "rank":               item["rank"],
                "claims":             item["totalClaims"],
                "total_transactions": item["totalClaims"],
                "total_amount":       "0",
                "latest_claim_time":  item["latestClaimTime"],
                "updated_at":         now_iso,
            }
            for item in data["faucet_rankings"]
        ]
        for chunk in _chunks(claim_rows, 100):
            supabase.table("claim_data").upsert(chunk, on_conflict="faucet_address").execute()

        # ── 4. network_tx_data ──────────────────────────────────────────────
        net_tx_rows = [
            {
                "network":            item["name"],
                "total_transactions": item["totalTransactions"],
                "chain_id":           item["chainId"],
                "color":              item["color"],
                "updated_at":         now_iso,
            }
            for item in data["network_transactions"]
        ]
        for chunk in _chunks(net_tx_rows, 100):
            supabase.table("network_tx_data").upsert(chunk, on_conflict="network").execute()

        # ── 5. dashboard_meta ───────────────────────────────────────────────
        supabase.table("dashboard_meta").upsert(
            {
                "id":                 1,
                "total_claims":       data["total_claims"],
                "total_unique_users": data["total_unique_users"],
                "total_faucets":      data["total_faucets"],
                "total_transactions": data["total_transactions"],
                "last_updated":       now_iso,
            },
            on_conflict="id",
        ).execute()

        print(f"✅ [save_dashboard_to_supabase] all tables updated at {now_iso}")

        # ── 6. Evict deleted faucets from claim_data ────────────────────────
        try:
            deleted_addrs = asyncio.get_event_loop().run_until_complete(fetch_deleted_faucets())
            for addr in deleted_addrs:
                supabase.table("claim_data").delete().eq("faucet_address", addr).execute()
            if deleted_addrs:
                print(f"   🗑️  Evicted {len(deleted_addrs)} deleted faucets from claim_data")
        except Exception as evict_err:
            print(f"   ⚠️  Eviction step failed: {evict_err}")

    except Exception as e:
        print(f"⚠️  [save_dashboard_to_supabase] failed: {e}")

async def collect_quest_quiz_unique_participants() -> set:
    """
    Also reads participants directly from Supabase tables
    (quest_participants, faucet_quiz_participants) as a supplement to
    on-chain calls, so we never miss users that are in the DB but not
    yet reflected on-chain or vice versa.
    """
    all_participants: set = set()

    _PARTICIPANTS_ABI = [
        {
            "inputs": [],
            "name": "getUniqueParticipants",
            "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
            "stateMutability": "view",
            "type": "function",
        }
    ]
    _GET_ALL_QUESTS_ABI = [
        {
            "inputs": [],
            "name": "getAllQuests",
            "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
            "stateMutability": "view",
            "type": "function",
        }
    ]
    _GET_ALL_QUIZZES_ABI = [
        {
            "inputs": [],
            "name": "getAllQuizzes",
            "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
            "stateMutability": "view",
            "type": "function",
        }
    ]

    loop = asyncio.get_running_loop()

    def _fetch_sync():
        participants: set = set()

        for chain_id, cfg in CHAIN_CONFIGS.items():
            chain_name = cfg["name"]
            try:
                w3 = get_web3(cfg["rpcUrls"])
            except Exception as e:
                print(f"   ⚠️  [{chain_name}] RPC failed: {e}")
                continue

            kinds = [
                ("quest", cfg.get("Quests", []), _GET_ALL_QUESTS_ABI, "quests",          "faucet_address"),
                ("quiz",  cfg.get("quiz",   []), _GET_ALL_QUIZZES_ABI, "faucet_quizzes", "faucet_address"),
            ]

            for kind, factory_addrs_raw, getter_abi, sb_table, sb_col in kinds:
                if isinstance(factory_addrs_raw, str):
                    factory_addrs_raw = [factory_addrs_raw] if factory_addrs_raw else []

                item_addresses: set = set()

                for factory_raw in factory_addrs_raw:
                    if not factory_raw or is_placeholder_address(factory_raw):
                        continue
                    factory_cs = safe_checksum(w3, factory_raw)
                    if not factory_cs:
                        continue

                    try:
                        fc = w3.eth.contract(address=factory_cs, abi=getter_abi)
                        fn_name = "getAllQuests" if kind == "quest" else "getAllQuizzes"
                        on_chain_addrs = fc.functions[fn_name]().call()
                        item_addresses.update(a.lower() for a in on_chain_addrs if a)
                        print(f"   ✅ [{chain_name}] {kind} factory {factory_cs[:10]}...: "
                            f"{len(on_chain_addrs)} addresses from chain")
                    except Exception as e:
                        print(f"   ⚠️  [{chain_name}] {kind} factory {factory_cs[:10]}... "
                            f"on-chain getter failed: {e}")

                if supabase:
                    try:
                        rows = supabase.table(sb_table).select(sb_col).execute().data or []
                        sb_addrs = {r[sb_col].lower() for r in rows if r.get(sb_col)
                                    and not is_placeholder_address(r[sb_col])}
                        new_from_sb = sb_addrs - item_addresses
                        if new_from_sb:
                            print(f"   ➕ [{chain_name}] {kind} Supabase added "
                                f"{len(new_from_sb)} extra addresses")
                        item_addresses.update(sb_addrs)
                    except Exception as e:
                        print(f"   ⚠️  [{chain_name}] {kind} Supabase fetch failed: {e}")

                print(f"   🔍 [{chain_name}] calling getUniqueParticipants on "
                    f"{len(item_addresses)} {kind} contracts...")

                for addr_lower in item_addresses:
                    cs = safe_checksum(w3, addr_lower)
                    if not cs:
                        continue
                    try:
                        contract = w3.eth.contract(address=cs, abi=_PARTICIPANTS_ABI)
                        raw_participants = contract.functions.getUniqueParticipants().call()
                        before = len(participants)
                        participants.update(p.lower() for p in raw_participants if p)
                        added = len(participants) - before
                        print(f"      📄 {kind} {cs[:10]}...: "
                            f"{len(raw_participants)} participants, +{added} new unique")
                    except Exception as e:
                        print(f"      ⚠️  {kind} {cs[:10]}... getUniqueParticipants failed: {e}")

        return participants

    def _fetch_db_participants() -> set:
        db_participants: set = set()
        if not supabase:
            return db_participants

        # Quest participants from DB
        try:
            rows = supabase.table("quest_participants").select("wallet_address").execute().data or []
            added = {r["wallet_address"].lower() for r in rows if r.get("wallet_address")}
            db_participants.update(added)
            print(f"   📦 [DB] quest_participants: {len(added)} wallet addresses")
        except Exception as e:
            print(f"   ⚠️  [DB] quest_participants fetch failed: {e}")

        # Quiz participants from DB
        try:
            rows = supabase.table("faucet_quiz_participants").select("wallet_address").execute().data or []
            added = {r["wallet_address"].lower() for r in rows if r.get("wallet_address")}
            db_participants.update(added)
            print(f"   📦 [DB] faucet_quiz_participants: {len(added)} wallet addresses")
        except Exception as e:
            print(f"   ⚠️  [DB] faucet_quiz_participants fetch failed: {e}")

        return db_participants

    try:
        onchain_result = await loop.run_in_executor(None, _fetch_sync)
        db_result      = await loop.run_in_executor(None, _fetch_db_participants)

        combined = onchain_result | db_result
        only_in_db = db_result - onchain_result

        print(
            f"\n  📊 Quest/Quiz participants:\n"
            f"     On-chain (getUniqueParticipants): {len(onchain_result)}\n"
            f"     DB-only (quest+quiz tables):      {len(only_in_db)}\n"
            f"     Combined unique:                  {len(combined)}"
        )

        print(f"\n✅ [collect_quest_quiz_unique_participants] "
            f"Total truly unique participants across all quests + quizzes: {len(combined)}")
        return combined
    except Exception as e:
        print(f"⚠️  [collect_quest_quiz_unique_participants] failed: {e}")
        return set()


# ====================== BACKGROUND JOB: network_faucets + faucet_details ======================

async def refresh_network_faucets():
    """
    Crawls every chain → every typed factory → every faucet.
    Checks BOTH on-chain deleted flag AND deleted-faucets list before saving.
    Cleans up stale deleted rows from both network_faucets and faucet_details.
    """
    print(f"🔄 [refresh_network_faucets] started at {datetime.utcnow()}")

    deleted_set: set = await fetch_deleted_faucets()
    print(f"   🗑️  Gating {len(deleted_set)} known deleted faucets")

    for chain_id, cfg in CHAIN_CONFIGS_V2.items():
        factories_map: Dict[str, str] = cfg.get("factories", {})
        if not factories_map:
            continue

        try:
            w3 = get_web3(cfg["rpcUrls"])
        except Exception as e:
            print(f"   ⚠️  {cfg['name']}: all RPCs failed — {e}")
            continue

        meta_rows:   List[Dict] = []
        detail_rows: List[Dict] = []

        for factory_addr, factory_type in factories_map.items():
            if is_placeholder_address(factory_addr):
                continue
            factory_cs = safe_checksum(w3, factory_addr)
            if not factory_cs:
                continue

            faucet_list = _get_all_faucets_from_factory(w3, factory_cs)
            print(f"   📋 {cfg['name']}/{factory_cs[:10]}... ({factory_type}): {len(faucet_list)} faucets")

            for faucet_raw in faucet_list:
                faucet_cs = safe_checksum(w3, faucet_raw)
                if not faucet_cs:
                    continue

                # Gate 1 — check known deleted list (fast, no RPC)
                if faucet_cs.lower() in deleted_set:
                    print(f"      🗑️  {faucet_cs[:10]}... in deleted list — skipping")
                    continue

                # fetch_faucet_details_sync already does Gate 2 (on-chain deleted flag)
                detail = fetch_faucet_details_sync(w3, faucet_cs, factory_addr, factory_type, chain_id)
                if detail is None:
                    # Either deleted on-chain or fetch failed — evict from DB to be safe
                    if supabase:
                        try:
                            supabase.table("network_faucets").delete().eq("faucet_address", faucet_cs.lower()).execute()
                            supabase.table("faucet_details").delete().eq("faucet_address", faucet_cs.lower()).execute()
                        except Exception:
                            pass
                    continue

                detail_rows.append(detail)

                meta_rows.append({
                    "faucet_address":  detail["faucet_address"],
                    "chain_id":        chain_id,
                    "network_name":    cfg["name"],
                    "factory_address": factory_addr.lower(),
                    "factory_type":    factory_type,
                    "faucet_name":     detail["faucet_name"],
                    "slug":            detail["slug"],
                    "token_symbol":    detail["token_symbol"],
                    "token_decimals":  detail["token_decimals"],
                    "is_ether":        detail["is_ether"],
                    "is_claim_active": detail["is_claim_active"],
                    "owner_address":   detail["owner_address"],
                    "start_time":      detail["start_time"],
                })

        detail_rows = await _enrich_with_metadata(detail_rows)

        if supabase and meta_rows:
            try:
                for chunk in _chunks(meta_rows, 100):
                    supabase.table("network_faucets").upsert(chunk, on_conflict="faucet_address").execute()
                for chunk in _chunks(detail_rows, 100):
                    supabase.table("faucet_details").upsert(chunk, on_conflict="faucet_address").execute()
                print(f"   ✅ {cfg['name']}: saved {len(meta_rows)} live faucets")
            except Exception as e:
                print(f"   ⚠️  {cfg['name']}: Supabase upsert failed — {e}")

    # Evict ALL known deleted faucets from both tables after crawl
    if supabase and deleted_set:
        evicted = 0
        for addr in deleted_set:
            try:
                supabase.table("network_faucets").delete().eq("faucet_address", addr).execute()
                supabase.table("faucet_details").delete().eq("faucet_address", addr).execute()
                evicted += 1
            except Exception:
                pass
        print(f"   🗑️  Evicted {evicted} deleted faucets from network_faucets + faucet_details")

    print(f"✅ [refresh_network_faucets] done")


# ====================== BACKGROUND JOB: dashboard ======================

def _fetch_quest_quiz_participant_dates() -> dict:
    """
    Returns {wallet_address_lower: "YYYY-MM-DD"} for the earliest
    participation date across quests and quizzes.
    Only uses Supabase — on-chain getUniqueParticipants has no timestamps.
    """
    first_date: dict = {}

    if not supabase:
        return first_date

    # Quest participants
    try:
        rows = supabase.table("quest_participants")\
            .select("wallet_address, created_at")\
            .execute().data or []
        for r in rows:
            addr = (r.get("wallet_address") or "").lower()
            ts   = r.get("created_at")
            if not addr or not ts:
                continue
            try:
                date_str = datetime.fromisoformat(
                    str(ts).replace("Z", "+00:00")
                ).strftime("%Y-%m-%d")
                if addr not in first_date or date_str < first_date[addr]:
                    first_date[addr] = date_str
            except Exception:
                continue
    except Exception as e:
        print(f"   ⚠️  [quest participant dates] {e}")

    # Quiz participants
    try:
        rows = supabase.table("faucet_quiz_participants")\
            .select("wallet_address, created_at")\
            .execute().data or []
        for r in rows:
            addr = (r.get("wallet_address") or "").lower()
            ts   = r.get("created_at")
            if not addr or not ts:
                continue
            try:
                date_str = datetime.fromisoformat(
                    str(ts).replace("Z", "+00:00")
                ).strftime("%Y-%m-%d")
                if addr not in first_date or date_str < first_date[addr]:
                    first_date[addr] = date_str
            except Exception:
                continue
    except Exception as e:
        print(f"   ⚠️  [quiz participant dates] {e}")

    print(f"   📅 [quest/quiz dates] {len(first_date)} dated participants")
    return first_date


async def refresh_all_data():
    global dashboard_data
    print(f"🔄 [refresh_all_data] started at {datetime.utcnow()}")
    all_claims           = []
    all_txs_count        = 0
    network_stats        = []
    network_faucets_list = []
    unique_users: set    = set()
    faucet_stats         = {}

    # Fetch deleted set ONCE from both sources at the start
    deleted = await fetch_deleted_faucets()
    print(f"   🗑️  Deleted faucets to exclude: {len(deleted)}")

    for chain_id, cfg in CHAIN_CONFIGS.items():
        chain_name  = cfg["name"]
        chain_color = NETWORK_COLORS.get(chain_name, "#888888")
        try:
            w3 = get_web3(cfg["rpcUrls"])
        except Exception as e:
            print(f"⚠️  {chain_name}: All RPCs failed — {e}")
            network_stats.append({"name": chain_name, "chainId": chain_id, "totalTransactions": 0, "color": chain_color})
            network_faucets_list.append({"network": chain_name, "faucets": 0})
            continue

        chain_tx_count     = 0
        chain_faucet_count = 0
        chain_claim_txs    = []

        for factory_addr in cfg["factoryAddresses"]:
            if is_placeholder_address(factory_addr):
                continue
            addr_checksum = safe_checksum(w3, factory_addr)
            if not addr_checksum:
                continue

            contract_type, data_a, data_b = detect_and_call(w3, addr_checksum)

            if contract_type in ("factory", "quest"):
                factory_txs      = data_a
                faucet_addresses = data_b
                chain_tx_count += len(factory_txs)
                claims = [tx for tx in factory_txs if str(tx[1]).lower() in ("claim", "claimwhenactive")]
                chain_claim_txs.extend(claims)
                label = "QUEST" if contract_type == "quest" else "FACTORY"
                print(f"   📋 {chain_name}/{addr_checksum[:10]}... {label}: {len(factory_txs)} txs, {len(claims)} claims")

                for faucet_raw in faucet_addresses:
                    faucet_cs = safe_checksum(w3, faucet_raw)
                    if not faucet_cs:
                        continue
                    addr_lower = faucet_cs.lower()

                    if addr_lower in deleted:
                        continue

                    if addr_lower not in faucet_stats and _is_deleted_onchain(w3, faucet_cs):
                        print(f"      🗑️  {faucet_cs[:10]}... deleted on-chain — skipping")
                        deleted.add(addr_lower)
                        continue

                    chain_faucet_count += 1
                    if addr_lower not in faucet_stats:
                        faucet_stats[addr_lower] = {
                            "claims": 0, "latest": 0, "name": "",
                            "network": chain_name, "chainId": chain_id,
                            "w3": w3, "addr_checksum": faucet_cs, "checkin_txs": 0,
                        }

            elif contract_type == "checkin":
                tx_count     = data_a
                participants = data_b
                addr_lower   = addr_checksum.lower()
                chain_tx_count += tx_count
                if addr_lower not in deleted:
                    chain_faucet_count += 1
                    before = len(unique_users)
                    unique_users.update(participants)
                    print(f"   🔄 {chain_name}/{addr_checksum[:10]}... CHECKIN: {tx_count} txs, "
                        f"{len(participants)} participants (+{len(unique_users)-before} new unique)")
                    if addr_lower not in faucet_stats:
                        faucet_stats[addr_lower] = {
                            "claims": 0, "latest": 0, "name": "",
                            "network": chain_name, "chainId": chain_id,
                            "w3": w3, "addr_checksum": addr_checksum, "checkin_txs": tx_count,
                        }
                    else:
                        faucet_stats[addr_lower]["checkin_txs"] = tx_count
                else:
                    print(f"   🗑️  {chain_name}/{addr_checksum[:10]}... CHECKIN deleted — txs counted, faucet excluded")
            else:
                print(f"   ❓ {chain_name}/{addr_checksum[:10]}... unknown, skipping")

        for tx in chain_claim_txs:
            faucet_cs = safe_checksum(w3, str(tx[0]))
            if not faucet_cs:
                continue
            addr_lower = faucet_cs.lower()
            if addr_lower in deleted:
                continue
            claimer_cs = safe_checksum(w3, str(tx[2]))
            if claimer_cs:
                unique_users.add(claimer_cs.lower())
            all_claims.append(tx)
            if addr_lower not in faucet_stats:
                faucet_stats[addr_lower] = {
                    "claims": 0, "latest": 0, "name": "",
                    "network": chain_name, "chainId": chain_id,
                    "w3": w3, "addr_checksum": faucet_cs, "checkin_txs": 0,
                }
            faucet_stats[addr_lower]["claims"] += 1
            faucet_stats[addr_lower]["latest"]  = max(faucet_stats[addr_lower]["latest"], int(tx[5]))

        for addr_lower, stats in faucet_stats.items():
            if stats["chainId"] != chain_id or stats["claims"] > 0 or stats["checkin_txs"] > 0:
                continue
            checkin_count, checkin_participants = _try_checkin(stats["w3"], stats["addr_checksum"])
            if checkin_count > 0:
                stats["checkin_txs"]  = checkin_count
                chain_tx_count       += checkin_count
                before = len(unique_users)
                unique_users.update(checkin_participants)
                print(f"      🔄 CHECKIN fallback {stats['addr_checksum'][:10]}...: "
                    f"{checkin_count} txs (+{len(unique_users)-before} new unique)")

        quest_quiz_tx_count = 0
        for kind, cfg_key in (("quest", "Quests"), ("quiz", "quiz")):
            factory_addrs_raw = cfg.get(cfg_key, [])
            if isinstance(factory_addrs_raw, str):
                factory_addrs_raw = [factory_addrs_raw] if factory_addrs_raw else []

            factory_abi = QUEST_FACTORY_ABI if kind == "quest" else QUIZ_FACTORY_ABI

            for factory_addr_raw in factory_addrs_raw:
                if not factory_addr_raw or is_placeholder_address(factory_addr_raw):
                    continue
                factory_cs = safe_checksum(w3, factory_addr_raw)
                if not factory_cs:
                    continue
                try:
                    fc = w3.eth.contract(address=factory_cs, abi=factory_abi)
                    factory_txs = fc.functions.getAllTransactions().call()
                    quest_quiz_tx_count += len(factory_txs)
                    chain_tx_count      += len(factory_txs)
                    print(f"   ✅ {chain_name}/{factory_cs[:10]}... {kind.upper()}-FACTORY: "
                        f"{len(factory_txs)} txs")
                except Exception:
                    print(f"   ⚠️  {chain_name} {kind} factory {factory_cs[:10]}... "
                        f"getAllTransactions() failed — skipping tx count")

        if quest_quiz_tx_count > 0:
            print(f"   📊 {chain_name}: +{quest_quiz_tx_count} txs from quest/quiz factories")

        all_txs_count += chain_tx_count
        network_stats.append({"name": chain_name, "chainId": chain_id,
                            "totalTransactions": chain_tx_count, "color": chain_color})
        network_faucets_list.append({"network": chain_name, "faucets": chain_faucet_count})
        print(f"   ✅ {chain_name}: {chain_tx_count} txs total, {chain_faucet_count} active faucets")

    # ── Quest + Quiz unique participants ──
    print(f"\n📊 [refresh_all_data] Collecting unique quest/quiz participants...")
    users_from_faucets = len(unique_users)

    quest_quiz_participants = await collect_quest_quiz_unique_participants()

    already_seen  = quest_quiz_participants & unique_users
    net_new       = quest_quiz_participants - unique_users
    unique_users.update(quest_quiz_participants)

    print(
        f"\n{'─'*60}\n"
        f"  👥 Unique user breakdown:\n"
        f"     Faucet claims + checkins : {users_from_faucets:>6}\n"
        f"     Quest/Quiz participants  : {len(quest_quiz_participants):>6}\n"
        f"       └─ already in faucets : {len(already_seen):>6}\n"
        f"       └─ net new (quest/quiz): {len(net_new):>6}\n"
        f"     TOTAL unique users       : {len(unique_users):>6}\n"
        f"{'─'*60}"
    )

    print(f"🔤 Fetching names for {len(faucet_stats)} faucets...")
    for addr_lower, stats in faucet_stats.items():
        stats["name"] = get_faucet_name_sync(stats["w3"], stats["addr_checksum"])

    # ── Faucet claim dates (existing) ──
    first_claim_per_user = {}
    for tx in all_claims:
        claimer  = str(tx[2]).lower()
        date_str = datetime.fromtimestamp(int(tx[5])).strftime("%Y-%m-%d")
        if claimer not in first_claim_per_user or date_str < first_claim_per_user[claimer]:
            first_claim_per_user[claimer] = date_str

    # ── Merge quest/quiz participant dates ──
    loop = asyncio.get_running_loop()
    quest_quiz_dates = await loop.run_in_executor(
        None, _fetch_quest_quiz_participant_dates
    )
    merged_qq = 0
    for addr, date_str in quest_quiz_dates.items():
        if addr not in first_claim_per_user or date_str < first_claim_per_user[addr]:
            first_claim_per_user[addr] = date_str
            merged_qq += 1
    print(f"   📅 Merged {merged_qq} quest/quiz-only dated users into users_chart")

    new_users_by_date = defaultdict(int)
    for date_str in first_claim_per_user.values():
        new_users_by_date[date_str] += 1

    users_chart = []
    cumulative  = 0
    for date_str in sorted(new_users_by_date.keys()):
        new = new_users_by_date[date_str]
        cumulative += new
        users_chart.append({"date": date_str, "newUsers": new, "cumulativeUsers": cumulative})

    total_claims   = len(all_claims)
    sorted_faucets = sorted(faucet_stats.items(), key=lambda x: x[1]["latest"], reverse=True)
    rankings = [
        {
            "rank":            i + 1,
            "faucetAddress":   addr,
            "faucetName":      stats["name"],
            "network":         stats["network"],
            "chainId":         stats["chainId"],
            "totalClaims":     stats["claims"],
            "latestClaimTime": stats["latest"],
        }
        for i, (addr, stats) in enumerate(sorted_faucets)
    ]

    sorted_by_claims = sorted(faucet_stats.items(), key=lambda x: x[1]["claims"], reverse=True)
    pie = [
        {
            "name":          stats["name"],
            "value":         stats["claims"],
            "faucetAddress": addr,
            "network":       stats["network"],
        }
        for addr, stats in sorted_by_claims[:10]
    ]

    others_count   = sum(s["claims"] for _, s in sorted_by_claims[10:])
    others_faucets = len(sorted_by_claims) - 10
    if others_count > 0:
        pie.append({"name": f"Others ({others_faucets})", "value": others_count,
                    "faucetAddress": "others", "network": ""})

    dashboard_data = {
        "total_claims":         total_claims,
        "total_unique_users":   len(unique_users),
        "total_faucets":        sum(x["faucets"] for x in network_faucets_list),
        "total_transactions":   all_txs_count,
        "claims_pie_data":      pie,
        "faucet_rankings":      rankings,
        "users_chart":          users_chart,
        "network_transactions": network_stats,
        "network_faucets":      network_faucets_list,
        "last_updated":         datetime.utcnow().isoformat(),
    }
    print(f"✅ Done: {total_claims} claims | {len(unique_users)} unique users | "
        f"{dashboard_data['total_faucets']} faucets | {all_txs_count} txs")
    save_dashboard_to_supabase(dashboard_data)


# --- Endpoints ---
@app.post("/api/spinners")
async def create_spinner(req: CreateSpinnerRequest):
    slug = generate_slug(req.name)
    data = {
        "slug": slug,
        "name": req.name,
        "description": req.description,
        "participants": req.participants,
        "winners": [],
        "owner_address": (req.owner_address or "").lower(),
    }
    result = supabase.table("spin_rooms").insert(data).execute()
    return {"success": True, "slug": slug, "data": result.data[0]}


@app.get("/api/spinners/{slug}")
async def get_spinner(slug: str):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        result = supabase.table("spin_rooms").select("*").eq("slug", slug).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Spinner not found")

        return {"success": True, "data": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/spinners/my-rooms")
async def get_my_rooms(address: str = Query(...)):
    result = supabase.table("spin_rooms")\
        .select("slug, name, description, participants, created_at")\
        .eq("owner_address", address.lower())\
        .order("created_at", desc=True)\
        .execute()
    return {"success": True, "rooms": result.data or []}

@app.patch("/api/spinners/{slug}")
async def update_spinner(slug: str, req: UpdateSpinnerRequest):
    room = supabase.table("spin_rooms").select("owner_address").eq("slug", slug).single().execute()
    if not room.data:
        raise HTTPException(status_code=404, detail="Room not found")

    owner = (room.data.get("owner_address") or "").lower()
    caller = (req.caller_address or "").lower()

    # If room has an owner, enforce it
    if owner and caller != owner:
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = {"participants": req.participants}
    if req.winners is not None:
        update_data["winners"] = req.winners
    result = supabase.table("spin_rooms").update(update_data).eq("slug", slug).execute()
    return {"success": True, "data": result.data[0]}


@app.get("/api/quests")
async def get_all_quests_for_dashboard():
    """All quests for the analytics dashboard table."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        quest_rows = supabase.table("quests").select("*").execute().data or []

        p_rows = supabase.table("quest_participants")\
            .select("quest_address, wallet_address").execute().data or []
        participant_counts: dict = {}
        for p in p_rows:
            addr = p["quest_address"]
            participant_counts[addr] = participant_counts.get(addr, 0) + 1

        t_rows = supabase.table("faucet_tasks")\
            .select("faucet_address, tasks").execute().data or []
        task_counts: dict = {
            r["faucet_address"]: len(r.get("tasks") or [])
            for r in t_rows
        }

        quests = []
        for q in quest_rows:
            addr = q.get("faucet_address", "")
            quests.append({
                "faucetAddress":     addr,
                "title":             q.get("title", "Untitled Quest"),
                "isActive":          q.get("is_active", False),
                "isDraft":           q.get("is_draft", False),
                "isFunded":          q.get("is_funded", False),
                "totalParticipants": participant_counts.get(addr, 0),
                "tasksCount":        task_counts.get(addr, 0),
                "rewardPool":        q.get("reward_pool", "0"),
                "tokenSymbol":       q.get("token_symbol", ""),
            })

        return {"success": True, "quests": quests, "count": len(quests)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/quiz/list")
async def get_all_quizzes_for_dashboard():
    """All quizzes for the analytics dashboard table."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        quiz_rows = supabase.table("faucet_quizzes").select(
            "id, code, title, status, chain_id, created_at"
        ).execute().data or []

        quiz_ids = [q["id"] for q in quiz_rows]
        if not quiz_ids:
            return {"success": True, "quizzes": [], "count": 0}

        p_rows = supabase.table("faucet_quiz_participants")\
            .select("quiz_id").execute().data or []
        player_counts: dict = {}
        for p in p_rows:
            qid = p["quiz_id"]
            player_counts[qid] = player_counts.get(qid, 0) + 1

        q_rows = supabase.table("faucet_quiz_questions")\
            .select("quiz_id").execute().data or []
        question_counts: dict = {}
        for q in q_rows:
            qid = q["quiz_id"]
            question_counts[qid] = question_counts.get(qid, 0) + 1

        r_rows = supabase.table("faucet_quiz_rewards")\
            .select("quiz_id, pool_amount, token_symbol").execute().data or []
        reward_map: dict = {
            r["quiz_id"]: {
                "poolAmount":  float(r.get("pool_amount") or 0),
                "tokenSymbol": r.get("token_symbol", ""),
            }
            for r in r_rows
        }

        quizzes = []
        for q in quiz_rows:
            qid    = q["id"]
            reward = reward_map.get(qid)
            quizzes.append({
                "code":           (q.get("code") or "").upper(),
                "title":          q.get("title", "Untitled Quiz"),
                "status":         q.get("status", "waiting"),
                "playerCount":    player_counts.get(qid, 0),
                "totalQuestions": question_counts.get(qid, 0),
                "reward": reward if reward and reward["poolAmount"] > 0 else None,
            })

        order = {"active": 0, "waiting": 1, "finished": 2}
        quizzes.sort(key=lambda x: order.get(x["status"], 3))

        return {"success": True, "quizzes": quizzes, "count": len(quizzes)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ====================== SUPABASE DASHBOARD LOADER ======================

def load_from_supabase() -> Optional[dict]:
    meta_rows = supabase.table("dashboard_meta").select("*").eq("id", 1).execute().data
    meta = meta_rows[0] if meta_rows else {}

    faucet_rows = supabase.table("faucet_data").select("*").execute().data or []
    network_faucets = [{"network": r["network"], "faucets": r["faucets"]} for r in faucet_rows]
    total_faucets   = meta.get("total_faucets") or sum(r["faucets"] for r in network_faucets)

    user_rows = supabase.table("user_data").select("*").order("date", desc=False).execute().data or []
    users_chart        = [{"date": r["date"], "newUsers": r["new_users"], "cumulativeUsers": r["cumulative_users"]} for r in user_rows]
    total_unique_users = meta.get("total_unique_users") or (user_rows[-1]["cumulative_users"] if user_rows else 0)

    claim_rows = supabase.table("claim_data").select("*").order("latest_claim_time", desc=True).execute().data or []
    if not claim_rows and not meta:
        return None

    total_claims       = meta.get("total_claims")       or sum(r["claims"] for r in claim_rows)
    total_transactions = meta.get("total_transactions") or sum(r.get("total_transactions", r["claims"]) for r in claim_rows)

    faucet_rankings = [
        {
            "rank":            r.get("rank") or i + 1,
            "faucetAddress":   r["faucet_address"],
            "faucetName":      r["faucet_name"],
            "network":         r["network"],
            "chainId":         r.get("chain_id") or 0,
            "totalClaims":     r["claims"],
            "latestClaimTime": r["latest_claim_time"],
        }
        for i, r in enumerate(claim_rows)
    ]

    net_tx_rows = supabase.table("network_tx_data").select("*").execute().data or []
    if net_tx_rows:
        network_transactions = [
            {
                "name":              r["network"],
                "chainId":           r.get("chain_id") or 0,
                "totalTransactions": r["total_transactions"],
                "color":             r.get("color") or NETWORK_COLORS.get(r["network"], "#888888"),
            }
            for r in net_tx_rows
        ]
    else:
        network_tx_map: Dict[str, int] = {}
        for r in claim_rows:
            net = r["network"]
            network_tx_map[net] = network_tx_map.get(net, 0) + r.get("total_transactions", r["claims"])
        for nf in network_faucets:
            network_tx_map.setdefault(nf["network"], 0)
        network_transactions = [
            {
                "name":              net,
                "chainId":           next((cid for cid, cfg in CHAIN_CONFIGS.items() if cfg["name"] == net), 0),
                "totalTransactions": tx_count,
                "color":             NETWORK_COLORS.get(net, "#888888"),
            }
            for net, tx_count in network_tx_map.items()
        ]

    sorted_by_claims = sorted(claim_rows, key=lambda r: r["claims"], reverse=True)
    pie = [
        {
            "name":          r["faucet_name"],
            "value":         r["claims"],
            "faucetAddress": r["faucet_address"],
            "network":       r["network"],
        }
        for r in sorted_by_claims[:10]
    ]
    others_count = sum(r["claims"] for r in sorted_by_claims[10:])
    if others_count > 0:
        pie.append({
            "name":          f"Others ({len(sorted_by_claims) - 10})",
            "value":         others_count,
            "faucetAddress": "others",
            "network":       "",
        })

    last_updated = meta.get("last_updated") or datetime.utcnow().isoformat()

    return {
        "total_claims":         total_claims,
        "total_unique_users":   total_unique_users,
        "total_faucets":        total_faucets,
        "total_transactions":   total_transactions,
        "claims_pie_data":      pie,
        "faucet_rankings":      faucet_rankings,
        "users_chart":          users_chart,
        "network_transactions": network_transactions,
        "network_faucets":      network_faucets,
        "last_updated":         last_updated,
    }

# ====================== ANALYTICS ENDPOINT (Supabase-driven) ======================

async def build_faucet_analytics() -> dict:
    try:
        # Fetch deleted set to gate network_faucets rows
        deleted_set = await fetch_deleted_faucets()

        # Single fetch of meta — use as the ONE source of truth for totals
        meta_rows = supabase.table("dashboard_meta").select("*").eq("id", 1).execute().data
        meta = meta_rows[0] if meta_rows else {}

        # Faucet rows from network_faucets — filter out deleted
        all_faucet_rows = supabase.table("network_faucets").select("*").execute().data or []
        faucet_rows = [
            f for f in all_faucet_rows
            if f.get("faucet_address", "").lower() not in deleted_set
        ]

        # Use dashboard_meta as the single source of truth for all totals
        total_faucets     = meta.get("total_faucets", 0)
        total_drops       = meta.get("total_claims", 0)
        unique_users      = meta.get("total_unique_users", 0)
        avg_drop_per_user = round(total_drops / unique_users, 2) if unique_users else 0

        # Monthly volume: aggregate claim_data by month + factory_type
        # Filter claim_data to exclude deleted faucets too
        claim_rows_raw = supabase.table("claim_data").select("*").execute().data or []
        claim_rows = [
            r for r in claim_rows_raw
            if r.get("faucet_address", "").lower() not in deleted_set
        ]

        faucet_type_map = {
            f["faucet_address"]: f.get("factory_type", "dropcode")
            for f in faucet_rows
        }

        MONTH_ORDER = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
        monthly_map: dict = {}

        for row in claim_rows:
            ts = row.get("latest_claim_time")
            if not ts:
                continue
            try:
                if isinstance(ts, (int, float)):
                    dt = datetime.fromtimestamp(int(ts))
                else:
                    dt = datetime.fromisoformat(str(ts))
                month_key = dt.strftime("%b")
            except Exception:
                continue

            if month_key not in monthly_map:
                monthly_map[month_key] = {"month": month_key, "dropcode": 0, "droplist": 0, "custom": 0}

            faucet_addr = row.get("faucet_address", "")
            ftype = faucet_type_map.get(faucet_addr, "dropcode")
            ftype = ftype if ftype in ("dropcode", "droplist", "custom") else "dropcode"
            monthly_map[month_key][ftype] += row.get("claims", 0)

        monthly_volume = sorted(
            monthly_map.values(),
            key=lambda x: MONTH_ORDER.index(x["month"]) if x["month"] in MONTH_ORDER else 99
        )[-7:]

        # Type split (% of live faucets by factory_type)
        type_counts: dict = {"dropcode": 0, "droplist": 0, "custom": 0}
        for f in faucet_rows:
            ft = f.get("factory_type", "dropcode")
            if ft in type_counts:
                type_counts[ft] += 1
        total_typed = sum(type_counts.values()) or 1
        type_split = [
            {"name": "DropCode", "value": round(type_counts["dropcode"] / total_typed * 100)},
            {"name": "DropList", "value": round(type_counts["droplist"] / total_typed * 100)},
            {"name": "Custom",   "value": round(type_counts["custom"]   / total_typed * 100)},
        ]

        # Top networks by claims (excluding deleted)
        net_claims: dict = {}
        for row in claim_rows:
            net = row.get("network", "Unknown")
            net_claims[net] = net_claims.get(net, 0) + row.get("claims", 0)
        top_networks = sorted(
            [{"name": k, "value": v} for k, v in net_claims.items()],
            key=lambda x: x["value"], reverse=True
        )[:5]

        # Recent activity: top 5 live faucets by latest_claim_time
        sorted_claims = sorted(
            claim_rows,
            key=lambda r: r.get("latest_claim_time") or 0,
            reverse=True
        )[:5]
        recent_activity = []
        for row in sorted_claims:
            addr = row.get("faucet_address", "")
            ftype_raw   = faucet_type_map.get(addr, "dropcode")
            ftype_label = {"dropcode": "DropCode", "droplist": "DropList", "custom": "Custom"}.get(ftype_raw, "DropCode")
            recent_activity.append({
                "name":    row.get("faucet_name", addr[:10]),
                "type":    ftype_label,
                "network": row.get("network", ""),
                "drops":   row.get("claims", 0),
            })

        return {
            "totalFaucets":   total_faucets,
            "totalDrops":     total_drops,
            "uniqueUsers":    unique_users,
            "avgDropPerUser": avg_drop_per_user,
            "monthlyVolume":  monthly_volume,
            "typeSplit":      type_split,
            "topNetworks":    top_networks,
            "recentActivity": recent_activity,
        }
    except Exception as e:
        print(f"⚠️  [build_faucet_analytics] {e}")
        return {
            "totalFaucets": 0, "totalDrops": 0, "uniqueUsers": 0, "avgDropPerUser": 0,
            "monthlyVolume": [], "typeSplit": [], "topNetworks": [], "recentActivity": [],
        }


async def build_quest_analytics() -> dict:
    """
    Builds QuestAnalytics entirely from Supabase tables.
    Tables used: quests, quest_participants, faucet_tasks, submissions
    """
    try:
        quest_rows = supabase.table("quests").select("*").execute().data or []

        active_quests = sum(1 for q in quest_rows if q.get("is_active") and not q.get("is_draft"))
        total_quests  = len([q for q in quest_rows if not q.get("is_draft")])

        participant_rows = supabase.table("quest_participants").select("wallet_address, quest_address, points, updated_at").execute().data or []
        unique_participants = len({r["wallet_address"] for r in participant_rows})

        submission_rows = supabase.table("submissions").select("faucet_address, wallet_address, status, submitted_at").execute().data or []
        completions = sum(1 for s in submission_rows if s.get("status") == "approved")

        task_rows = supabase.table("faucet_tasks").select("faucet_address, tasks").execute().data or []
        task_count_map = {r["faucet_address"]: len(r.get("tasks") or []) for r in task_rows}
        avg_tasks = round(
            sum(task_count_map.values()) / len(task_count_map), 1
        ) if task_count_map else 0

        WEEK_LABELS = ["W1","W2","W3","W4","W5","W6","W7","W8"]
        weekly_map: dict = {}
        for sub in submission_rows:
            ts = sub.get("submitted_at")
            if not ts:
                continue
            try:
                dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
                iso_week = dt.strftime("%Y-W%W")
                if iso_week not in weekly_map:
                    weekly_map[iso_week] = {"week": iso_week, "completions": 0, "dropoffs": 0}
                if sub.get("status") == "approved":
                    weekly_map[iso_week]["completions"] += 1
                elif sub.get("status") in ("pending", "rejected"):
                    weekly_map[iso_week]["dropoffs"] += 1
            except Exception:
                continue

        weekly_completions = sorted(weekly_map.values(), key=lambda x: x["week"])[-8:]
        for i, w in enumerate(weekly_completions):
            w["week"] = f"W{i + 1}"

        task_type_counts: dict = {}
        for row in task_rows:
            for task in (row.get("tasks") or []):
                category = task.get("category") or task.get("action") or "Other"
                task_type_counts[category] = task_type_counts.get(category, 0) + 1

        task_types = sorted(
            [{"name": k, "value": v} for k, v in task_type_counts.items()],
            key=lambda x: x["value"], reverse=True
        )[:5]

        quest_participant_counts: dict = {}
        for r in participant_rows:
            addr = r["quest_address"]
            quest_participant_counts[addr] = quest_participant_counts.get(addr, 0) + 1

        quest_title_map = {q["faucet_address"]: q.get("title", q["faucet_address"][:10]) for q in quest_rows}
        top_quests = sorted(
            [
                {"name": quest_title_map.get(addr, addr[:10]), "value": count}
                for addr, count in quest_participant_counts.items()
            ],
            key=lambda x: x["value"], reverse=True
        )[:5]

        all_quests = []
        for q in quest_rows:
            if q.get("is_draft"):
                continue
            addr = q.get("faucet_address", "")
            all_quests.append({
                "address":      addr,
                "name":         q.get("title", "Untitled"),
                "network":      "Multi-chain",
                "chainId":      q.get("chain_id", 0),
                "participants": quest_participant_counts.get(addr, 0),
                "tasks":        task_count_map.get(addr, 0),
                "isActive":     q.get("is_active", False),
            })

        return {
            "activeQuests":      active_quests,
            "completions":       completions,
            "participants":      unique_participants,
            "avgTasksPerQuest":  avg_tasks,
            "weeklyCompletions": weekly_completions,
            "taskTypes":         task_types,
            "topQuests":         top_quests,
            "allQuests":         all_quests,
        }
    except Exception as e:
        print(f"⚠️  [build_quest_analytics] {e}")
        return {
            "activeQuests": 0, "completions": 0, "participants": 0, "avgTasksPerQuest": 0,
            "weeklyCompletions": [], "taskTypes": [], "topQuests": [], "allQuests": [],
        }


async def build_quiz_analytics() -> dict:
    try:
        quiz_rows = supabase.table("faucet_quizzes").select(
            "id, code, title, status, chain_id, faucet_address, creator_address, "
            "is_ai_generated, max_participants, time_per_question, created_at, "
            "rewards_distributed"
        ).execute().data or []

        total_quizzes = len(quiz_rows)
        quiz_id_map   = {q["id"]: q for q in quiz_rows}

        participant_rows = supabase.table("faucet_quiz_participants").select(
            "quiz_id, wallet_address, final_rank, final_points, points"
        ).execute().data or []

        total_attempts = len(participant_rows)

        answer_rows = supabase.table("faucet_quiz_answers").select(
            "quiz_id, wallet_address, is_correct, points_earned, answered_at"
        ).execute().data or []

        from collections import defaultdict
        answer_map: dict = defaultdict(lambda: {"correct": 0, "total": 0})
        for a in answer_rows:
            key = (a["quiz_id"], a["wallet_address"])
            answer_map[key]["total"] += 1
            if a.get("is_correct"):
                answer_map[key]["correct"] += 1

        score_bucket: dict = {str(i): 0 for i in range(11)}
        total_score_sum = 0
        for stats in answer_map.values():
            if stats["total"] == 0:
                continue
            raw_score = round((stats["correct"] / stats["total"]) * 10)
            bucket = str(min(int(raw_score), 10))
            score_bucket[bucket] = score_bucket.get(bucket, 0) + 1
            total_score_sum += raw_score

        total_scored = sum(score_bucket.values())
        passes   = sum(score_bucket.get(str(i), 0) for i in range(6, 11))
        pass_rate = round(passes / total_scored * 100) if total_scored else 0
        avg_score = round(total_score_sum / total_scored, 1) if total_scored else 0

        def band(score_int: int) -> str:
            if score_int <= 5: return "fail"
            if score_int <= 7: return "pass"
            return "excellent"

        score_distribution = [
            {"score": str(i), "count": score_bucket.get(str(i), 0), "band": band(i)}
            for i in range(11)
        ]

        DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
        daily_map: dict = {d: 0 for d in DAYS}
        for a in answer_rows:
            ts = a.get("answered_at")
            if not ts:
                continue
            try:
                dt  = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
                day = dt.strftime("%a")
                if day in daily_map:
                    daily_map[day] += 1
            except Exception:
                continue
        daily_attempts = [{"day": d, "value": daily_map[d]} for d in DAYS]

        category_map: dict = {}
        participant_counts_by_quiz: dict = defaultdict(int)
        for p in participant_rows:
            participant_counts_by_quiz[p["quiz_id"]] += 1

        for q in quiz_rows:
            name  = q.get("title") or f"Quiz {(q.get('code') or '')[:6]}"
            count = participant_counts_by_quiz.get(q["id"], 0)
            if count > 0:
                category_map[name] = category_map.get(name, 0) + count

        top_categories = sorted(
            [{"name": k, "value": v} for k, v in category_map.items()],
            key=lambda x: x["value"], reverse=True
        )[:5]

        all_quizzes = []
        for q in quiz_rows:
            all_quizzes.append({
                "address":  q.get("faucet_address") or "",
                "name":     q.get("title") or "Untitled",
                "network":  "Multi-chain",
                "chainId":  q.get("chain_id") or 0,
                "attempts": participant_counts_by_quiz.get(q["id"], 0),
            })

        return {
            "totalQuizzes":      total_quizzes,
            "attempts":          total_attempts,
            "passRate":          pass_rate,
            "avgScore":          avg_score,
            "scoreDistribution": score_distribution,
            "dailyAttempts":     daily_attempts,
            "categories":        top_categories,
            "allQuizzes":        all_quizzes,
        }
    except Exception as e:
        print(f"⚠️  [build_quiz_analytics] {e}")
        return {
            "totalQuizzes": 0, "attempts": 0, "passRate": 0, "avgScore": 0,
            "scoreDistribution": [], "dailyAttempts": [], "categories": [], "allQuizzes": [],
        }


# ── Cached analytics store ──
_analytics_cache: Dict[str, Any] = {}
_analytics_last_built: Optional[datetime] = None

async def refresh_analytics_cache():
    global _analytics_cache, _analytics_last_built
    print(f"🔄 [refresh_analytics_cache] started at {datetime.utcnow()}")
    faucet_data = await build_faucet_analytics()
    quest_data  = await build_quest_analytics()
    quiz_data   = await build_quiz_analytics()
    _analytics_cache = {
        "faucet": faucet_data,
        "quest":  quest_data,
        "quiz":   quiz_data,
        "last_updated": datetime.utcnow().isoformat(),
    }
    _analytics_last_built = datetime.utcnow()
    print(f"✅ [refresh_analytics_cache] done")


@app.get("/api/analytics")
async def get_analytics(background_tasks: BackgroundTasks):
    """
    Returns faucet / quest / quiz analytics from Supabase.
    Serves from cache if fresh (< 3 h); otherwise rebuilds in background
    and returns stale data immediately so the UI never hangs.
    """
    CACHE_TTL_SECONDS = 3 * 60 * 60  # 3 hours

    cache_stale = (
        not _analytics_cache
        or _analytics_last_built is None
        or (datetime.utcnow() - _analytics_last_built).total_seconds() > CACHE_TTL_SECONDS
    )

    if cache_stale and not _analytics_cache:
        await refresh_analytics_cache()
    elif cache_stale:
        background_tasks.add_task(refresh_analytics_cache)

    return _analytics_cache


# ====================== ROUTES ======================


@app.get("/api/dashboard", response_model=DashboardResponse)
async def get_dashboard():
    if supabase:
        try:
            data = load_from_supabase()
            if data:
                return data
        except Exception as e:
            print(f"⚠️  Supabase read failed, falling back to in-memory: {e}")
    return dashboard_data


@app.get("/api/network/{chain_id}/faucets")
async def get_network_faucets(
    chain_id:     int,
    active_only:  bool          = Query(False),
    factory_type: Optional[str] = Query(None),
    search:       Optional[str] = Query(None),
    page:         int           = Query(1,  ge=1),
    per_page:     int           = Query(50, ge=1, le=200),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        # Fetch deleted set and filter them out of results
        deleted_set = await fetch_deleted_faucets()

        q = supabase.table("network_faucets").select("*").eq("chain_id", chain_id)
        if active_only:
            q = q.eq("is_claim_active", True)
        if factory_type:
            q = q.eq("factory_type", factory_type)
        rows = q.order("start_time", desc=True).execute().data or []

        # Filter deleted
        rows = [r for r in rows if r.get("faucet_address", "").lower() not in deleted_set]

        if search:
            s = search.strip().lower()
            rows = [r for r in rows if s in (r.get("faucet_name") or "").lower() or s in (r.get("token_symbol") or "").lower() or s in (r.get("faucet_address") or "").lower()]
        total = len(rows)
        start = (page - 1) * per_page
        return {"chain_id": chain_id, "network_name": CHAIN_CONFIGS.get(chain_id, {}).get("name", str(chain_id)), "total": total, "page": page, "per_page": per_page, "faucets": rows[start: start + per_page]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/faucet/{faucet_address}")
async def get_faucet_detail(faucet_address: str):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        # Gate deleted faucets at the API level too
        deleted_set = await fetch_deleted_faucets()
        if faucet_address.lower() in deleted_set:
            raise HTTPException(status_code=404, detail=f"Faucet {faucet_address} not found.")

        rows = supabase.table("faucet_details").select("*").eq("faucet_address", faucet_address.lower()).limit(1).execute().data
        if not rows:
            raise HTTPException(status_code=404, detail=f"Faucet {faucet_address} not found.")
        return rows[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/force-sync-faucet/{faucet_address}")
async def force_sync_faucet(faucet_address: str):
    """
    Force immediate full sync of a faucet after admin updates.
    Called from frontend after setClaimParameters, update name, tasks, X template, etc.
    """
    print(f"🔄 [Force Sync] Requested for faucet {faucet_address}")

    # Gate deleted faucets — don't sync them back in
    deleted_set = await fetch_deleted_faucets()
    if faucet_address.lower() in deleted_set:
        return {"success": False, "error": "Faucet is deleted"}

    try:
        result = supabase.table("network_faucets").select("chain_id, factory_address, factory_type").eq("faucet_address", faucet_address.lower()).execute()

        if not result.data:
            result = supabase.table("faucet_details").select("chain_id, factory_address, factory_type").eq("faucet_address", faucet_address.lower()).execute()

        if not result.data:
            return {"success": False, "error": "Faucet not found in database"}

        row = result.data[0]
        chain_id = row["chain_id"]
        factory_address = row["factory_address"]
        factory_type = row["factory_type"]

        cfg = CHAIN_CONFIGS_V2.get(chain_id) or CHAIN_CONFIGS.get(chain_id)
        if not cfg:
            return {"success": False, "error": "Unsupported chain ID"}

        try:
            w3 = get_web3(cfg["rpcUrls"])
        except Exception as e:
            return {"success": False, "error": f"RPC connection failed: {e}"}

        detail = fetch_faucet_details_sync(
            w3,
            faucet_address,
            factory_address,
            factory_type,
            chain_id
        )

        if not detail:
            return {"success": False, "error": "Failed to fetch on-chain data (faucet may be deleted on-chain)"}

        detail = (await _enrich_with_metadata([detail]))[0]

        supabase.table("network_faucets").upsert({
            "faucet_address": detail["faucet_address"],
            "chain_id": detail["chain_id"],
            "network_name": detail["network_name"],
            "factory_type": detail["factory_type"],
            "faucet_name": detail["faucet_name"],
            "token_symbol": detail["token_symbol"],
            "is_ether": detail["is_ether"],
            "owner_address": detail["owner_address"],
            "slug": detail.get("slug")
        }, on_conflict="faucet_address").execute()

        supabase.table("faucet_details").upsert(detail, on_conflict="faucet_address").execute()

        print(f"✅ [Force Sync] SUCCESS for {faucet_address} (chain {chain_id})")
        return {
            "success": True,
            "slug": detail.get("slug"),
            "faucet_name": detail.get("faucet_name"),
            "message": "Faucet data refreshed instantly"
        }

    except Exception as e:
        print(f"❌ [Force Sync] ERROR for {faucet_address}: {e}")
        return {"success": False, "error": str(e)}

@app.get("/api/faucets")
async def get_all_faucets(
    active_only:  bool          = Query(False),
    factory_type: Optional[str] = Query(None),
    search:       Optional[str] = Query(None),
    page:         int           = Query(1,  ge=1),
    per_page:     int           = Query(50, ge=1, le=200),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        # Filter deleted faucets from listing
        deleted_set = await fetch_deleted_faucets()

        q = supabase.table("network_faucets").select("*")
        if active_only:
            q = q.eq("is_claim_active", True)
        if factory_type:
            q = q.eq("factory_type", factory_type)
        rows = q.order("start_time", desc=True).execute().data or []

        # Filter deleted
        rows = [r for r in rows if r.get("faucet_address", "").lower() not in deleted_set]

        if search:
            s = search.strip().lower()
            rows = [r for r in rows if s in (r.get("faucet_name") or "").lower() or s in (r.get("token_symbol") or "").lower() or s in (r.get("faucet_address") or "").lower()]
        total = len(rows)
        start = (page - 1) * per_page
        return {"total": total, "page": page, "per_page": per_page, "faucets": rows[start: start + per_page]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/network/{chain_id}/faucets/refresh")
async def refresh_network_endpoint(chain_id: int, background_tasks: BackgroundTasks):
    if chain_id not in CHAIN_CONFIGS:
        raise HTTPException(status_code=404, detail=f"Chain {chain_id} not supported")
    background_tasks.add_task(refresh_network_faucets)
    return {"status": "refresh started", "chain_id": chain_id}


@app.get("/api/refresh")
async def manual_refresh():
    print("🖱️  [manual_refresh] triggered by frontend")
    await asyncio.gather(
        refresh_all_data(),
    )
    return {
        "status":       "complete",
        "last_updated": dashboard_data.get("last_updated"),
    }

@app.get("/api/refresh/dashboard")
async def refresh_dashboard():
    """Refresh all dashboard data (faucet page button)."""
    await refresh_all_data()
    return {"status": "complete", "last_updated": dashboard_data.get("last_updated")}

@app.get("/api/refresh/network-faucets")
async def refresh_network_faucets_endpoint():
    """Refresh all network faucets (network page button)."""
    await refresh_network_faucets()
    return {"status": "complete"}

@app.get("/api/refresh/analytics")
async def refresh_analytics_endpoint():
    """Refresh analytics cache (home page button)."""
    await refresh_analytics_cache()
    return {"status": "complete", "last_updated": _analytics_cache.get("last_updated")}

@app.get("/api/refresh/claims")
async def refresh_claims_endpoint():
    """Refresh claims cache (faucet list page button)."""
    await refresh_claims_cache()
    return {
        "status": "complete",
        "last_updated": claims_last_updated.isoformat() if claims_last_updated else None,
    }

@app.post("/sync-faucet/{faucet_address}")
async def sync_single_faucet(faucet_address: str):
    print(f"🔄 [sync_single_faucet] Forced sync requested for {faucet_address}")

    deleted = await fetch_deleted_faucets()
    if faucet_address.lower() in deleted:
        return {"success": False, "message": "Faucet was deleted"}

    for chain_id, cfg in CHAIN_CONFIGS_V2.items():
        try:
            w3 = get_web3(cfg["rpcUrls"])
        except:
            continue

        # Verify the contract exists on this chain
        try:
            contract = w3.eth.contract(
                address=w3.to_checksum_address(faucet_address),
                abi=FAUCET_ABI
            )
            _ = contract.functions.name().call()
        except:
            continue

        # Detect the real factory_type by finding which factory owns this faucet
        resolved_factory_address = "0x0000000000000000000000000000000000000000"
        resolved_factory_type = "dropcode"  # safe fallback

        factories_map: Dict[str, str] = cfg.get("factories", {})
        for factory_addr, factory_type in factories_map.items():
            if is_placeholder_address(factory_addr):
                continue
            factory_cs = safe_checksum(w3, factory_addr)
            if not factory_cs:
                continue
            try:
                faucet_list = _get_all_faucets_from_factory(w3, factory_cs)
                if any(f.lower() == faucet_address.lower() for f in faucet_list):
                    resolved_factory_address = factory_addr
                    resolved_factory_type = factory_type
                    print(f"   ✅ Found factory: {factory_cs[:10]}... type={factory_type}")
                    break
            except Exception as e:
                print(f"   ⚠️  Factory check failed {factory_cs[:10]}...: {e}")
                continue

        detail = fetch_faucet_details_sync(
            w3,
            faucet_address,
            resolved_factory_address,
            resolved_factory_type,
            chain_id
        )

        if detail:
            detail = (await _enrich_with_metadata([detail]))[0]

            supabase.table("network_faucets").upsert({
                "faucet_address":  detail["faucet_address"],
                "chain_id":        chain_id,
                "network_name":    cfg["name"],
                "factory_address": resolved_factory_address.lower(),
                "factory_type":    resolved_factory_type,
                "faucet_name":     detail["faucet_name"],
                "slug":            detail["slug"],
                "token_symbol":    detail["token_symbol"],
                "token_decimals":  detail["token_decimals"],
                "is_ether":        detail["is_ether"],
                "is_claim_active": detail["is_claim_active"],
                "owner_address":   detail["owner_address"],
                "start_time":      detail["start_time"],
            }, on_conflict="faucet_address").execute()

            supabase.table("faucet_details").upsert(detail, on_conflict="faucet_address").execute()

            print(f"✅ Instant sync complete: {faucet_address} → type={resolved_factory_type} slug={detail['slug']}")
            return {
                "success":      True,
                "message":      "Faucet synced instantly",
                "slug":         detail["slug"],
                "chain_id":     chain_id,
                "factory_type": resolved_factory_type,
            }

    return {"success": False, "message": "Faucet not found on any supported chain"}

# ── Blog endpoints (Supabase version — no asyncpg) ─────────────
@app.post("/api/blog/upload-image")
async def upload_blog_image(
    file: UploadFile = File(...),
    sessionToken: str = Form(...),
):
    if not is_valid_session(sessionToken):
        raise HTTPException(status_code=401, detail="Not authenticated")

    if not supabase:
        raise HTTPException(status_code=503, detail="Storage not available")

    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"}
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {content_type}")

    MAX_BYTES = 5 * 1024 * 1024
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 5 MB)")

    ext = mimetypes.guess_extension(content_type) or ".jpg"
    ext = {".jpe": ".jpg", ".jpeg": ".jpg"}.get(ext, ext)
    unique_name = f"{uuid.uuid4().hex}{ext}"
    storage_path = f"posts/{unique_name}"

    try:
        supabase.storage.from_("blog-images").upload(
            path=storage_path,
            file=data,
            file_options={"content-type": content_type, "upsert": "false"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")

    public_url = (
        f"{os.getenv('SUPABASE_URL')}/storage/v1/object/public/blog-images/{storage_path}"
    )

    return {"success": True, "url": public_url, "path": storage_path}


@app.post("/api/blogs/login")
async def blog_login(body: BlogLoginRequest):
    if (body.username != BLOG_ADMIN_USERNAME or
        hash_password(body.password) != hash_password(BLOG_ADMIN_PASSWORD)):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = generate_session_token()
    expires_at = create_session(token)

    return {
        "success": True,
        "sessionToken": token,
        "expiresAt": expires_at.isoformat(),
        "admin": {
            "username": BLOG_ADMIN_USERNAME,
            "displayName": os.getenv("BLOG_ADMIN_DISPLAY_NAME", "FaucetDrops Team"),
            "avatarUrl": os.getenv("BLOG_ADMIN_AVATAR_URL", ""),
        }
    }

@app.post("/api/blog/logout")
async def blog_logout(sessionToken: str):
    delete_session(sessionToken)
    return {"success": True}


@app.get("/api/blog/me")
async def blog_me(sessionToken: str):
    if not is_valid_session(sessionToken):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {
        "success": True,
        "admin": {
            "username": BLOG_ADMIN_USERNAME,
            "displayName": os.getenv("BLOG_ADMIN_DISPLAY_NAME", "FaucetDrops Team"),
            "avatarUrl": os.getenv("BLOG_ADMIN_AVATAR_URL", ""),
        }
    }


@app.post("/api/blog/extract-url")
async def extract_url_metadata(body: ExtractUrlRequest):
    if not is_valid_session(body.sessionToken):
        raise HTTPException(status_code=401, detail="Not authenticated")

    parsed_url = urlparse(body.url)
    is_twitter = parsed_url.netloc in ["twitter.com", "www.twitter.com", "x.com", "www.x.com"]

    try:
        async with httpx.AsyncClient(
            timeout=20,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            }
        ) as client:

            if is_twitter:
                path_parts = parsed_url.path.strip("/").split("/")
                if len(path_parts) >= 3 and path_parts[1] == "status":
                    api_url = f"https://api.vxtwitter.com/{path_parts[0]}/status/{path_parts[2]}"
                    res = await client.get(api_url)
                    res.raise_for_status()

                    tweet_data = res.json()

                    author_name = tweet_data.get('user_name', 'Unknown')
                    author_handle = f"@{tweet_data.get('user_screen_name', '')}"
                    content = tweet_data.get('text', '')
                    media = tweet_data.get('mediaURLs', [])
                    cover = media[0] if media else ""

                    return {"success": True, "data": {
                        "title": f"Tweet by {author_name}",
                        "excerpt": content[:300] + "..." if len(content) > 300 else content,
                        "content": content,
                        "coverImageUrl": cover,
                        "authorName": author_name,
                        "authorAvatar": "",
                        "authorHandle": author_handle,
                        "sourceUrl": body.url,
                        "tags": ["twitter", "tweet"]
                    }}

            res = await client.get(body.url)
            res.raise_for_status()

        soup = BeautifulSoup(res.text, "html.parser")

        def og(prop):
            tag = soup.find("meta", property=f"og:{prop}")
            return tag["content"].strip() if tag and tag.get("content") else ""

        def meta(name):
            tag = soup.find("meta", attrs={"name": name})
            return tag["content"].strip() if tag and tag.get("content") else ""

        def tw(name):
            tag = (soup.find("meta", attrs={"name": f"twitter:{name}"}) or
                soup.find("meta", property=f"twitter:{name}"))
            return tag["content"].strip() if tag and tag.get("content") else ""

        title   = og("title") or tw("title") or (soup.find("title").get_text().strip() if soup.find("title") else "")
        excerpt = og("description") or meta("description") or tw("description") or ""
        cover   = og("image") or tw("image") or ""

        if cover and cover.startswith("/"):
            p = urlparse(body.url)
            cover = f"{p.scheme}://{p.netloc}{cover}"

        author = meta("author") or og("site_name") or ""

        favicon = ""
        link_icon = soup.find("link", rel=lambda r: r and "icon" in r.lower() if r else False)
        if link_icon and link_icon.get("href"):
            href = link_icon["href"]
            if href.startswith("http"):
                favicon = href
            else:
                p = urlparse(body.url)
                favicon = f"{p.scheme}://{p.netloc}{href}"

        noise_tags = [
            "script", "style", "noscript", "nav", "header", "footer",
            "aside", "form", "button", "input", "select", "textarea",
            "iframe", "embed", "object", "advertisement", "ads",
            "cookie", "popup", "modal", "sidebar", "menu", "breadcrumb",
            "social", "share", "comment", "related", "recommended",
            "newsletter", "subscribe",
        ]
        for tag in soup.find_all(noise_tags):
            tag.decompose()

        noise_patterns = [
            "nav", "header", "footer", "sidebar", "menu", "ad", "ads",
            "advertisement", "banner", "popup", "modal", "cookie",
            "social", "share", "comment", "related", "newsletter",
            "subscribe", "widget", "promo", "signup", "login",
            "breadcrumb", "pagination", "tag-list", "author-bio",
            "read-more", "recommended",
        ]
        for pattern in noise_patterns:
            for el in soup.find_all(class_=re.compile(pattern, re.I)):
                el.decompose()
            for el in soup.find_all(id=re.compile(pattern, re.I)):
                el.decompose()

        content = ""

        content_selectors = [
            ("tag",   "article"),
            ("tag",   "main"),
            ("class", re.compile(r"article[-_]?(body|content|text|inner)", re.I)),
            ("class", re.compile(r"post[-_]?(body|content|text|inner|article)", re.I)),
            ("class", re.compile(r"blog[-_]?(body|content|text|inner|post)", re.I)),
            ("class", re.compile(r"entry[-_]?(body|content|text)", re.I)),
            ("class", re.compile(r"story[-_]?(body|content|text)", re.I)),
            ("class", re.compile(r"news[-_]?(body|content|text|article)", re.I)),
            ("class", re.compile(r"content[-_]?(body|main|article|text|inner)", re.I)),
            ("class", re.compile(r"^(content|article|post|entry|story|body)$", re.I)),
            ("id",    re.compile(r"article[-_]?(body|content|text|inner)", re.I)),
            ("id",    re.compile(r"post[-_]?(body|content|text|inner)", re.I)),
            ("id",    re.compile(r"^(content|article|post|entry|story|main)$", re.I)),
        ]

        def extract_text_from_element(el) -> str:
            lines = []
            for node in el.find_all(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote"]):
                text = node.get_text(separator=" ", strip=True)
                if len(text) < 20 and node.name not in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                    continue
                if node.name == "h1":
                    lines.append(f"# {text}")
                elif node.name == "h2":
                    lines.append(f"## {text}")
                elif node.name == "h3":
                    lines.append(f"### {text}")
                elif node.name in ["h4", "h5", "h6"]:
                    lines.append(f"#### {text}")
                elif node.name == "blockquote":
                    lines.append(f"> {text}")
                elif node.name == "li":
                    lines.append(f"- {text}")
                else:
                    lines.append(text)
            return "\n\n".join(lines)

        for selector_type, selector_value in content_selectors:
            if selector_type == "tag":
                el = soup.find(selector_value)
            elif selector_type == "class":
                el = soup.find(class_=selector_value)
            elif selector_type == "id":
                el = soup.find(id=selector_value)
            else:
                el = None

            if el:
                candidate = extract_text_from_element(el)
                if len(candidate) > len(content):
                    content = candidate
                if len(content) > 500:
                    break

        if len(content) < 300:
            best_div = None
            best_len = 0
            for div in soup.find_all(["div", "section"]):
                text = extract_text_from_element(div)
                if len(text) > best_len:
                    best_len = len(text)
                    best_div = div
            if best_div and best_len > 0:
                content = extract_text_from_element(best_div)

        if len(content) < 200:
            body_tag = soup.find("body")
            if body_tag:
                content = extract_text_from_element(body_tag)

        content = re.sub(r"[ \t]{2,}", " ", content)
        content = re.sub(r"\n{3,}", "\n\n", content).strip()

        tags = [k.strip() for k in (meta("keywords") or "").split(",") if k.strip()][:8]

        return {"success": True, "data": {
            "title":         title,
            "excerpt":       excerpt[:300],
            "content":       content[:15000],
            "coverImageUrl": cover,
            "authorName":    author,
            "authorAvatar":  favicon,
            "authorHandle":  "",
            "sourceUrl":     body.url,
            "tags":          tags,
        }}

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch URL: {e.response.status_code}")
    except Exception as e:
        print(f"[Blog Extract] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/blog/posts")
async def create_blog_post(body: CreateBlogRequest):
    if not is_valid_session(body.sessionToken):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        slug = re.sub(r"[^a-z0-9]+", "-", body.title.lower()).strip("-")[:80]
        slug = f"{slug}-{int(datetime.now(timezone.utc).timestamp())}"

        author_name   = body.authorName   or os.getenv("BLOG_ADMIN_DISPLAY_NAME", "FaucetDrops Team")
        author_avatar = body.authorAvatar or os.getenv("BLOG_ADMIN_AVATAR_URL", "")

        result = supabase.table("blog_posts").insert({
            "slug":            slug,
            "title":           body.title,
            "content":         body.content,
            "excerpt":         body.excerpt,
            "cover_image_url": body.coverImageUrl,
            "tags":            body.tags,
            "author_name":     author_name,
            "author_avatar":   author_avatar,
            "author_handle":   body.authorHandle,
            "source_url":      body.sourceUrl,
            "is_published":    True,
        }).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Insert failed")

        return {"success": True, "id": result.data[0]["id"], "slug": slug}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/blog/posts")
async def get_blog_posts(page: int = 1, limit: int = 12, tag: str = None):
    try:
        offset = (page - 1) * limit

        query = supabase.table("blog_posts")\
            .select("id,slug,title,excerpt,cover_image_url,tags,author_name,author_avatar,author_handle,source_url,published_at")\
            .eq("is_published", True)\
            .order("published_at", desc=True)\
            .range(offset, offset + limit - 1)

        if tag:
            query = query.contains("tags", [tag])

        result = query.execute()
        posts  = result.data or []

        count_query = supabase.table("blog_posts").select("id", count="exact").eq("is_published", True)
        if tag:
            count_query = count_query.contains("tags", [tag])
        count_result = count_query.execute()
        total = count_result.count or 0

        for post in posts:
            likes = supabase.table("blog_post_likes").select("id", count="exact").eq("post_id", post["id"]).execute()
            views = supabase.table("blog_post_views").select("id", count="exact").eq("post_id", post["id"]).execute()
            post["likes_count"] = likes.count or 0
            post["views_count"] = views.count or 0

        return {
            "success": True,
            "posts": posts,
            "total": total,
            "page": page,
            "totalPages": max(1, -(-total // limit)),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/track-visit", status_code=201)
async def track_visit(body: TrackVisitRequest):
    """
    Called from the frontend on every meaningful page navigation.
    Inserts one row into page_visits.  Fails silently on error so
    a broken tracker never breaks the user experience.
    """
    if not supabase:
        return {"success": False, "reason": "no db"}
    try:
        supabase.table("page_visits").insert({
            "path":        body.path[:500],
            "referrer":    (body.referrer  or "")[:500] or None,
            "user_agent":  (body.user_agent or "")[:500] or None,
            "fingerprint": (body.fingerprint or "")[:64]  or None,
        }).execute()
        return {"success": True}
    except Exception as e:
        print(f"⚠️  [track_visit] {e}")
        return {"success": False}


@app.get("/api/visit-stats")
async def get_visit_stats(days: int = 30):
    days = min(max(days, 1), 365)
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    try:
        rows = (
            supabase.table("page_visits")
            .select("path, fingerprint, visited_at")
            .gte("visited_at", since)
            .order("visited_at", desc=False)
            .execute()
            .data or []
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    daily_map:   dict = {}
    weekly_map:  dict = {}
    monthly_map: dict = {}
    page_map:    dict = {}
    fingerprints: set = set()

    # 👇 Track unique fingerprints per time bucket
    daily_fps:   dict = {}
    weekly_fps:  dict = {}
    monthly_fps: dict = {}

    for row in rows:
        ts_raw = row.get("visited_at", "")
        path   = row.get("path", "/")
        fp     = row.get("fingerprint")

        try:
            dt = datetime.fromisoformat(str(ts_raw).replace("Z", "+00:00"))
        except Exception:
            continue

        day_key   = dt.strftime("%Y-%m-%d")
        week_key  = dt.strftime("%G-W%V")
        month_key = dt.strftime("%Y-%m")

        daily_map[day_key]     = daily_map.get(day_key, 0)     + 1
        weekly_map[week_key]   = weekly_map.get(week_key, 0)   + 1
        monthly_map[month_key] = monthly_map.get(month_key, 0) + 1
        page_map[path]         = page_map.get(path, 0)         + 1

        if fp:
            fingerprints.add(fp)
            # 👇 Add fingerprint to the per-bucket sets
            daily_fps.setdefault(day_key, set()).add(fp)
            weekly_fps.setdefault(week_key, set()).add(fp)
            monthly_fps.setdefault(month_key, set()).add(fp)

    # 👇 Include unique_visitors count in each data point
    daily   = [{"date":  k, "visits": v, "unique_visitors": len(daily_fps.get(k, set()))}   for k, v in sorted(daily_map.items())]
    weekly  = [{"week":  k, "visits": v, "unique_visitors": len(weekly_fps.get(k, set()))}  for k, v in sorted(weekly_map.items())]
    monthly = [{"month": k, "visits": v, "unique_visitors": len(monthly_fps.get(k, set()))} for k, v in sorted(monthly_map.items())]

    top_pages = sorted(
        [{"path": k, "visits": v} for k, v in page_map.items()],
        key=lambda x: x["visits"], reverse=True
    )[:10]

    return {
        "daily":           daily,
        "weekly":          weekly,
        "monthly":         monthly,
        "top_pages":       top_pages,
        "total":           len(rows),
        "unique_visitors": len(fingerprints) if fingerprints else None,
        "period_days":     days,
    }


# ====================== GLOBAL CLAIMS CACHE ======================
global_claims_cache: List[Dict] = []
claims_last_updated: Optional[datetime] = None

async def refresh_claims_cache():
    """
    Fetches all claims across all networks and enriches them with
    Supabase metadata. Filters out deleted faucets.
    """
    global global_claims_cache, claims_last_updated
    print(f"🔄 [refresh_claims_cache] Fetching all claims from RPCs...")

    loop = asyncio.get_running_loop()

    # Fetch deleted set once before the sync executor
    deleted_set = await fetch_deleted_faucets()

    def _fetch_claims_sync():
        fetched = []

        faucet_meta_map = {}
        if supabase:
            try:
                resp = supabase.table("faucet_details").select(
                    "faucet_address, faucet_name, token_symbol, token_decimals, slug"
                ).execute()

                if resp.data:
                    for row in resp.data:
                        addr = row["faucet_address"].lower()
                        # Don't include deleted faucets in the meta map
                        if addr not in deleted_set:
                            faucet_meta_map[addr] = {
                                "name": row.get("faucet_name", "Unknown Faucet"),
                                "symbol": row.get("token_symbol", "TOKEN"),
                                "decimals": row.get("token_decimals", 18),
                                "slug": row.get("slug")
                            }
            except Exception as e:
                print(f"⚠️ [refresh_claims_cache] Supabase meta fetch failed: {e}")

        for chain_id, cfg in CHAIN_CONFIGS.items():
            chain_name = cfg["name"]
            try:
                w3 = get_web3(cfg["rpcUrls"])
            except Exception:
                continue

            for factory_addr in cfg.get("factoryAddresses", []):
                if is_placeholder_address(factory_addr):
                    continue

                addr_checksum = safe_checksum(w3, factory_addr)
                if not addr_checksum:
                    continue

                contract_type, factory_txs, _ = detect_and_call(w3, addr_checksum)

                if contract_type in ("factory", "quest") and factory_txs:
                    for tx in factory_txs:
                        tx_type = str(tx[1]).lower()
                        if "claim" in tx_type:
                            faucet_addr = str(tx[0])
                            addr_lower = faucet_addr.lower()

                            # Skip claims from deleted faucets
                            if addr_lower in deleted_set:
                                continue

                            meta = faucet_meta_map.get(addr_lower, {})

                            fetched.append({
                                "faucet": faucet_addr,
                                "faucet_name": meta.get("name", f"Faucet {faucet_addr[:6]}"),
                                "slug": meta.get("slug"),
                                "claimer": str(tx[2]),
                                "amount": str(tx[3]),
                                "token_symbol": meta.get("symbol", "TOKEN"),
                                "token_decimals": meta.get("decimals", 18),
                                "is_ether": bool(tx[4]),
                                "time": int(tx[5]),
                                "network": chain_name,
                                "chain_id": chain_id,
                                "transaction_type": tx_type
                            })
        return fetched

    try:
        new_claims = await loop.run_in_executor(None, _fetch_claims_sync)
        new_claims.sort(key=lambda x: x["time"], reverse=True)
        global_claims_cache = new_claims
        claims_last_updated = datetime.utcnow()
        print(f"✅ [refresh_claims_cache] Successfully cached {len(new_claims)} claims.")
    except Exception as e:
        print(f"⚠️ [refresh_claims_cache] Failed: {e}")

@app.get("/api/claims")
async def get_all_claims(
    limit: int = Query(100, ge=1, le=5000, description="Max claims to return"),
    background_tasks: BackgroundTasks = None
):
    global global_claims_cache, claims_last_updated

    CACHE_TTL_SECONDS = 10 * 60

    cache_stale = (
        not global_claims_cache
        or claims_last_updated is None
        or (datetime.utcnow() - claims_last_updated).total_seconds() > CACHE_TTL_SECONDS
    )

    if cache_stale:
        if not global_claims_cache:
            await refresh_claims_cache()
        else:
            if background_tasks:
                background_tasks.add_task(refresh_claims_cache)

    return {
        "success": True,
        "total": len(global_claims_cache),
        "returned": len(global_claims_cache[:limit]),
        "last_updated": claims_last_updated.isoformat() if claims_last_updated else None,
        "claims": global_claims_cache[:limit]
    }

@app.get("/api/blog/posts/{slug}")
async def get_blog_post(slug: str):
    try:
        result = supabase.table("blog_posts")\
            .select("*")\
            .eq("slug", slug)\
            .eq("is_published", True)\
            .single()\
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Post not found")

        post = result.data
        post_id = post["id"]

        try:
            supabase.table("blog_post_views").insert({"post_id": post_id}).execute()
        except Exception:
            pass

        likes = supabase.table("blog_post_likes").select("id", count="exact").eq("post_id", post_id).execute()
        views = supabase.table("blog_post_views").select("id", count="exact").eq("post_id", post_id).execute()
        post["likes_count"] = likes.count or 0
        post["views_count"] = views.count or 0

        return {"success": True, "post": post}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/blog/posts/{slug}")
async def delete_blog_post(slug: str, body: DeleteBlogRequest):
    if not is_valid_session(body.sessionToken):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        result = supabase.table("blog_posts").select("id").eq("slug", slug).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Post not found")
        supabase.table("blog_posts").delete().eq("id", result.data["id"]).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/blog/posts/{slug}/like")
async def like_blog_post(slug: str, fingerprint: str):
    try:
        post = supabase.table("blog_posts").select("id").eq("slug", slug).single().execute()
        if not post.data:
            raise HTTPException(status_code=404, detail="Post not found")

        post_id  = post.data["id"]
        existing = supabase.table("blog_post_likes")\
            .select("id")\
            .eq("post_id", post_id)\
            .eq("fingerprint", fingerprint)\
            .execute()

        if existing.data:
            supabase.table("blog_post_likes").delete().eq("id", existing.data[0]["id"]).execute()
            liked = False
        else:
            supabase.table("blog_post_likes").insert({
                "post_id": post_id, "fingerprint": fingerprint
            }).execute()
            liked = True

        fresh = supabase.table("blog_post_likes").select("id", count="exact").eq("post_id", post_id).execute()
        return {"success": True, "liked": liked, "likes_count": fresh.count or 0}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ====================== SCHEDULER ======================

scheduler = AsyncIOScheduler()
scheduler.add_job(refresh_all_data,        "interval", hours=3)
scheduler.add_job(refresh_analytics_cache, "interval", hours=3)
scheduler.add_job(refresh_claims_cache,    "interval", minutes=15)
scheduler.add_job(refresh_network_faucets, "interval", hours=3)
scheduler.start()


# ====================== STARTUP ======================

@app.on_event("startup")
async def startup():
    global dashboard_data
    print("🚀 [Startup] API is coming online...")

    if supabase:
        try:
            cached = load_from_supabase()
            if cached:
                dashboard_data = cached
                print("✅ [Startup] Loaded initial data from Supabase")
        except Exception as e:
            print(f"⚠️ [Startup] Supabase cache empty or failed: {e}")
    #asyncio.create_task(refresh_all_data())
    #asyncio.create_task(refresh_network_faucets())
    #asyncio.create_task(refresh_analytics_cache())
    #asyncio.create_task(refresh_claims_cache())

# ====================== RENDER.COM COMPATIBLE RUN ======================
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    print(f"🚀 Starting FaucetDrop API on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)