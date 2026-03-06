"""
utils/web3_utils.py — Web3 helpers: chain resolution, RPC instantiation,
Alchemy clients, explorer config.
"""
from __future__ import annotations

import logging
from typing import Dict, Optional, Tuple

from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
from web3.types import TxReceipt
from alchemy import Alchemy, Network

from config import ALCHEMY_API_KEY, CHAIN_INFO
from models import Chain

logger = logging.getLogger(__name__)

# ── RPC URL map (Alchemy) ─────────────────────────────────────────────────────
CHAIN_RPC_URLS: Dict[Chain, str] = {
    Chain.ethereum: f"https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}",
    Chain.base:     f"https://base-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}",
    Chain.arbitrum: f"https://arb-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}",
    Chain.celo:     f"https://celo-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}",
    Chain.lisk:     f"https://lisk-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}",
    Chain.bnb:      f"https://bnb-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}",
}

# ── Alchemy clients ───────────────────────────────────────────────────────────
def _build_alchemy_clients() -> Dict[Chain, Alchemy]:
    clients: Dict[Chain, Alchemy] = {
        Chain.ethereum: Alchemy(api_key=ALCHEMY_API_KEY, network=Network.ETH_MAINNET),
        Chain.arbitrum: Alchemy(api_key=ALCHEMY_API_KEY, network=Network.ARB_MAINNET),
    }
    _optional = [
        (Chain.base,      ["BASE_MAINNET", "BASE"]),
        (Chain.celo,      ["CELO_MAINNET", "CELO"]),
        (Chain.lisk,      ["LISK_MAINNET", "LISK"]),
        (Chain.bnb,       ["BNB_MAINNET",  "BNB"]),
    ]
    for chain, names in _optional:
        for name in names:
            try:
                clients[chain] = Alchemy(api_key=ALCHEMY_API_KEY, network=getattr(Network, name))
                break
            except (AttributeError, KeyError):
                continue
    logger.info("✅ Alchemy clients: %s", list(clients.keys()))
    return clients


alchemy_clients: Dict[Chain, Alchemy] = _build_alchemy_clients()


# ── Chain helpers ─────────────────────────────────────────────────────────────
_CHAIN_ID_MAP: Dict[int, Chain] = {
    1:     Chain.ethereum,
    8453:  Chain.base,
    42161: Chain.arbitrum,
    42220: Chain.celo,
    1135:  Chain.lisk,
    56:    Chain.bnb,
}


def get_chain_enum(chain_id: int) -> Chain:
    """Map an integer chain ID to the Chain enum (default: celo)."""
    return _CHAIN_ID_MAP.get(chain_id, Chain.celo)


def get_chain_info(chain_id: int) -> Dict:
    """Return basic chain metadata (name, native_token)."""
    return CHAIN_INFO.get(chain_id, {"name": "Unknown Network", "native_token": "ETH"})


def get_w3(chain: Chain) -> Web3:
    """Create a Web3 instance for the given Chain enum, injecting PoA middleware where needed."""
    url = CHAIN_RPC_URLS.get(chain)
    if not url:
        raise ValueError(f"No RPC configured for chain {chain}")
    w3 = Web3(Web3.HTTPProvider(url))
    if chain in (Chain.base, Chain.arbitrum, Chain.celo, Chain.lisk):
        w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    return w3


async def get_web3_instance(chain_id: int) -> Web3:
    """Async helper — return a connected Web3 for the given chain_id."""
    from fastapi import HTTPException
    from config import get_rpc_url

    rpc_url = get_rpc_url(chain_id)
    if not rpc_url:
        raise HTTPException(status_code=400, detail=f"No RPC URL for chain {chain_id}")
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        raise HTTPException(status_code=500, detail=f"Cannot connect to node for chain {chain_id}")
    return w3


def get_explorer_config(chain_id: int) -> Dict:
    """Map chain_id to block-explorer API config."""
    import os
    explorers = {
        1:     {"base_url": "https://api.etherscan.io/api",     "env_key": "ETHERSCAN_API_KEY"},
        8453:  {"base_url": "https://api.basescan.org/api",     "env_key": "BASESCAN_API_KEY"},
        42161: {"base_url": "https://api.arbiscan.io/api",      "env_key": "ARBISCAN_API_KEY"},
        42220: {"base_url": "https://api.celoscan.io/api",      "env_key": "CELOSCAN_API_KEY"},
        1135:  {"base_url": "https://blockscout.lisk.com/api",  "env_key": "LISKSCAN_API_KEY"},
        56:    {"base_url": "https://api.bscscan.com/api",      "env_key": "BSCSCAN_API_KEY"},
        43114: {"base_url": "https://api.snowtrace.io/api",     "env_key": "SNOWTRACE_API_KEY"},
        137:   {"base_url": "https://api.polygonscan.com/api",  "env_key": "POLYGONSCAN_API_KEY"},
    }
    cfg = explorers.get(chain_id, {})
    if cfg:
        cfg["api_key"] = os.getenv(cfg["env_key"], "")
    return cfg
