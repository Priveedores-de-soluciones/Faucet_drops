"""
utils/crypto.py — Cryptographic helpers: signature verification, HMAC, Telegram auth.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
from typing import Dict, Optional

from eth_account import Account
from eth_account.messages import encode_defunct

logger = logging.getLogger(__name__)


def verify_signature(address: str, message: str, signature: str) -> bool:
    """
    Recover the signer address from an EIP-191 personal_sign signature and
    compare it to `address`.  Returns False on any error.
    """
    try:
        encoded_message = encode_defunct(text=message)
        recovered = Account.recover_message(encoded_message, signature=signature)
        return recovered.lower() == address.lower()
    except Exception as exc:
        logger.warning("Signature verification failed: %s", exc)
        return False


def verify_telegram_init_data(init_data: str, bot_token: str) -> bool:
    """
    Validate Telegram WebApp initData using the bot token as the HMAC secret.
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
    """
    try:
        pairs = dict(kv.split("=", 1) for kv in init_data.split("&") if "=" in kv)
        hash_value = pairs.pop("hash", None)
        if not hash_value:
            return False

        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(pairs.items())
        )
        secret_key = hmac.new(
            b"WebAppData", bot_token.encode(), hashlib.sha256
        ).digest()
        calculated_hash = hmac.new(
            secret_key, data_check_string.encode(), hashlib.sha256
        ).hexdigest()
        return calculated_hash == hash_value
    except Exception as exc:
        logger.warning("Telegram initData verification error: %s", exc)
        return False


def compute_hmac_sha256(secret: str, data: str) -> str:
    """Return the hex HMAC-SHA256 of `data` using `secret`."""
    return hmac.new(secret.encode(), data.encode(), hashlib.sha256).hexdigest()
