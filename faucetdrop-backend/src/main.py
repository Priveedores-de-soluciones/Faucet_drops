from __future__ import annotations
import shortuuid
from fastapi import FastAPI, HTTPException, Query, Request, Form, File, UploadFile, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter, HTTPException,BackgroundTasks, WebSocket, WebSocketDisconnect,UploadFile, File, Form
from fastapi.responses import RedirectResponse, JSONResponse, HTMLResponse
from fastapi import UploadFile, File, Depends
from pydantic import BaseModel, Field, ConfigDict
import json
import random
import collections
import string
from contextlib import asynccontextmanager
import time
from datetime import datetime, timezone,timedelta
from typing import Dict, List, Optional, Any
from web3 import Web3
from typing import List, Optional, Literal, Dict, Any, Tuple
from typing import Union
import re
import hmac
import hashlib
from starlette.middleware.sessions import SessionMiddleware
# FIX: Use Web3's constants for ADDRESS_ZERO
from web3.constants import ADDRESS_ZERO as ZeroAddress
from web3.middleware import ExtraDataToPOAMiddleware
from enum import Enum
from alchemy import Alchemy, Network
from eth_account import Account
from web3.types import TxReceipt
from web3.exceptions import ContractLogicError
import sys
import math
import traceback
import shutil
import io
import json
from PyPDF2 import PdfReader
import base64, os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import asyncio
import secrets
import json
import random
import dateutil.parser
from supabase import create_client, Client
from sqlalchemy import Column, TEXT, BOOLEAN, DATE, TIMESTAMP, text # Import required DB elements
from sqlalchemy.ext.declarative import declarative_base # Import the base for ORM models
from eth_account.messages import encode_defunct
import httpx
import traceback # Added for better error logging
import logging
from dotenv import load_dotenv
from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, ForeignKey, Integer,
    Numeric, String, Text, UniqueConstraint, func, text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.future import select
# Add parent directory to sys.path for config import
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
# Assuming 'config.py' exists and contains PRIVATE_KEY and get_rpc_url
# In a real setup, these should be securely handled.
try:
    from config import PRIVATE_KEY, get_rpc_url
except ImportError:
    # Placeholder for local testing if config is missing
    PRIVATE_KEY = os.getenv("PRIVATE_KEY", "0x" + "0"*64) # Dummy Key
    def get_rpc_url(chain_id):
        return os.getenv(f"RPC_URL_{chain_id}") or "http://127.0.0.1:8545" # Dummy RPC
    print("WARNING: Using dummy config due to missing 'config.py'")
import asyncpg
from contextlib import asynccontextmanager
DATABASE_URL = os.getenv("DATABASE_URL")  # postgresql+asyncpg → just postgresql:// for asyncpg
pool: asyncpg.Pool = None
async def get_db():
    return await pool.acquire()
async def release_db(conn):
    await pool.release(conn)
from decimal import Decimal
import uuid
import logging
import traceback # Added for better error logging
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
import httpx
from fastapi import Request, BackgroundTasks
load_dotenv()
from pydantic import BaseModel
from fastapi import BackgroundTasks, HTTPException
from web3 import Web3
import os
from abis import (
    ERC20_ABI, ERC20_BALANCE_ABI, ERC721_ABI, FAUCET_ABI,
    QUEST_ABI,QUIZ_ABI,
)
ITEM_IMAGES = {
    "merch_tshirt_01":            "https://app.faucetdrops.io/tshirt-front.jpg",
    "merch_tshirt_02":            "https://app.faucetdrops.io/merchB.jpg",
    "merch_hoodie_01":            "https://app.faucetdrops.io/hoodie-front.jpg",
    "merch_cap_black_01":         "https://app.faucetdrops.io/capB.jpeg",
    "merch_cap_trucker_01":       "https://app.faucetdrops.io/capw.jpeg",
    "merch_bottle_black_01":      "https://app.faucetdrops.io/mugb.jpeg",
    "merch_bottle_white_01":      "https://app.faucetdrops.io/mugw.jpg",
    "merch_backpack_01":          "https://app.faucetdrops.io/bag.jpeg",
    "merch_bracelet_rope_01":     "https://app.faucetdrops.io/bracelet.jpeg",
    "merch_bracelet_silicone_01": "https://app.faucetdrops.io/bracelet.jpeg",
    "merch_jug_01":               "https://app.faucetdrops.io/jug.jpeg",
    "merch_pen_01":               "https://app.faucetdrops.io/pen.jpeg",
    "merch_stickers_01":          "https://app.faucetdrops.io/sticker.jpeg",
    "merch_writing_01":           "https://app.faucetdrops.io/writing.jpeg",
    "merch_book_01":              "https://app.faucetdrops.io/book.jpeg",
}

def _item_image_url(item_id: str) -> str:
    return ITEM_IMAGES.get(item_id, "https://faucetdrops.io/drop-token.png")

import resend  # pip install resend
SOLANA_PROGRAM_ID = "5Kw76EwothAXEiDt3EPTmxwYLdWiw89pRAXxWHVmsXTU"
RESEND_API_KEY      = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL          = os.getenv("FROM_EMAIL", "orders@faucetdrops.io")
ADMIN_EMAIL         = os.getenv("ADMIN_EMAIL", "admin@faucetdrops.io")
FRONTEND_URL        = os.getenv("FRONTEND_URL", "https://faucetdrops.io")
HOMEPAGE_URL        = os.getenv("HOMEPAGE_URL", "https://faucetdrops.io")

resend.api_key = RESEND_API_KEY

CHAIN_NAMES_MAP = {
    42220: "Celo", 8453: "Base", 42161: "Arbitrum",
    56: "BNB Chain", 1135: "Lisk",11142220: "Celo Sepolia",
}

CHAIN_EXPLORERS_MAP = {
    42220: "https://celoscan.io/tx/",
    8453:  "https://basescan.org/tx/",
    42161: "https://arbiscan.io/tx/",
    56:    "https://bscscan.com/tx/",
    1135:  "https://blockscout.lisk.com/tx/",
    11142220: "https://sepolia.celoscan.io/tx/",  # Celo Alfajores
}

ITEM_DISPLAY_NAMES = {
    "merch_tshirt_01":      "Builder T-Shirt",
    "merch_tshirt_02":      "Builder T-Shirt (Alt)",
    "merch_hoodie_01":      "Genesis Hoodie",
    "merch_cap_black_01":   "Drop Points Cap",
    "merch_cap_trucker_01": "FaucetDrops Trucker Cap",
    "merch_bottle_black_01":"Drop Bottle — Black",
    "merch_bottle_white_01":"Drop Bottle — White",
    "merch_backpack_01":    "Drop Backpack",
    "merch_bracelet_rope_01":     "Builder Rope Bracelet",
    "merch_bracelet_silicone_01": "Drop Silicone Band",
    "merch_jug_01":         "FaucetDrops Jug",
    "merch_pen_01":         "Tactical Drop Pen",
    "merch_stickers_01":    "Sticker Pack",
}


# ─── EMAIL HELPERS ────────────────────────────────────────────────────────────

def _item_name(item_id: str) -> str:
    return ITEM_DISPLAY_NAMES.get(item_id, item_id.replace("_", " ").title())

def _explorer_link(tx_hash: str, chain_id: int) -> str:
    base = CHAIN_EXPLORERS_MAP.get(chain_id, "https://basescan.org/tx/")
    return f"{base}{tx_hash}"

def _tracking_url_for_order(order: dict) -> str:
    oid = order.get("order_id") or order.get("orderId", "")
    return f"{FRONTEND_URL}/store/orders/track?id={oid}"

# ── Helper ──────────────────────────────────────────────────────────────────
async def _require_email(creator_address: str) -> None:
    """
    Raises HTTP 403 with code 'EMAIL_REQUIRED' if the creator has not
    linked a Gmail / email address to their profile yet.
    """
    wallet_key = creator_address.lower() if not is_solana_address(creator_address) else creator_address
    try:
        res = supabase.table("user_profiles") \
            .select("email") \
            .eq("wallet_address", wallet_key) \
            .execute()
    except Exception as e:
        print(f"⚠️  Email check DB error: {e}")
        raise HTTPException(status_code=500, detail="Could not verify profile.")

    if not res.data or not res.data[0].get("email"):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "EMAIL_REQUIRED",
                "message": "Please add your email in Profile Settings before creating a quest.",
            },
        )

async def send_order_confirmation_emails(order: dict):
    if not RESEND_API_KEY:
        print("⚠️  RESEND_API_KEY not set — skipping order emails")
        return

    order_id       = str(order.get("order_id", "")).split("-")[0].upper()
    full_order_id  = str(order.get("order_id", ""))
    item           = _item_name(order.get("item_id", ""))
    item_img       = _item_image_url(order.get("item_id", ""))
    customer_name  = order.get("full_name", "Builder")
    customer_email = order.get("email", "")
    chain_id       = int(order.get("chain_id") or 8453)
    tx_hash        = order.get("tx_hash", "")
    wallet         = order.get("wallet_address", "")
    addr           = order.get("shipping_address") or {}
    if isinstance(addr, str):
        import json as _j
        addr = _j.loads(addr)

    tracking_page = _tracking_url_for_order({"orderId": full_order_id})
    tx_link       = _explorer_link(tx_hash, chain_id)
    chain_name    = CHAIN_NAMES_MAP.get(chain_id, "blockchain")

    SHARED_STYLES = """
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 0; }
    .wrap { max-width: 560px; margin: 40px auto; }
    .card { background: #141414; border: 1px solid #262626;
            border-radius: 20px; overflow: hidden; }
    .hdr  { background: #1a1a1a; border-bottom: 1px solid #262626;
            padding: 28px 32px; }
    .hero { text-align: center; padding: 24px 32px 0;
            border-bottom: 1px solid #1f1f1f; }
    .hero img { border-radius: 14px; object-fit: cover;
                border: 1px solid #2a2a2a; display: block; margin: 0 auto; }
    .hero p   { font-size: 15px; font-weight: 700; color: #fff;
                margin: 10px 0 20px; }
    .body { padding: 28px 32px 32px; }
    h1    { font-size: 22px; font-weight: 900; margin: 0 0 4px; color: #fff; }
    .sub  { font-size: 12px; color: #737373; margin: 0; }
    .row  { display: flex; justify-content: space-between;
            padding: 12px 0; border-bottom: 1px solid #1f1f1f; }
    .row:last-child { border-bottom: none; }
    .lbl  { font-size: 11px; color: #737373; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.08em; }
    .val  { font-size: 13px; font-weight: 700; color: #e5e5e5; text-align: right; }
    .btn  { display: inline-block; margin-top: 24px; padding: 14px 28px;
            background: #3b82f6; color: #fff; font-weight: 900; font-size: 13px;
            text-decoration: none; border-radius: 12px; }
    .footer { font-size: 11px; color: #525252; text-align: center;
              margin-top: 24px; padding: 0 16px; }
    a { color: #60a5fa; }
    """

    # ── 1. Customer confirmation email ────────────────────────────────────
    if customer_email:
        try:
            resend.Emails.send({
                "from": f"FaucetDrops Orders <{FROM_EMAIL}>",
                "to":   customer_email,
                "subject": f"Order Confirmed #{order_id} — {item}",
                "html": f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>{SHARED_STYLES}</style></head>
<body>
  <div class="wrap">
    <div class="card">

      <div class="hdr">
        <h1>Order Confirmed! 🎉</h1>
        <p class="sub">FaucetDrops Merch Store · #{order_id}</p>
      </div>

      <div class="hero">
        <img src="{item_img}" alt="{item}" width="180" height="180"/>
        <p>{item}</p>
      </div>

      <div class="body">
        <p style="font-size:14px;color:#a3a3a3;margin:0 0 24px">
          Hey {customer_name}, your Drop Points have been burned and your order
          is locked in. We'll get it out to you as soon as possible.
        </p>

        <div class="row">
          <span class="lbl">Order ID</span>
          <span class="val" style="font-family:monospace">#{order_id}</span>
        </div>
        <div class="row">
          <span class="lbl">Chain</span>
          <span class="val">{chain_name}</span>
        </div>
        <div class="row">
          <span class="lbl">Wallet</span>
          <span class="val" style="font-family:monospace;font-size:11px">
            {wallet[:8]}…{wallet[-6:]}
          </span>
        </div>
        <div class="row">
          <span class="lbl">Ship to</span>
          <span class="val" style="font-size:12px;line-height:1.5">
            {addr.get('street','')}<br/>
            {addr.get('city','')}, {addr.get('state','')} {addr.get('zip','')}<br/>
            {addr.get('country','')}
          </span>
        </div>
        <div class="row">
          <span class="lbl">Burn TX</span>
          <span class="val">
            <a href="{tx_link}" style="font-family:monospace;font-size:11px">
              {tx_hash[:10]}…{tx_hash[-8:]}
            </a>
          </span>
        </div>

        <a href="{tracking_page}" class="btn">Track My Order →</a>

        <p style="font-size:12px;color:#525252;margin-top:24px">
          You'll receive another email when your order ships with a tracking number.
          Questions? Reply to this email or contact
          <a href="mailto:support@faucetdrops.io">support@faucetdrops.io</a>.
        </p>
      </div>
    </div>

    <div class="footer">
      © FaucetDrops · Drip With Purpose<br/>
      You're receiving this because you placed an order at faucetdrops.io
    </div>
  </div>
</body>
</html>""",
            })
            print(f"✅ Order confirmation email sent to {customer_email}")
        except Exception as e:
            print(f"⚠️  Customer email failed: {e}")

    # ── 2. Admin alert email ───────────────────────────────────────────────
    ADMIN_STYLES = """
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 0; }
    .wrap { max-width: 560px; margin: 40px auto; }
    .card { background: #141414; border: 1px solid #262626; border-radius: 20px; overflow: hidden; }
    .hdr  { background: #1a1a1a; border-bottom: 1px solid #262626; padding: 24px 28px; }
    .hero { text-align: center; padding: 20px 28px 0; border-bottom: 1px solid #1f1f1f; }
    .hero img { border-radius: 12px; object-fit: cover; border: 1px solid #2a2a2a;
                display: block; margin: 0 auto; }
    .hero p   { font-size: 14px; font-weight: 700; color: #fff; margin: 8px 0 16px; }
    .body { padding: 24px 28px 28px; }
    h1    { font-size: 18px; font-weight: 900; margin: 0 0 4px; color: #fff; }
    .sub  { font-size: 11px; color: #737373; margin: 0; }
    .row  { display: flex; justify-content: space-between; padding: 10px 0;
            border-bottom: 1px solid #1f1f1f; }
    .row:last-child { border-bottom: none; }
    .lbl  { font-size: 10px; color: #737373; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.08em; }
    .val  { font-size: 12px; font-weight: 700; color: #e5e5e5; text-align: right; }
    .btn  { display: inline-block; margin-top: 20px; padding: 12px 24px;
            background: #f59e0b; color: #000; font-weight: 900; font-size: 12px;
            text-decoration: none; border-radius: 10px; }
    a { color: #60a5fa; }
    """
    try:
        resend.Emails.send({
            "from": f"FaucetDrops Orders <{FROM_EMAIL}>",
            "to":   ADMIN_EMAIL,
            "subject": f"🛍 New Order #{order_id} — {item} · {customer_name}",
            "html": f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>{ADMIN_STYLES}</style></head>
<body>
  <div class="wrap">
    <div class="card">

      <div class="hdr">
        <h1>New Order Needs Fulfillment</h1>
        <p class="sub">FaucetDrops Admin Alert · #{order_id}</p>
      </div>

      <div class="hero">
        <img src="{item_img}" alt="{item}" width="160" height="160"/>
        <p>{item}</p>
      </div>

      <div class="body">
        <div class="row"><span class="lbl">Item</span><span class="val">{item}</span></div>
        <div class="row">
          <span class="lbl">Customer</span>
          <span class="val">{customer_name} · <a href="mailto:{customer_email}">{customer_email}</a></span>
        </div>
        <div class="row">
          <span class="lbl">Wallet</span>
          <span class="val" style="font-family:monospace;font-size:11px">{wallet}</span>
        </div>
        <div class="row">
          <span class="lbl">Ship to</span>
          <span class="val" style="font-size:11px;line-height:1.5">
            {addr.get('street','')}, {addr.get('city','')},
            {addr.get('state','')} {addr.get('zip','')},
            {addr.get('country','')}
          </span>
        </div>
        <div class="row">
          <span class="lbl">Chain</span><span class="val">{chain_name}</span>
        </div>
        <div class="row">
          <span class="lbl">TX</span>
          <span class="val">
            <a href="{tx_link}" style="font-size:11px;font-family:monospace">
              {tx_hash[:12]}…{tx_hash[-8:]}
            </a>
          </span>
        </div>
        <a href="{FRONTEND_URL}/admin/orders" class="btn">Open Admin Dashboard →</a>
      </div>
    </div>
  </div>
</body>
</html>""",
        })
        print(f"✅ Admin alert email sent for order #{order_id}")
    except Exception as e:
        print(f"⚠️  Admin alert email failed: {e}")

async def get_all_user_emails():
    """Fetch all emails from user_profiles table."""
    try:
        # Fetch only non-null emails
        res = supabase.table("user_profiles").select("email").not_.is_("email", "null").execute()
        return [row["email"] for row in res.data if row.get("email")]
    except Exception as e:
        print(f"⚠️ Error fetching user emails: {e}")
        return []

QUEST_EMAIL_STYLE = """
    body { font-family: sans-serif; background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 0; }
    .wrap { max-width: 560px; margin: 20px auto; border: 1px solid #262626; border-radius: 12px; overflow: hidden; background: #141414; }
    .hero { width: 100%; height: auto; border-bottom: 1px solid #262626; }
    .content { padding: 32px; }
    h1 { color: #ffffff; font-size: 24px; margin-bottom: 16px; }
    p { line-height: 1.6; color: #a3a3a3; }
    .btn { display: inline-block; padding: 12px 24px; background: #3b82f6; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #525252; }
"""

async def send_new_quest_email(title: str, description: str, image_url: str):
    emails = await get_all_user_emails()
    if not emails or not RESEND_API_KEY:
        return

    html_body = f"""
    <html>
    <head><style>{QUEST_EMAIL_STYLE}</style></head>
    <body>
        <div class="wrap">
            <img src="{image_url}" class="hero" />
            <div class="content">
                <h1>{title}</h1>
                <p>{description}</p>
                <a href="{FRONTEND_URL}/quests" class="btn">Start Quest & Earn Points</a>
            </div>
            <div class="footer">© FaucetDrops · Drip with Purpose</div>
        </div>
    </body>
    </html>
    """

    # Split into batches of 50 (Resend's limit)
    batch_size = 50
    batches = [emails[i:i + batch_size] for i in range(0, len(emails), batch_size)]
    
    success_count = 0
    for batch in batches:
        try:
            resend.Emails.send({
                "from": f"FaucetDrops Quests <{ADMIN_EMAIL}>",
                "to": batch,
                "subject": f"🚀 New Quest Live: {title}",
                "html": html_body
            })
            success_count += len(batch)
            # Small delay to avoid rate limiting
            await asyncio.sleep(0.5)
        except Exception as e:
            print(f"⚠️ Broadcast failed for batch: {e}")

    print(f"✅ New quest email broadcast to {success_count}/{len(emails)} users")    
async def send_shipping_update_email(order: dict):
    if not RESEND_API_KEY:
        return

    order_id       = str(order.get("order_id", "")).split("-")[0].upper()
    full_order_id  = str(order.get("order_id", ""))
    item           = _item_name(order.get("item_id", ""))
    item_img       = _item_image_url(order.get("item_id", ""))
    customer_name  = order.get("full_name", "Builder")
    customer_email = order.get("email", "")
    status         = order.get("status", "shipped")
    tracking_num   = order.get("tracking_number") or ""
    tracking_url   = order.get("tracking_url") or ""
    est_delivery   = order.get("estimated_delivery") or ""
    notes          = order.get("shipping_notes") or ""
    chain_id       = int(order.get("chain_id") or 8453)

    if not customer_email:
        return

    tracking_page = _tracking_url_for_order({"orderId": full_order_id})
    is_delivered  = status == "delivered"
    status_label  = "Delivered 🎉" if is_delivered else "Shipped 🚚"
    headline      = "Your order has arrived!" if is_delivered else "Your order is on its way!"
    subline       = (
        f"Order #{order_id} has been delivered. We hope you love it!"
        if is_delivered
        else f"Order #{order_id} has left our warehouse and is headed to you."
    )

    tracking_block = ""
    if not is_delivered and tracking_num:
        carrier_link = (
            f'<a href="{tracking_url}" style="color:#60a5fa">{tracking_num}</a>'
            if tracking_url else tracking_num
        )
        tracking_block = f"""
        <div class="row">
          <span class="lbl">Tracking Number</span>
          <span class="val" style="font-family:monospace">{carrier_link}</span>
        </div>"""
        if est_delivery:
            tracking_block += f"""
        <div class="row">
          <span class="lbl">Estimated Delivery</span>
          <span class="val">{est_delivery}</span>
        </div>"""

    notes_block = ""
    if notes:
        notes_block = f"""
        <div style="margin-top:16px;padding:14px;background:#1f1f1f;
             border-radius:10px;border:1px solid #2a2a2a">
          <p style="font-size:10px;font-weight:700;color:#737373;
             text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px">
            Note from the team
          </p>
          <p style="font-size:13px;margin:0;color:#a3a3a3">{notes}</p>
        </div>"""

    SHIP_STYLES = """
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 0; }
    .wrap { max-width: 560px; margin: 40px auto; }
    .card { background: #141414; border: 1px solid #262626;
            border-radius: 20px; overflow: hidden; }
    .hdr  { background: #1a1a1a; border-bottom: 1px solid #262626; padding: 28px 32px; }
    .hero { text-align: center; padding: 24px 32px 0; border-bottom: 1px solid #1f1f1f; }
    .hero img { border-radius: 14px; object-fit: cover; border: 1px solid #2a2a2a;
                display: block; margin: 0 auto; }
    .hero p   { font-size: 15px; font-weight: 700; color: #fff; margin: 10px 0 20px; }
    .body { padding: 28px 32px 32px; }
    h1    { font-size: 22px; font-weight: 900; margin: 0 0 4px; color: #fff; }
    .sub  { font-size: 12px; color: #737373; margin: 0; }
    .row  { display: flex; justify-content: space-between;
            padding: 12px 0; border-bottom: 1px solid #1f1f1f; }
    .row:last-child { border-bottom: none; }
    .lbl  { font-size: 11px; color: #737373; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.08em; }
    .val  { font-size: 13px; font-weight: 700; color: #e5e5e5; text-align: right; }
    .btn  { display: inline-block; margin-top: 24px; padding: 14px 28px;
            background: #3b82f6; color: #fff; font-weight: 900; font-size: 13px;
            text-decoration: none; border-radius: 12px; }
    a { color: #60a5fa; }
    """

    try:
        resend.Emails.send({
            "from": f"FaucetDrops Orders <{FROM_EMAIL}>",
            "to":   customer_email,
            "subject": f"Order {status_label} #{order_id} — {item}",
            "html": f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>{SHIP_STYLES}</style></head>
<body>
  <div class="wrap">
    <div class="card">

      <div class="hdr">
        <h1>{headline}</h1>
        <p class="sub">FaucetDrops Merch Store · #{order_id}</p>
      </div>

      <div class="hero">
        <img src="{item_img}" alt="{item}" width="180" height="180"/>
        <p>{item}</p>
      </div>

      <div class="body">
        <p style="font-size:14px;color:#a3a3a3;margin:0 0 24px">
          Hey {customer_name}, {subline}
        </p>
        <div class="row">
          <span class="lbl">Status</span>
          <span class="val">{status_label}</span>
        </div>
        {tracking_block}
        {notes_block}
        <a href="{tracking_page}" class="btn">View Order Details →</a>
        <p style="font-size:12px;color:#525252;margin-top:24px">
          Questions? Contact
          <a href="mailto:support@faucetdrops.io">support@faucetdrops.io</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>""",
        })
        print(f"✅ Shipping update email sent to {customer_email} (status: {status})")
    except Exception as e:
        print(f"⚠️  Shipping update email failed: {e}")  
        
# ─── DRAFT / DEMO QUEST REMINDER EMAILS ──────────────────────────────────────

DRAFT_REMINDER_STYLE = """
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
       background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 0; }
.wrap { max-width: 560px; margin: 40px auto; }
.card { background: #141414; border: 1px solid #262626;
        border-radius: 20px; overflow: hidden; }
.hdr  { background: #1a1a1a; border-bottom: 1px solid #262626; padding: 28px 32px; }
.body { padding: 28px 32px 32px; }
h1   { font-size: 22px; font-weight: 900; margin: 0 0 4px; color: #fff; }
.sub { font-size: 12px; color: #737373; margin: 0; }
p    { font-size: 14px; color: #a3a3a3; line-height: 1.6; margin: 0 0 20px; }
.btn { display: inline-block; padding: 14px 28px; font-weight: 900;
       font-size: 13px; text-decoration: none; border-radius: 12px; margin-top: 8px; }
.btn-blue  { background: #3b82f6; color: #fff; }
.btn-green { background: #10b981; color: #fff; }
.feature   { display: flex; align-items: flex-start; gap: 12px;
             padding: 12px 0; border-bottom: 1px solid #1f1f1f; }
.feature:last-child { border-bottom: none; }
.icon { font-size: 20px; margin-top: 2px; }
.ft   { font-size: 11px; color: #525252; text-align: center; margin-top: 24px; }
a     { color: #60a5fa; }
"""


async def send_draft_quest_reminder(quest: dict):
    """Sent to creators who started a draft quest but never finalized it."""
    if not RESEND_API_KEY:
        return

    creator_email = quest.get("creator_email") or quest.get("email", "")
    if not creator_email:
        # Fetch email from user_profiles using creator_address
        try:
            profile = supabase.table("user_profiles") \
                .select("email") \
                .eq("wallet_address", quest.get("creator_address", "").lower()) \
                .execute()
            creator_email = profile.data[0].get("email", "") if profile.data else ""
        except Exception:
            pass

    if not creator_email:
        print(f"⚠️  No email found for draft quest creator {quest.get('creator_address')}")
        return

    title    = quest.get("title", "Your Quest")
    draft_id = quest.get("faucet_address", "")
    # Deep-link directly back into the builder at the finalize step
    continue_url = f"{FRONTEND_URL}/quests/create?draft={draft_id}&step=finalize"

    try:
        resend.Emails.send({
            "from": f"FaucetDrops Quests <{ADMIN_EMAIL}>",
            "to":   creator_email,
            "subject": f"You left '{title}' unfinished — pick up where you left off",
            "html": f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>{DRAFT_REMINDER_STYLE}</style></head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="hdr">
        <h1>Your quest is waiting ⏳</h1>
        <p class="sub">FaucetDrops · Draft Quest Reminder</p>
      </div>
      <div class="body">
        <p>
          Hey there! You started building <strong style="color:#fff">{title}</strong>
          a few days ago but haven't launched it yet. Your draft is still saved —
          it only takes a few minutes to go live.
        </p>

        <div class="feature">
          <span class="icon">🎯</span>
          <div>
            <p style="margin:0;color:#fff;font-weight:700;font-size:13px">Deploy your quest contract</p>
            <p style="margin:4px 0 0;font-size:13px">Fund the reward pool and set your tasks live.</p>
          </div>
        </div>
        <div class="feature">
          <span class="icon">🏆</span>
          <div>
            <p style="margin:0;color:#fff;font-weight:700;font-size:13px">Attract participants</p>
            <p style="margin:4px 0 0;font-size:13px">
              Quests appear in the public feed the moment they're finalized.
            </p>
          </div>
        </div>
        <div class="feature">
          <span class="icon">💸</span>
          <div>
            <p style="margin:0;color:#fff;font-weight:700;font-size:13px">Reward your community</p>
            <p style="margin:4px 0 0;font-size:13px">
              Automated on-chain payouts. No manual work after you launch.
            </p>
          </div>
        </div>

        <a href="{continue_url}" class="btn btn-blue" style="margin-top:24px">
          Continue building →
        </a>

        <p style="margin-top:24px;font-size:12px;color:#525252">
          Your draft is saved at the link above. If you have questions,
          reply to this email or reach
          <a href="mailto:support@faucetdrops.io">support@faucetdrops.io</a>.
        </p>
      </div>
    </div>
    <div class="ft">© FaucetDrops · Drip With Purpose</div>
  </div>
</body>
</html>""",
        })
        print(f"✅ Draft reminder sent to {creator_email} for quest '{title}'")
    except Exception as e:
        print(f"⚠️  Draft reminder email failed: {e}")


async def send_demo_quest_followup(quest: dict):
    """Sent to demo-quest users 3 days after creation — nudges them to subscribe."""
    if not RESEND_API_KEY:
        return

    creator_email = quest.get("creator_email") or quest.get("email", "")
    if not creator_email:
        try:
            profile = supabase.table("user_profiles") \
                .select("email") \
                .eq("wallet_address", quest.get("creator_address", "").lower()) \
                .execute()
            creator_email = profile.data[0].get("email", "") if profile.data else ""
        except Exception:
            pass

    if not creator_email:
        print(f"⚠️  No email found for demo quest creator {quest.get('creator_address')}")
        return

    subscribe_url = f"{HOMEPAGE_URL}/pricing"
    quests_url    = f"{FRONTEND_URL}/quests/create"

    try:
        resend.Emails.send({
            "from": f"FaucetDrops Quests <{ADMIN_EMAIL}>",
            "to":   creator_email,
            "subject": "How's the demo going? Here's what's waiting for you 🚀",
            "html": f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>{DRAFT_REMINDER_STYLE}</style></head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="hdr">
        <h1>Enjoying the demo? 👋</h1>
        <p class="sub">FaucetDrops · Quest Creator Check-in</p>
      </div>
      <div class="body">
        <p>
          You tried the FaucetDrops demo quest a few days ago. We hope it gave you
          a feel for what's possible. Here's what you unlock when you go live with
          a real quest:
        </p>

        <div class="feature">
          <span class="icon">🔗</span>
          <div>
            <p style="margin:0;color:#fff;font-weight:700;font-size:13px">Real on-chain rewards</p>
            <p style="margin:4px 0 0;font-size:13px">
              Deploy your own reward contract, fund it with any ERC-20 or native
              token, and winners claim trustlessly on-chain.
            </p>
          </div>
        </div>
        <div class="feature">
          <span class="icon">📣</span>
          <div>
            <p style="margin:0;color:#fff;font-weight:700;font-size:13px">Public quest listing</p>
            <p style="margin:4px 0 0;font-size:13px">
              Your quest is featured in the FaucetDrops explore feed, reaching
              thousands of active community members.
            </p>
          </div>
        </div>
        <div class="feature">
          <span class="icon">🤖</span>
          <div>
            <p style="margin:0;color:#fff;font-weight:700;font-size:13px">Auto-verification</p>
            <p style="margin:4px 0 0;font-size:13px">
              Discord joins, Twitter follows, Telegram memberships, and on-chain
              tasks verified automatically — no manual review needed.
            </p>
          </div>
        </div>
        <div class="feature">
          <span class="icon">📊</span>
          <div>
            <p style="margin:0;color:#fff;font-weight:700;font-size:13px">Leaderboard + analytics</p>
            <p style="margin:4px 0 0;font-size:13px">
              Live leaderboard, stage progression, referral tracking, and full
              participant analytics in your admin dashboard.
            </p>
          </div>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px">
          <a href="{subscribe_url}" class="btn btn-green">View plans &amp; pricing →</a>
          <a href="{quests_url}" class="btn btn-blue"
             style="background:#1f1f1f;border:1px solid #333;">
            Launch a real quest
          </a>
        </div>

        <p style="margin-top:24px;font-size:12px;color:#525252">
          Questions before you subscribe? Reply to this email — a real human reads it.
        </p>
      </div>
    </div>
    <div class="ft">© FaucetDrops · Drip With Purpose</div>
  </div>
</body>
</html>""",
        })
        print(f"✅ Demo follow-up sent to {creator_email}")
    except Exception as e:
        print(f"⚠️  Demo follow-up email failed: {e}")


async def draft_quest_reminder_processor():
    """
    Background loop: every hour, find draft/demo quests created 3+ days ago
    whose reminder email hasn't been sent yet, then send and mark them.
    """
    print("📧 Draft Quest Reminder Processor started...")
    await asyncio.sleep(60)  # small startup delay so the pool is ready

    while True:
        try:
            cutoff_iso = (
                datetime.now(timezone.utc) - timedelta(days=3)
            ).isoformat()

            # Fetch draft quests (faucet_address may be a real address or "draft-*")
            response = supabase.table("quests") \
                .select(
                    "faucet_address, title, creator_address, "
                    "created_at, draft_reminder_sent_at"
                ) \
                .eq("is_draft", True) \
                .is_("draft_reminder_sent_at", "null") \
                .lt("created_at", cutoff_iso) \
                .execute()

            pending = response.data or []
            print(f"[DraftReminder] Found {len(pending)} draft/demo quests needing a nudge")

            for quest in pending:
                faucet_addr = quest.get("faucet_address", "")
                is_demo     = (
                    str(faucet_addr).startswith("demo-")
                    or str(faucet_addr).startswith("draft-")
                )

                # Send the right email
                if is_demo:
                    await send_demo_quest_followup(quest)
                else:
                    await send_draft_quest_reminder(quest)

                # Mark so we never send twice
                try:
                    supabase.table("quests") \
                        .update({
                            "draft_reminder_sent_at":
                                datetime.now(timezone.utc).isoformat()
                        }) \
                        .eq("faucet_address", faucet_addr) \
                        .execute()
                except Exception as mark_err:
                    print(f"⚠️  Could not mark reminder sent for {faucet_addr}: {mark_err}")

                # Small pause between sends to respect Resend rate limits
                await asyncio.sleep(1)

        except Exception as e:
            print(f"💥 DraftReminderProcessor error: {e}")
            traceback.print_exc()

        # Check once per hour
        await asyncio.sleep(3600)
                 
quizzes: Dict[str, dict] = {}                           # code → quiz data
connections: Dict[str, List[WebSocket]] = {}            # code → [ws, ...]
player_sockets: Dict[str, Dict[str, WebSocket]] = {}    # code → {wallet → ws}
game_state: Dict[str, dict] = {}                        # code → runtime state
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
CONTRACT_ADDRESSES: dict[int, str] = {
    42220: "0xF8F6D74E61A0FC2dd2feCd41dE384ba2fbf91b9D",  # Celo
    8453:  "0x42fcB7C4D4a36D772c430ee8C7d026f627365BcB",  # Base
    56:    "0x4C603fe32fe590D8A47B7f23b027dc24C2c762B1",  # BNB
    1135:  "0x28B9DAB4Fd2CD9bF1A4773dB858e03Ee178AE075",  # Lisk
    42161: "0xEcb026D22f9aA7FD9Aa83B509834dB8Fd66B27F6",  # Arbitrum
}
GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY")           # load from env
GEMINI_URL       = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)
REWARD_API_URL   = "https://faucetdrop-backend.onrender.com/api/quiz/dispatch-rewards"
quiz_router = APIRouter()
ws_router   = APIRouter()
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
DISCORD_API_URL = "https://discord.com/api/v10"
if DISCORD_BOT_TOKEN:
    print(f"✅ DISCORD_BOT_TOKEN loaded ({DISCORD_BOT_TOKEN[:10]}...)")
else:
    print("❌ DISCORD_BOT_TOKEN is NOT SET — Discord verification will fail!")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
config = Config(environ=os.environ)
oauth = OAuth(config)
oauth.register(
    name='discord',
    client_id=config("DISCORD_CLIENT_ID"),
    client_secret=config("DISCORD_CLIENT_SECRET"),
    authorize_url='https://discord.com/api/oauth2/authorize',
    access_token_url='https://discord.com/api/oauth2/token',
    api_base_url='https://discord.com/api/',
    client_kwargs={'scope': 'identify guilds guilds.members.read'}
)
auth_router = APIRouter(prefix="/auth", tags=["auth"])
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
app.add_middleware(
    SessionMiddleware, 
    secret_key=os.getenv("SESSION_SECRET", "some-random-secret-key-change-this"),
    max_age=3600  # Session expires in 1 hour
)
from fastapi import Depends
async def require_pool():
    if not pool:
        raise HTTPException(status_code=503, detail="Database not available")
    conn = await pool.acquire()
    try:
        yield conn
    finally:
        await pool.release(conn)
app.include_router(auth_router)
# Validate environment variables
if not PRIVATE_KEY or PRIVATE_KEY == "0x" + "0"*64:
    pass # Let initialization continue, but rely on function-level gas checks.
if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_KEY"):
    print("FATAL: SUPABASE_URL or SUPABASE_KEY not set.")
   
# Initialize Supabase client
try:
    # CRITICAL CHANGE: Use SUPABASE_SERVICE_ROLE_KEY instead of SUPABASE_KEY
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase_url = os.getenv("SUPABASE_URL")
    
    if not service_role_key:
        print("WARNING: SUPABASE_SERVICE_ROLE_KEY not set. Uploads may fail due to RLS.")
        # Fallback to standard key if service key is missing (optional)
        service_role_key = os.getenv("SUPABASE_KEY")
    supabase: Client = create_client(supabase_url, service_role_key)
    
except Exception as e:
    print(f"Supabase initialization failed: {e}. API endpoints relying on Supabase will fail.")
   
# SYNCED CHAIN IDS - Must match frontend exactly
VALID_CHAIN_IDS = [
    1, # Ethereum Mainnet
    42220, # Celo Mainnet
    44787, # Celo Testnet
    62320, # Custom Network
    1135, # Lisk
    4202, # Lisk Testnet
    11142220,
    8453, # Base
    84532, # Base Testnet
    42161, # Arbitrum One
    421614, # Arbitrum Sepolia
    137, # Polygon Mainnet
    56,
    43114,
]

signer = Account.from_key(PRIVATE_KEY)
# Platform owner address
PLATFORM_OWNER = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785"
# --- NEW QUEST PYDANTIC MODELS ---
class StagePassRequirements(BaseModel):
    Beginner: int = 0
    Intermediate: int = 0
    Advance: int = 0
    Legend: int = 0
    Ultimate: int = 0
# Request model for availability check

class StockUpdateRequest(BaseModel):
    adminAddress: str
    quantity: int  # positive = add stock
 
# --- ADMIN MERCHANDISE ENDPOINTS ---
class MerchOrderRequest(BaseModel):
    txHash: str
    chainId: int
    walletAddress: str
    itemId: str
    shippingDetails: dict


class UpdateOrderStatusRequest(BaseModel):
    adminAddress: str
    status: str # 'processing', 'shipped', 'delivered'
    
class AvailabilityCheck(BaseModel):
    field: str              # e.g., "username", "email", "twitter_handle"
    value: str              # e.g., "Jerydam", "test@gmail.com"
    current_wallet: str     # The wallet address of the user editing the profile
class DeleteFaucetRequest(BaseModel):
    faucetAddress: str
    userAddress: str # The initiator of the deletion
    chainId: int
    
class XCommentVerifyRequest(BaseModel):
    submissionId: str
    walletAddress: str
    taskId: str
    proofUrl: str     
class ConfirmDeliveryRequest(BaseModel):
    walletAddress: str
  
class MonthlyGreetingRequest(BaseModel):
    title: str
    content: str
    imageUrl: str
    adminAddress: str
            
class QuestTask(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    points: Union[int, str]
    required: bool
    category: str
    url: Optional[str] = None
    action: Optional[str] = None
    verificationType: str
    targetPlatform: Optional[str] = None
    stage: str
    targetServerId: Optional[str] = None
    targetHandle: Optional[str] = None
    targetContractAddress: Optional[str] = None
    minAmount: Optional[str] = None
    minTxCount: Optional[str] = None
    minDays: Optional[str] = None
    targetChainId: Optional[str] = None
    isSystem: Optional[bool] = False
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    model_config = ConfigDict(extra='allow', populate_by_name=True)
    
class QuestDraft(BaseModel):
    creatorAddress: str
    title: str
    description: Optional[str] = ""
    imageUrl: Optional[str] = ""
    rewardPool: str
    rewardTokenType: str
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    tokenAddress: Optional[str] = None
    tokenSymbol: Optional[str] = None          # camelCase from frontend
    token_symbol: Optional[str] = None         # snake_case from frontend
    distributionConfig: Optional[Dict[str, Any]] = None
    faucetAddress: Optional[str] = None
    tasks: Optional[List[Dict[str, Any]]] = None
    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )
    def get_token_symbol(self) -> Optional[str]:
        """Returns whichever symbol field was populated."""
        return self.token_symbol or self.tokenSymbol
class BotVerifyRequest(BaseModel):
    submissionId: str
    faucetAddress: str
    walletAddress: str
    handle: str
    proofUrl: str
    taskType: str
import os
import asyncio
class QuestFinalize(BaseModel):
    faucetAddress: str 
    draftId: Optional[str] = None
    
    creatorAddress: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    
    startDate: str
    endDate: str
    claimWindowHours: int
    tasks: List[Union[dict, QuestTask]] 
    
    stagePassRequirements: Union[dict, StagePassRequirements] 
    enforceStageRules: bool = False
    chainId: int
    rewardPool: Optional[str] = None
    rewardTokenType: Optional[str] = None
    tokenAddress: Optional[str] = None
    tokenSymbol: Optional[str] = None
    distributionConfig: Optional[Dict[str, Any]] = None
class Quest(BaseModel):
    creatorAddress: str
    title: str
    description: str
    isActive: bool = True
    rewardPool: str
    startDate: str
    endDate: str
    imageUrl: str # New field
    faucetAddress: str
    rewardTokenType: str
    tokenAddress: str
    tasks: List[QuestTask]
    stagePassRequirements: StagePassRequirements # New field
# --- Pydantic Model (No changes needed here) ---
class RegisterFaucetRequest(BaseModel):
    faucetAddress: str
    ownerAddress: str
    chainId: int
    faucetType: str
    name: str
class ImageUploadResponse(BaseModel):
    success: bool
    imageUrl: str
    message: str
class FinalizeRewardsRequest(BaseModel):
    adminAddress: str
    faucetAddress: str
    chainId: int
    winners: List[str]
    amounts: List[int]
# In your FastAPI project's 'schemas.py'
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date

class QuestOverview(BaseModel):
    
    faucetAddress: str = Field(alias="faucet_address")
    title: str = Field(alias="title")
    description: Optional[str] = Field(alias="description")
    isActive: bool = Field(alias="is_active")
    rewardPool: str = Field(alias="reward_pool")
    creatorAddress: str = Field(alias="creator_address")
    startDate: str = Field(alias="start_date") 
    endDate: str = Field(alias="end_date")
    # These fields are computed/fetched separately
    tasksCount: int = Field(alias="tasksCount") # Computed, keep simple alias
    participantsCount: int = Field(alias="participantsCount") # Computed, keep simple alias
   
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )
class QuizOption(BaseModel):
    id: str
    text: str
class QuizQuestion(BaseModel):
    question: str
    options: List[QuizOption]
    correctId: str
    timeLimit: int = 30
class RewardDistributionRow(BaseModel):
    rank: int
    pct: float
    amount: float

class RewardConfig(BaseModel):
    poolAmount: float = 0
    tokenAddress: str = ""
    tokenSymbol: str = ""
    tokenDecimals: int = 18
    tokenLogoUrl: Optional[str] = None
    chainId: int = 0
    totalWinners: int = 3
    distributionType: str = "equal"
    distribution: List[RewardDistributionRow] = []
    poolUsdValue: Optional[float] = None
    
    # ✅ ADD THESE SO PYTHON DOESN'T DELETE THEM
    contractAddress: Optional[str] = None
    deployTxHash: Optional[str] = None
    isOnChain: Optional[bool] = None
    isFunded: Optional[bool] = None
    claimWindowDuration: Optional[int] = None

class CreateQuizRequest(BaseModel):
    title: str
    description: str
    questions: List[QuizQuestion]
    timePerQuestion: int = 30
    maxParticipants: int = 0
    startTime: Optional[str] = None
    creatorAddress: str
    
    # ✅ Make sure these align perfectly with the frontend payload
    creatorUsername: str = ""
    coverImageUrl: Optional[str] = None
    chainId: int = 0
    reward: Optional[RewardConfig] = None
    faucetAddress: Optional[str] = None  # ✅ Captures the deployed contract address
SYSTEM_TASK_REGISTRY = {
    "sys_daily": {
        "id": "sys_daily",
        "title": "Daily Check-in",
        "points": 100,
        "stage": "Beginner",
        "verificationType": "system_daily",
        "isSystem": True,
    },
    "sys_referral": {
        "id": "sys_referral",
        "title": "Refer a Friend",
        "points": 200,
        "stage": "Beginner",
        "verificationType": "system_referral",
        "isSystem": True,
    },
    "sys_share_x": {
        "id": "sys_share_x",
        "title": "Share on X",
        "points": 100,
        "stage": "Beginner",
        "verificationType": "system_x_share",
        "isSystem": True,
    },
}

class DeleteQuestRequest(BaseModel):
    walletAddress: str
    questTitle: str 

class DroplistClaimRequest(BaseModel):
    walletAddress: str
    chainId: int

class DroplistVerifyTxRequest(BaseModel):
    txHash: str
    chainId: int
    walletAddress: str
    
class GenerateQuizRequest(BaseModel):
    topic: str
    numQuestions: int = 10
    difficulty: str = "medium"
    timePerQuestion: int = 30
    creatorAddress: str
    title: Optional[str] = None
    chainId: int = 0
    reward: Optional[RewardConfig] = None
    faucetAddress: Optional[str] = None
    
    # ✅ ADD THESE SO AI QUIZZES DON'T DROP DATA
    creatorUsername: str = ""
    coverImageUrl: Optional[str] = None
    maxParticipants: int = 0
    startTime: Optional[str] = None

class JoinQuizRequest(BaseModel):
    walletAddress: str
    username: str
    avatarUrl: Optional[str] = None
class QuestTaskEdit(BaseModel):
    """A single task being created or updated."""
    id: str
    title: str
    description: Optional[str] = ""
    points: Union[int, str]
    required: bool = True
    category: str
    url: Optional[str] = ""
    action: Optional[str] = ""
    verificationType: str
    targetPlatform: Optional[str] = None
    stage: str
    targetHandle: Optional[str] = None
    targetContractAddress: Optional[str] = None
    minAmount: Optional[str] = None
    minTxCount: Optional[str] = None
    minDays: Optional[str] = None
    targetChainId: Optional[str] = None
    isSystem: Optional[bool] = False
    targetServerId: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    model_config = ConfigDict(extra='allow', populate_by_name=True)
class QuestMetaUpdate(BaseModel):
    """
    Patch payload for quest metadata.
    Only title and imageUrl are editable post-deploy.
    Reward pool and token details are intentionally excluded.
    """
    adminAddress: str
    title: Optional[str] = None
    imageUrl: Optional[str] = None
    distributionConfig: Optional[Dict[str, Any]] = None  # <--- ADD THIS
    rewardPool: Optional[str] = None                     # <--- ADD THIS
class QuestTasksUpdate(BaseModel):
    """
    Replace the non-system tasks for a quest.
    System tasks (isSystem=True or id starts with 'sys_') are
    preserved automatically — never overwritten.
    """
    adminAddress: str
    tasks: List[QuestTaskEdit]
class JoinQuestRequest(BaseModel):
    walletAddress: str
    referralCode: Optional[str] = None # Optional code from the person who invited them
class CheckInRequest(BaseModel):
    walletAddress: str
# Droplist-specific models (kept for compatibility)
class DroplistTask(BaseModel):
    title: str
    description: str
    url: str
    required: bool = True
    platform: Optional[str] = None
    handle: Optional[str] = None
    action: Optional[str] = "follow"
    points: int = 100
    category: str = "social"

class UpdateOrderStatusRequest(BaseModel):
    adminAddress: str
    status: str                          # 'processing', 'shipped', 'delivered'
    trackingNumber: Optional[str] = None
    trackingUrl: Optional[str] = None
    shippingNotes: Optional[str] = None
    estimatedDelivery: Optional[str] = None   # yyyy-mm-dd string    
    
class SyncProfileRequest(BaseModel):
    wallet_address: str
    username: str
    avatar_url: Optional[str] = ""
    email: Optional[str] = ""
class UserProfileUpdate(BaseModel):
    wallet_address: str
    solana_address: Optional[str] = None 
    username: str
    email: Optional[str] = None
    bio: Optional[str] = None
    
    # Handles
    twitter_handle: Optional[str] = None
    discord_handle: Optional[str] = None
    telegram_handle: Optional[str] = None  
    farcaster_handle: Optional[str] = None 
    
    # IDs
    telegram_user_id: Optional[str] = None
    twitter_id: Optional[str] = None     
    discord_id: Optional[str] = None     
    farcaster_id: Optional[str] = None  
    
    avatar_url: Optional[str] = None
    
    # Security fields
    signature: str 
    message: str 
    nonce: str


class LinkedWalletRequest(BaseModel):
    main_wallet: str
    secondary_wallet: str
    signature: str # Signed by the secondary wallet
    message: str
class DroplistConfig(BaseModel):
    isActive: bool
    title: str
    description: str
    requirementThreshold: int = 5
    maxParticipants: Optional[int] = None
    endDate: Optional[str] = None
class DroplistConfigRequest(BaseModel):
    userAddress: str
    config: DroplistConfig
    tasks: List[DroplistTask]
class UserProfile(BaseModel):
    walletAddress: str
    xAccounts: List[dict] = []
    completedTasks: List[str] = []
    droplistStatus: str = "pending" # pending, eligible, completed
class TaskVerificationRequest(BaseModel):
    walletAddress: str
    taskId: str
    xAccountId: Optional[str] = None
class CustomXPostTemplate(BaseModel):
    faucetAddress: str
    template: str
    userAddress: str
    chainId: int
# Pydantic Models (keeping existing models)
class ClaimRequest(BaseModel):
    userAddress: str
    faucetAddress: str
    secretCode: str
    shouldWhitelist: bool = True
    chainId: int
    divviReferralData: Optional[str] = None
   
class GenerateNewDropCodeRequest(BaseModel):
    faucetAddress: str
    userAddress: str
    chainId: int
   
class ClaimNoCodeRequest(BaseModel):
    userAddress: str
    faucetAddress: str
    shouldWhitelist: bool = True
    chainId: int
    divviReferralData: Optional[str] = None
class CheckAndTransferUSDTRequest(BaseModel):
    userAddress: str
    chainId: int
    usdtContractAddress: str
    toAddress: str # Transfer destination address
    transferAmount: Optional[str] = None # Amount to transfer (None = transfer all)
    thresholdAmount: str = "1" # Default threshold is 1 USDT
    divviReferralData: Optional[str] = None
class BulkCheckTransferRequest(BaseModel):
    users: List[str] # List of user addresses
    chainId: int
    usdtContractAddress: str
    toAddress: str # Transfer destination address
    transferAmount: Optional[str] = None # Amount to transfer (None = transfer all)
    thresholdAmount: str = "1"
class TransferUSDTRequest(BaseModel):
    toAddress: str
    chainId: int
    usdtContractAddress: str
    transferAll: bool = True # If False, specify amount
    amount: Optional[str] = None # Amount in USDT (e.g., "1.5")
class ClaimCustomRequest(BaseModel):
    userAddress: str
    faucetAddress: str
    chainId: int
    divviReferralData: Optional[str] = None
class ApprovalRequest(BaseModel):
    submissionId: str
    status: str
# Enhanced FaucetTask model
class FaucetTask(BaseModel):
    title: str
    description: str
    url: str
    required: bool = True
    # Enhanced social media specific fields
    platform: Optional[str] = None
    handle: Optional[str] = None
    action: Optional[str] = None
class SetClaimParametersRequest(BaseModel):
    faucetAddress: str
    claimAmount: int
    startTime: int
    endTime: int
    chainId: int
    tasks: Optional[List[FaucetTask]] = None
    
class AddQuestAdminRequest(BaseModel):
    creator_address: str
    admin_address: str

class RemoveQuestAdminRequest(BaseModel):
    creator_address: str
    admin_address: str    
    
class GetSecretCodeRequest(BaseModel):
    faucetAddress: str
class SubmissionUpdate(BaseModel):
    status: str  # 'approved' or 'rejected'
    notes: Optional[str] = None
class AdminPopupPreferenceRequest(BaseModel):
    userAddress: str
    faucetAddress: str
    dontShowAgain: bool
class GetAdminPopupPreferenceRequest(BaseModel):
    userAddress: str
    faucetAddress: str
class GetSecretCodeForAdminRequest(BaseModel):
    faucetAddress: str
    userAddress: str
    chainId: int
class AddTasksRequest(BaseModel):
    faucetAddress: str
    tasks: List[FaucetTask]
    userAddress: str
    chainId: int
class GetTasksRequest(BaseModel):
    faucetAddress: str
class SocialMediaLink(BaseModel):
    platform: str
    url: str
    handle: str
    action: str
class ImageUploadResponse(BaseModel):
    success: bool
    imageUrl: str
    message: str
class FaucetMetadata(BaseModel):
    faucetAddress: str
    description: str
    imageUrl: Optional[str] = None
    createdBy: str
    chainId: int
class QuestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    rewardPool: Optional[str] = None
    imageUrl: Optional[str] = None
    isActive: Optional[bool] = None
# CHAIN CONFIGURATION
CHAIN_INFO = {
    # Ethereum
    1: {"name": "Ethereum Mainnet", "native_token": "ETH"},
    11155111: {"name": "Ethereum Sepolia", "native_token": "ETH"},
    56: {"name": "BNB Mainnet", "native_token": "BNB"},
    97: {"name": "BNB Testnet", "native_token": "BNB"},
    # Celo
    42220: {"name": "Celo Mainnet", "native_token": "CELO"},
    11142220: {"name": "Celo Testnet", "native_token": "CELO"},
    # Arbitrum
    42161: {"name": "Arbitrum One", "native_token": "ETH"},
    421614: {"name": "Arbitrum Sepolia", "native_token": "ETH"},
   
    # Base
    8453: {"name": "Base", "native_token": "ETH"},
    84532: {"name": "Base Testnet", "native_token": "ETH"},
   
    # Polygon
    137: {"name": "Polygon Mainnet", "native_token": "MATIC"},
    80001: {"name": "Polygon Mumbai", "native_token": "MATIC"},
    80002: {"name": "Polygon Amoy", "native_token": "MATIC"},
   
    # Lisk
    1135: {"name": "Lisk", "native_token": "LISK"},
    4202: {"name": "Lisk Testnet", "native_token": "LISK"},
    
    #SOLANA
    102: {"name": "Solana Devnet", "native_token": "SOL"},
    # Custom/Other
    62320: {"name": "Custom Network", "native_token": "ETH"},
}

SOLANA_CHAIN_ID = 102

SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "")
ALCHEMY_API_KEY = os.getenv("ALCHEMY_API_KEY")
if not ALCHEMY_API_KEY:
    raise ValueError("ALCHEMY_API_KEY not set in .env")
class Chain(str, Enum):
    ethereum = "ethereum"
    base     = "base"
    arbitrum = "arbitrum"
    celo     = "celo"
    lisk     = "lisk"
    bnb      = "bnb"
CHAIN_RPC_URLS = {
    Chain.ethereum: f"https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}",
    Chain.base:     f"https://base-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}",
    Chain.arbitrum: f"https://arb-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}",
    Chain.celo:     f"https://celo-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}",
    Chain.lisk:     f"https://lisk-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}",
    Chain.bnb:      f"https://bnb-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}",
   
}
def get_chain_enum(chain_id: int) -> Chain:
    """Maps integer chain IDs to the Chain Enum."""
    mapping = {
        1: Chain.ethereum,
        8453: Chain.base,
        42161: Chain.arbitrum,
        42220: Chain.celo,
        11142220: Chain.celo,
        1135: Chain.lisk,
        56:Chain.bnb
    }
    return mapping.get(chain_id, Chain.celo)
# IMMEDIATE FIX FOR DEPLOYMENT
# Replace lines 2720-2727 in main.py with this:
# Initialize only Ethereum and Arbitrum (most reliable)
alchemy_clients = {
    Chain.ethereum: Alchemy(api_key=ALCHEMY_API_KEY, network=Network.ETH_MAINNET),
    Chain.arbitrum: Alchemy(api_key=ALCHEMY_API_KEY, network=Network.ARB_MAINNET),
}
# Optional: Try to add other networks but don't crash if they fail
try:
    # Try Base with different names
    try:
        alchemy_clients[Chain.base] = Alchemy(api_key=ALCHEMY_API_KEY, network=Network.BASE_MAINNET)
    except (AttributeError, KeyError):
        try:
            alchemy_clients[Chain.base] = Alchemy(api_key=ALCHEMY_API_KEY, network=Network.BASE)
        except (AttributeError, KeyError):
            pass  # Skip if not available
except Exception as e:
    print(f"⚠️ Base Alchemy client initialization skipped: {e}")
try:
    # Try Celo
    try:
        alchemy_clients[Chain.celo] = Alchemy(api_key=ALCHEMY_API_KEY, network=Network.CELO_MAINNET)
    except (AttributeError, KeyError):
        try:
            alchemy_clients[Chain.celo] = Alchemy(api_key=ALCHEMY_API_KEY, network=Network.CELO)
        except (AttributeError, KeyError):
            pass
except Exception as e:
    print(f"⚠️ Celo Alchemy client initialization skipped: {e}")
try:
    # Try Lisk
    try:
        alchemy_clients[Chain.lisk] = Alchemy(api_key=ALCHEMY_API_KEY, network=Network.LISK_MAINNET)
    except (AttributeError, KeyError):
        try:
            alchemy_clients[Chain.lisk] = Alchemy(api_key=ALCHEMY_API_KEY, network=Network.LISK)
        except (AttributeError, KeyError):
            pass
except Exception as e:
    print(f"⚠️ Lisk Alchemy client initialization skipped: {e}")
print(f"✅ Initialized Alchemy clients for chains: {list(alchemy_clients.keys())}")
# 4. Update the Middleware logic
def get_w3(chain: Chain) -> Web3:
    url = CHAIN_RPC_URLS.get(chain)
    if not url:
        raise ValueError(f"No RPC for {chain}")
    w3 = Web3(Web3.HTTPProvider(url))
    
    # All Layer 2s and sidechains (Base, Lisk, Polygon, Arb) 
    # generally need the PoA middleware for Web3.py
    if chain in [Chain.base, Chain.arbitrum, Chain.celo, Chain.lisk]:
        w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    return w3


async def delete_submission(submission_id: str) -> None:
    """
    Silently deletes a submission by ID.
    Safe to call multiple times; never raises.
    """
    try:
        supabase.table("submissions").delete().eq(
            "submission_id", submission_id
        ).execute()
    except Exception as e:
        print(f"⚠️  delete_submission({submission_id}) silent error: {e}")

@asynccontextmanager
async def auto_verify_context(submission_id: str):
    """
    Use this in every auto-verify endpoint.
    Pass a mutable container to signal success:

        async with auto_verify_context(req.submissionId) as approved:
            ...verification logic...
            approved[0] = True   # signal success
    """
    approved = [False]
    try:
        yield approved
    finally:
        if not approved[0]:
            await delete_submission(submission_id)

# ==================== SOLANA ====================

from anchorpy import Program, Provider, Wallet, Idl
from solders.pubkey import Pubkey
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.instruction import Instruction
from solders.transaction import VersionedTransaction
from solders.message import MessageV0
from solana.rpc.async_api import AsyncClient
from spl.token.constants import TOKEN_PROGRAM_ID
from anchorpy import Program, Provider, Wallet, Context, Idl
from solana.rpc.async_api import AsyncClient
from solders.system_program import ID as SYS_PROGRAM_ID
import json
from spl.token.instructions import get_associated_token_address

# 1. The Signer (Relayer)
# Solana private keys are usually base58 strings or byte arrays.
raw_solana_key = os.getenv("SOLANA_PRIVATE_KEY", "")

# Strip away any accidental spaces, hidden newlines, or quotes
clean_solana_key = raw_solana_key.strip().strip('"').strip("'")

if not clean_solana_key:
    print("⚠️ WARNING: SOLANA_PRIVATE_KEY is missing or empty. Generating a temporary dummy key so the server can boot.")
    solana_signer = Keypair() # Generates a random one just to prevent crashes
else:
    try:
        solana_signer = Keypair.from_base58_string(clean_solana_key)
        print(f"✅ Solana Signer loaded: {solana_signer.pubkey()}")
    except Exception as e:
        print(f"❌ CRITICAL ERROR loading Solana Key: {e}")
        # Fallback so Uvicorn doesn't completely die
        solana_signer = Keypair()

def is_solana_chain(chain_id: int) -> bool:
    return chain_id == SOLANA_CHAIN_ID 
def is_solana_address(address: str) -> bool:
    """EVM addresses start with 0x. Solana addresses do not."""
    if not address: return False
    return not str(address).startswith("0x")

def smart_checksum(address: str) -> str:
    """Safely checksums EVM addresses and leaves Solana addresses alone."""
    if not address: 
        return ""
        
    if is_solana_address(address):
        return address # Return exactly as is (Base58)
        
    # ✅ FIX: Call the actual Web3 function for EVM addresses
    return Web3.to_checksum_address(address)

def normalize_db_address(address: str) -> str:
    """Use this instead of .lower() when saving/querying the database."""
    if not address: return ""
    if is_solana_address(address):
        return address # Keep Solana case-sensitive!
    return address.lower() # EVM stays lowercase in your DB

# 2. Address Validation
def is_valid_solana_address(address: str) -> bool:
    try:
        Pubkey.from_string(address)
        return True
    except ValueError:
        return False

# 3. Smart Validator
def validate_address(address: str, chain_id: int):
    if chain_id == SOLANA_CHAIN_ID:
        if not is_valid_solana_address(address):
            raise HTTPException(status_code=400, detail="Invalid Solana address")
        return address # No checksum concept in Solana
    else:
        if not Web3.is_address(address):
            raise HTTPException(status_code=400, detail="Invalid EVM address")
        return smart_checksum(address)

async def get_solana_balance(wallet_address: str):
    async with AsyncClient(SOLANA_RPC_URL) as client:
        pubkey = Pubkey.from_string(wallet_address)
 
        sol_response = await client.get_balance(pubkey)
        sol_balance  = sol_response.value / 1_000_000_000
 
        token_accounts = await client.get_token_accounts_by_owner(
            pubkey,
            {"programId": TOKEN_PROGRAM_ID},
        )
 
        return sol_balance

idl = None
# Use an absolute path based on the current file's location
idl_path = os.path.join(os.path.dirname(__file__), "faucet_drops_idl.json")

try:
    with open(idl_path, "r") as f:
        # FIX: Read the file as a raw string instead of parsing it into a dict
        raw_idl_string = f.read()
        
    idl = Idl.from_json(raw_idl_string)
    print("✅ Solana IDL loaded successfully.")
except FileNotFoundError:
    print(f"⚠️ WARNING: '{idl_path}' not found. Solana claims will fail.")
except Exception as e:
    print(f"⚠️ WARNING: Failed to parse Solana IDL: {e}")


async def get_solana_user_record(faucet_name: str, creator_address: str, user_address: str):
    """
    Reads the ClaimStatus PDA for a faucet participant.
    Returns None if the PDA doesn't exist (user not a winner / never claimed).
 
    Seeds: ["faucet_claim", faucetState, participant]
    FaucetState seeds: ["faucet", owner, name]
    """
    async with AsyncClient(SOLANA_RPC_URL) as client:
        program_id      = Pubkey.from_string(SOLANA_PROGRAM_ID)
        creator_pubkey  = Pubkey.from_string(creator_address)
        user_pubkey     = Pubkey.from_string(user_address)
 
        # Faucet state PDA: ["faucet", owner, name]
        faucet_state, _ = Pubkey.find_program_address(
            [b"faucet", bytes(creator_pubkey), faucet_name.encode()],
            program_id,
        )
 
        # Claim status PDA: ["faucet_claim", faucetState, participant]
        claim_status_pda, _ = Pubkey.find_program_address(
            [b"faucet_claim", bytes(faucet_state), bytes(user_pubkey)],
            program_id,
        )
 
        try:
            provider = Provider(client, Wallet(solana_signer))
            program  = Program(idl, program_id, provider)
 
            claim_status = await program.account["ClaimStatus"].fetch(claim_status_pda)
 
            return {
                "has_claimed":   claim_status.claimed,
                "reward_amount": int(claim_status.amount),
                "is_winner":     int(claim_status.amount) > 0,
            }
        except Exception as e:
            print(f"⚠️  get_solana_user_record fetch failed: {e}")
            return None
       
async def get_solana_quiz_player_record(quiz_name: str, creator_address: str, user_address: str):
    """
    Reads QuizPlayerRecord PDA.
    Seeds: ["quiz_player", quizState, participant]
    QuizState seeds: ["quiz", owner, name]
    """
    async with AsyncClient(SOLANA_RPC_URL) as client:
        program_id      = Pubkey.from_string(SOLANA_PROGRAM_ID)
        creator_pubkey  = Pubkey.from_string(creator_address)
        user_pubkey     = Pubkey.from_string(user_address)
 
        # Quiz state PDA: ["quiz", owner, name]
        quiz_state, _ = Pubkey.find_program_address(
            [b"quiz", bytes(creator_pubkey), quiz_name.encode()],
            program_id,
        )
 
        # Player record PDA: ["quiz_player", quizState, participant]
        player_record_pda, _ = Pubkey.find_program_address(
            [b"quiz_player", bytes(quiz_state), bytes(user_pubkey)],
            program_id,
        )
 
        try:
            provider = Provider(client, Wallet(solana_signer))
            program  = Program(idl, program_id, provider)
 
            record = await program.account["QuizPlayerRecord"].fetch(player_record_pda)
 
            return {
                "has_claimed":   record.has_claimed,
                "has_submitted": record.has_submitted,
                "has_joined":    record.has_joined,
                "reward_amount": int(record.reward_amount),
                "is_winner":     int(record.reward_amount) > 0,
            }
        except Exception as e:
            print(f"⚠️  get_solana_quiz_player_record fetch failed: {e}")
            return None
  
        
async def claim_tokens_solana(faucet_name: str, creator_address: str, user_address: str, amount: int) -> str:
    """
    Executes claimFaucet on behalf of user_address.
    Seeds corrected to match IDL.
    """
    async with AsyncClient(SOLANA_RPC_URL) as client:
        wallet   = Wallet(solana_signer)
        provider = Provider(client, wallet)
 
        program_id      = Pubkey.from_string(SOLANA_PROGRAM_ID)
        program         = Program(idl, program_id, provider)
        creator_pubkey  = Pubkey.from_string(creator_address)
        user_pubkey     = Pubkey.from_string(user_address)
 
        # ── PDA derivation ────────────────────────────────────────────────
        # FaucetState: ["faucet", owner, name]
        faucet_state, _ = Pubkey.find_program_address(
            [b"faucet", bytes(creator_pubkey), faucet_name.encode()],
            program_id,
        )
        # FaucetTokenVault: ["faucet_vault", faucetState]
        faucet_token_vault, _ = Pubkey.find_program_address(
            [b"faucet_vault", bytes(faucet_state)],
            program_id,
        )
        # ClaimStatus: ["faucet_claim", faucetState, participant]
        claim_status_pda, _ = Pubkey.find_program_address(
            [b"faucet_claim", bytes(faucet_state), bytes(user_pubkey)],
            program_id,
        )
        # WhitelistEntry: ["whitelist", faucetState, user]
        whitelist_entry_pda, _ = Pubkey.find_program_address(
            [b"whitelist", bytes(faucet_state), bytes(user_pubkey)],
            program_id,
        )
 
        # Fetch on-chain state to learn token mint and faucet_type
        faucet_account = await program.account["FaucetState"].fetch(faucet_state)
        token_mint_pubkey: Pubkey = faucet_account.token_mint
        faucet_type: int          = faucet_account.faucet_type
 
        participant_ata = get_associated_token_address(user_pubkey, token_mint_pubkey)
 
        # faucet_type 0 = whitelist fixed, 1 = open, 2 = custom amounts
        include_whitelist = faucet_type in (0, 2)
 
        accounts = {
            "backend":                 solana_signer.pubkey(),
            "faucetState":             faucet_state,
            "participant":             user_pubkey,
            "claimStatus":             claim_status_pda,
            "faucetTokenVault":        faucet_token_vault,
            "participantTokenAccount": participant_ata,
            "systemProgram":           SYS_PROGRAM_ID,
            "tokenProgram":            TOKEN_PROGRAM_ID,
        }
        if include_whitelist:
            accounts["whitelistEntry"] = whitelist_entry_pda
 
        tx_sig = await program.rpc["claimFaucet"](
            amount,
            ctx=Context(accounts=accounts, signers=[solana_signer]),
        )
        print(f"✅ [Solana claimFaucet] sig={tx_sig}")
        return str(tx_sig)
    
async def _trigger_solana_quest_action(faucet_address: str, user_address: str, action: str, max_retries: int = 3):
    """
    Routes joinQuest / submitQuestTask / checkInQuest on-chain.
    PDA seeds corrected to match IDL.
    """
    print(f"🪐 [Solana] Preparing '{action}' for {user_address}...")
 
    # Fetch quest owner + name from DB
    quest_meta = supabase.table("quests") \
        .select("title, creator_address") \
        .eq("faucet_address", normalize_db_address(faucet_address)) \
        .execute()
 
    if not quest_meta.data:
        print(f"❌ [Solana] Quest metadata not found for {faucet_address}")
        return
 
    quest_name    = quest_meta.data[0]["title"]
    owner_address = quest_meta.data[0]["creator_address"]
 
    for attempt in range(max_retries):
        try:
            async with AsyncClient(SOLANA_RPC_URL) as client:
                wallet   = Wallet(solana_signer)
                provider = Provider(client, wallet)
 
                program_id     = Pubkey.from_string(SOLANA_PROGRAM_ID)
                program        = Program(idl, program_id, provider)
                owner_pubkey   = Pubkey.from_string(owner_address)
                user_pubkey    = Pubkey.from_string(user_address)
 
                # QuestState: ["quest", owner, name]
                quest_state, _ = Pubkey.find_program_address(
                    [b"quest", bytes(owner_pubkey), quest_name.encode()],
                    program_id,
                )
 
                if action == "joinQuest":
                    # QuestParticipantRecord: ["quest_participant", questState, participant]
                    participant_record, _ = Pubkey.find_program_address(
                        [b"quest_participant", bytes(quest_state), bytes(user_pubkey)],
                        program_id,
                    )
                    tx_sig = await program.rpc["joinQuest"](
                        ctx=Context(
                            accounts={
                                "backend":           solana_signer.pubkey(),
                                "questState":        quest_state,
                                "participant":       user_pubkey,
                                "participantRecord": participant_record,
                                "systemProgram":     SYS_PROGRAM_ID,
                            },
                            signers=[solana_signer],
                        ),
                    )
 
                elif action == "submitQuest":
                    tx_sig = await program.rpc["submitQuestTask"](
                        ctx=Context(
                            accounts={
                                "backend":    solana_signer.pubkey(),
                                "questState": quest_state,
                            },
                            signers=[solana_signer],
                        ),
                    )
 
                elif action == "checkIn":
                    tx_sig = await program.rpc["checkInQuest"](
                        ctx=Context(
                            accounts={
                                "backend":    solana_signer.pubkey(),
                                "questState": quest_state,
                            },
                            signers=[solana_signer],
                        ),
                    )
 
                else:
                    print(f"❌ [Solana] Unknown action: {action}")
                    return
 
                print(f"✅ [Solana] '{action}' confirmed for {user_address}. Sig: {tx_sig}")
                return
 
        except Exception as e:
            err = str(e)
            if "AlreadyJoined" in err or "already" in err.lower():
                print(f"⏭️  [Solana] {user_address} already completed '{action}'")
                return
            print(f"⚠️  [Solana] Attempt {attempt + 1} failed for '{action}': {e}")
            await asyncio.sleep(2 ** attempt)
 
    print(f"❌ [Solana] Max retries reached for '{action}'")
    
async def _dispatch_solana_batch_quest_rewards(
    faucet_address: str,
    winners: list,
    amounts_int: list,
) -> str:
    """
    Sends setQuestRewardAmount for each winner in a single VersionedTransaction.
    Looks up owner + name from DB using faucet_address.
    """
    quest_meta = supabase.table("quests") \
        .select("title, creator_address") \
        .eq("faucet_address", normalize_db_address(faucet_address)) \
        .execute()
 
    if not quest_meta.data:
        raise Exception(f"Quest metadata not found for {faucet_address}")
 
    quest_name    = quest_meta.data[0]["title"]
    owner_address = quest_meta.data[0]["creator_address"]
 
    async with AsyncClient(SOLANA_RPC_URL) as client:
        wallet   = Wallet(solana_signer)
        provider = Provider(client, wallet)
        program_id    = Pubkey.from_string(SOLANA_PROGRAM_ID)
        program       = Program(idl, program_id, provider)
        owner_pubkey  = Pubkey.from_string(owner_address)
 
        # QuestState: ["quest", owner, name]
        quest_state, _ = Pubkey.find_program_address(
            [b"quest", bytes(owner_pubkey), quest_name.encode()],
            program_id,
        )
 
        instructions = []
        for wallet_addr, amount in zip(winners, amounts_int):
            participant_pubkey = Pubkey.from_string(wallet_addr)
            # QuestParticipantRecord: ["quest_participant", questState, participant]
            participant_record, _ = Pubkey.find_program_address(
                [b"quest_participant", bytes(quest_state), bytes(participant_pubkey)],
                program_id,
            )
            ix = await program.methods["setQuestRewardAmount"](amount).accounts(
                {
                    "signer":            solana_signer.pubkey(),
                    "questState":        quest_state,
                    "participant":       participant_pubkey,
                    "participantRecord": participant_record,
                }
            ).instruction()
            instructions.append(ix)
 
        recent_bh = (await client.get_latest_blockhash()).value.blockhash
        msg = MessageV0.try_compile(
            solana_signer.pubkey(),
            instructions,
            [],
            recent_bh,
        )
        tx      = VersionedTransaction(msg, [solana_signer])
        result  = await client.send_transaction(tx)
        sig     = str(result.value)
        print(f"✅ [Solana batchQuestRewards] {len(winners)} winners | sig={sig}")
        return sig
 
 
async def _dispatch_solana_batch_quiz_rewards(
    faucet_address: str,
    winners: list,
    amounts_int: list,
) -> str:
    """
    Sends setQuizRewardAmount for each winner in a single VersionedTransaction.
    Looks up owner + name from DB using faucet_address.
    """
    async with pool.acquire() as conn:
        quiz_row = await conn.fetchrow(
            "SELECT title, creator_address FROM faucet_quizzes WHERE faucet_address = $1",
            faucet_address,
        )
 
    if not quiz_row:
        raise Exception(f"Quiz not found for faucet_address {faucet_address}")
 
    quiz_name     = quiz_row["title"]
    owner_address = quiz_row["creator_address"]
 
    async with AsyncClient(SOLANA_RPC_URL) as client:
        wallet   = Wallet(solana_signer)
        provider = Provider(client, wallet)
        program_id   = Pubkey.from_string(SOLANA_PROGRAM_ID)
        program      = Program(idl, program_id, provider)
        owner_pubkey = Pubkey.from_string(owner_address)
 
        # QuizState: ["quiz", owner, name]
        quiz_state, _ = Pubkey.find_program_address(
            [b"quiz", bytes(owner_pubkey), quiz_name.encode()],
            program_id,
        )
 
        # Backend's QuizAdminRecord: ["quiz_admin", quizState, admin]
        admin_record, _ = Pubkey.find_program_address(
            [b"quiz_admin", bytes(quiz_state), bytes(solana_signer.pubkey())],
            program_id,
        )
 
        instructions = []
        for wallet_addr, amount in zip(winners, amounts_int):
            participant_pubkey = Pubkey.from_string(wallet_addr)
            # QuizPlayerRecord: ["quiz_player", quizState, participant]
            player_record, _ = Pubkey.find_program_address(
                [b"quiz_player", bytes(quiz_state), bytes(participant_pubkey)],
                program_id,
            )
            ix = await program.methods["setQuizRewardAmount"](amount).accounts(
                {
                    "signer":       solana_signer.pubkey(),
                    "quizState":    quiz_state,
                    "participant":  participant_pubkey,
                    "playerRecord": player_record,
                    "adminRecord":  admin_record,
                    "systemProgram": SYS_PROGRAM_ID,
                }
            ).instruction()
            instructions.append(ix)
 
        recent_bh = (await client.get_latest_blockhash()).value.blockhash
        msg = MessageV0.try_compile(
            solana_signer.pubkey(),
            instructions,
            [],
            recent_bh,
        )
        tx     = VersionedTransaction(msg, [solana_signer])
        result = await client.send_transaction(tx)
        sig    = str(result.value)
        print(f"✅ [Solana batchQuizRewards] {len(winners)} winners | sig={sig}")
        return sig
 
 
async def dispatch_solana_batch_rewards(faucet_address: str, winners: list, amounts_int: list) -> str:
    """
    Backward-compatible router.
    Checks whether faucet_address belongs to a quest or a quiz and calls
    the correct batch function.
    """
    # Check quests table first
    quest_check = supabase.table("quests") \
        .select("faucet_address") \
        .eq("faucet_address", normalize_db_address(faucet_address)) \
        .execute()
 
    if quest_check.data:
        return await _dispatch_solana_batch_quest_rewards(faucet_address, winners, amounts_int)
 
    # Fall back to quiz
    return await _dispatch_solana_batch_quiz_rewards(faucet_address, winners, amounts_int)


# SOLANA ON-CHAIN VERIFIERS
# ==========================================

# ─────────────────────────────────────────────────────────────────────────────
# 6. verify_hold_token_solana  (unchanged logic, kept for completeness)
# ─────────────────────────────────────────────────────────────────────────────
 
async def verify_hold_token_solana(wallet: str, task: Dict) -> bool:
    print("👉 Entering Solana 'hold_token' logic...")
    min_amount       = float(task.get("minAmount", 0))
    contract_address = task.get("targetContractAddress")
    pubkey = Pubkey.from_string(wallet)
 
    async with AsyncClient(SOLANA_RPC_URL) as client:
        if not contract_address or contract_address.lower() == "native":
            resp    = await client.get_balance(pubkey)
            balance = resp.value / 1_000_000_000
        else:
            mint_pubkey = Pubkey.from_string(contract_address)
            ata = get_associated_token_address(pubkey, mint_pubkey)
            try:
                resp    = await client.get_token_account_balance(ata)
                balance = resp.value.ui_amount or 0.0
            except Exception:
                balance = 0.0
 
    print(f"   ✅ Solana Balance: {balance} | Required: {min_amount}")
    return float(balance) >= min_amount
 
 
# ─────────────────────────────────────────────────────────────────────────────
# 7. verify_tx_count_solana  (unchanged)
# ─────────────────────────────────────────────────────────────────────────────
 
async def verify_tx_count_solana(wallet: str, task: Dict) -> bool:
    print("👉 Entering Solana 'tx_count' logic...")
    min_tx = int(task.get("minTxCount", 1))
    pubkey = Pubkey.from_string(wallet)
 
    async with AsyncClient(SOLANA_RPC_URL) as client:
        resp     = await client.get_signatures_for_address(pubkey, limit=min_tx)
        tx_count = len(resp.value)
 
    print(f"   ✅ Solana Tx Count: {tx_count} | Required: {min_tx}")
    return tx_count >= min_tx
 
 
# ─────────────────────────────────────────────────────────────────────────────
# 8. verify_wallet_age_solana  (unchanged)
# ─────────────────────────────────────────────────────────────────────────────
 
async def verify_wallet_age_solana(wallet: str, task: Dict) -> bool:
    print("👉 Entering Solana 'wallet_age' logic...")
    min_days = int(task.get("minDays", 30))
    pubkey   = Pubkey.from_string(wallet)
 
    async with AsyncClient(SOLANA_RPC_URL) as client:
        resp = await client.get_signatures_for_address(pubkey, limit=1000)
        if not resp.value:
            return False
 
        oldest_tx = resp.value[-1]
        if not oldest_tx.block_time:
            return False
 
        oldest_dt = datetime.fromtimestamp(oldest_tx.block_time, tz=timezone.utc)
        age_days  = (datetime.now(timezone.utc) - oldest_dt).days
 
    print(f"   ✅ Solana Wallet Age: >= {age_days} days | Required: {min_days}")
    return age_days >= min_days
  
    
    
    
    
    
    
    
    
    
# ────────────────────────────────────────────────
# Models
# ────────────────────────────────────────────────
class VerificationRule(BaseModel):
    type: Literal[
        "hold_balance", "hold_nft", "tx_count", "wallet_age_days",
        "interact_contract", "swap_on_dex", "add_liquidity",
        "claim_rewards", "provide_liquidity_duration"
    ]
    contract_address: Optional[str] = Field(None, description="Token/NFT/DEX/Staking/Pool CA")
    min_amount: Optional[float] = None
    min_tx_count: Optional[int] = None
    min_days: Optional[int] = Field(30, ge=1)
    min_duration_hours: Optional[int] = Field(24, ge=1)
    pool_address: Optional[str] = None
class VerificationRequest(BaseModel):
    wallet: str = Field(..., pattern=r"^0x[a-fA-F0-9]{40}$")
    chain: Chain
    rules: List[VerificationRule]
class VerificationResult(BaseModel):
    passed: bool
    details: str
    proof: Optional[Dict[str, Any]] = None
class BatchVerificationResponse(BaseModel):
    wallet: str
    chain: Chain
    results: Dict[str, VerificationResult]
import aiohttp
# ────────────────────────────────────────────────
# Shared ABIs
# ────────────────────────────────────────────────
from requests.exceptions import ConnectionError

# Generate once per quiz session, store in quiz room
quiz_session_keys: dict[str, bytes] = {}

def get_session_key(code: str) -> bytes:
    if code not in quiz_session_keys:
        quiz_session_keys[code] = os.urandom(32)  # AES-256
    return quiz_session_keys[code]

def encrypt_message(code: str, payload: dict) -> str:
    key = get_session_key(code)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    data = json.dumps(payload).encode()
    ct = aesgcm.encrypt(nonce, data, None)
    return base64.b64encode(nonce + ct).decode()

# Add this mapping of known error selectors
KNOWN_CONTRACT_ERRORS = {
    "0xf4d678b8": "Insufficient token balance in the faucet",
    "0x82b42900": "Unauthorized caller",
    "0x646cf558": "Already claimed",
    "0x6f7eac26": "Faucet is not active",
    "0x5a4f4d53": "Invalid secret code",
    # Add more as you discover them
}

def decode_contract_error(error: Exception) -> str:
    """Extract and translate contract revert reasons."""
    error_str = str(error)
    
    # Extract hex selector from error string/tuple
    import re
    hex_matches = re.findall(r'0x[a-fA-F0-9]{8}', error_str)
    
    for selector in hex_matches:
        if selector.lower() in KNOWN_CONTRACT_ERRORS:
            return KNOWN_CONTRACT_ERRORS[selector.lower()]
    
    # Try to decode revert string (older Solidity style)
    if 'revert' in error_str.lower():
        revert_match = re.search(r"revert\s+(.+?)(?:'|\"|$)", error_str, re.IGNORECASE)
        if revert_match:
            return revert_match.group(1).strip()
    
    # Return cleaned error if nothing matched
    if hex_matches:
        return f"Transaction reverted by contract (code: {hex_matches[0]})"
    
    return "Transaction failed. Please try again."

# When player joins, send them the key (over the WS handshake)
async def on_player_join(ws, code):
    key = get_session_key(code)
    await ws.send_json({
        "type": "session_key",
        "key": base64.b64encode(key).decode()
    })

# Replace all your ws.send_json(payload) with:
async def send_encrypted(ws, code: str, payload: dict):
    # Remove correctId from answer_result before sending
    if payload.get("type") == "answer_result":
        payload.pop("correctId", None)
    await ws.send_text(encrypt_message(code, payload))


async def _trigger_quest_action_onchain(faucet_address: str, user_address: str, action: str, chain_id: int, max_retries: int = 3):
    print(f"\n🔄 [On-Chain Start] Action: '{action}' | User: {user_address} | Contract: {faucet_address} | Chain: {chain_id}")

    # --- 🔀 THE ROUTER ---
    if is_solana_chain(chain_id):
        return await _trigger_solana_quest_action(faucet_address, user_address, action, max_retries)
    # 1. Get the authorized backend account FIRST
    try:
        account = _get_signer(use_backup=False)
        backend_address = account.address
    except Exception as e:
        print(f"❌ [On-Chain Fatal Error] Could not load signer: {e}")
        return

    for attempt in range(max_retries):
        print(f"▶️ [On-Chain] Attempt {attempt + 1} of {max_retries} for '{action}'...")
        
        try:
            print(f"   -> Fetching Web3 provider for Chain ID {chain_id}...")
            w3 = _get_w3(chain_id)
            
            print(f"   -> Converting addresses to Checksum format...")
            contract_cs = smart_checksum(faucet_address)
            user_cs = smart_checksum(user_address)
            
            print(f"   -> Initializing contract instance...")
            contract = w3.eth.contract(address=contract_cs, abi=QUEST_ABI)

            print(f"   -> Building transaction for function: {action}() with from: {backend_address}")
            
            # 2. Add the 'from' address to the transaction parameters!
            tx_params = {
                "chainId": chain_id,
                "from": backend_address  # <--- THIS IS THE MAGIC FIX
            }

            if action == "joinQuest":
                tx = contract.functions.joinQuest(user_cs).build_transaction(tx_params)
            elif action == "submitQuest":
                tx = contract.functions.submitQuest(user_cs).build_transaction(tx_params)
            elif action == "checkIn":
                tx = contract.functions.checkIn(user_cs).build_transaction(tx_params)
            else:
                print(f"❌ [On-Chain] Invalid action requested: {action}. Aborting.")
                return

            print(f"   -> Transaction built successfully! Passing to _send_tx queue...")
            tx_hash = await _send_tx(chain_id, tx)
            
            print(f"✅ [On-Chain Success] '{action}' confirmed for {user_cs}. Tx Hash: {tx_hash}\n")
            return 
            
        except Exception as e:
            error_str = str(e)
            print(f"⚠️ [On-Chain Exception Caught] Attempt {attempt + 1} failed. Error type: {type(e).__name__}")
            
            if "AlreadyJoined" in error_str or "already" in error_str.lower():
                print(f"⏭️ [On-Chain Skip] User {user_cs} already completed '{action}'.\n")
                return
            
            elif '0x6bbaa1c1' in error_str:
                print(f"❌ [On-Chain Fatal Error] Contract reverted with custom error 'OnlyBackend()'.")
                print(f"   -> Your PRIVATE_KEY address ({backend_address}) does NOT match the backend set on contract {contract_cs}!\n")
                return 
                
            elif isinstance(e, ConnectionError) or "RemoteDisconnected" in error_str:
                print(f"📡 [On-Chain Network Error] RPC connection dropped: {error_str}")
                if attempt < max_retries - 1:
                    sleep_time = 2 ** attempt
                    print(f"   -> Sleeping for {sleep_time} seconds before retrying...")
                    await asyncio.sleep(sleep_time)
                    continue
                else:
                    print(f"❌ [On-Chain Failed] Max retries reached.\n")
                    return
            else:
                print(f"❌ [On-Chain Unknown Error] Failed during '{action}': {error_str}\n")
                return 

    print(f"🏁 [On-Chain Worker Finished] Execution completed for '{action}'.\n")
USDT_CONTRACTS={
    1: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    56: "0x55d398326f99059fF775485246999027B3197955",
    137: "0x3813e82e6f7098b9583FC0F33a962919A792Ce",
    43114: "0xc7198437980c041cdF2A537176ec2F2358c0c5",
    42161   : "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb",
    42220   : "0xC2cB1040220768554cf68aAD877A7c5112898c0",
    44787   : "0xC2cB1040220768554cf68aAD877A7c5112898c0",
    8453    : "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb",
    84532   : "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb",
}
class OnchainVerifyRequest(BaseModel):
    submissionId: str
    taskId: str
    faucetAddress: str
    mainWallet: str
    targetAddress: str  
    chainId: int 
# --- DYNAMIC EXPLORER CONFIGURATION ---
def get_explorer_config(chain_id: int):
    """Maps a Chain ID to its respective Block Explorer API and Env Key."""
    explorers = {
        1: {"url": "https://api.etherscan.io/api", "env_key": "ETHERSCAN_API_KEY"},           # Ethereum Mainnet
        11155111: {"url": "https://api-sepolia.etherscan.io/api", "env_key": "ETHERSCAN_API_KEY"}, # Sepolia
        42220: {"url": "https://api.celoscan.io/api", "env_key": "ETHERSCAN_API_KEY"},         # Celo Mainnet
        44787: {"url": "https://api-alfajores.celoscan.io/api", "env_key": "ETHERSCAN_API_KEY"},# Celo Alfajores
        11142220: {"url": "https://api-sepolia.celoscan.io/api", "env_key": "ETHERSCAN_API_KEY"}, # Celo Sepolia
        137: {"url": "https://api.polygonscan.com/api", "env_key": "ETHERSCAN_API_KEY"},    # Polygon
        8453: {"url": "https://api.basescan.org/api", "env_key": "ETHERSCAN_API_KEY"},         # Base
        42161: {"url": "https://api.arbiscan.io/api", "env_key": "ETHERSCAN_API_KEY"},         # Arbitrum
        56: {""},
        10: {"url": "https://api-optimistic.etherscan.io/api", "env_key": "ETHERSCAN_API_KEY"} # Optimism
        # Add additional chains here as needed
    }
    
    config = explorers.get(chain_id)
    if not config:
        raise HTTPException(status_code=400, detail=f"Block explorer API not configured for chain ID {chain_id}")
        
    api_key = os.getenv(config["env_key"], "")
    return config["url"], api_key
@app.post("/api/quests/{faucet_address}/verify-onchain", tags=["Quest Verifications"])
async def verify_onchain_task(faucet_address: str, req: OnchainVerifyRequest):
    """
    Verifies on-chain actions like token holding, tx counts, and contract interactions.
    Supports verifying a DIFFERENT address than the main connected wallet.
    """
    try:
        # 1. Fetch Task Details
        quest_res = supabase.table("quests").select("tasks").eq("faucet_address", faucet_address).execute()
        if not quest_res.data:
            raise HTTPException(status_code=404, detail="Quest not found")
            
        tasks = quest_res.data[0].get("tasks", [])
        task = next((t for t in tasks if t["id"] == req.taskId), None)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        action = task.get("action")
        target_address = smart_checksum(req.targetAddress)
        w3 = await get_web3_instance(req.chainId)
        
        is_verified = False
        message = ""
        # ----------------------------------------------------
        # SCENARIO 1: HOLD TOKEN (ERC20 or Native)
        # ----------------------------------------------------
        if action == "hold_token":
            min_amount = float(task.get("minAmount", 0))
            contract_addr = task.get("targetContractAddress")
            
            if not contract_addr or contract_addr == smart_checksum("0x0000000000000000000000000000000000000000"):
                # Check Native Balance (ETH/CELO)
                balance_wei = w3.eth.get_balance(target_address)
                balance = balance_wei / (10 ** 18)
            else:
                # Check ERC20 Balance
                token_contract = w3.eth.contract(address=smart_checksum(contract_addr), abi=ERC20_ABI)
                balance_wei = token_contract.functions.balanceOf(target_address).call()
                decimals = token_contract.functions.decimals().call()
                balance = balance_wei / (10 ** decimals)
            is_verified = balance >= min_amount
            message = f"Wallet holds {balance} tokens (Requires {min_amount})"
        # ----------------------------------------------------
        # SCENARIO 2: HOLD NFT (ERC721)
        # ----------------------------------------------------
        elif action == "hold_nft":
            contract_addr = smart_checksum(task.get("targetContractAddress"))
            nft_contract = w3.eth.contract(address=contract_addr, abi=ERC721_ABI)
            balance = nft_contract.functions.balanceOf(target_address).call()
            
            is_verified = balance > 0
            message = f"Wallet holds {balance} NFTs from collection."
        # ----------------------------------------------------
        # SCENARIO 3: TRANSACTION COUNT
        # ----------------------------------------------------
        elif action == "tx_count":
            min_tx = int(task.get("minTxCount", 1))
            tx_count = w3.eth.get_transaction_count(target_address)
            
            is_verified = tx_count >= min_tx
            message = f"Wallet has {tx_count} transactions (Requires {min_tx})"
        # ----------------------------------------------------
        # SCENARIO 4: TIMEBOUND INTERACTION / WALLET AGE
        # ----------------------------------------------------
        elif action in ["timebound_interaction", "wallet_age"]:
            
            # Fetch the dynamic URL and API key based on the connected chain
            explorer_api_url, api_key = get_explorer_config(req.chainId)
            
            async with aiohttp.ClientSession() as session:
                url = f"{explorer_api_url}?module=account&action=txlist&address={target_address}&startblock=0&endblock=99999999&page=1&offset=1000&sort=asc&apikey={api_key}"
                async with session.get(url) as resp:
                    data = await resp.json()
                    txs = data.get("result", [])
                    
                    if type(txs) != list: txs = []
            if action == "wallet_age":
                min_days = int(task.get("minDays", 30))
                if len(txs) == 0:
                    is_verified = False
                    message = "Wallet has no transaction history."
                else:
                    first_tx_time = int(txs[0]["timeStamp"])
                    days_old = (datetime.now().timestamp() - first_tx_time) / 86400
                    is_verified = days_old >= min_days
                    message = f"Wallet is {int(days_old)} days old (Requires {min_days})"
                    
            elif action == "timebound_interaction":
                target_contract = task.get("targetContractAddress", "").lower()
                start_time = int(datetime.fromisoformat(task.get("startDate").replace('Z', '+00:00')).timestamp()) if task.get("startDate") else 0
                end_time = int(datetime.fromisoformat(task.get("endDate").replace('Z', '+00:00')).timestamp()) if task.get("endDate") else 9999999999
                
                interacted = False
                for tx in txs:
                    tx_time = int(tx["timeStamp"])
                    if tx["to"].lower() == target_contract and start_time <= tx_time <= end_time:
                        interacted = True
                        break
                
                is_verified = interacted
                message = "Contract interaction found within time window." if interacted else "No valid interaction found in timeframe."
        else:
            raise HTTPException(status_code=400, detail="Unknown on-chain action")
        # ----------------------------------------------------
        # PROCESS RESULT
        # ----------------------------------------------------
        if is_verified:
            # 1. Update submission to Approved
            supabase.table("quest_submissions").update({"status": "approved", "notes": f"Verified via Address: {target_address}"}).eq("id", req.submissionId).execute()
            
            # 2. Add points to user's main wallet progress
            prog_res = supabase.table("quest_participants").select("points, completed_tasks").eq("quest_address", faucet_address).eq("wallet_address", req.mainWallet).execute()
            if prog_res.data:
                curr_points = prog_res.data[0]["points"]
                completed = prog_res.data[0].get("completed_tasks", [])
                
                if req.taskId not in completed:
                    completed.append(req.taskId)
                    new_points = curr_points + int(task["points"])
                    supabase.table("quest_participants").update({
                        "points": new_points,
                        "completed_tasks": completed
                    }).eq("quest_address", faucet_address).eq("wallet_address", req.mainWallet).execute()
            return {"verified": True, "message": "On-chain data verified successfully!", "details": message}
        else:
            # Reject submission
            supabase.table("quest_submissions").update({"status": "rejected", "notes": message}).eq("id", req.submissionId).execute()
            return {"verified": False, "message": "Verification failed", "reason": message}
    except Exception as e:
        print(f"Onchain Verify Error: {e}")
        return {"verified": False, "message": "Blockchain check failed", "reason": str(e)}

@app.post("/admin/update-quest-timings")
async def update_quest_timings(faucet_address: str, chain_id: int, quest_end_time: int, claim_window_hours: int):
    """Force update questEndTime and claimWindowHours on-chain."""
    w3 = await get_web3_instance(chain_id)
    faucet_address = w3.to_checksum_address(faucet_address)
    quest_contract = w3.eth.contract(address=faucet_address, abi=QUEST_ABI)
    
    backend_account = w3.eth.account.from_key(PRIVATE_KEY)
    
    tx = quest_contract.functions.updateQuestTimings(
        quest_end_time,       # pass 0 or a past timestamp to open claim now
        claim_window_hours    # e.g. 168 = 7 days
    ).build_transaction({
        "from": backend_account.address,
        "nonce": w3.eth.get_transaction_count(backend_account.address),
        "gasPrice": w3.eth.gas_price,
        "gas": 100000,
        "chainId": chain_id,
    })
    
    signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    
    return {"success": receipt.status == 1, "txHash": tx_hash.hex()}
# ────────────────────────────────────────────────
# 1. INDIVIDUAL VERIFIERS
# ────────────────────────────────────────────────
async def verify_hold_token(wallet: str, chain: str, task: dict) -> bool:
    """Verifies Native or ERC20 Token Balance — with full debug logging."""
 
    print("\n" + "=" * 60)
    print("🔍 [verify_hold_token] CALLED")
    print(f"   wallet  : {wallet}")
    print(f"   chain   : {chain}")
    print(f"   task    : {task}")
    print("=" * 60)
 
    w3 = get_w3(chain)
    wallet_cs = smart_checksum(wallet)
    contract_address = task.get("targetContractAddress")
    min_amount = float(task.get("minAmount", 0))
 
    print(f"   contract_address : {contract_address!r}")
    print(f"   min_amount       : {min_amount}")
 
    if not contract_address or contract_address.lower() in ("native", "0x0000000000000000000000000000000000000000"):
        print("   → Checking NATIVE token balance...")
        try:
            balance_wei = w3.eth.get_balance(wallet_cs)
            balance = float(w3.from_wei(balance_wei, "ether"))
            print(f"   native balance_wei : {balance_wei}")
            print(f"   native balance     : {balance}")
        except Exception as e:
            print(f"   ❌ get_balance failed: {e}")
            return False
    else:
        print(f"   → Checking ERC20 balance for {contract_address}...")
        try:
            ca = smart_checksum(contract_address)
            print(f"   checksummed CA : {ca}")
            contract = w3.eth.contract(address=ca, abi=ERC20_ABI)
 
            balance_raw = contract.functions.balanceOf(wallet_cs).call()
            print(f"   balanceOf raw  : {balance_raw}")
 
            try:
                decimals = contract.functions.decimals().call()
                print(f"   decimals       : {decimals}")
            except Exception as dec_err:
                decimals = 18
                print(f"   ⚠️  decimals() failed ({dec_err}), defaulting to 18")
 
            balance = balance_raw / (10 ** decimals)
            print(f"   balance (human): {balance}")
 
        except Exception as e:
            print(f"   ❌ ERC20 call failed: {e}")
            import traceback; traceback.print_exc()
            return False
 
    result = float(balance) >= min_amount
    print(f"   ✅ Result: {balance} >= {min_amount} → {result}")
    print("=" * 60 + "\n")
    return result
 

async def verify_hold_nft(wallet: str, chain: str, task: Dict) -> bool:
    """Verifies ERC721 NFT Ownership"""
    print("👉 Entering 'hold_nft' logic...")
    w3 = get_w3(chain)
    wallet_cs = smart_checksum(wallet)
    contract_address = task.get("targetContractAddress")
    if not contract_address:
        print("   ❌ Error: No contract address provided for NFT check.")
        return False
    ca = smart_checksum(contract_address)
    contract = w3.eth.contract(address=ca, abi=ERC721_ABI)
    balance = contract.functions.balanceOf(wallet_cs).call()
    print(f"   ✅ NFT Balance Found: {balance} | Required: > 0")
    return balance > 0
async def verify_tx_count(wallet: str, chain: str, task: Dict) -> bool:
    """Verifies Total Transactions sent by the wallet (Nonce)"""
    print("👉 Entering 'tx_count' logic...")
    w3 = get_w3(chain)
    wallet_cs = smart_checksum(wallet)
    min_tx = int(task.get("minTxCount", 1))
    count = w3.eth.get_transaction_count(wallet_cs)
    print(f"   ✅ On-Chain Nonce (Tx Count): {count} | Required: {min_tx}")
    return count >= min_tx
async def verify_wallet_age(wallet: str, chain: str, task: Dict) -> bool:
    """Verifies how old the wallet is (First Tx Date)"""
    print("👉 Entering 'wallet_age' logic...")
    wallet_cs = smart_checksum(wallet)
    min_days = int(task.get("minDays", 30))
    print(f"   Min Days Required: {min_days}")
    # 1. Try Alchemy API First
    client = alchemy_clients.get(chain)
    if client:
        try:
            res = client.core.get_asset_transfers(
                from_block="0x0",
                to_block="latest",
                from_address=wallet_cs,
                category=["external", "internal"],
                max_count=1,
                order="asc"
            )
            transfers_list = res.transfers if hasattr(res, 'transfers') else res.get('transfers', [])
            
            if transfers_list and len(transfers_list) > 0:
                first_tx = transfers_list[0]
                if hasattr(first_tx, 'metadata') and first_tx.metadata:
                    first_tx_ts = first_tx.metadata.block_timestamp
                else:
                    block_num = first_tx.block_num if hasattr(first_tx, 'block_num') else None
                    w3 = get_w3(chain)
                    block = w3.eth.get_block(block_num)
                    first_tx_ts = datetime.fromtimestamp(block['timestamp'], tz=timezone.utc).isoformat()
                
                oldest_dt = datetime.fromisoformat(first_tx_ts.replace("Z", "+00:00"))
                age_days = (datetime.now(timezone.utc) - oldest_dt).days
                print(f"   ✅ Alchemy Wallet Age: {age_days} days")
                return age_days >= min_days
        except Exception as alchemy_error:
            print(f"   ⚠️ Alchemy method failed: {alchemy_error}")
    # 2. Fallback: Binary Search via standard Web3 RPC
    print("   Using Web3 fallback method...")
    w3 = get_w3(chain)
    current_block = w3.eth.block_number
    scan_interval = max(1, current_block // 100) 
    oldest_block_with_tx = None
    
    for block_num in range(0, current_block, scan_interval):
        try:
            tx_count = w3.eth.get_transaction_count(wallet_cs, block_num)
            if tx_count > 0:
                oldest_block_with_tx = block_num
                break
        except:
            continue
    
    if not oldest_block_with_tx:
        print("   ❌ No transactions found (New wallet)")
        return False
    
    block = w3.eth.get_block(oldest_block_with_tx)
    oldest_dt = datetime.fromtimestamp(block['timestamp'], tz=timezone.utc)
    age_days = (datetime.now(timezone.utc) - oldest_dt).days
    
    print(f"   ✅ Web3 Wallet Age: {age_days} days")
    return age_days >= min_days
async def verify_timebound_interaction(wallet: str, chain: str, task: Dict) -> bool:
    """Verifies if a wallet interacted with a contract within a specific date range."""
    print("\n👉 Entering 'timebound_interaction' logic...")
    
    contract_address = task.get("targetContractAddress")
    start_date_str = task.get("startDate") 
    end_date_str = task.get("endDate")
    if not contract_address or not start_date_str or not end_date_str:
        print("   ❌ Missing required parameters: contract address, startDate, or endDate.")
        return False
    wallet_cs = smart_checksum(wallet)
    contract_cs = smart_checksum(contract_address)
    # Parse the target timeframe into timezone-aware datetimes
    start_dt = datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
    end_dt = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
    
    print(f"   ⏰ Required Window: {start_dt} to {end_dt} (UTC)")
    # 1. Try Alchemy API First
    client = alchemy_clients.get(chain)
    if client:
        print(f"   🔍 Using Alchemy API for {chain}...")
        page_key = None
        while True:
            try:
                res = client.core.get_asset_transfers(
                    from_block="0x0",
                    to_block="latest",
                    from_address=wallet_cs,
                    to_address=contract_cs,
                    category=["external", "erc20"],
                    with_metadata=True,
                    max_count=1000,
                    page_key=page_key
                )
                
                transfers_list = res.transfers if hasattr(res, 'transfers') else res.get('transfers', [])
                
                for tx in transfers_list:
                    meta = tx.metadata if hasattr(tx, 'metadata') else tx.get("metadata", {})
                    tx_ts_str = meta.block_timestamp if hasattr(meta, 'block_timestamp') else meta.get("blockTimestamp")
                    
                    if tx_ts_str:
                        tx_dt = datetime.fromisoformat(tx_ts_str.replace("Z", "+00:00"))
                        if start_dt <= tx_dt <= end_dt:
                            print(f"   ✅ Interaction found via Alchemy at {tx_dt}")
                            return True
                page_key = res.page_key if hasattr(res, 'page_key') else res.get("pageKey")
                if not page_key:
                    break
            except Exception as e:
                print(f"   ⚠️ Alchemy query failed: {e}. Falling back to Explorer API...")
                break
    # 2. Fallback: Block Explorer API (Etherscan V2 & Blockscout)
    print(f"   🔍 Using Block Explorer API fallback for {chain}...")
    
    chain_name = chain.value if hasattr(chain, 'value') else str(chain)
    etherscan_api_key = os.getenv("ETHERSCAN_API_KEY", "")
    
    # Etherscan V2 uses chain IDs to target the right network
    etherscan_v2_chains = {
        "ethereum": 1,
        "celo": 42220,
        "celo-sepolia": 11142220,
        "base": 8453,
        "arbitrum": 42161,
        "bnb": 56,
    }
    
    endpoints = []
    
    # Build V2 endpoints if it's an Etherscan-supported chain
    if chain_name in etherscan_v2_chains:
        if not etherscan_api_key:
            print("   ❌ ETHERSCAN_API_KEY not found in .env. Required for V2 Explorer API.")
            return False
            
        chain_id = etherscan_v2_chains[chain_name]
        base_v2_url = f"https://api.etherscan.io/v2/api?chainid={chain_id}"
        
        endpoints = [
            f"{base_v2_url}&module=account&action=txlist&address={wallet_cs}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey={etherscan_api_key}",
            f"{base_v2_url}&module=account&action=tokentx&address={wallet_cs}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey={etherscan_api_key}"
        ]
        
    # Blockscout fallback for Lisk
    elif chain_name == "lisk":
        endpoints = [
            f"https://blockscout.lisk.com/api?module=account&action=txlist&address={wallet_cs}&page=1&offset=50&sort=desc",
            f"https://blockscout.lisk.com/api?module=account&action=tokentx&address={wallet_cs}&page=1&offset=50&sort=desc"
        ]
    else:
        print(f"   ❌ No Explorer API mapped for {chain_name}.")
        return False
    # Execute Explorer Fetch
    import httpx
    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            found_contract_but_wrong_time = False
            for url in endpoints:
                print(f"   📡 Pinging Explorer API...")
                resp = await http_client.get(url)
                data = resp.json()
                
                if data.get("status") == "1" and isinstance(data.get("result"), list):
                    txs = data["result"]
                    print(f"   📊 Fetched {len(txs)} transactions from Explorer.")
                    
                    for tx in txs:
                        tx_to = tx.get("to", "")
                        
                        # Check if 'to' address matches our target contract
                        if tx_to and tx_to.lower() == contract_cs.lower():
                            tx_ts = int(tx.get("timeStamp", 0))
                            tx_dt = datetime.fromtimestamp(tx_ts, tz=timezone.utc)
                            
                            if start_dt <= tx_dt <= end_dt:
                                print(f"   ✅ VALID MATCH: Interaction found at {tx_dt} (TxHash: {tx.get('hash')})")
                                return True
                            else:
                                found_contract_but_wrong_time = True
                                print(f"   ⚠️ Time Mismatch: Found interaction at {tx_dt}, but required window is {start_dt} to {end_dt}")
                else:
                    print(f"   ❌ Explorer Error/Empty: {data.get('message')} - {data.get('result')}")
            
            if not found_contract_but_wrong_time:
                print(f"   ❌ Checked recent transactions. None were sent to {contract_cs}.")
                print(f"      (Hint: Ensure the user interacted directly with {contract_cs} and not a Router/Proxy).")
    except Exception as e:
        print(f"   ❌ Explorer API query failed entirely: {e}")
    print("   ❌ Verification Failed.")
    return False
# ────────────────────────────────────────────────
# MAIN ROUTER / EXECUTOR
# ────────────────────────────────────────────────

# EVM Map
VERIFIER_MAP_EVM = {
    "hold_token": verify_hold_token,
    "hold_nft": verify_hold_nft,
    "tx_count": verify_tx_count,
    "wallet_age": verify_wallet_age,
    "timebound_interaction": verify_timebound_interaction,
}

# Solana Map
VERIFIER_MAP_SOLANA = {
    "hold_token": verify_hold_token_solana,
    "tx_count": verify_tx_count_solana,
    "wallet_age": verify_wallet_age_solana,
    # Add hold_nft or timebound later using Metaplex/Helius APIs if needed
}

async def run_onchain_verification(wallet: str, chain: Chain, task: Dict) -> bool:
    """
    Routes the verification request to the correct mapped function for BOTH EVM and Solana.
    """
    action = task.get("action")
    print(f"\n--- 🕵️ STARTING VERIFICATION ---")
    print(f"🔹 Wallet: {wallet}")
    print(f"🔹 Chain: {chain}")
    print(f"🔹 Action: {action}")
    
    try:
        # Route to Solana
        if is_solana_chain(getattr(chain, 'value', chain)):
            verifier_func = VERIFIER_MAP_SOLANA.get(action)
            if not verifier_func:
                print(f"❌ Unknown or unsupported Solana action type: {action}")
                return False
            return await verifier_func(wallet, task)
            
        # Route to EVM
        else:
            verifier_func = VERIFIER_MAP_EVM.get(action)
            if not verifier_func:
                print(f"❌ Unknown EVM action type: {action}")
                return False
            return await verifier_func(wallet, chain, task)
            
    except Exception as e:
        print(f"❌ CRITICAL VERIFICATION ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

async def get_quest_context(faucet_address: str):
    """
    Fetches the Stage Requirements and Task List from the DB to verify points and stages.
    """
    try:
        # 1. Fetch Stage Requirements from 'quests' table
        quest_response = supabase.table("quests").select("stage_pass_requirements").eq("faucet_address", faucet_address).execute()
        if not quest_response.data:
            return None, None
            
        stage_reqs = quest_response.data[0].get("stage_pass_requirements", {})
        # Handle case where it might be stored as a JSON string
        if isinstance(stage_reqs, str):
            stage_reqs = json.loads(stage_reqs)
        # 2. Fetch Tasks from 'faucet_tasks' table
        tasks_response = supabase.table("faucet_tasks").select("tasks").eq("faucet_address", faucet_address).execute()
        tasks = tasks_response.data[0].get("tasks", []) if tasks_response.data else []
        return stage_reqs, tasks
    except Exception as e:
        print(f"Error fetching quest context: {e}")
        return None, None
def get_stage_totals(tasks: List[Dict]) -> Dict[str, int]:
    """
    Sum all NON-SYSTEM task points per stage.
    System tasks (daily check-in, referral, x-share) are excluded
    because they have variable/unlimited point values.
    """
    import math
    totals: Dict[str, int] = {}
    
    SYSTEM_TASK_IDS = {"sys_daily", "sys_referral", "sys_share_x"}
    
    for task in tasks:
        task_id = task.get("id", "")
        
        # Skip system tasks — they have no fixed point ceiling
        if task.get("isSystem") or task_id in SYSTEM_TASK_IDS or str(task_id).startswith("sys_"):
            continue
        
        stage = task.get("stage", "Beginner")
        try:
            pts = int(task.get("points", 0))
        except (ValueError, TypeError):
            pts = 0
        
        totals[stage] = totals.get(stage, 0) + pts
    
    return totals
def get_active_stages(tasks: List[Dict]) -> List[str]:
    """
    Returns only stages that have at least one task, in canonical order.
    e.g. if tasks exist in Beginner + Intermediate + Ultimate only,
    returns ["Beginner", "Intermediate", "Ultimate"] — skips Advance and Legend.
    """
    ALL_STAGES = ["Beginner", "Intermediate", "Advance", "Legend", "Ultimate"]
    stage_totals = get_stage_totals(tasks)
    return [s for s in ALL_STAGES if stage_totals.get(s, 0) > 0]
def calculate_current_stage(stage_points: Dict[str, int], tasks: List[Dict]) -> str:
    """
    Returns the stage the user is currently IN.
    
    Logic:
    - Only looks at active stages (stages that have tasks).
    - Unlock threshold for a stage = ceil(total stage points * 70%)
    - User is IN stage X if they haven't yet earned the threshold for X.
    - If user has passed every active stage, they stay on the last one.
    """
    import math
    active_stages = get_active_stages(tasks)
    if not active_stages:
        return "Beginner"
    stage_totals = get_stage_totals(tasks)
    for stage in active_stages:
        total = stage_totals.get(stage, 0)
        if total <= 0:
            continue
        threshold = math.ceil(total * 0.70)
        earned = stage_points.get(stage, 0)
        if earned < threshold:
            # User hasn't passed this stage yet — they are HERE
            return stage
    # Passed every active stage
    return active_stages[-1]
       
async def process_auto_approval(submission_id: str, faucet_address: str, wallet_address: str):
    try:
        faucet_checksum = smart_checksum(faucet_address)
        wallet_checksum = smart_checksum(wallet_address)

        sub_res = supabase.table("submissions").select("*")\
            .eq("submission_id", submission_id)\
            .execute()
        if not sub_res.data:
            print(f"❌ Submission {submission_id} not found")
            return

        submission = sub_res.data[0]
        task_id = submission['task_id']

        supabase.table("submissions").update({
            "status": "approved",
            "reviewed_at": datetime.utcnow().isoformat(),
            "notes": "Verified by System" if submission.get('submission_type') != "none" else "Instant Reward"
        }).eq("submission_id", submission_id).execute()

        stage_reqs, tasks = await get_quest_context(faucet_checksum)
        task = next((t for t in tasks if t['id'] == task_id), None)

        if not task:
            print(f"⚠️ Task {task_id} not found in quest context.")
            # Delete the submission so user can retry — don't leave it stuck as approved with no points
            supabase.table("submissions").delete().eq("submission_id", submission_id).execute()
            return

        points_to_add = int(task.get('points', 0))
        task_stage = task.get('stage', 'Beginner')

        prog_res = supabase.table("user_progress").select("*")\
            .eq("wallet_address", wallet_checksum)\
            .eq("faucet_address", faucet_checksum)\
            .execute()

        curr_prog = None
        if not prog_res.data:
            new_profile = {
                "wallet_address": wallet_checksum,
                "faucet_address": faucet_checksum,
                "total_points": 0,
                "stage_points": {"Beginner": 0, "Intermediate": 0, "Advance": 0, "Legend": 0, "Ultimate": 0},
                "completed_tasks": [],
                "current_stage": "Beginner",
                "updated_at": datetime.now().isoformat()
            }
            insert_res = supabase.table("user_progress").insert(new_profile).execute()
            if insert_res.data:
                curr_prog = insert_res.data[0]
        else:
            curr_prog = prog_res.data[0]

        if not curr_prog:
            print("❌ Failed to initialize user progress row.")
            supabase.table("submissions").delete().eq("submission_id", submission_id).execute()
            return

        current_completed_tasks = curr_prog.get('completed_tasks') or []
        if task_id not in current_completed_tasks:
            current_completed_tasks.append(task_id)
            new_total = (curr_prog.get('total_points') or 0) + points_to_add
            current_stage_points = curr_prog.get('stage_points') or {}

            for s in ["Beginner", "Intermediate", "Advance", "Legend", "Ultimate"]:
                if s not in current_stage_points:
                    current_stage_points[s] = 0
            current_stage_points[task_stage] += points_to_add
            new_stage_name = calculate_current_stage(current_stage_points, tasks)

            supabase.table("user_progress").update({
                "total_points": new_total,
                "stage_points": current_stage_points,
                "completed_tasks": current_completed_tasks,
                "current_stage": new_stage_name,
                "updated_at": datetime.now().isoformat()
            }).eq("wallet_address", wallet_checksum).eq("faucet_address", faucet_checksum).execute()

            print(f"✅ Points Saved: {points_to_add}. Task {task_id} marked done.")

        part_res = supabase.table("quest_participants").select("points")\
            .eq("quest_address", faucet_checksum)\
            .eq("wallet_address", wallet_checksum)\
            .execute()
        if part_res.data:
            current_lb_points = part_res.data[0].get('points', 0)
            supabase.table("quest_participants").update({
                "points": current_lb_points + points_to_add,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("quest_address", faucet_checksum).eq("wallet_address", wallet_checksum).execute()
        # ── CHECK PENDING REFERRALS: award referrer if this task fulfills the requirement ──
        try:
            pending_res = supabase.table("pending_referrals").select("*")\
                .eq("quest_address", faucet_checksum)\
                .eq("referee_wallet", wallet_checksum)\
                .eq("required_task_id", task_id)\
                .eq("awarded", False)\
                .execute()

            for pending in (pending_res.data or []):
                referrer_wallet = pending["referrer_wallet"]
                referral_points = int(pending.get("referral_points", 200))

                # Award points to the referrer
                ref_part_res = supabase.table("quest_participants").select("points")\
                    .eq("quest_address", faucet_checksum)\
                    .eq("wallet_address", referrer_wallet)\
                    .execute()

                if ref_part_res.data:
                    current_ref_pts = ref_part_res.data[0].get("points", 0)
                    supabase.table("quest_participants").update({
                        "points": current_ref_pts + referral_points,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }).eq("quest_address", faucet_checksum).eq("wallet_address", referrer_wallet).execute()

                # Mark as awarded so we don't double-pay
                supabase.table("pending_referrals").update({"awarded": True})\
                    .eq("quest_address", faucet_checksum)\
                    .eq("referee_wallet", wallet_checksum)\
                    .eq("required_task_id", task_id)\
                    .execute()

                print(f"✅ Referral points ({referral_points}) awarded to {referrer_wallet} because {wallet_checksum} completed task {task_id}")
        except Exception as ref_err:
            print(f"⚠️ Referral fulfillment check failed: {ref_err}")
            
    except Exception as e:
        print(f"❌ Auto-processing failed: {str(e)}")
        traceback.print_exc()
        # ── KEY FIX: delete the stuck submission so the user can retry cleanly ──
        try:
            supabase.table("submissions").delete().eq("submission_id", submission_id).execute()
            print(f"🗑️ Deleted stuck submission {submission_id} so user can retry.")
        except Exception as cleanup_err:
            print(f"⚠️ Failed to clean up submission {submission_id}: {cleanup_err}")
               
def generate_slug(name: str):
    if not name:
        return "faucet"
    # Create a URL-friendly slug
    slug = name.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_-]+', '-', slug)
    return slug

def verify_signature(address: str, message: str, signature: str) -> bool:
    """Recover the signer address from the signature to verify authenticity."""
    try:
        # Create the precise message structure expected by EIP-191
        encoded_message = encode_defunct(text=message)
        recovered_address = Account.recover_message(encoded_message, signature=signature)
        
        return recovered_address.lower() == address.lower()
    except Exception as e:
        print(f"Signature verification failed: {e}")
        return False
# Image upload endpoint using Supabase Storage
@app.post("/upload-image", response_model=ImageUploadResponse)
async def upload_faucet_image(file: UploadFile = File(...)):
    """Upload faucet image to Supabase Storage"""
    try:
        # Validate file type
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
            )
       
        # Read file content
        contents = await file.read()
       
        # Validate file size (5MB max)
        max_size = 5 * 1024 * 1024 # 5MB
        if len(contents) > max_size:
            raise HTTPException(
                status_code=400,
                detail="File too large. Maximum size is 5MB"
            )
       
        # Generate unique filename
        file_extension = file.filename.split(".")[-1] if "." in file.filename else "png"
        unique_filename = f"faucet-images/{uuid.uuid4()}.{file_extension}"
       
        # Upload to Supabase Storage
        response = supabase.storage.from_("faucet-assets").upload(
            path=unique_filename,
            file=contents,
            file_options={
                "content-type": file.content_type,
                "cache-control": "3600",
                "upsert": "False"
            }
        )
       
        # Get public URL
        public_url = supabase.storage.from_("faucet-assets").get_public_url(unique_filename)
       
        print(f"✅ Uploaded image: {unique_filename}")
       
        return {
            "success": True,
            "imageUrl": public_url,
            "message": "Image uploaded successfully"
        }
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Error uploading image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")
    
@app.get("/deleted-faucets", tags=["Utility"])
async def get_deleted_faucets_endpoint():
    """
    Returns a list of all faucet addresses marked as permanently deleted in the database.
    (This is typically used for auditing or filtering on the frontend.)
    """
    try:
        # NOTE: Implement proper authentication/authorization here if this endpoint should be restricted
        # For security, you should check if the requester is an admin or platform owner.
        
        deleted_faucets = await get_all_deleted_faucets()
        
        # Extract just the addresses for simplicity in this endpoint
        deleted_addresses = [record['faucet_address'] for record in deleted_faucets]
        
        return {
            "success": True,
            "count": len(deleted_addresses),
            "deletedAddresses": deleted_addresses,
            "message": "Successfully retrieved list of deleted faucet addresses."
        }
        
    except Exception as e:
        print(f"💥 Error in get_deleted_faucets_endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve deleted faucet list: {str(e)}")
        
# Optional: Endpoint to delete an image
@app.delete("/delete-image")
async def delete_faucet_image(image_url: str):
    """Delete faucet image from Supabase Storage"""
    try:
        # Extract filename from URL
        # URL format: https://[project].supabase.co/storage/v1/object/public/faucet-assets/faucet-images/[uuid].[ext]
        filename = image_url.split("/faucet-assets/")[-1]
       
        # Delete from Supabase Storage
        response = supabase.storage.from_("faucet-assets").remove([filename])
       
        print(f"✅ Deleted image: {filename}")
       
        return {
            "success": True,
            "message": "Image deleted successfully"
        }
       
    except Exception as e:
        print(f"💥 Error deleting image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {str(e)}")

def get_chain_info(chain_id: int) -> Dict:
    """Get basic chain information."""
    return CHAIN_INFO.get(chain_id, {"name": "Unknown Network", "native_token": "ETH"})
def check_sufficient_balance(w3: Web3, signer_address: str, min_balance_eth: float = 0.000001) -> Tuple[bool, str]:
    """
    Simplified balance check - just ensure we have some minimum balance for gas.
    """
    try:
        balance = w3.eth.get_balance(signer_address)
        min_balance_wei = w3.to_wei(min_balance_eth, 'ether')
        chain_info = get_chain_info(w3.eth.chain_id)
       
        if balance < min_balance_wei:
            balance_formatted = w3.from_wei(balance, 'ether')
           
            error_msg = (
                f"Insufficient funds: balance {balance_formatted} {chain_info['native_token']}, "
                f"minimum required ~{min_balance_eth} {chain_info['native_token']}"
            )
            return False, error_msg
       
        return True, ""
       
    except Exception as e:
        return False, f"Error checking balance: {str(e)}"
def build_transaction_with_standard_gas(w3: Web3, contract_function, from_address: str) -> dict:
    """
    Build transaction using standard network gas pricing - no custom logic.
    """
    try:
        # Get current network gas price
        gas_price = w3.eth.gas_price
       
        # Build base transaction
        tx_params = {
            'from': from_address,
            'chainId': w3.eth.chain_id,
            'nonce': w3.eth.get_transaction_count(from_address, 'pending'),
            'gasPrice': gas_price # Use network standard gas price
        }
       
        # Build transaction
        tx = contract_function.build_transaction(tx_params)
       
        # Let Web3 estimate gas naturally
        try:
            estimated_gas = w3.eth.estimate_gas(tx)
            # Add small buffer (10%) to be safe
            tx['gas'] = int(estimated_gas * 1.1)
        except Exception as e:
            print(f"⚠️ Gas estimation failed: {str(e)}, using default")
            # Fallback to a reasonable default
            tx['gas'] = 200000
       
        chain_info = get_chain_info(w3.eth.chain_id)
        print(f"⛽ Standard gas on {chain_info['name']}: {tx['gas']} gas @ {gas_price} wei")
       
        return tx
       
    except Exception as e:
        print(f"❌ Error building transaction: {str(e)}")
        raise
async def get_web3_instance(chain_id: int) -> Web3:
    try:
        rpc_url = get_rpc_url(chain_id)
        if not rpc_url:
            raise HTTPException(status_code=400, detail=f"No RPC URL configured for chain {chain_id}")
       
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            raise HTTPException(status_code=500, detail=f"Failed to connect to node for chain {chain_id}: {rpc_url}")
       
        return w3
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize Web3 for chain {chain_id}: {str(e)}")
async def wait_for_transaction_receipt(w3: Web3, tx_hash: str, timeout: int = 300) -> TxReceipt:
    deadline = asyncio.get_event_loop().time() + timeout
    while asyncio.get_event_loop().time() < deadline:
        try:
            receipt = w3.eth.get_transaction_receipt(tx_hash)
            if receipt is not None:
                return receipt
        except Exception:
            pass
        await asyncio.sleep(2)
    raise HTTPException(status_code=500, detail=f"Transaction {tx_hash} not mined within {timeout} seconds")
# Basic health check
@app.get("/health")
async def health_check():
    # Using timezone-aware UTC is the current best practice
    return {
        "status": "ok", 
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
@app.get("/chain-info/{chain_id}")
async def get_chain_info_endpoint(chain_id: int):
    """Get chain-specific information."""
    try:
        chain_info = get_chain_info(chain_id)
        return {
            "success": True,
            "chain_id": chain_id,
            "network_name": chain_info["name"],
            "native_token": chain_info["native_token"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# Debug endpoints
@app.get("/debug/chain-info/{chain_id}")
async def debug_chain_info(chain_id: int):
    """Debug endpoint to check basic chain information."""
    try:
        chain_info = get_chain_info(chain_id)
        w3 = await get_web3_instance(chain_id)
       
        return {
            "success": True,
            "chain_id": chain_id,
            "network_name": chain_info["name"],
            "native_token": chain_info["native_token"],
            "current_gas_price": w3.eth.gas_price,
            "signer_balance": {
                "wei": w3.eth.get_balance(signer.address),
                "formatted": w3.from_wei(w3.eth.get_balance(signer.address), 'ether')
            },
            "balance_sufficient": w3.eth.get_balance(signer.address) >= w3.to_wei(0.001, 'ether')
        }
       
    except Exception as e:
        return {"success": False, "error": str(e)}
@app.get("/debug/supported-chains")
async def get_supported_chains():
    """Debug endpoint to see which chains are supported."""
    return {
        "success": True,
        "valid_chain_ids": VALID_CHAIN_IDS,
        "chain_info": CHAIN_INFO,
        "total_supported": len(VALID_CHAIN_IDS)
    }
# Additional utility functions for the complete backend
async def check_whitelist_status(w3: Web3, faucet_address: str, user_address: str) -> bool:
    faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
    for _ in range(5):
        try:
            return faucet_contract.functions.isWhitelisted(user_address).call()
        except (ContractLogicError, ValueError) as e:
            print(f"Retry checking whitelist status: {str(e)}")
            await asyncio.sleep(2)
    raise HTTPException(status_code=500, detail="Failed to check whitelist status after retries")
async def check_pause_status(w3: Web3, faucet_address: str) -> bool:
    faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
    try:
        return faucet_contract.functions.paused().call()
    except (ContractLogicError, ValueError) as e:
        print(f"Error checking pause status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to check faucet status")
async def check_user_is_authorized_for_faucet(w3: Web3, faucet_address: str, user_address: str) -> bool:
    """
    Check if user is owner, admin, or backend address for the faucet.
    """
    try:
        faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
       
        # Check if user is owner
        try:
            owner = faucet_contract.functions.owner().call()
            if owner.lower() == user_address.lower():
                print(f"✅ User {user_address} is owner of faucet {faucet_address}")
                return True
        except Exception as e:
            print(f"⚠️ Could not check owner: {str(e)}")
       
        # Check if user is admin
        try:
            is_admin = faucet_contract.functions.isAdmin(user_address).call()
            if is_admin:
                print(f"✅ User {user_address} is admin of faucet {faucet_address}")
                return True
        except Exception as e:
            print(f"⚠️ Could not check admin: {str(e)}")
       
        # Check if user is backend
        try:
            backend = faucet_contract.functions.BACKEND().call()
            if backend.lower() == user_address.lower():
                print(f"✅ User {user_address} is backend of faucet {faucet_address}")
                return True
        except Exception as e:
            print(f"⚠️ Could not check backend: {str(e)}")
       
        print(f"❌ User {user_address} is not authorized for faucet {faucet_address}")
        return False
       
    except Exception as e:
        print(f"❌ Error checking authorization: {str(e)}")
        return False
# Task Management Functions
async def store_faucet_tasks(faucet_address: str, tasks: List[Dict], user_address: str):
    """Store tasks for ANY faucet type in Supabase."""
    try:
        if not Web3.is_address(faucet_address):
            raise HTTPException(status_code=400, detail=f"Invalid faucet address: {faucet_address}")
       
        checksum_faucet_address = smart_checksum(faucet_address)
        checksum_user_address = smart_checksum(user_address)
       
        data = {
            "faucet_address": checksum_faucet_address,
            "tasks": tasks,
            "created_by": checksum_user_address,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
       
        # Upsert: replace existing tasks or create new ones
        response = supabase.table("faucet_tasks").upsert(
            data,
            on_conflict="faucet_address" # Replace if faucet already has tasks
        ).execute()
       
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to store faucet tasks")
           
        print(f"✅ Stored {len(tasks)} tasks for faucet {checksum_faucet_address}")
        print(f"📝 Task types: {[task.get('platform', 'general') for task in tasks[:5]]}") # Show first 5 platforms
       
        return response.data[0]
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Database error in store_faucet_tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
async def get_faucet_tasks(faucet_address: str) -> Optional[Dict]:
    """Get tasks for a faucet from Supabase."""
    try:
        if not Web3.is_address(faucet_address):
            raise HTTPException(status_code=400, detail=f"Invalid faucet address: {faucet_address}")
       
        checksum_faucet_address = smart_checksum(faucet_address)
       
        response = supabase.table("faucet_tasks").select("*").eq(
            "faucet_address", checksum_faucet_address
        ).execute()
       
        if response.data and len(response.data) > 0:
            return response.data[0]
       
        return None
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database error in get_faucet_tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
async def whitelist_user(w3: Web3, faucet_address: str, user_address: str) -> str:
    try:
        chain_info = get_chain_info(w3.eth.chain_id)
       
        faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
       
        # Check balance with simplified requirements
        balance_ok, balance_error = check_sufficient_balance(w3, signer.address)
        if not balance_ok:
            raise HTTPException(status_code=400, detail=balance_error)
       
        # Build transaction with standard gas
        tx = build_transaction_with_standard_gas(
            w3,
            faucet_contract.functions.setWhitelist(user_address, True),
            signer.address
        )
       
        # Sign and send
        signed_tx = w3.eth.account.sign_transaction(tx, signer.key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = await wait_for_transaction_receipt(w3, tx_hash.hex())
       
        if receipt.get('status', 0) != 1:
            raise HTTPException(status_code=400, detail=f"Whitelist transaction failed: {tx_hash.hex()}")
       
        print(f"✅ Whitelist successful on {chain_info['name']}: {tx_hash.hex()}")
        return tx_hash.hex()
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"ERROR in whitelist_user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
# Enhanced Secret Code Database Functions
async def get_secret_code_from_db(faucet_address: str) -> Optional[Dict[str, Any]]:
    """
    Get secret code from database for a specific faucet address.
    """
    try:
        if not Web3.is_address(faucet_address):
            raise HTTPException(status_code=400, detail=f"Invalid faucet address: {faucet_address}")
       
        # Convert to checksum address for consistency
        checksum_address = smart_checksum(faucet_address)
       
        response = supabase.table("secret_codes").select("*").eq("faucet_address", checksum_address).execute()
       
        if not response.data or len(response.data) == 0:
            return None
       
        record = response.data[0]
        current_time = int(datetime.now().timestamp())
       
        return {
            "faucet_address": record["faucet_address"],
            "secret_code": record["secret_code"],
            "start_time": record["start_time"],
            "end_time": record["end_time"],
            "is_valid": record["start_time"] <= current_time <= record["end_time"],
            "is_expired": current_time > record["end_time"],
            "is_future": current_time < record["start_time"],
            "created_at": record.get("created_at"),
            "time_remaining": max(0, record["end_time"] - current_time) if current_time <= record["end_time"] else 0
        }
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database error in get_secret_code_from_db: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
async def get_valid_secret_code(faucet_address: str) -> Optional[str]:
    """
    Get only the secret code string if it's currently valid.
    """
    try:
        code_data = await get_secret_code_from_db(faucet_address)
       
        if code_data and code_data["is_valid"]:
            return code_data["secret_code"]
           
        return None
       
    except Exception as e:
        print(f"Error getting valid secret code: {str(e)}")
        return None
async def get_all_secret_codes() -> list:
    """
    Get all secret codes from database with their validity status.
    """
    try:
        response = supabase.table("secret_codes").select("*").order("created_at", desc=True).execute()
       
        if not response.data:
            return []
       
        current_time = int(datetime.now().timestamp())
        codes = []
       
        for row in response.data:
            codes.append({
                "faucet_address": row["faucet_address"],
                "secret_code": row["secret_code"],
                "start_time": row["start_time"],
                "end_time": row["end_time"],
                "is_valid": row["start_time"] <= current_time <= row["end_time"],
                "is_expired": current_time > row["end_time"],
                "is_future": current_time < row["start_time"],
                "created_at": row.get("created_at"),
                "time_remaining": max(0, row["end_time"] - current_time) if current_time <= row["end_time"] else 0
            })
       
        return codes
       
    except Exception as e:
        print(f"Database error in get_all_secret_codes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
# --- NEW FAUCET DELETION UTILITIES ---
async def get_all_deleted_faucets() -> List[Dict]:
    """
    Retrieves all deleted faucet records from the 'deleted_faucets' table.
    """
    try:
        print("🔍 Retrieving all deleted faucet addresses from Supabase...")
        
        # Select all columns, ordered by most recently deleted
        response = supabase.table("deleted_faucets").select("*").order("deleted_at", desc=True).execute()
        
        deleted_records = response.data or []
        
        print(f"✅ Found {len(deleted_records)} deleted faucet records.")
        return deleted_records
        
    except Exception as e:
        print(f"💥 Database error in get_all_deleted_faucets: {str(e)}")
        # Log the error and return an empty list gracefully
        return []
    
async def record_deleted_faucet(faucet_address: str, deleted_by: str, chain_id: int):
    """
    Records a faucet address in the 'deleted_faucets' table in Supabase 
    AFTER the on-chain transaction succeeded.
    """
    try:
        if not Web3.is_address(faucet_address) or not Web3.is_address(deleted_by):
            raise ValueError("Invalid address format for faucet or deleter.")
        
        checksum_faucet_address = smart_checksum(faucet_address)
        checksum_deleted_by = smart_checksum(deleted_by)
        
        data = {
            "faucet_address": checksum_faucet_address,
            "deleted_by": checksum_deleted_by,
            "chain_id": chain_id,
            "deleted_at": datetime.now().isoformat()
        }
        
        # Insert the record. Assumes the "deleted_faucets" table has been created in Supabase.
        response = supabase.table("deleted_faucets").upsert(data, on_conflict="faucet_address").execute()
        
        if not response.data:
            raise Exception("Failed to record deleted faucet in Supabase.")
        
        print(f"✅ Recorded deleted faucet {checksum_faucet_address} by {checksum_deleted_by}")
        return response.data[0]
        
    except Exception as e:
        print(f"💥 Database error in record_deleted_faucet: {str(e)}")
        raise
async def is_faucet_permanently_deleted(faucet_address: str) -> bool:
    """
    Checks if a faucet is marked as permanently deleted in the Supabase table.
    """
    try:
        if not Web3.is_address(faucet_address):
            return False
            
        checksum_faucet_address = smart_checksum(faucet_address)
        
        response = supabase.table("deleted_faucets").select("faucet_address").eq(
            "faucet_address", checksum_faucet_address
        ).execute()
        
        return len(response.data) > 0
        
    except Exception as e:
        print(f"⚠️ Error checking deletion status in DB: {str(e)}")
        return False    
async def check_secret_code_status(faucet_address: str, secret_code: str) -> Dict[str, Any]:
    """
    Check if a provided secret code matches and is valid for a faucet.
    """
    try:
        code_data = await get_secret_code_from_db(faucet_address)
       
        if not code_data:
            return {
                "valid": False,
                "reason": "No secret code found for this faucet",
                "code_exists": False
            }
       
        code_matches = code_data["secret_code"] == secret_code
        time_valid = code_data["is_valid"]
       
        result = {
            "valid": code_matches and time_valid,
            "code_exists": True,
            "code_matches": code_matches,
            "time_valid": time_valid,
            "is_expired": code_data["is_expired"],
            "is_future": code_data["is_future"],
            "time_remaining": code_data["time_remaining"]
        }
       
        if not code_matches:
            result["reason"] = "Secret code does not match"
        elif not time_valid:
            if code_data["is_expired"]:
                result["reason"] = "Secret code has expired"
            elif code_data["is_future"]:
                result["reason"] = "Secret code is not yet active"
            else:
                result["reason"] = "Secret code is not currently valid"
        else:
            result["reason"] = "Valid"
           
        return result
       
    except Exception as e:
        print(f"Error checking secret code status: {str(e)}")
        return {
            "valid": False,
            "reason": f"Error checking code: {str(e)}",
            "code_exists": False
        }
async def generate_secret_code() -> str:
    """Generate a 6-character alphanumeric secret code."""
    characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return ''.join(secrets.choice(characters) for _ in range(6))
async def store_secret_code(faucet_address: str, secret_code: str, start_time: int, end_time: int):
    """Store the secret code in Supabase."""
    try:
        data = {
            "faucet_address": faucet_address,
            "secret_code": secret_code,
            "start_time": start_time,
            "end_time": end_time
        }
        response = supabase.table("secret_codes").upsert(data, on_conflict="faucet_address").execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to store secret code in Supabase")
    except Exception as e:
        print(f"Supabase error in store_secret_code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Supabase error: {str(e)}")
# Updated verify_secret_code function using the new helper
async def verify_secret_code(faucet_address: str, secret_code: str) -> bool:
    """Verify the secret code against Supabase."""
    try:
        status = await check_secret_code_status(faucet_address, secret_code)
        return status["valid"]
    except Exception as e:
        print(f"Error in verify_secret_code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
async def save_admin_popup_preference(user_address: str, faucet_address: str, dont_show_again: bool):
    """Save the admin popup preference to Supabase."""
    try:
        if not Web3.is_address(user_address) or not Web3.is_address(faucet_address):
            raise HTTPException(status_code=400, detail="Invalid address format")
       
        # Convert to checksum addresses for consistency
        checksum_user_address = smart_checksum(user_address)
        checksum_faucet_address = smart_checksum(faucet_address)
       
        data = {
            "user_address": checksum_user_address,
            "faucet_address": checksum_faucet_address,
            "dont_show_admin_popup": dont_show_again,
            "updated_at": datetime.now().isoformat()
        }
       
        # Upsert: insert or update if combination already exists
        response = supabase.table("admin_popup_preferences").upsert(
            data,
            on_conflict="user_address,faucet_address"
        ).execute()
       
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to save admin popup preference")
           
        return response.data[0]
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database error in save_admin_popup_preference: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
async def get_admin_popup_preference(user_address: str, faucet_address: str) -> bool:
    """Get the admin popup preference from Supabase. Returns False if not found."""
    try:
        if not Web3.is_address(user_address) or not Web3.is_address(faucet_address):
            return False
       
        # Convert to checksum addresses for consistency
        checksum_user_address = smart_checksum(user_address)
        checksum_faucet_address = smart_checksum(faucet_address)
       
        response = supabase.table("admin_popup_preferences").select("dont_show_admin_popup").eq(
            "user_address", checksum_user_address
        ).eq(
            "faucet_address", checksum_faucet_address
        ).execute()
       
        if response.data and len(response.data) > 0:
            return response.data[0]["dont_show_admin_popup"]
       
        # Default to False (show popup) if no preference found
        return False
       
    except Exception as e:
        print(f"Database error in get_admin_popup_preference: {str(e)}")
        # Return False on error so popup still shows
        return False
async def get_user_all_popup_preferences(user_address: str) -> list:
    """Get all admin popup preferences for a specific user."""
    try:
        if not Web3.is_address(user_address):
            raise HTTPException(status_code=400, detail="Invalid user address format")
       
        checksum_user_address = smart_checksum(user_address)
       
        response = supabase.table("admin_popup_preferences").select("*").eq(
            "user_address", checksum_user_address
        ).execute()
       
        return response.data or []
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database error in get_user_all_popup_preferences: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
async def claim_tokens_no_code_evm(w3: Web3, faucet_address: str, user_address: str, divvi_data: Optional[str] = None) -> str:
    try:
        chain_info = get_chain_info(w3.eth.chain_id)
       
        # Check if paused
        is_paused = await check_pause_status(w3, faucet_address)
        if is_paused:
            raise HTTPException(status_code=400, detail="Faucet is paused")
        # Check balance
        balance_ok, balance_error = check_sufficient_balance(w3, signer.address)
        if not balance_ok:
            raise HTTPException(status_code=400, detail=balance_error)
        faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
       
        # Build transaction with standard gas
        tx = build_transaction_with_standard_gas(
            w3,
            faucet_contract.functions.claim([user_address]),
            signer.address
        )
       
        # Handle Divvi referral data
        if divvi_data:
            print(f"Adding Divvi referral data: {divvi_data[:50]}...")
           
            if isinstance(divvi_data, str) and divvi_data.startswith('0x'):
                try:
                    divvi_bytes = bytes.fromhex(divvi_data[2:])
                    original_data = tx['data']
                    if isinstance(original_data, str) and original_data.startswith('0x'):
                        original_bytes = bytes.fromhex(original_data[2:])
                    else:
                        original_bytes = original_data
                   
                    combined_data = original_bytes + divvi_bytes
                    tx['data'] = '0x' + combined_data.hex()
                   
                    print(f"Successfully appended Divvi data. Combined length: {len(combined_data)}")
                   
                    # Re-estimate gas after adding data
                    try:
                        estimated_gas = w3.eth.estimate_gas(tx)
                        tx['gas'] = int(estimated_gas * 1.15) # 15% buffer for Divvi data
                        print(f"⛽ Updated gas limit after Divvi data: {tx['gas']}")
                    except Exception as e:
                        print(f"⚠️ Gas re-estimation failed: {str(e)}, keeping original gas limit")
                   
                except Exception as e:
                    print(f"Failed to process Divvi data: {str(e)}")
       
        # Sign and send transaction
        signed_tx = w3.eth.account.sign_transaction(tx, signer.key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = await wait_for_transaction_receipt(w3, tx_hash.hex())
       
        if receipt.get('status', 0) != 1:
            try:
                w3.eth.call(tx, block_identifier=receipt['blockNumber'])
            except Exception as revert_error:
                raise HTTPException(status_code=400, detail=f"Claim failed: {str(revert_error)}")
       
        print(f"✅ Claim no-code successful on {chain_info['name']}: {tx_hash.hex()}")
        return tx_hash.hex()
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"ERROR in claim_tokens_no_code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to claim tokens: {str(e)}")
async def claim_tokens(w3: Web3, faucet_address: str, user_address: str, secret_code: str, divvi_data: Optional[str] = None) -> str:
    try:
        chain_info = get_chain_info(w3.eth.chain_id)
       
        # Validate secret code first
        is_valid_code = await verify_secret_code(faucet_address, secret_code)
        if not is_valid_code:
            raise HTTPException(status_code=403, detail="Invalid or expired secret code")
        # Check if paused
        is_paused = await check_pause_status(w3, faucet_address)
        if is_paused:
            raise HTTPException(status_code=400, detail="Faucet is paused")
        # Check balance
        balance_ok, balance_error = check_sufficient_balance(w3, signer.address)
        if not balance_ok:
            raise HTTPException(status_code=400, detail=balance_error)
        faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
       
        # Build transaction with standard gas
        tx = build_transaction_with_standard_gas(
            w3,
            faucet_contract.functions.claim([user_address]),
            signer.address
        )
       
        # Handle Divvi referral data
        if divvi_data:
            print(f"Adding Divvi referral data: {divvi_data[:50]}...")
           
            if isinstance(divvi_data, str) and divvi_data.startswith('0x'):
                try:
                    divvi_bytes = bytes.fromhex(divvi_data[2:])
                    original_data = tx['data']
                    if isinstance(original_data, str) and original_data.startswith('0x'):
                        original_bytes = bytes.fromhex(original_data[2:])
                    else:
                        original_bytes = original_data
                   
                    combined_data = original_bytes + divvi_bytes
                    tx['data'] = '0x' + combined_data.hex()
                   
                    print(f"Successfully appended Divvi data. Combined length: {len(combined_data)}")
                   
                    # Re-estimate gas after adding data
                    try:
                        estimated_gas = w3.eth.estimate_gas(tx)
                        tx['gas'] = int(estimated_gas * 1.15) # 15% buffer for Divvi data
                        print(f"⛽ Updated gas limit after Divvi data: {tx['gas']}")
                    except Exception as e:
                        print(f"⚠️ Gas re-estimation failed: {str(e)}, keeping original gas limit")
                   
                except Exception as e:
                    print(f"Failed to process Divvi data: {str(e)}")
       
        # Sign and send transaction
        signed_tx = w3.eth.account.sign_transaction(tx, signer.key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = await wait_for_transaction_receipt(w3, tx_hash.hex())
       
        if receipt.get('status', 0) != 1:
            try:
                w3.eth.call(tx, block_identifier=receipt['blockNumber'])
            except Exception as revert_error:
                raise HTTPException(status_code=400, detail=f"Claim failed: {str(revert_error)}")
       
        print(f"✅ Claim successful on {chain_info['name']}: {tx_hash.hex()}")
        return tx_hash.hex()
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"ERROR in claim_tokens: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to claim tokens: {str(e)}")
   
async def claim_tokens_custom_evm(w3: Web3, faucet_address: str, user_address: str, divvi_data: Optional[str] = None) -> str:
    try:
        chain_info = get_chain_info(w3.eth.chain_id)
       
        # Check if paused
        is_paused = await check_pause_status(w3, faucet_address)
        if is_paused:
            raise HTTPException(status_code=400, detail="Faucet is paused")
        faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
       
        # Check custom amount
        try:
            has_custom_amount = faucet_contract.functions.hasCustomClaimAmount(user_address).call()
            if not has_custom_amount:
                raise HTTPException(status_code=400, detail="No custom claim amount set for this address")
           
            custom_amount = faucet_contract.functions.getCustomClaimAmount(user_address).call()
            if custom_amount <= 0:
                raise HTTPException(status_code=400, detail="Custom claim amount is zero")
               
            print(f"User {user_address} has custom claim amount: {custom_amount}")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error checking custom claim amount: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to check custom claim amount")
       
        # Check if already claimed
        try:
            has_claimed = faucet_contract.functions.hasClaimed(user_address).call()
            if has_claimed:
                raise HTTPException(status_code=400, detail="User has already claimed from this faucet")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error checking claim status: {str(e)}")
        # Check balance
        balance_ok, balance_error = check_sufficient_balance(w3, signer.address)
        if not balance_ok:
            raise HTTPException(status_code=400, detail=balance_error)
        # Build transaction with standard gas
        tx = build_transaction_with_standard_gas(
            w3,
            faucet_contract.functions.claim([user_address]),
            signer.address
        )
       
        # Handle Divvi referral data
        if divvi_data:
            print(f"Adding Divvi referral data: {divvi_data[:50]}...")
           
            if isinstance(divvi_data, str) and divvi_data.startswith('0x'):
                try:
                    divvi_bytes = bytes.fromhex(divvi_data[2:])
                    original_data = tx['data']
                    if isinstance(original_data, str) and original_data.startswith('0x'):
                        original_bytes = bytes.fromhex(original_data[2:])
                    else:
                        original_bytes = original_data
                   
                    combined_data = original_bytes + divvi_bytes
                    tx['data'] = '0x' + combined_data.hex()
                   
                    print(f"Successfully appended Divvi data. Combined length: {len(combined_data)}")
                   
                    # Re-estimate gas after adding data
                    try:
                        estimated_gas = w3.eth.estimate_gas(tx)
                        tx['gas'] = int(estimated_gas * 1.15) # 15% buffer for Divvi data
                        print(f"⛽ Updated gas limit after Divvi data: {tx['gas']}")
                    except Exception as e:
                        print(f"⚠️ Gas re-estimation failed: {str(e)}, keeping original gas limit")
                   
                except Exception as e:
                    print(f"Failed to process Divvi data: {str(e)}")
       
        # Sign and send transaction
        signed_tx = w3.eth.account.sign_transaction(tx, signer.key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = await wait_for_transaction_receipt(w3, tx_hash.hex())
       
        if receipt.get('status', 0) != 1:
            try:
                w3.eth.call(tx, block_identifier=receipt['blockNumber'])
            except Exception as revert_error:
                raise HTTPException(status_code=400, detail=f"Claim failed: {str(revert_error)}")
       
        print(f"✅ Custom claim successful on {chain_info['name']}: {tx_hash.hex()}")
        return tx_hash.hex()
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"ERROR in claim_tokens_custom: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to claim tokens: {str(e)}")
# Enhanced set_claim_parameters function for ALL faucet types
# Updated set_claim_parameters function to APPEND tasks instead of overwriting
async def set_claim_parameters(faucetAddress: str, start_time: int, end_time: int, tasks: Optional[List[Dict]] = None) -> str:
    try:
        # 1. Generate secret code for dropcode faucets (still needed for dropcode)
        secret_code = await generate_secret_code()
        await store_secret_code(faucetAddress, secret_code, start_time, end_time)
        
        # 2. Handle Task Merging
        if tasks:
            print(f"📝 Processing tasks for faucet {faucetAddress}")
            
            # A. Fetch Existing Tasks first
            existing_tasks = []
            try:
                existing_data = await get_faucet_tasks(faucetAddress)
                if existing_data and "tasks" in existing_data:
                    existing_tasks = existing_data["tasks"]
                    print(f"found {len(existing_tasks)} existing tasks.")
            except Exception as e:
                print(f"No existing tasks found or DB error: {e}")
            # B. Combine Existing + New Tasks
            # Note: This simply appends. If you want to prevent duplicates, 
            # you would need to filter by URL or ID here.
            combined_tasks = existing_tasks + tasks
            
            # C. Store the Combined List (Use backend signer as creator for set-claim-parameters calls)
            await store_faucet_tasks(faucetAddress, combined_tasks, signer.address)
            print(f"✅ Successfully stored {len(combined_tasks)} total tasks (appended) for faucet {faucetAddress}")
        
        print(f"🔐 Generated secret code for {faucetAddress}: {secret_code}")
        return secret_code
        
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"ERROR in set_claim_parameters: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to set parameters: {str(e)}")
# Helper function to check if user is platform owner
async def check_platform_owner_authorization(user_address: str) -> bool:
    """Check if user address is the platform owner"""
    return user_address.lower() == PLATFORM_OWNER.lower()
async def store_droplist_config(config: DroplistConfig, tasks: List[DroplistTask], user_address: str):
    """Store droplist configuration in Supabase"""
    try:
        # Convert tasks to storage format
        tasks_data = [task.dict() for task in tasks]
       
        data = {
            "platform_owner": user_address,
            "config": config.dict(),
            "tasks": tasks_data,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
       
        # Upsert configuration (replace if exists)
        response = supabase.table("droplist_config").upsert(
            data,
            on_conflict="platform_owner"
        ).execute()
       
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to store droplist config")
           
        print(f"✅ Stored droplist config with {len(tasks)} tasks for owner {user_address}")
        return response.data[0]
       
    except Exception as e:
        print(f"💥 Database error in store_droplist_config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
async def get_droplist_config() -> Optional[Dict]:
    """Get current droplist configuration"""
    try:
        response = supabase.table("droplist_config").select("*").eq(
            "platform_owner", PLATFORM_OWNER
        ).execute()
       
        if response.data and len(response.data) > 0:
            return response.data[0]
       
        return None
       
    except Exception as e:
        print(f"Database error in get_droplist_config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
async def store_user_profile(profile: UserProfile):
    """Store or update user profile in Supabase"""
    try:
        data = {
            "wallet_address": profile.walletAddress,
            "x_accounts": profile.xAccounts,
            "completed_tasks": profile.completedTasks,
            "droplist_status": profile.droplistStatus,
            "updated_at": datetime.now().isoformat()
        }
       
        response = supabase.table("droplist_users").upsert(
            data,
            on_conflict="wallet_address"
        ).execute()
       
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to store user profile")
           
        return response.data[0]
       
    except Exception as e:
        print(f"Database error in store_user_profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
async def get_user_profile(wallet_address: str) -> Optional[UserProfile]:
    """Get user profile from Supabase"""
    try:
        if not Web3.is_address(wallet_address):
            return None
           
        checksum_address = smart_checksum(wallet_address)
       
        response = supabase.table("droplist_users").select("*").eq(
            "wallet_address", checksum_address
        ).execute()
       
        if response.data and len(response.data) > 0:
            data = response.data[0]
            return UserProfile(
                walletAddress=data["wallet_address"],
                xAccounts=data.get("x_accounts", []),
                completedTasks=data.get("completed_tasks", []),
                droplistStatus=data.get("droplist_status", "pending")
            )
       
        return None
       
    except Exception as e:
        print(f"Database error in get_user_profile: {str(e)}")
        return None
    
async def generate_new_drop_code_only(faucet_address: str) -> str:
    """
    Generate a new drop code and update it in the database with smart timing logic.
    If existing code is expired, make new code active immediately.
    If existing code is still valid, preserve the timing.
    """
    try:
        current_time = int(datetime.now().timestamp())
       
        # Get existing secret code data to check timing
        existing_code_data = await get_secret_code_from_db(faucet_address)
       
        if existing_code_data:
            old_start_time = existing_code_data["start_time"]
            old_end_time = existing_code_data["end_time"]
            is_expired = existing_code_data["is_expired"]
            is_future = existing_code_data["is_future"]
           
            print(f"📅 Existing timing: start={old_start_time}, end={old_end_time}, expired={is_expired}, future={is_future}")
           
            if is_expired:
                # Old code is expired - make new code active immediately for 30 days
                start_time = current_time
                end_time = current_time + (30 * 24 * 60 * 60) # 30 days from now
                print(f"🔄 Old code expired, making new code active immediately until {datetime.fromtimestamp(end_time)}")
            elif is_future:
                # Old code hasn't started yet - preserve start time but extend end time if needed
                start_time = old_start_time
                # Ensure at least 7 days from start time
                min_end_time = old_start_time + (7 * 24 * 60 * 60)
                end_time = max(old_end_time, min_end_time)
                print(f"⏳ Old code is future, preserving start time {old_start_time}, end time set to {end_time}")
            else:
                # Old code is currently valid - preserve existing timing
                start_time = old_start_time
                end_time = old_end_time
                print(f"✅ Old code is valid, preserving existing timing")
        else:
            # No existing code - set new timing (active immediately for 30 days)
            start_time = current_time
            end_time = current_time + (30 * 24 * 60 * 60) # 30 days from now
            print(f"🆕 No existing code, setting new timing: start={start_time}, end={end_time}")
       
        # Generate new secret code
        new_secret_code = await generate_secret_code()
       
        # Store the new code with smart timing
        await store_secret_code(faucet_address, new_secret_code, start_time, end_time)
       
        # Verify the new code is properly stored and valid
        verification = await get_secret_code_from_db(faucet_address)
        if verification:
            print(f"✅ New code verification: valid={verification['is_valid']}, expired={verification['is_expired']}")
       
        print(f"✅ Generated new drop code for {faucet_address}: {new_secret_code}")
        print(f"⏰ Active period: {datetime.fromtimestamp(start_time)} to {datetime.fromtimestamp(end_time)}")
       
        return new_secret_code
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"ERROR in generate_new_drop_code_only: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate new drop code: {str(e)}")
    
@app.get("/api/check-name")
async def check_quest_name_availability(name: str):
    """
    Checks if a Quest Name (title) already exists in the database.
    Used by the frontend to provide real-time validation.
    """
    try:
        clean_name = name.strip()
        
        if not clean_name or len(clean_name) < 3:
            return {
                "exists": False, 
                "valid": False, 
                "message": "Name must be at least 3 characters"
            }
        # Query Supabase 'quests' table
        # We use .ilike() for case-insensitive matching to prevent duplicate confusion
        response = supabase.table("quests")\
            .select("title")\
            .ilike("title", clean_name)\
            .execute()
        # If we get any rows back, the name exists
        exists = len(response.data) > 0
        return {
            "exists": exists,
            "valid": True,
            "message": "Name is already taken" if exists else "Name is available"
        }
    except Exception as e:
        print(f"💥 Error checking name availability: {str(e)}")
        # Don't block the UI on error, just assume valid but log it
        return {"exists": False, "valid": True, "error": str(e)}

@app.get("/api/profile/user/{identifier}")
async def get_user_profile(identifier: str):
    """
    Smart endpoint: Search by Username OR Wallet Address.
    """
    try:
        # 1. Try searching by Wallet Address first (Exact Match)
        # We assume identifiers starting with '0x' are wallets
        if identifier.startswith("0x") and len(identifier) == 42:
            response = supabase.table("user_profiles")\
                .select("*")\
                .eq("wallet_address", identifier.lower())\
                .execute()
        else:
            # 2. Otherwise, treat as Username (Case Insensitive)
            response = supabase.table("user_profiles")\
                .select("*")\
                .ilike("username", identifier)\
                .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {"success": True, "profile": response.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/profile/user/{username}")
async def get_profile_by_username(username: str):
    """
    Used for shareable links. Finds a profile by username string.
    """
    try:
        # Search case-insensitive
        response = supabase.table("user_profiles")\
            .select("*")\
            .ilike("username", username)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {
            "success": True, 
            "profile": response.data[0]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/profile/update")
async def update_user_profile(request: UserProfileUpdate):
    try:
        # 1. Identify addresses
        wallet_lower = smart_checksum(request.wallet_address).lower() if not is_solana_address(request.wallet_address) else request.wallet_address
        solana_addr = request.solana_address

        # 2. Verify signature using the actively connected wallet
        active_wallet = request.solana_address if is_solana_address(request.wallet_address) else request.wallet_address
        if not verify_signature(active_wallet, request.message, request.signature):
            raise HTTPException(status_code=401, detail="Invalid signature. You are not the owner of this wallet.")

        # 3. Check Unique Fields (Username, Email, Twitter)
        def check_is_taken(column, value):
            if not value: return False
            existing = supabase.table("user_profiles").select("wallet_address, solana_address").eq(column, value).execute()
            if existing.data:
                found = existing.data[0]
                # Allow if either the EVM or Solana address matches the current user
                found_evm = found.get('wallet_address', '').lower()
                found_sol = found.get('solana_address', '')
                
                is_evm_match = (found_evm == wallet_lower) if wallet_lower else False
                is_sol_match = (found_sol == solana_addr) if solana_addr else False
                
                if not (is_evm_match or is_sol_match):
                    return True
            return False

        if check_is_taken("username", request.username):
            raise HTTPException(status_code=400, detail="Username is already taken.")
        if check_is_taken("email", request.email):
            raise HTTPException(status_code=400, detail="Email is already used by another account.")
        if check_is_taken("twitter_handle", request.twitter_handle):
            raise HTTPException(status_code=400, detail="Twitter handle is already linked to another account.")

        # 4. Prepare Upsert Data
        profile_data = {
            "wallet_address": wallet_lower, # Always anchor to EVM as primary if available
            "solana_address": solana_addr,  # 👈 Save the linked Solana address
            "username": request.username, 
            "email": request.email,
            "bio": request.bio,
            "avatar_url": request.avatar_url,
            "twitter_handle": request.twitter_handle,
            "discord_handle": request.discord_handle,
            "telegram_handle": request.telegram_handle,
            "farcaster_handle": request.farcaster_handle,
            "telegram_user_id": request.telegram_user_id,
            "twitter_id": request.twitter_id,      
            "discord_id": request.discord_id,      
            "farcaster_id": request.farcaster_id,  
            "updated_at": datetime.now().isoformat()
        }

        # 5. Upsert 
        response = supabase.table("user_profiles").upsert(
            profile_data, 
            on_conflict="wallet_address" # Overwrites based on EVM address to keep the row unified
        ).execute()
        
        return {
            "success": True, 
            "message": "Profile updated successfully", 
            "profile": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Update Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
    
@app.post("/faucet-x-template")
async def save_faucet_x_template(request: CustomXPostTemplate):
    """Save custom X post template for a faucet"""
    try:
        if not Web3.is_address(request.faucetAddress):
            raise HTTPException(status_code=400, detail="Invalid faucet address")
       
        faucet_address = smart_checksum(request.faucetAddress)
        user_address = smart_checksum(request.userAddress)
       
        # Validate user is authorized (similar to add-faucet-tasks)
        w3 = await get_web3_instance(request.chainId)
        is_authorized = await check_user_is_authorized_for_faucet(w3, faucet_address, user_address)
       
        if not is_authorized:
            raise HTTPException(
                status_code=403,
                detail="Access denied. User must be owner, admin, or backend address."
            )
       
        data = {
            "faucet_address": faucet_address,
            "x_post_template": request.template,
            "created_by": user_address,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
       
        # Upsert template
        response = supabase.table("faucet_x_templates").upsert(
            data,
            on_conflict="faucet_address"
        ).execute()
       
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to store X post template")
       
        print(f"✅ Stored X post template for faucet {faucet_address}")
       
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "message": "X post template saved successfully"
        }
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Error saving X post template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save template: {str(e)}")
# --- NEW API ENDPOINT: DELETE FAUCET METADATA ---
# In main.py
@app.post("/delete-faucet-metadata") 
async def delete_faucet_metadata_endpoint(request: DeleteFaucetRequest):
    try:
        # 1. Use Checksum for Web3 verification (Security)
        faucet_address_checksum = smart_checksum(request.faucetAddress)
        user_address_checksum = smart_checksum(request.userAddress)
        
        # 2. Verify authorization using the checksummed address
        w3 = await get_web3_instance(request.chainId)
        is_authorized = await check_user_is_authorized_for_faucet(w3, faucet_address_checksum, user_address_checksum)
        
        if not is_authorized:
            raise HTTPException(status_code=403, detail="Access denied.")
        
        # 3. CONVERT TO LOWERCASE FOR DATABASE OPERATIONS
        # This ensures we match the format stored in 'userfaucets'
        faucet_address_lower = request.faucetAddress.lower()
        # 4. Perform the Deletions using LOWERCASE address
        # Delete from userfaucets (The one showing in dashboard)
        supabase.table("userfaucets").delete().eq("faucet_address", faucet_address_lower).execute()
        
        # Clean up other metadata
        supabase.table("faucet_metadata").delete().eq("faucet_address", faucet_address_lower).execute()
        supabase.table("faucet_tasks").delete().eq("faucet_address", faucet_address_lower).execute()
        supabase.table("faucet_x_templates").delete().eq("faucet_address", faucet_address_lower).execute()
        # 5. Record deletion (Optional: store as checksum or lower, depending on preference)
        await record_deleted_faucet(faucet_address_checksum, user_address_checksum, request.chainId)
        
        return {
            "success": True,
            "faucetAddress": faucet_address_checksum,
            "message": "Faucet marked as deleted and metadata cleaned up."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Error processing deletion: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete metadata: {str(e)}")
    
@app.get("/faucet-x-template/{faucetAddress}")
async def get_faucet_x_template(faucetAddress: str):
    """Get custom X post template for a faucet"""
    try:
        if not Web3.is_address(faucetAddress):
            raise HTTPException(status_code=400, detail="Invalid faucet address")
       
        faucet_address = smart_checksum(faucetAddress)
       
        response = supabase.table("faucet_x_templates").select("*").eq(
            "faucet_address", faucet_address
        ).execute()
       
        if response.data and len(response.data) > 0:
            return {
                "success": True,
                "faucetAddress": faucet_address,
                "template": response.data[0]["x_post_template"],
                "createdBy": response.data[0].get("created_by"),
                "createdAt": response.data[0].get("created_at"),
                "updatedAt": response.data[0].get("updated_at")
            }
       
        # Return default template if none exists
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "template": None,
            "message": "No custom template found, will use default"
        }
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Error getting X post template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get template: {str(e)}")
@app.delete("/faucet-x-template/{faucetAddress}")
async def delete_faucet_x_template(faucetAddress: str, userAddress: str, chainId: int):
    """Delete custom X post template for a faucet"""
    try:
        if not Web3.is_address(faucetAddress) or not Web3.is_address(userAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
       
        faucet_address = smart_checksum(faucetAddress)
        user_address = smart_checksum(userAddress)
       
        # Validate user is authorized
        w3 = await get_web3_instance(chainId)
        is_authorized = await check_user_is_authorized_for_faucet(w3, faucet_address, user_address)
       
        if not is_authorized:
            raise HTTPException(
                status_code=403,
                detail="Access denied. User must be owner, admin, or backend address."
            )
       
        response = supabase.table("faucet_x_templates").delete().eq(
            "faucet_address", faucet_address
        ).execute()
       
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "message": "X post template deleted successfully"
        }
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Error deleting X post template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {str(e)}")
   
# Add this new endpoint after the existing secret code endpoints
@app.post("/generate-new-drop-code")
async def generate_new_drop_code_endpoint(request: GenerateNewDropCodeRequest):
    """Generate a new drop code for dropcode faucets (authorized users only)."""
    try:
        print(f"🔄 New drop code request: user={request.userAddress}, faucet={request.faucetAddress}")
       
        # Validate addresses
        if not Web3.is_address(request.faucetAddress) or not Web3.is_address(request.userAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
       
        # Validate chain ID
        if request.chainId not in VALID_CHAIN_IDS:
            raise HTTPException(status_code=400, detail=f"Invalid chainId: {request.chainId}")
       
        faucet_address = smart_checksum(request.faucetAddress)
        user_address = smart_checksum(request.userAddress)
       
        # Get Web3 instance
        w3 = await get_web3_instance(request.chainId)
       
        # Check if user is authorized (owner, admin, or backend)
        is_authorized = await check_user_is_authorized_for_faucet(w3, faucet_address, user_address)
        if not is_authorized:
            raise HTTPException(
                status_code=403,
                detail="Access denied. User must be owner, admin, or backend address."
            )
       
        # Additional check: Verify this is actually a dropcode faucet
        try:
            # Try to get existing secret code data to confirm this is a dropcode faucet
            faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
           
            # Check if this faucet has the faucetType function and if it's dropcode
            try:
                faucet_type = faucet_contract.functions.faucetType().call()
                if faucet_type.lower() != 'dropcode':
                    raise HTTPException(
                        status_code=400,
                        detail=f"This operation is only available for dropcode faucets. Current type: {faucet_type}"
                    )
            except Exception as e:
                print(f"⚠️ Could not verify faucet type: {str(e)}")
                # Continue anyway - older contracts might not have faucetType function
               
        except Exception as e:
            print(f"⚠️ Could not verify faucet contract: {str(e)}")
       
        # Generate new drop code
        new_code = await generate_new_drop_code_only(faucet_address)
       
        print(f"✅ Successfully generated new drop code for {faucet_address}: {new_code}")
       
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "userAddress": user_address,
            "secretCode": new_code,
            "chainId": request.chainId,
            "message": "New drop code generated successfully",
            "timestamp": datetime.now().isoformat(),
            "note": "Previous drop code is now invalid"
        }
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"💥 Error in generate_new_drop_code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate new drop code: {str(e)}")
# Optional: Add a debug endpoint to check drop code status
@app.get("/debug/drop-code-status/{faucetAddress}")
async def debug_drop_code_status(faucetAddress: str):
    """Debug endpoint to check current drop code status."""
    try:
        if not Web3.is_address(faucetAddress):
            raise HTTPException(status_code=400, detail="Invalid faucet address format")
       
        faucet_address = smart_checksum(faucetAddress)
        code_data = await get_secret_code_from_db(faucet_address)
       
        if not code_data:
            return {
                "success": False,
                "faucetAddress": faucet_address,
                "message": "No drop code found for this faucet"
            }
       
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "hasCode": True,
            "isValid": code_data["is_valid"],
            "isExpired": code_data["is_expired"],
            "isFuture": code_data["is_future"],
            "timeRemaining": code_data["time_remaining"],
            "startTime": code_data["start_time"],
            "endTime": code_data["end_time"],
            "createdAt": code_data.get("created_at"),
            "code": code_data["secret_code"][:2] + "****" # Partially hidden for security
        }
       
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "faucetAddress": faucetAddress
        }
@app.post("/api/profile/check-availability")
async def check_availability(check: AvailabilityCheck):
        try:
            # 2. Map frontend field names to DB column names (if they differ)
            # This prevents SQL injection or invalid column errors
            field_map = {
                "username": "username",
                "email": "email",
                "twitter_handle": "twitter_handle",
                "discord_handle": "discord_handle",
                "telegram_handle": "telegram_handle",
                "farcaster_handle": "farcaster_handle"
            }
            
            if check.field not in field_map:
                return {"available": True} # Unknown field, ignore check
            db_column = field_map[check.field]
            check_value = check.value.strip()
            
            # Standardize the incoming wallet to lowercase for comparison
            requesting_wallet = check.current_wallet.lower() if check.current_wallet else ""
            # 3. QUERY: Find ANY record with this specific value
            # We select the 'wallet_address' so we can identify the owner
            response = supabase.table("user_profiles")\
                .select("wallet_address")\
                .ilike(db_column, check_value)\
                .execute()
            # 4. LOGIC: Analyze the result
            if response.data:
                # We found a record! Now, who owns it?
                owner_wallet = response.data[0]['wallet_address'].lower()
                # COMPARE: Is the owner the same person making the request?
                if owner_wallet == requesting_wallet:
                    # YES -> It's me! I am allowed to keep my own username.
                    return {"available": True}
                else:
                    # NO -> It belongs to someone else.
                    return {
                        "available": False, 
                        "message": f"This {check.field.replace('_', ' ')} is already taken."
                    }
            # 5. No record found -> Totally new and available
            return {"available": True}
        except Exception as e:
            print(f"Check Error: {e}")
            # Default to True on error to avoid blocking the UI
            return {"available": True}
        
# API Endpoints
@app.post("/api/droplist/config")
async def save_droplist_config(request: DroplistConfigRequest):
    """Save droplist configuration (platform owner only)"""
    try:
        # Validate user is platform owner
        if not Web3.is_address(request.userAddress):
            raise HTTPException(status_code=400, detail="Invalid user address")
       
        user_address = smart_checksum(request.userAddress)
       
        if not await check_platform_owner_authorization(user_address):
            raise HTTPException(
                status_code=403,
                detail="Access denied. Only platform owner can manage droplist configuration"
            )
       
        # Store configuration
        result = await store_droplist_config(request.config, request.tasks, user_address)
       
        return {
            "success": True,
            "message": f"Droplist configuration saved with {len(request.tasks)} tasks",
            "data": result
        }
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error saving droplist config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save configuration: {str(e)}")
@app.get("/api/droplist/config")
async def get_droplist_config_endpoint():
    """Get current droplist configuration"""
    try:
        config = await get_droplist_config()
       
        if not config:
            return {
                "success": True,
                "config": {
                    "isActive": False,
                    "title": "Join FaucetDrops Community",
                    "description": "Complete social media tasks to join our droplist",
                    "requirementThreshold": 5
                },
                "tasks": [],
                "message": "No configuration found, using defaults"
            }
       
        return {
            "success": True,
            "config": config.get("config", {}),
            "tasks": config.get("tasks", []),
            "createdAt": config.get("created_at"),
            "updatedAt": config.get("updated_at")
        }
       
    except Exception as e:
        print(f"Error getting droplist config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get configuration: {str(e)}")
@app.post("/api/upload-image", tags=["Utilities"])
async def upload_image(file: UploadFile = File(...)):
    """
    Uploads an image to Supabase Storage ('quest-images' bucket) 
    and returns the public URL.
    """
    try:
        # 1. Read file content
        file_content = await file.read()
        file_ext = file.filename.split(".")[-1]
        
        # 2. Generate unique filename (using uuid)
        import uuid
        file_name = f"{uuid.uuid4()}.{file_ext}"
        
        # 3. Upload to Supabase Storage
        # NOTE: Ensure you created a public bucket named 'quest-images'
        bucket_name = "quest-images"
        
        # 'file_options' might be needed depending on supabase-py version, 
        # usually defaults work for public buckets.
        res = supabase.storage.from_(bucket_name).upload(
            path=file_name,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        # 4. Get Public URL
        public_url_res = supabase.storage.from_(bucket_name).get_public_url(file_name)
        
        # Check if URL was generated (Supabase-py implementation varies, checking distinct return types)
        # usually get_public_url returns a string or a dict containing publicURL
        
        final_url = public_url_res
        if not isinstance(final_url, str):
             # Some versions return specific objects, ensure we get the string
             final_url = str(final_url)
        return {"success": True, "url": final_url}
    except Exception as e:
        print(f"❌ Upload Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")
@app.get("/api/users/{wallet_address}", tags=["User Management"])
async def get_user_profile_endpoint(wallet_address: str):
    """Get user profile"""
    try:
        profile = await get_user_profile(wallet_address)
       
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")
       
        # FIX: Simply return the profile. 
        # Since it's already a dict, FastAPI will automatically 
        # serialize it to JSON for you.
        return profile
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting user profile: {str(e)}")
        # It's helpful to keep this print for debugging
        raise HTTPException(status_code=500, detail=f"Failed to get user profile: {str(e)}")@app.post("/api/users")
async def create_user_profile_endpoint(profile: UserProfile):
    """Create new user profile"""
    try:
        if not Web3.is_address(profile.walletAddress):
            raise HTTPException(status_code=400, detail="Invalid wallet address")
       
        profile.walletAddress = smart_checksum(profile.walletAddress)
       
        result = await store_user_profile(profile)
       
        return {
            "success": True,
            "message": "User profile created",
            "data": result
        }
       
    except Exception as e:
        print(f"Error creating user profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create user profile: {str(e)}")
@app.post("/api/tasks/verify")
async def verify_task_endpoint(request: TaskVerificationRequest):
    """Verify task completion for user"""
    try:
        if not Web3.is_address(request.walletAddress):
            raise HTTPException(status_code=400, detail="Invalid wallet address")
       
        wallet_address = smart_checksum(request.walletAddress)
       
        # Get user profile
        profile = await get_user_profile(wallet_address)
        if not profile:
            # Create new profile
            profile = UserProfile(walletAddress=wallet_address)
       
        # Check if task is already completed
        if request.taskId in profile.completedTasks:
            return {
                "success": True,
                "completed": True,
                "message": "Task already completed",
                "verifiedWith": request.xAccountId
            }
       
        # Here you would implement actual verification logic
        # For now, we'll simulate verification
        verification_success = True # Replace with actual verification
       
        if verification_success:
            profile.completedTasks.append(request.taskId)
            await store_user_profile(profile)
       
        return {
            "success": True,
            "completed": verification_success,
            "message": "Task verified successfully" if verification_success else "Verification failed",
            "verifiedWith": request.xAccountId if verification_success else None
        }
       
    except Exception as e:
        print(f"Error verifying task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Task verification failed: {str(e)}")
@app.post("/api/tasks/verify-all")
async def verify_all_tasks_endpoint(request: dict):
    """Verify all tasks for a user"""
    try:
        wallet_address = request.get("walletAddress")
        if not wallet_address or not Web3.is_address(wallet_address):
            raise HTTPException(status_code=400, detail="Invalid wallet address")
       
        wallet_address = smart_checksum(wallet_address)
       
        # Get droplist config to check tasks
        config = await get_droplist_config()
        if not config:
            raise HTTPException(status_code=404, detail="No droplist configuration found")
       
        # Get user profile
        profile = await get_user_profile(wallet_address)
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")
       
        tasks = config.get("tasks", [])
        completed_count = len(profile.completedTasks)
        requirement_threshold = config.get("config", {}).get("requirementThreshold", 5)
       
        return {
            "success": True,
            "completedTasks": completed_count,
            "totalTasks": len(tasks),
            "requirementMet": completed_count >= requirement_threshold,
            "message": f"User has completed {completed_count}/{len(tasks)} tasks"
        }
       
    except Exception as e:
        print(f"Error verifying all tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Task verification failed: {str(e)}")
@app.post("/api/droplist/submit")
async def submit_to_droplist_endpoint(request: dict):
    """Submit user to droplist"""
    try:
        wallet_address = request.get("walletAddress")
        if not wallet_address or not Web3.is_address(wallet_address):
            raise HTTPException(status_code=400, detail="Invalid wallet address")
       
        wallet_address = smart_checksum(wallet_address)
       
        # Get droplist config
        config = await get_droplist_config()
        if not config:
            raise HTTPException(status_code=404, detail="No droplist configuration found")
       
        droplist_config = config.get("config", {})
        if not droplist_config.get("isActive", False):
            raise HTTPException(status_code=400, detail="Droplist is not currently active")
       
        # Get user profile
        profile = await get_user_profile(wallet_address)
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")
       
        # Check if user meets requirements
        completed_count = len(profile.completedTasks)
        requirement_threshold = droplist_config.get("requirementThreshold", 5)
       
        if completed_count < requirement_threshold:
            raise HTTPException(
                status_code=400,
                detail=f"Not eligible. Completed {completed_count}/{requirement_threshold} required tasks"
            )
       
        # Check if already completed
        if profile.droplistStatus == "completed":
            return {
                "success": True,
                "message": "User already in droplist",
                "alreadySubmitted": True
            }
       
        # Update user status
        profile.droplistStatus = "completed"
        await store_user_profile(profile)
       
        # Here you could add logic to:
        # - Send confirmation email
        # - Add to external mailing list
        # - Trigger Discord/Telegram notifications
       
        return {
            "success": True,
            "message": "Successfully added to droplist",
            "completedTasks": completed_count,
            "status": "completed"
        }
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error submitting to droplist: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Droplist submission failed: {str(e)}")
@app.get("/api/droplist/stats")
async def get_droplist_stats():
    """Get droplist statistics"""
    try:
        # Get all users
        response = supabase.table("droplist_users").select("*").execute()
        users = response.data or []
       
        total_users = len(users)
        completed_users = len([u for u in users if u.get("droplist_status") == "completed"])
        pending_users = total_users - completed_users
       
        # Get configuration
        config = await get_droplist_config()
        is_active = config.get("config", {}).get("isActive", False) if config else False
       
        return {
            "success": True,
            "stats": {
                "totalUsers": total_users,
                "completedUsers": completed_users,
                "pendingUsers": pending_users,
                "isActive": is_active,
                "totalTasks": len(config.get("tasks", [])) if config else 0
            }
        }
       
    except Exception as e:
        print(f"Error getting droplist stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")
# X Account management endpoints (placeholder - implement OAuth flow)
@app.post("/api/x-accounts/auth/initiate")
async def initiate_x_auth(request: dict):
    """Initiate X OAuth flow"""
    # Implement X OAuth initiation
    # This would typically involve generating OAuth tokens and redirecting to X
    return {
        "authUrl": "https://api.twitter.com/oauth/authenticate?oauth_token=example",
        "state": "example_state"
    }
@app.put("/api/x-accounts/{account_id}")
async def update_x_account(account_id: str, request: dict):
    """Update X account status"""
    # Implement X account status update
    return {
        "success": True,
        "message": "Account status updated"
    }
# --- QUEST MANAGEMENT ENDPOINTS (UPDATED) ---
@app.post("/api/quests", tags=["Quest Management"])
async def save_quest(request: Quest):
    """
    Saves the Quest configuration to the database.
    Handles image_url and stage_pass_requirements fields using Supabase.
    """
    try:
        if not Web3.is_address(request.creatorAddress) or not Web3.is_address(request.faucetAddress):
            raise HTTPException(status_code=400, detail="Invalid address format for creator or faucet.")
        
        faucet_address_cs = smart_checksum(request.faucetAddress)
        
        quest_data = request.dict()
        
        # 1. Extract and separate complex fields
        tasks_to_store = quest_data.pop("tasks")
        stage_reqs_to_store = quest_data.pop("stagePassRequirements")
        # 2. Map remaining fields to snake_case column names for the 'quests' table
        quest_data_db = {
            "faucet_address": faucet_address_cs,
            "creator_address": quest_data.pop("creatorAddress"),
            "title": quest_data.pop("title"),
            "description": quest_data.pop("description"),
            "is_active": quest_data.pop("isActive"),
            "reward_pool": quest_data.pop("rewardPool"),
            "start_date": quest_data.pop("startDate"),
            "end_date": quest_data.pop("endDate"),
            "reward_token_type": quest_data.pop("rewardTokenType"),
            "token_address": quest_data.pop("tokenAddress"),
            "token_symbol": quest_data.pop("tokenSymbol", None),
            # New/Updated fields:
            "image_url": quest_data.pop("imageUrl"), 
            "stage_pass_requirements": stage_reqs_to_store, # Stored as JSON/Dict
            
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        # 3. Store main quest data in the 'quests' table
        response = supabase.table("quests").upsert(
            quest_data_db,
            on_conflict="faucet_address"
        ).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to save core quest metadata to Supabase.")
        
        # 4. Store tasks data in the 'faucet_tasks' table
        await store_faucet_tasks(faucet_address_cs, tasks_to_store, quest_data_db["creator_address"])
        
        print(f"✅ Saved Quest: '{request.title}'. Faucet: {faucet_address_cs}")
        
        return {
            "success": True,
            "message": "Quest and Faucet metadata saved successfully.",
            "faucetAddress": faucet_address_cs
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Error saving quest: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to save quest: {str(e)}")
    
# --- GET QUEST BY ADDRESS (Updated to fetch new fields) ---
@app.get("/api/quests/{faucetAddress}", tags=["Quest Management"])
async def get_quest_by_address(faucetAddress: str):
    """
    Fetch a single quest by faucet address OR draft ID.
    Handles strict address validation bypass for drafts and rehydrates tasks.
    """
    try:
        print(f"🔍 Fetching quest details for: {faucetAddress}")
        
        # 1. VALIDATE ADDRESS/ID
        if Web3.is_address(faucetAddress):
            faucet_address = smart_checksum(faucetAddress)
        else:
            faucet_address = faucetAddress # It's a Draft ID (e.g. "draft-uuid...")
        # 2. FETCH CORE METADATA
        response = supabase.table("quests").select("*").eq("faucet_address", faucet_address).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail=f"Quest not found")
        
        quest_row = response.data[0]
        participants_count_res = supabase.table("quest_participants")\
            .select("wallet_address", count="exact")\
            .eq("quest_address", faucet_address)\
            .execute()
        
        total_participants = participants_count_res.count if hasattr(participants_count_res, 'count') else 0
        
        # 3. FETCH TASKS FROM faucet_tasks TABLE
        # We query the separate table where tasks are stored during draft/creation
        tasks = []
        try:
            tasks_res = supabase.table("faucet_tasks").select("tasks").eq(
                "faucet_address", faucet_address
            ).execute()
            
            if tasks_res.data and len(tasks_res.data) > 0:
                # Extract the 'tasks' column from the first row found
                tasks = tasks_res.data[0].get("tasks", [])
                print(f"✅ Successfully rehydrated {len(tasks)} tasks for {faucet_address}")
            else:
                print(f"⚠️ No tasks found in faucet_tasks for {faucet_address}")
        except Exception as task_err:
            print(f"⚠️ Error fetching tasks for {faucet_address}: {str(task_err)}")
            # Don't fail the whole request if tasks fail, just return empty list
            tasks = []
        
        # 4. PARSE DATES SAFELY
        def parse_iso_date(date_str):
            if not date_str: return None
            try:
                clean_date = date_str.replace('Z', '+00:00')
                return datetime.fromisoformat(clean_date).isoformat() # <-- Keeps the exact time
            except: return None
        
        start_date = parse_iso_date(quest_row.get("start_date"))
        end_date = parse_iso_date(quest_row.get("end_date"))
        # 5. PARSE JSON FIELDS
        # Supabase usually returns dicts, but if it's stored as a string, we parse it
        def ensure_dict(field_data):
            if isinstance(field_data, str):
                try:
                    return json.loads(field_data)
                except:
                    return {}
            return field_data or {}
        stage_reqs = ensure_dict(quest_row.get("stage_pass_requirements"))
        dist_config = ensure_dict(quest_row.get("distribution_config"))
        admins_res = supabase.table("quest_admins").select("admin_address").eq("quest_address", faucet_address).execute()
        admin_addresses = [a["admin_address"].lower() for a in (admins_res.data or [])]
        # 6. ASSEMBLE FINAL DATA
        quest_data = {
            "faucetAddress": faucet_address,
            "title": quest_row.get("title"),
            "totalParticipants": total_participants,
            "description": quest_row.get("description"),
            "isActive": quest_row.get("is_active", False),
            "isDraft": quest_row.get("is_draft", False),
            "isFunded": quest_row.get("is_funded", False),
            "rewardPool": quest_row.get("reward_pool"),
            "creatorAddress": quest_row.get("creator_address"),
            "admins": admin_addresses,
            "startDate": start_date,
            "endDate": end_date,
            "tasks": tasks,  # <--- FIXED: Now populated from faucet_tasks
            "tokenSymbol": quest_row.get("token_symbol"),
            "imageUrl": quest_row.get("image_url"),
            "stagePassRequirements": stage_reqs,
            "distributionConfig": dist_config,
            "tokenAddress": quest_row.get("token_address"),
            "rewardTokenType": quest_row.get("reward_token_type")
        }
        
        return {"success": True, "quest": quest_data}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Critical Error fetching quest: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/api/faucets/by-slug/{slug_or_address}", tags=["Faucet Management"])
async def get_faucet_address_by_slug(slug_or_address: str):
    try:
        clean_input = slug_or_address.lower().strip()
        
        # 1. Search by SLUG first
        response = supabase.table("faucets").select("*").eq("slug", clean_input).execute()
        
        if response.data and len(response.data) > 0:
            return {
                "success": True,
                "faucetAddress": response.data[0].get("faucet_address"),
                "chainId": response.data[0].get("chain_id"),
                "name": response.data[0].get("name"),
                "slug": response.data[0].get("slug")
            }
        # 2. If Slug search fails, check if input is a valid ETH ADDRESS
        if clean_input.startswith("0x") and len(clean_input) == 42:
            addr_response = supabase.table("faucets").select("*").eq("faucet_address", clean_input).execute()
            
            if addr_response.data and len(addr_response.data) > 0:
                faucet = addr_response.data[0]
                
                # 3. AUTO-GENERATE & SAVE SLUG IF MISSING
                # This fixes the 404 for existing faucets
                if not faucet.get("slug"):
                    base_slug = generate_slug(faucet.get("name"))
                    # Append unique suffix to prevent collisions
                    final_slug = f"{base_slug}-{clean_input[-4:]}"
                    
                    # Save it back to Supabase permanently
                    supabase.table("faucets").update({"slug": final_slug}).eq("faucet_address", clean_input).execute()
                    faucet["slug"] = final_slug
                
                return {
                    "success": True,
                    "faucetAddress": faucet.get("faucet_address"),
                    "chainId": faucet.get("chain_id"),
                    "name": faucet.get("name"),
                    "slug": faucet.get("slug")
                }
        # 4. Truly not found
        raise HTTPException(status_code=404, detail="Faucet not found")
        
    except HTTPException as he:
        # Don't let the 'except Exception' block catch actual HTTP 404s
        raise he
    except Exception as e:
        print(f"❌ Error resolving: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal database error")
@app.get("/api/quests/by-slug/{slug}", tags=["Quest Management"])
async def get_quest_by_slug(slug: str):
    """
    Fetch a single quest using its unique slug identifier.
    Used for frontend dynamic routing.
    """
    try:
        print(f"🔍 Fetching quest details for slug: {slug}")
        
        # 1. FETCH CORE METADATA BY SLUG
        # Ensure your Supabase 'quests' table has a 'slug' column
        response = supabase.table("quests").select("*").eq("slug", slug).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Quest not found")
        
        quest_row = response.data[0]
        # We need the actual address to fetch participants and tasks
        faucet_address = quest_row.get("faucet_address")
        # 2. FETCH PARTICIPANT COUNT
        participants_count_res = supabase.table("quest_participants")\
            .select("wallet_address", count="exact")\
            .eq("quest_address", faucet_address)\
            .execute()
        
        total_participants = participants_count_res.count if hasattr(participants_count_res, 'count') else 0
        
        # 3. REHYDRATE TASKS
        tasks = []
        try:
            tasks_res = supabase.table("faucet_tasks").select("tasks").eq(
                "faucet_address", faucet_address
            ).execute()
            
            if tasks_res.data:
                tasks = tasks_res.data[0].get("tasks", [])
        except Exception as task_err:
            print(f"⚠️ Task rehydration failed for {slug}: {str(task_err)}")
        
        # 4. DATE PARSING HELPER
        def parse_iso_date(date_str):
            if not date_str: return None
            try:
                clean_date = date_str.replace('Z', '+00:00')
                return datetime.fromisoformat(clean_date).isoformat() # <--- Keeps exact time
            except: return None
        # 5. ASSEMBLE DATA (Matches your QuestOverview Interface)
        quest_data = {
            "faucetAddress": faucet_address,
            "slug": quest_row.get("slug"),
            "title": quest_row.get("title"),
            "totalParticipants": total_participants,
            "description": quest_row.get("description"),
            "isActive": quest_row.get("is_active", False),
            "rewardPool": quest_row.get("reward_pool"),
            "isFunded": quest_row.get("is_funded", False),
            "creatorAddress": quest_row.get("creator_address"),
            "startDate": parse_iso_date(quest_row.get("start_date")),
            "endDate": parse_iso_date(quest_row.get("end_date")),
            "tasks": tasks,
            "tokenSymbol": quest_row.get("token_symbol"),
            "imageUrl": quest_row.get("image_url"),
            "tokenAddress": quest_row.get("token_address")
        }
        
        return {"success": True, "quest": quest_data}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching quest by slug: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/quests", tags=["Quest Management"])
async def get_all_quests(walletAddress: str = None):
    try:
        print("🔍 Fetching all quests from Supabase...")

        # 1. Fetch all quests metadata
        response = supabase.table("quests").select("*").execute()
        
        if not response.data:
            return {"success": True, "quests": [], "message": "No quests found"}
        
        quests_list = []
        
        for quest_row in response.data:
            try:
                faucet_address = quest_row.get("faucet_address")
                if not faucet_address:
                    continue

                # === Mirror single quest logic for participants count ===
                participants_count_res = supabase.table("quest_participants")\
                    .select("wallet_address", count="exact")\
                    .eq("quest_address", faucet_address)\
                    .execute()
                
                total_participants = participants_count_res.count if hasattr(participants_count_res, 'count') else 0

                # 2. Fetch tasks count
                tasks_res = supabase.table("faucet_tasks").select("tasks").eq(
                    "faucet_address", faucet_address
                ).execute()
                
                tasks_count = 0
                if tasks_res.data and tasks_res.data[0].get("tasks"):
                    tasks_count = len(tasks_res.data[0]["tasks"])

                # 3. Check if user has joined (only if walletAddress provided)
                has_joined = False
                if walletAddress:
                    faucet_cs = smart_checksum(faucet_address)
                    wallet_cs = smart_checksum(walletAddress)
                    
                    participant_res = supabase.table("quest_participants")\
                        .select("id")\
                        .eq("quest_address", faucet_cs)\
                        .eq("wallet_address", wallet_cs)\
                        .execute()
                    
                    has_joined = len(participant_res.data or []) > 0

                # 4. Safe date parsing
                def format_date(raw_date):
                    if not raw_date:
                        return None
                    try:
                        return datetime.fromisoformat(raw_date.replace('Z', '+00:00')).isoformat()
                    except:
                        return None

                # 5. Assemble data (mirroring single quest structure)
                quest_data = {
                    "faucetAddress": faucet_address,
                    "slug": quest_row.get("slug") or faucet_address,
                    "title": quest_row.get("title"),
                    "description": quest_row.get("description"),
                    "isActive": quest_row.get("is_active", False),
                    "isDraft": quest_row.get("is_draft", False),
                    "isFunded": quest_row.get("is_funded", False),
                    "rewardPool": quest_row.get("reward_pool"),
                    "creatorAddress": quest_row.get("creator_address"),
                    "startDate": format_date(quest_row.get("start_date")),
                    "endDate": format_date(quest_row.get("end_date")),
                    "tasksCount": tasks_count,
                    "totalParticipants": total_participants,          # ← Now consistent with single quest
                    "imageUrl": quest_row.get("image_url"),
                    "tokenSymbol": quest_row.get("token_symbol"),
                    "hasJoined": has_joined
                }
                
                quests_list.append(quest_data)
                
            except Exception as e:
                print(f"⚠️ Error processing quest {faucet_address}: {str(e)}")
                continue
        
        return {
            "success": True,
            "quests": quests_list,
            "count": len(quests_list)
        }
        
    except Exception as e:
        print(f"❌ Error fetching quests: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
async def process_delayed_x_verification(
    submission_id: str,
    faucet_address: str,
    wallet_address: str,
    is_success: bool,
    delay_seconds: int
):
    """Waits in the background, then approves or rejects the task."""
    print(f"⏳ Task {submission_id} queued for {delay_seconds} seconds...")
    
    # 1. Wait the required time (3-10 mins, or 5 mins)
    await asyncio.sleep(delay_seconds)
    
    # 2. Make sure the submission hasn't been manually altered by an admin while waiting
    sub_res = supabase.table("submissions").select("status").eq("submission_id", submission_id).execute()
    if not sub_res.data or sub_res.data[0]["status"] != "auto_verifying":
        print(f"⏭️ Task {submission_id} status changed manually. Aborting queue worker.")
        return 
        
    # 3. Execute the final decision
    if is_success:
        # Happy Path -> Approve
        supabase.table("submissions").update({
            "status": "approved",
            "notes": "Verified by X Sync Queue"
        }).eq("submission_id", submission_id).execute()
        
        await process_auto_approval(submission_id, faucet_address, wallet_address)
        print(f"✅ Delayed X task {submission_id} approved!")
    else:
        # Sad Path -> Reject
        supabase.table("submissions").update({
            "status": "rejected",
            "notes": "Task missing requirement. Please do the task on X and try again."
        }).eq("submission_id", submission_id).execute()
        print(f"❌ Delayed X task {submission_id} rejected!")
        
             
async def finalize_rewards(request: FinalizeRewardsRequest):
    # Mocking success for demo, actual implementation requires Web3 interaction
    if len(request.winners) != len(request.amounts):
        raise HTTPException(status_code=400, detail="Winners and amounts lists must be of the same length.")
   
    print(f"MOCK: Successfully set custom claim amounts for {len(request.winners)} winners.")
       
    return {
        "success": True,
        "message": f"Successfully set custom claim amounts for {len(request.winners)} winners. Users can now claim (MOCK TX).",
        "txHash": "0xMOCKTXHASH",
        "faucetAddress": request.faucetAddress
    }
@app.get("/api/wallet/balances/{chain_id}/{wallet_address}")
async def get_wallet_balances(chain_id: int, wallet_address: str):
    """
    Fetch all token balances for a wallet on a specific chain.
    Returns both native and ERC20/SPL token balances.
    """
    try:
        # --- 🔀 THE ROUTER ---
        if is_solana_chain(chain_id):
            if not is_valid_solana_address(wallet_address):
                raise HTTPException(status_code=400, detail="Invalid Solana address")
            
            # Fetch Solana Balances
            async with AsyncClient(SOLANA_RPC_URL) as client:
                pubkey = Pubkey.from_string(wallet_address)
                
                # Native SOL
                sol_response = await client.get_balance(pubkey)
                sol_balance = sol_response.value / 1_000_000_000
                
                balances = [{
                    "token_address": "0x0000000000000000000000000000000000000000", # Native token placeholder
                    "balance": str(sol_balance),
                    "is_native": True
                }]
                
                # (Optional future feature: Loop through SPL tokens here)
                        
                return {
                    "success": True,
                    "chain_id": chain_id,
                    "wallet_address": wallet_address,
                    "balances": balances
                }

        # --- 👇 EXISTING EVM LOGIC 👇 ---
        if not Web3.is_address(wallet_address):
            raise HTTPException(status_code=400, detail="Invalid EVM wallet address")
            
        wallet_checksum = Web3.to_checksum_address(wallet_address)
        w3 = await get_web3_instance(chain_id)
        
        balances = []
        
        # Get native token balance
        try:
            native_balance = w3.eth.get_balance(wallet_checksum)
            balances.append({
                "token_address": "0x0000000000000000000000000000000000000000",
                "balance": str(native_balance),
                "is_native": True
            })
        except Exception as e:
            print(f"Error fetching native balance: {e}")
            balances.append({
                "token_address": "0x0000000000000000000000000000000000000000",
                "balance": "0",
                "is_native": True
            })
        
        # Get ERC20 token balances
        token_addresses = get_token_addresses_for_chain(chain_id)
        for token_address in token_addresses:
            try:
                token_contract = w3.eth.contract(
                    address=Web3.to_checksum_address(token_address),
                    abi=ERC20_BALANCE_ABI
                )
                balance = token_contract.functions.balanceOf(wallet_checksum).call()
                balances.append({
                    "token_address": token_address,
                    "balance": str(balance),
                    "is_native": False
                })
            except Exception as e:
                print(f"Error fetching balance for {token_address}: {e}")
                balances.append({
                    "token_address": token_address,
                    "balance": "0",
                    "is_native": False
                })
        
        return {
            "success": True,
            "chain_id": chain_id,
            "wallet_address": wallet_checksum,
            "balances": balances
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching wallet balances: {e}")
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/api/wallet/balance/{chain_id}/{token_address}/{wallet_address}")
async def get_token_balance(chain_id: int, token_address: str, wallet_address: str):
    """
    Fetch balance for a specific token.
    Use '0x0000000000000000000000000000000000000000' for native token.
    """
    try:
        if not Web3.is_address(wallet_address):
            raise HTTPException(status_code=400, detail="Invalid wallet address")
        
        wallet_checksum = smart_checksum(wallet_address)
        w3 = await get_web3_instance(chain_id)
        
        # Check if native token
        if token_address.lower() == "0x0000000000000000000000000000000000000000":
            balance = w3.eth.get_balance(wallet_checksum)
            return {
                "success": True,
                "balance": str(balance),
                "is_native": True
            }
        
        # ERC20 token
        token_checksum = smart_checksum(token_address)
        token_contract = w3.eth.contract(
            address=token_checksum,
            abi=ERC20_BALANCE_ABI
        )
        
        balance = token_contract.functions.balanceOf(wallet_checksum).call()
        decimals = token_contract.functions.decimals().call()
        symbol = token_contract.functions.symbol().call()
        
        return {
            "success": True,
            "balance": str(balance),
            "decimals": decimals,
            "symbol": symbol,
            "is_native": False
        }
        
    except Exception as e:
        print(f"Error fetching token balance: {e}")
        raise HTTPException(status_code=500, detail=str(e))
def get_token_addresses_for_chain(chain_id: int) -> List[str]:
    """
    Return list of token addresses to check for each chain.
    These should match your NETWORK_TOKENS config in the frontend.
    """
    token_map = {
        42220: [  # Celo
            "0x765DE816845861e75A25fCA122bb6898B8B1282a",  # cUSD
            "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",  # USDT
            "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",  # cEUR
            "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",  # USDC
            "0x639A647fbe20b6c8ac19E48E2de44ea792c62c5C",  # cREAL
            "0xE2702Bd97ee33c88c8f6f92DA3B733608aa76F71",  # cNGN
            "0x32A9FE697a32135BFd313a6Ac28792DaE4D9979d",  # cKES
            "0x4f604735c1cf31399c6e711d5962b2b3e0225ad3",  # USDGLO
            "0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a",  # G$
        ],
        1135: [  # Lisk
            "0xac485391EB2d7D88253a7F1eF18C37f4242D1A24",  # LSK
            "0x05D032ac25d322df992303dCa074EE7392C117b9",  # USDT
            "0xF242275d3a6527d877f2c927a82D9b057609cc71",  # USDC.e
        ],
        42161: [  # Arbitrum
            "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",  # USDC
            "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",  # USDT
            "0x912CE59144191C1204E64559FE8253a0e49E6548",  # ARB
        ],
        8453: [  # Base
            "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",  # USDT
            "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed",  # DEGEN
        ],
         56: [  # BSC (Binance Smart Chain)
       "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",  # USDC
       "0x55d398326f99059fF775485246999027B3197955",  # USDT
       "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",  # BUSD
   ],
    }
    
    return token_map.get(chain_id, [])
@app.post("/api/wallet/send-transaction")
async def send_wallet_transaction(
    wallet_address: str,
    to_address: str,
    amount: str,
    chain_id: int,
    token_address: str = None
):
    """
    Send a transaction from the embedded wallet.
    Note: This endpoint should be called from the frontend with Privy's sendTransaction.
    The backend can verify and log the transaction.
    """
    try:
        if not Web3.is_address(wallet_address) or not Web3.is_address(to_address):
            raise HTTPException(status_code=400, detail="Invalid address")
        
        # Log the transaction attempt
        print(f"Transaction request: {wallet_address} -> {to_address}, amount: {amount}")
        
        # In production, you might want to:
        # 1. Verify the user owns the wallet
        # 2. Check balance before attempting
        # 3. Log the transaction to your database
        # 4. Implement rate limiting
        
        return {
            "success": True,
            "message": "Transaction should be sent via Privy SDK on frontend",
            "details": {
                "from": wallet_address,
                "to": to_address,
                "amount": amount,
                "token": token_address or "native"
            }
        }
        
    except Exception as e:
        print(f"Transaction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# Optional: Price fetching endpoint
@app.get("/api/wallet/token-prices")
async def get_token_prices(symbols: str):
    """
    Fetch USD prices for tokens.
    symbols: comma-separated list like "CELO,cUSD,USDT"
    
    In production, integrate with CoinGecko, CoinMarketCap, or similar API
    """
    try:
        symbol_list = symbols.split(",")
        
        # TODO: Integrate with real price API
        # Example: CoinGecko API
        # https://api.coingecko.com/api/v3/simple/price?ids=celo,usd-coin&vs_currencies=usd
        
        prices = {}
        for symbol in symbol_list:
            prices[symbol] = "1.00"  # Mock price
        
        return {
            "success": True,
            "prices": prices,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
from web3.middleware import ExtraDataToPOAMiddleware

async def get_web3_instance(chain_id: int) -> Web3:
    """
    Get Web3 instance for the specified chain.
    """
    rpc_urls = {
        1: "https://eth.llamarpc.com",
        42220: "https://forno.celo.org",  # Celo
        11142220: "https://forno.celo-sepolia.celo-testnet.org",  # Celo Sepolia
        1135: "https://rpc.api.lisk.com",  # Lisk
        42161: "https://arb1.arbitrum.io/rpc",  # Arbitrum
        8453: "https://mainnet.base.org",  # Base
        56: "https://bsc-dataseed1.binance.org", # BNB
    }
    
    rpc_url = rpc_urls.get(chain_id)
    if not rpc_url:
        raise HTTPException(status_code=400, detail=f"No RPC URL configured for chain {chain_id}")
        
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    
    # Required for L2s/Sidechains like Celo, Base, Arbitrum, BSC, Lisk
    if chain_id in [42220, 1135, 42161, 8453, 56]:
        w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        
    if not w3.is_connected():
        raise HTTPException(status_code=500, detail=f"Failed to connect to node for chain {chain_id}")
        
    return w3
    

   
@app.post("/add-faucet-tasks")
async def add_faucet_tasks_endpoint(request: AddTasksRequest):
    """Add tasks to a faucet (Appending to existing tasks)."""
    try:
        print(f"📝 Adding {len(request.tasks)} tasks to faucet: {request.faucetAddress}")
        
        # 1. Validate Addresses
        if not Web3.is_address(request.faucetAddress) or not Web3.is_address(request.userAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
        
        # Validate chain ID
        if request.chainId not in VALID_CHAIN_IDS:
            raise HTTPException(status_code=400, detail=f"Invalid chainId: {request.chainId}")
        
        faucet_address = smart_checksum(request.faucetAddress)
        user_address = smart_checksum(request.userAddress)
        
        # 2. Get Web3 instance and Authorize User
        w3 = await get_web3_instance(request.chainId)
        
        is_authorized = await check_user_is_authorized_for_faucet(w3, faucet_address, user_address)
        if not is_authorized:
            raise HTTPException(
                status_code=403, 
                detail="Access denied. User must be owner, admin, or backend address."
            )
        # 3. Fetch Existing Tasks
        existing_tasks = []
        try:
            # We reuse your existing helper function
            existing_data = await get_faucet_tasks(faucet_address)
            if existing_data and "tasks" in existing_data:
                existing_tasks = existing_data["tasks"]
                print(f"found {len(existing_tasks)} existing tasks.")
        except Exception as e:
            print(f"No existing tasks found or DB error (continuing with empty list): {e}")
            existing_tasks = []
        # 4. Convert new tasks to dictionary format
        new_tasks_dict = [task.dict() for task in request.tasks]
        # 5. Append Logic (Merge lists)
        # Note: You might want to filter duplicates here based on URL if necessary.
        # For now, this simply adds the new ones to the end.
        combined_tasks = existing_tasks + new_tasks_dict
        # 6. Store the Combined List
        result = await store_faucet_tasks(faucet_address, combined_tasks, user_address)
        
        print(f"✅ Successfully stored {len(combined_tasks)} total tasks for faucet {faucet_address}")
        
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "tasksAdded": len(new_tasks_dict),
            "totalTasks": len(combined_tasks),
            "userAddress": user_address,
            "chainId": request.chainId,
            "data": result,
            "message": f"Successfully added tasks. Total tasks: {len(combined_tasks)}"
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"💥 Error in add_faucet_tasks: {str(e)}")
        # Log stack trace for easier debugging
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to add tasks: {str(e)}")
# --- USER PROFILE ENDPOINTS ---
@app.post("/api/quests/draft", tags=["Quest Management"])
async def save_quest_draft(draft: QuestDraft):
    try:
        if not Web3.is_address(draft.creatorAddress):
            raise HTTPException(status_code=400, detail="Invalid creator address")
        await _require_email(draft.creatorAddress)
        faucet_address_val = draft.faucetAddress
        creator_address_cs = smart_checksum(draft.creatorAddress)
        # Resolve token symbol from whichever field arrived
        resolved_symbol = draft.get_token_symbol()
        # Debug log so you can confirm the value in Render logs
        print(f"📝 token_symbol resolved  : {resolved_symbol}")
        print(f"   draft.token_symbol     : {draft.token_symbol}")
        print(f"   draft.tokenSymbol      : {draft.tokenSymbol}")
        # Generate slug
        base_slug = generate_slug(draft.title)
        quest_slug = f"{base_slug}-{str(uuid.uuid4())[:4]}"
        draft_data_db = {
            "faucet_address":    faucet_address_val,
            "creator_address":   creator_address_cs,
            "title":             draft.title,   
            "slug":              quest_slug,
            "description":       draft.description,
            "image_url":         draft.imageUrl,
            "reward_pool":       draft.rewardPool,
            "reward_token_type": draft.rewardTokenType,
            "token_address":     draft.tokenAddress,
            "token_symbol":      resolved_symbol,       # ← always populated now
            "distribution_config": draft.distributionConfig,
            "start_date":        draft.startDate,
            "end_date":          draft.endDate,
            
            "is_draft":          True,
            "updated_at":        datetime.now().isoformat()
        }
        print(f"📦 Saving draft to DB: {draft_data_db}")
        response = supabase.table("quests").upsert(
            draft_data_db, on_conflict="faucet_address"
        ).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to save draft to database")
        # Save tasks if present
        if draft.tasks:
            tasks_db = {
                "faucet_address": faucet_address_val,
                "created_by":     creator_address_cs,
                "tasks": [
                    t.dict() if hasattr(t, "dict") else t
                    for t in draft.tasks
                ],
                "updated_at": datetime.now().isoformat()
            }
            supabase.table("faucet_tasks").upsert(
                tasks_db, on_conflict="faucet_address"
            ).execute()
        print(f"✅ Draft saved successfully. slug={quest_slug}, token_symbol={resolved_symbol}")
        return {
            "success":      True,
            "faucetAddress": faucet_address_val,
            "slug":          quest_slug,
            "message":       "Draft saved successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error saving draft: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to save draft: {str(e)}")
@app.delete("/api/quests/draft/{draftId}", tags=["Quest Management"])
async def delete_quest_draft(draftId: str):
    """
    Deletes a quest draft and its associated tasks from the database.
    """
    try:
        print(f"🗑️ Deleting draft: {draftId}")
        
        # 1. Delete from Quests table
        # We assume the draftId IS the faucet_address in the DB for drafts
        response_q = supabase.table("quests").delete().eq("faucet_address", draftId).execute()
        
        # 2. Delete from Faucet Tasks table (clean up associated tasks)
        response_t = supabase.table("faucet_tasks").delete().eq("faucet_address", draftId).execute()
        
        # Check if anything was actually deleted (Optional, but good for debugging)
        # Note: supabase delete returns the deleted rows in .data
        if not response_q.data and not response_t.data:
             print("⚠️ Draft not found or already deleted.")
             # We still return success so the frontend updates the UI
        
        return {"success": True, "message": "Draft deleted successfully"}
        
    except Exception as e:
        print(f"❌ Error deleting draft: {str(e)}")
        # Log stack trace for deeper debugging if needed
        # traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/quests/{faucet_address}/admins", tags=["Quest Management"])
async def get_quest_admins(faucet_address: str):
    try:
        faucet_cs = smart_checksum(faucet_address)
        res = supabase.table("quest_admins").select("*").eq("quest_address", faucet_cs).execute()
        return {"success": True, "admins": res.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/quests/{faucet_address}/admins", tags=["Quest Management"])
async def add_quest_admin(faucet_address: str, payload: AddQuestAdminRequest):
    try:
        faucet_cs    = smart_checksum(faucet_address)
        creator_cs   = smart_checksum(payload.creator_address)
        new_admin_cs = smart_checksum(payload.admin_address)

        # 1. Verify caller is creator
        quest_res = supabase.table("quests").select("creator_address").eq("faucet_address", faucet_cs).execute()
        if not quest_res.data:
            raise HTTPException(status_code=404, detail="Quest not found")
        if quest_res.data[0]["creator_address"].lower() != creator_cs.lower() and creator_cs.lower() != PLATFORM_OWNER.lower():
            raise HTTPException(status_code=403, detail="Only the quest creator can add admins")

        # 2. Cannot add yourself (creator)
        if new_admin_cs.lower() == creator_cs.lower():
            raise HTTPException(status_code=400, detail="Creator is already the quest owner")

        # 3. Check if the address is already a participant
        participant_res = supabase.table("quest_participants") \
            .select("wallet_address") \
            .eq("quest_address", faucet_cs) \
            .eq("wallet_address", new_admin_cs) \
            .execute()
        if participant_res.data:
            raise HTTPException(status_code=400, detail="This address is already a participant and cannot be added as admin")

        # 4. Check if already an admin
        existing = supabase.table("quest_admins") \
            .select("id") \
            .eq("quest_address", faucet_cs) \
            .eq("admin_address", new_admin_cs) \
            .execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Address is already an admin for this quest")

        # 5. Fetch profile for display name
        profile_res = supabase.table("user_profiles").select("username, avatar_url") \
            .eq("wallet_address", new_admin_cs.lower()).execute()
        username = profile_res.data[0].get("username") if profile_res.data else None
        avatar   = profile_res.data[0].get("avatar_url") if profile_res.data else None

        # 6. Insert
        insert_data = {
            "quest_address":  faucet_cs,
            "admin_address":  new_admin_cs,
            "added_by":       creator_cs,
            "username":       username,
            "avatar_url":     avatar,
            "created_at":     datetime.now(timezone.utc).isoformat(),
        }
        supabase.table("quest_admins").insert(insert_data).execute()

        return {"success": True, "message": f"Admin added successfully", "admin": insert_data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/quests/{faucet_address}/admins/{admin_address}", tags=["Quest Management"])
async def remove_quest_admin(faucet_address: str, admin_address: str, creator_address: str):
    try:
        faucet_cs  = smart_checksum(faucet_address)
        creator_cs = smart_checksum(creator_address)
        admin_cs   = smart_checksum(admin_address)

        quest_res = supabase.table("quests").select("creator_address").eq("faucet_address", faucet_cs).execute()
        if not quest_res.data:
            raise HTTPException(status_code=404, detail="Quest not found")
        if quest_res.data[0]["creator_address"].lower() != creator_cs.lower() and creator_cs.lower() != PLATFORM_OWNER.lower():
            raise HTTPException(status_code=403, detail="Only the quest creator can remove admins")

        supabase.table("quest_admins") \
            .delete() \
            .eq("quest_address", faucet_cs) \
            .eq("admin_address", admin_cs) \
            .execute()

        return {"success": True, "message": "Admin removed"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# --- FINALIZE QUEST (Phase 2) ---
@app.post("/api/quests/finalize", tags=["Quest Management"])
async def finalize_quest(finalize: QuestFinalize,background_tasks: BackgroundTasks):
    try:
        print(f"🚀 Finalizing Quest. Real Address: {finalize.faucetAddress}")
        is_demo = finalize.faucetAddress.startswith("draft-") or finalize.faucetAddress.startswith("demo-")
        if not is_demo and not Web3.is_address(finalize.faucetAddress):
            raise HTTPException(status_code=400, detail="Invalid faucet address")
        real_address_cs = finalize.faucetAddress if is_demo else smart_checksum(finalize.faucetAddress)
        
        # 1. FETCH DATA FROM DRAFT
        draft_data = {}
        existing_slug = None
        
        if finalize.draftId:
            draft_res = supabase.table("quests").select("*").eq("faucet_address", finalize.draftId).execute()
            if draft_res.data:
                draft_data = draft_res.data[0]
                existing_slug = draft_data.get("slug")

        # 2. DETERMINE FINAL CREATOR
        final_creator = finalize.creatorAddress or draft_data.get("creator_address")
        if not final_creator:
            raise HTTPException(status_code=400, detail="Creator address is missing.")
        if Web3.is_address(final_creator):
            final_creator = smart_checksum(final_creator)
        await _require_email(final_creator)
        # Helper: Safe Dict Converter
        def to_dict(obj):
            if hasattr(obj, 'model_dump'): return obj.model_dump()
            if hasattr(obj, 'dict'): return obj.dict()
            return obj 

        # 3. PREPARE DATA
        stage_reqs = to_dict(finalize.stagePassRequirements)
        clean_tasks = [to_dict(t) for t in finalize.tasks]

        # 4. DELETE DRAFT BEFORE UPSERT
        if finalize.draftId and finalize.draftId != real_address_cs and not is_demo:
            supabase.table("quests").delete().eq("faucet_address", finalize.draftId).execute()
            supabase.table("faucet_tasks").delete().eq("faucet_address", finalize.draftId).execute()

        # ==========================================
        # 🛡️ BULLETPROOF TOKEN SYMBOL RESOLUTION 🛡️
        # ==========================================
        final_token_address = finalize.tokenAddress or draft_data.get("token_address")
        final_token_symbol = finalize.tokenSymbol or draft_data.get("token_symbol")
        
        # If it's a Native token (ZeroAddress)
        if not final_token_address or final_token_address == "0x0000000000000000000000000000000000000000":
            chain_info = get_chain_info(finalize.chainId)
            final_token_symbol = chain_info.get("native_token", "ETH")
            
        # If it's an ERC20 but the frontend dropped the symbol, fetch it from the blockchain!
        elif not final_token_symbol or final_token_symbol == "":
            try:
                w3 = await get_web3_instance(finalize.chainId)
                token_contract = w3.eth.contract(
                    address=smart_checksum(final_token_address), 
                    abi=ERC20_BALANCE_ABI
                )
                final_token_symbol = token_contract.functions.symbol().call()
                print(f"🔗 Auto-fetched missing symbol from chain: {final_token_symbol}")
            except Exception as e:
                print(f"⚠️ Could not fetch token symbol from chain: {e}")
                final_token_symbol = "Tokens" # Ultimate fallback

        # 5. UPSERT QUESTS TABLE
        final_quest_data = {
            "faucet_address": real_address_cs,
            "creator_address": final_creator,
            "title": finalize.title or draft_data.get("title"),
            "slug": existing_slug or generate_slug(finalize.title or "quest"),
            "description": finalize.description or draft_data.get("description"),
            "image_url": finalize.imageUrl or draft_data.get("image_url"),
            
            "reward_pool": finalize.rewardPool or draft_data.get("reward_pool"),
            "reward_token_type": finalize.rewardTokenType or draft_data.get("reward_token_type"),
            "token_address": final_token_address,
            "token_symbol": final_token_symbol, # <--- FIXED AND SECURED
            "distribution_config": finalize.distributionConfig or draft_data.get("distribution_config"),
            "chain_id": finalize.chainId,
            "rewards_distributed": False,
            "start_date": finalize.startDate,
            "end_date": finalize.endDate,
            "claim_window_hours": finalize.claimWindowHours,
            "stage_pass_requirements": stage_reqs,
            "enforce_stage_rules": finalize.enforceStageRules,
            "is_draft": False,
            "is_active": True,
            "updated_at": datetime.now().isoformat()
        }
        
        supabase.table("quests").upsert(final_quest_data, on_conflict="faucet_address").execute()

        # 6. UPSERT FAUCET_TASKS TABLE
        tasks_data = {
            "faucet_address": real_address_cs,
            "created_by": final_creator,
            "tasks": clean_tasks,
            "updated_at": datetime.now().isoformat()
        }
        supabase.table("faucet_tasks").upsert(tasks_data, on_conflict="faucet_address").execute()
        background_tasks.add_task(send_new_quest_email, final_quest_data["title"], final_quest_data["description"], final_quest_data["image_url"])
        return {
            "success": True, 
            "message": "Quest finalized and live!", 
            "slug": final_quest_data["slug"]
        }
        
    except Exception as e:
        print(f"❌ Error finalizing quest: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/quests/{faucet_address}/participant/{wallet_address}", tags=["Quest Actions"])
async def get_quest_participant(faucet_address: str, wallet_address: str):
    try:
        if faucet_address.startswith("draft-") or faucet_address.startswith("demo-"):
            return {"success": False, "message": "Demo quest — no participants", "participant": None}
        if not Web3.is_address(faucet_address) or not Web3.is_address(wallet_address):
            raise HTTPException(status_code=400, detail="Invalid address format")
        faucet_checksum = smart_checksum(faucet_address)
        wallet_checksum = smart_checksum(wallet_address)
        # Fetch participant data
        res = supabase.table("quest_participants")\
            .select("*")\
            .eq("quest_address", faucet_checksum)\
            .eq("wallet_address", wallet_checksum)\
            .execute()
        if res.data and len(res.data) > 0:
            return {"success": True, "participant": res.data[0]}
        else:
            return {"success": False, "message": "User has not joined this quest", "participant": None}
            
    except Exception as e:
        print(f"Error fetching participant: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- OPTIONAL: List drafts for user ---
@app.get("/api/quests/drafts/{creator_address}", tags=["Quest Management"])
async def get_user_drafts(creator_address: str):
    try:
        if not Web3.is_address(creator_address):
            raise HTTPException(status_code=400, detail="Invalid address")
        creator_cs = smart_checksum(creator_address)
        response = supabase.table("quests").select("*").eq(
            "creator_address", creator_cs
        ).eq("is_draft", True).execute()
        return {"success": True, "drafts": response.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
def generate_unique_referral_id():
    """Generates a short, URL-friendly unique ID."""
    return shortuuid.ShortUUID().random(length=8)   
# This is the endpoint the WalletConnectButton calls
@app.get("/api/profile/{wallet_address}")
async def get_user_profile_data(wallet_address: str):
    """Fetches profile by EITHER EVM or Solana address"""
    try:
        # Solana is case-sensitive (Base58), EVM is lowercase
        search_val = wallet_address if is_solana_address(wallet_address) else wallet_address.lower()
        
        response = supabase.table("user_profiles")\
            .select("*")\
            .or_(f"wallet_address.eq.{search_val},solana_address.eq.{search_val}")\
            .execute()
        
        if response.data and len(response.data) > 0:
            return {"success": True, "profile": response.data[0]}
        else:
            return {"success": True, "profile": None, "message": "New User"}
            
    except Exception as e:
        print(f"Error in wallet profile fetch: {e}")
        raise HTTPException(status_code=500, detail="Database error")

    
  
@app.post("/api/quests/{faucet_address}/join", tags=["Quest Actions"])
async def join_quest(faucet_address: str, payload: JoinQuestRequest, background_tasks: BackgroundTasks):
    try:
        faucet_address_cs = smart_checksum(faucet_address)
        user_address_cs = smart_checksum(payload.walletAddress)
        
        # 1. Fetch Quest Creator & Chain ID
        quest_res = supabase.table("quests").select("creator_address, chain_id").eq("faucet_address", faucet_address_cs).execute()
        creator_address = quest_res.data[0].get("creator_address", "").lower() if quest_res.data else ""
        chain_id = quest_res.data[0].get("chain_id", 42220) if quest_res.data else 42220
        
        # 2. Check if user already joined
        existing_user = supabase.table("quest_participants").select("*").eq("quest_address", faucet_address_cs).eq("wallet_address", user_address_cs).execute()
        if existing_user.data:
            return {"success": True, "message": "User already joined", "participant": existing_user.data[0]}
            
        # 3. Handle Referral Logic (EXCLUDE ADMIN)
        if payload.referralCode:
            referrer_res = supabase.table("quest_participants").select("wallet_address, points, referral_count").eq("quest_address", faucet_address_cs).eq("referral_id", payload.referralCode).execute()
            
            if referrer_res.data:
                referrer = referrer_res.data[0]
                if referrer.get('wallet_address', '').lower() != creator_address:
                    # Check if referral task has a required task the referee must complete first
                    tasks_res = supabase.table("faucet_tasks").select("tasks").eq("faucet_address", faucet_address_cs).execute()
                    tasks_list = tasks_res.data[0].get("tasks", []) if tasks_res.data else []
                    sys_referral_task = next((t for t in tasks_list if t.get("id") == "sys_referral"), None)
                    required_referee_task_id = sys_referral_task.get("requiredRefereeTaskId") if sys_referral_task else None

                    if not required_referee_task_id or required_referee_task_id == "none":
                        # No requirement — award points immediately on join
                        new_points = (referrer.get('points') or 0) + int(sys_referral_task.get("points", 200) if sys_referral_task else 200)
                        new_count = (referrer.get('referral_count') or 0) + 1
                        supabase.table("quest_participants").update({"points": new_points, "referral_count": new_count}).eq("quest_address", faucet_address_cs).eq("referral_id", payload.referralCode).execute()
                    else:
                        # Store the pending referral — points awarded when referee completes the required task
                        supabase.table("quest_participants").update({
                            "referral_count": (referrer.get('referral_count') or 0) + 1
                        }).eq("quest_address", faucet_address_cs).eq("referral_id", payload.referralCode).execute()
                        
                        # Record the pending referral so we can award it later
                        supabase.table("pending_referrals").upsert({
                            "quest_address": faucet_address_cs,
                            "referee_wallet": user_address_cs,
                            "referrer_wallet": referrer["wallet_address"],
                            "required_task_id": required_referee_task_id,
                            "referral_points": int(sys_referral_task.get("points", 200) if sys_referral_task else 200),
                            "created_at": datetime.now(timezone.utc).isoformat()
                        }, on_conflict="quest_address,referee_wallet").execute()
                        
        
        # 4. Create record
        new_ref_id = generate_unique_referral_id()
        now_iso = datetime.now(timezone.utc).isoformat()
        new_participant = {
            "quest_address": faucet_address_cs,
            "wallet_address": user_address_cs,
            "referral_id": new_ref_id,
            "points": 0,
            "referral_count": 0,
            "joined_at": now_iso,
            "updated_at": now_iso # <--- ADD THIS
        }
        supabase.table("quest_participants").insert(new_participant).execute()
        
        # 🚀 5. TRIGGER ON-CHAIN JOIN (Background)
        background_tasks.add_task(_trigger_quest_action_onchain, faucet_address_cs, user_address_cs, "joinQuest", chain_id)
        
        return {"success": True, "message": "Successfully joined quest", "participant": new_participant}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    
@app.post("/api/quests/{faucet_address}/checkin", tags=["Quest Actions"])
async def daily_checkin(faucet_address: str, payload: CheckInRequest, background_tasks: BackgroundTasks):
    try:
        if not Web3.is_address(faucet_address) or not Web3.is_address(payload.walletAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
            
        faucet_address_cs = smart_checksum(faucet_address)
        user_address_cs = smart_checksum(payload.walletAddress)
        
        # 1. SECURITY: Ensure Admin/Creator is not checking in AND get chain_id
        quest_check = supabase.table("quests").select("creator_address, chain_id").eq("faucet_address", faucet_address_cs).execute()
        if quest_check.data and quest_check.data[0]['creator_address'].lower() == user_address_cs.lower():
            raise HTTPException(status_code=403, detail="Admins cannot earn points or check in.")
            
        chain_id = quest_check.data[0].get("chain_id", 42220) if quest_check.data else 42220
        
        # 2. Fetch User Data
        user_res = supabase.table("quest_participants").select("*").eq("quest_address", faucet_address_cs).eq("wallet_address", user_address_cs).execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="User not registered in this quest.")
            
        user = user_res.data[0]
        last_checkin = user.get("last_checkin_at")
        
        # 3. Verify Cooldown (24 Hours)
        now = datetime.now(timezone.utc)
        if last_checkin:
            last_checkin_dt = dateutil.parser.isoparse(last_checkin)
            last_checkin_dt = last_checkin_dt.replace(tzinfo=timezone.utc) if last_checkin_dt.tzinfo is None else last_checkin_dt.astimezone(timezone.utc)
            
            next_available = last_checkin_dt + timedelta(hours=24)
            if now < next_available:
                remaining = next_available - now
                hours, remainder = divmod(remaining.seconds, 3600)
                minutes, _ = divmod(remainder, 60)
                return {"success": False, "message": f"Cooldown active. Try again in {hours}h {minutes}m."}
                
        # 4. Award Points
        new_points = (user.get("points") or 0) + 50
        supabase.table("quest_participants").update({
            "points": new_points,
            "last_checkin_at": now.isoformat(),
            "updated_at": now.isoformat() # <--- ADD THIS
        }).eq("quest_address", faucet_address_cs).eq("wallet_address", user_address_cs).execute()
        
        # 5. Log Submission
        supabase.table("submissions").upsert({
            "faucet_address": faucet_address_cs,
            "wallet_address": user_address_cs,
            "task_id": "sys_daily",
            "task_title": "Daily Check-in",
            "status": "approved",
            "submitted_data": "Daily Check-in"
        }).execute()

        background_tasks.add_task(_trigger_quest_action_onchain, faucet_address_cs, user_address_cs, "checkIn", chain_id)
        
        return {"success": True, "message": "Daily check-in successful! +10 Points", "newPoints": new_points}
    except HTTPException: raise
    except Exception as e:
        print(f"❌ Error during check-in: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
     
# API Endpoints for Claims and Tasks
@app.post("/admin-popup-preference")
async def save_admin_popup_preference_endpoint(request: AdminPopupPreferenceRequest):
    """Save the admin popup preference for a user-faucet combination."""
    try:
        print(f"Saving admin popup preference: user={request.userAddress}, faucet={request.faucetAddress}, dontShow={request.dontShowAgain}")
       
        result = await save_admin_popup_preference(
            request.userAddress,
            request.faucetAddress,
            request.dontShowAgain
        )
       
        return {
            "success": True,
            "message": "Admin popup preference saved successfully",
            "data": result
        }
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in save_admin_popup_preference_endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save preference: {str(e)}")
@app.get("/admin-popup-preference")
async def get_admin_popup_preference_endpoint(userAddress: str, faucetAddress: str):
    """Get the admin popup preference for a user-faucet combination."""
    try:
        print(f"Getting admin popup preference: user={userAddress}, faucet={faucetAddress}")
       
        dont_show_again = await get_admin_popup_preference(userAddress, faucetAddress)
       
        return {
            "success": True,
            "userAddress": userAddress,
            "faucetAddress": faucetAddress,
            "dontShowAgain": dont_show_again
        }
       
    except Exception as e:
        print(f"Error in get_admin_popup_preference_endpoint: {str(e)}")
        # Return False on error so popup still shows
        return {
            "success": False,
            "userAddress": userAddress,
            "faucetAddress": faucetAddress,
            "dontShowAgain": False,
            "error": str(e)
        }
@app.get("/admin-popup-preferences/{userAddress}")
async def get_user_admin_popup_preferences_endpoint(userAddress: str):
    """Get all admin popup preferences for a specific user."""
    try:
        print(f"Getting all admin popup preferences for user: {userAddress}")
       
        preferences = await get_user_all_popup_preferences(userAddress)
       
        return {
            "success": True,
            "userAddress": userAddress,
            "preferences": preferences,
            "count": len(preferences)
        }
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in get_user_admin_popup_preferences_endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get preferences: {str(e)}")
# Set claim parameters endpoint for ALL faucet types
@app.post("/set-claim-parameters")
async def set_claim_parameters_endpoint(request: SetClaimParametersRequest):
    try:
        if not Web3.is_address(request.faucetAddress):
            raise HTTPException(status_code=400, detail=f"Invalid faucetAddress: {request.faucetAddress}")
       
        if request.chainId not in VALID_CHAIN_IDS:
            raise HTTPException(status_code=400, detail=f"Invalid chainId: {request.chainId}")
       
        faucet_address = smart_checksum(request.faucetAddress)
       
        tasks_dict = None
        if request.tasks:
            tasks_dict = [task.dict() for task in request.tasks]
       
        secret_code = await set_claim_parameters(
            faucet_address, request.startTime, request.endTime, tasks_dict
        )

        # ✅ ADD THIS: Sync start_time, end_time, claim_amount back to faucet_details
        update_payload = {
            "start_time": request.startTime,
            "end_time": request.endTime,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if request.claimAmount and request.claimAmount > 0:
            update_payload["claim_amount"] = str(request.claimAmount)

        supabase.table("faucet_details").update(update_payload)\
            .eq("faucet_address", faucet_address.lower())\
            .execute()

        # Also sync is_claim_active based on current time vs window
        now_ts = int(time.time())
        is_active = request.startTime <= now_ts <= request.endTime
        supabase.table("faucet_details").update({"is_claim_active": is_active})\
            .eq("faucet_address", faucet_address.lower())\
            .execute()
       
        return {
            "success": True,
            "secretCode": secret_code,
            "tasksStored": len(tasks_dict) if tasks_dict else 0,
            "faucetAddress": faucet_address,
            "message": f"Parameters updated successfully"
        }
       
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/get-secret-code-for-admin")
async def get_secret_code_for_admin_endpoint(request: GetSecretCodeForAdminRequest):
    """Get secret code for authorized users (owner, admin, backend)."""
    try:
        print(f"Admin secret code request: user={request.userAddress}, faucet={request.faucetAddress}")
       
        # Validate addresses
        if not Web3.is_address(request.faucetAddress) or not Web3.is_address(request.userAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
       
        # Validate chain ID
        if request.chainId not in VALID_CHAIN_IDS:
            raise HTTPException(status_code=400, detail=f"Invalid chainId: {request.chainId}")
       
        faucet_address = smart_checksum(request.faucetAddress)
        user_address = smart_checksum(request.userAddress)
       
        # Get Web3 instance
        w3 = await get_web3_instance(request.chainId)
       
        # Check if user is authorized
        is_authorized = await check_user_is_authorized_for_faucet(w3, faucet_address, user_address)
        if not is_authorized:
            raise HTTPException(
                status_code=403,
                detail="Access denied. User must be owner, admin, or backend address."
            )
       
        # Get secret code data
        code_data = await get_secret_code_from_db(faucet_address)
       
        if not code_data:
            raise HTTPException(
                status_code=404,
                detail=f"No secret code found for faucet: {faucet_address}"
            )
       
        print(f"✅ Authorized admin access: {user_address} accessing secret code for {faucet_address}")
       
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "userAddress": user_address,
            "secretCode": code_data["secret_code"],
            "startTime": code_data["start_time"],
            "endTime": code_data["end_time"],
            "isValid": code_data["is_valid"],
            "isExpired": code_data["is_expired"],
            "isFuture": code_data["is_future"],
            "timeRemaining": code_data["time_remaining"],
            "createdAt": code_data["created_at"]
        }
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in get_secret_code_for_admin: {str(e)}")
@app.get("/faucet-tasks/{faucetAddress}")
async def get_faucet_tasks_endpoint(faucetAddress: str):
    """Get tasks for ANY faucet type."""
    try:
        print(f"🔍 Getting tasks for faucet: {faucetAddress}")
       
        if not Web3.is_address(faucetAddress):
            raise HTTPException(status_code=400, detail="Invalid faucet address format")
       
        faucet_address = smart_checksum(faucetAddress)
       
        tasks_data = await get_faucet_tasks(faucet_address)
       
        if not tasks_data:
            return {
                "success": True,
                "faucetAddress": faucet_address,
                "tasks": [],
                "count": 0,
                "message": "No tasks found for this faucet"
            }
       
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "tasks": tasks_data["tasks"],
            "count": len(tasks_data["tasks"]),
            "createdBy": tasks_data.get("created_by"),
            "createdAt": tasks_data.get("created_at"),
            "updatedAt": tasks_data.get("updated_at"),
            "message": f"Found {len(tasks_data['tasks'])} social media tasks"
        }
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"💥 Error in get_faucet_tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get tasks: {str(e)}")
@app.delete("/faucet-tasks/{faucetAddress}")
async def delete_faucet_tasks_endpoint(faucetAddress: str, userAddress: str, chainId: int):
    """Delete all tasks for a faucet (authorized users only)."""
    try:
        print(f"🗑️ Deleting tasks for faucet: {faucetAddress} by user: {userAddress}")
       
        # Validate addresses
        if not Web3.is_address(faucetAddress) or not Web3.is_address(userAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
       
        # Validate chain ID
        if chainId not in VALID_CHAIN_IDS:
            raise HTTPException(status_code=400, detail=f"Invalid chainId: {chainId}")
       
        faucet_address = smart_checksum(faucetAddress)
        user_address = smart_checksum(userAddress)
       
        # Get Web3 instance
        w3 = await get_web3_instance(chainId)
       
        # Check if user is authorized
        is_authorized = await check_user_is_authorized_for_faucet(w3, faucet_address, user_address)
        if not is_authorized:
            raise HTTPException(
                status_code=403,
                detail="Access denied. User must be owner, admin, or backend address."
            )
       
        # Delete tasks from database
        try:
            response = supabase.table("faucet_tasks").delete().eq("faucet_address", faucet_address).execute()
           
            if response.data:
                deleted_count = len(response.data)
                print(f"✅ Deleted {deleted_count} task records for faucet {faucet_address}")
            else:
                deleted_count = 0
                print(f"📝 No tasks found to delete for faucet {faucet_address}")
           
            return {
                "success": True,
                "faucetAddress": faucet_address,
                "userAddress": user_address,
                "deletedCount": deleted_count,
                "message": f"Successfully deleted {deleted_count} tasks"
            }
           
        except Exception as db_error:
            print(f"💥 Database error deleting tasks: {str(db_error)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(db_error)}")
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"💥 Error in delete_faucet_tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete tasks: {str(e)}")
@app.post("/claim")
async def claim(request: ClaimRequest):
    try:
        print(f"Received claim request: {request.model_dump() if hasattr(request, 'model_dump') else request.dict()}")
        
        # 1. 🔀 UNIVERSAL ADDRESS VALIDATION
        try:
            # Use the smart checksum/normalizer
            user_address = smart_checksum(request.userAddress)
            faucet_address = smart_checksum(request.faucetAddress)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid address: {str(e)}")
        
        if request.chainId not in VALID_CHAIN_IDS and request.chainId != SOLANA_CHAIN_ID:
            raise HTTPException(status_code=400, detail=f"Invalid chainId: {request.chainId}")

        # 2. 🔐 VERIFY SECRET CODE (Works for BOTH EVM and Solana)
        try:
            is_valid_code = await verify_secret_code(faucet_address, request.secretCode)
            if not is_valid_code:
                raise HTTPException(status_code=400, detail=f"Invalid or expired secret code.")
            print(f"✅ Secret code validated: {request.secretCode}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Secret code validation error: {str(e)}")

        # ==========================================
        # 🪐 SOLANA EXECUTION
        # ==========================================
        if is_solana_chain(request.chainId):
            faucet_meta = supabase.table("userfaucets").select("name, owner_address").eq(
            "faucet_address", normalize_db_address(faucet_address)
            ).execute()
        
            if not faucet_meta.data:
                raise HTTPException(status_code=404, detail="Faucet metadata not found.")
        
            f_name  = faucet_meta.data[0]["name"]
            f_owner = faucet_meta.data[0]["owner_address"]
        
            tx_hash_str = await claim_tokens_solana(f_name, f_owner, user_address, amount=0)
            
        # ==========================================
        # 🌐 EVM EXECUTION
        # ==========================================
        else:
            print(f"🌐 Executing EVM Claim for {user_address}...")
            w3 = await get_web3_instance(request.chainId)
            
            is_paused = await check_pause_status(w3, faucet_address)
            if is_paused:
                raise HTTPException(status_code=400, detail="Faucet is paused")
                
            balance_ok, balance_error = check_sufficient_balance(w3, signer.address)
            if not balance_ok:
                raise HTTPException(status_code=400, detail=balance_error)
                
            tx_hash_str = await claim_tokens(w3, faucet_address, user_address, request.secretCode, request.divviReferralData)

        print(f"✅ Claim successful! tx: {tx_hash_str}")
        return {"success": True, "txHash": tx_hash_str}

    except HTTPException as e:
        raise e
    except Exception as e:
        user_message = decode_contract_error(e)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=user_message)
    
    
@app.post("/claim-no-code")
async def claim_no_code(request: ClaimNoCodeRequest):
    """Endpoint to claim tokens without requiring a secret code."""
    try:
        print(f"Received claim-no-code request: {request.model_dump() if hasattr(request, 'model_dump') else request.dict()}")
       
        # 1. 🔀 UNIVERSAL ADDRESS VALIDATION
        try:
            user_address = smart_checksum(request.userAddress)
            faucet_address = smart_checksum(request.faucetAddress)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid address: {str(e)}")
       
        # Validate chain ID
        if request.chainId not in VALID_CHAIN_IDS and request.chainId != SOLANA_CHAIN_ID:
            raise HTTPException(status_code=400, detail=f"Invalid chainId: {request.chainId}")
       
        print(f"Addresses validated: user={user_address}, faucet={faucet_address}")

        # ==========================================
        # 🪐 SOLANA EXECUTION
        # ==========================================
        if is_solana_chain(request.chainId):
            faucet_meta = supabase.table("userfaucets").select("name, owner_address").eq(
            "faucet_address", normalize_db_address(faucet_address)
            ).execute()
        
            if not faucet_meta.data:
                raise HTTPException(status_code=404, detail="Faucet metadata not found.")
        
            f_name  = faucet_meta.data[0]["name"]
            f_owner = faucet_meta.data[0]["owner_address"]
        
            tx_hash_str = await claim_tokens_solana(f_name, f_owner, user_address, amount=0)

        # ==========================================
        # 🌐 EVM EXECUTION
        # ==========================================
        else:
            print(f"🌐 Executing EVM Claim (No Code) for {user_address}...")
            w3 = await get_web3_instance(request.chainId)
            
            faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
            
            # EVM-specific pause check
            is_paused = await check_pause_status(w3, faucet_address)
            if is_paused:
                raise HTTPException(status_code=400, detail="Faucet is paused")
                
            backend = faucet_contract.functions.BACKEND().call()
            if not Web3.is_address(backend):
                raise HTTPException(status_code=500, detail="Invalid BACKEND address in contract")
                
            # NOTE: Be sure to rename your old EVM function to `claim_tokens_no_code_evm` 
            # so it doesn't conflict with this endpoint name!
            tx_hash_str = await claim_tokens_no_code_evm(w3, faucet_address, user_address, request.divviReferralData)

        print(f"✅ Successfully claimed tokens for {user_address}, tx: {tx_hash_str}")
        return {"success": True, "txHash": tx_hash_str}

    except HTTPException as e:
        raise e
    except Exception as e:
        user_message = decode_contract_error(e)
        print(f"Server error for user {request.userAddress}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=user_message)
 
@app.post("/claim-on-quest")
async def claim_on_quest(request: ClaimNoCodeRequest):
    """
    Backend-mediated claim for Quests.
    Supports both EVM and Solana chains natively.
    """
    try:
        print(f"Received claim-on-quest request: {request.model_dump() if hasattr(request, 'model_dump') else request.dict()}")
        
        # 1. 🔀 UNIVERSAL ADDRESS VALIDATION
        try:
            user_address = smart_checksum(request.userAddress)
            faucet_address = smart_checksum(request.faucetAddress)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid address format: {str(e)}")
        
        if request.chainId not in VALID_CHAIN_IDS and request.chainId != SOLANA_CHAIN_ID:
            raise HTTPException(status_code=400, detail=f"Invalid chainId: {request.chainId}")

        # ==========================================
        # 🪐 SOLANA EXECUTION
        # ==========================================
        if is_solana_chain(request.chainId):
            quest_meta = supabase.table("quests").select("title, creator_address").eq(
                "faucet_address", normalize_db_address(faucet_address)
            ).execute()
    
            if not quest_meta.data:
                raise HTTPException(status_code=404, detail="Quest metadata not found.")
    
            q_title   = quest_meta.data[0]["title"]
            q_creator = quest_meta.data[0]["creator_address"]
     
            # Check eligibility via QuestParticipantRecord
            program_id     = Pubkey.from_string(SOLANA_PROGRAM_ID)
            creator_pubkey = Pubkey.from_string(q_creator)
            user_pubkey    = Pubkey.from_string(user_address)
     
            quest_state, _ = Pubkey.find_program_address(
                [b"quest", bytes(creator_pubkey), q_title.encode()],
                program_id,
            )
            participant_record_pda, _ = Pubkey.find_program_address(
                [b"quest_participant", bytes(quest_state), bytes(user_pubkey)],
                program_id,
            )
     
            async with AsyncClient(SOLANA_RPC_URL) as _client:
                _program = Program(idl, program_id, Provider(_client, Wallet(solana_signer)))
                try:
                    record = await _program.account["QuestParticipantRecord"].fetch(participant_record_pda)
                    if record.has_claimed:
                        raise HTTPException(status_code=400, detail="Already claimed.")
                    if int(record.reward_amount) == 0:
                        raise HTTPException(status_code=404, detail="No reward allocated.")
                except HTTPException:
                    raise
                except Exception:
                    raise HTTPException(status_code=404, detail="No reward allocated for this wallet.")
     
            tx_hash_str = await claim_tokens_solana(q_title, q_creator, user_address, amount=0)
            return {"success": True, "txHash": tx_hash_str}
        # ==========================================
        # 🌐 EVM EXECUTION
        # ==========================================
        print(f"🌐 Executing EVM Quest Claim for {user_address}...")
        w3 = await get_web3_instance(request.chainId)
        quest_contract = w3.eth.contract(address=faucet_address, abi=QUEST_ABI)
        
        try:
            status = quest_contract.functions.getClaimStatus(user_address).call()
            claimed          = status[0]
            has_reward       = status[1]
            reward_amount    = status[2]
            can_claim        = status[3]
            time_until_start = status[4]
            time_remaining   = status[5]
            
            print(f"getClaimStatus({user_address}): claimed={claimed}, canClaim={can_claim}")
        except Exception as e:
            print(f"getClaimStatus failed: {e}")
            claimed, has_reward, reward_amount, can_claim = False, False, 0, False

        # Eligibility Checks
        if claimed:
            raise HTTPException(status_code=400, detail="User has already claimed their reward.")
        if not has_reward or reward_amount == 0:
            raise HTTPException(status_code=404, detail="No reward amount set for this user.")
        if time_until_start > 0:
            raise HTTPException(status_code=400, detail=f"Claim period starts in {time_until_start}s.")
        if time_remaining == 0 and not can_claim:
            raise HTTPException(status_code=400, detail="Claim window has closed.")
        if not can_claim:
            raise HTTPException(status_code=400, detail="Cannot claim at this time.")

        is_paused = quest_contract.functions.paused().call()
        is_claim_active = quest_contract.functions.isClaimActive().call()
        
        if is_paused:
            raise HTTPException(status_code=400, detail="Contract is paused.")
        if not is_claim_active:
            raise HTTPException(status_code=400, detail="Claim is not active.")

        # Gas Check
        balance_ok, balance_err = check_sufficient_balance(w3, signer.address)
        if not balance_ok:
            raise HTTPException(status_code=500, detail=f"Backend wallet low on gas: {balance_err}")

        print("\n--- 🛠️ INITIATING EVM BLOCKCHAIN TRANSACTION 🛠️ ---")
        try:
            tx = build_transaction_with_standard_gas(w3, quest_contract.functions.claim([user_address]), signer.address)
            signed_tx = w3.eth.account.sign_transaction(tx, signer.key)
            tx_hash_bytes = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            tx_hash_str = tx_hash_bytes.hex()
            
            # Wait for confirmation
            receipt = await wait_for_transaction_receipt(w3, tx_hash_str)
            if receipt.get("status", 0) != 1:
                raise HTTPException(status_code=400, detail="Transaction reverted on-chain.")
                
        except Exception as build_error:
            print(f"   ❌ FATAL ERROR DURING TRANSACTION: {str(build_error)}")
            raise HTTPException(status_code=400, detail=f"Contract reverted: {str(build_error)}")
        
        print(f"✅ Claimed for {user_address}, tx: {tx_hash_str}")
        print("--- 🏁 TRANSACTION COMPLETE 🏁 ---\n")
        
        return {"success": True, "txHash": tx_hash_str}

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"❌ Server error for user {request.userAddress}: {str(e)}")
        import traceback
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=str(e))
     
     
@app.post("/admin/verify-task")
async def admin_verify_task(submission_id: str, action: str): # action = "approve" or "reject"
    if action == "approve":
        # 1. Update task_completions status to 'verified'
        # 2. Trigger the point addition logic to the user's total profile
        supabase.table("task_completions").update({"status": "verified"}).eq("id", submission_id).execute()
        return {"status": "success", "message": "Points awarded"}
    else:
        # Mark as rejected so the user can try again
        supabase.table("task_completions").update({"status": "rejected"}).eq("id", submission_id).execute()
        return {"status": "rejected", "message": "Proof denied"}
        
@app.post("/claim-custom")
async def claim_custom(request: ClaimCustomRequest):
    """Endpoint to claim tokens from custom faucets."""
    try:
        print(f"Received claim-custom request: {request.dict()}")
       
        # 1. 🔀 UNIVERSAL ADDRESS VALIDATION
        try:
            user_address = smart_checksum(request.userAddress)
            faucet_address = smart_checksum(request.faucetAddress)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid address: {str(e)}")
       
        if request.chainId not in VALID_CHAIN_IDS and request.chainId != SOLANA_CHAIN_ID:
            raise HTTPException(status_code=400, detail=f"Invalid chainId: {request.chainId}")

        # ==========================================
        # 🪐 SOLANA EXECUTION
        # ==========================================
        if is_solana_chain(request.chainId):
            faucet_meta = supabase.table("userfaucets").select("name, owner_address").eq(
            "faucet_address", normalize_db_address(faucet_address)
            ).execute()
        
            if not faucet_meta.data:
                raise HTTPException(status_code=404, detail="Faucet metadata not found.")
        
            f_name  = faucet_meta.data[0]["name"]
            f_owner = faucet_meta.data[0]["owner_address"]
        
            tx_hash_str = await claim_tokens_solana(f_name, f_owner, user_address, amount=0)

        # ==========================================
        # 🌐 EVM EXECUTION
        # ==========================================
        else:
            print(f"🌐 Executing EVM Custom Claim for {user_address}...")
            w3 = await get_web3_instance(request.chainId)
            
            is_paused = await check_pause_status(w3, faucet_address)
            if is_paused:
                raise HTTPException(status_code=400, detail="Faucet is paused")
                
            faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
            
            # Verify custom amount exists
            has_custom_amount = faucet_contract.functions.hasCustomClaimAmount(user_address).call()
            if not has_custom_amount:
                raise HTTPException(status_code=400, detail="No custom claim amount allocated for this address")
           
            custom_amount = faucet_contract.functions.getCustomClaimAmount(user_address).call()
            if custom_amount <= 0:
                raise HTTPException(status_code=400, detail="Custom claim amount is zero")
                
            has_claimed = faucet_contract.functions.hasClaimed(user_address).call()
            if has_claimed:
                raise HTTPException(status_code=400, detail="User has already claimed from this faucet")
                
            balance_ok, balance_error = check_sufficient_balance(w3, signer.address)
            if not balance_ok:
                raise HTTPException(status_code=400, detail=balance_error)
                
            # Calling the renamed EVM helper function!
            tx_hash_str = await claim_tokens_custom_evm(w3, faucet_address, user_address, request.divviReferralData)

        print(f"✅ Successfully claimed custom tokens for {user_address}, tx: {tx_hash_str}")
        return {"success": True, "txHash": tx_hash_str}

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"❌ Claim error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
    
# Secret Code Endpoints
@app.get("/secret-codes")
async def get_secret_codes():
    """Get all secret codes with enhanced metadata."""
    try:
        codes = await get_all_secret_codes()
        return {
            "success": True,
            "count": len(codes),
            "codes": codes,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error in get_secret_codes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get secret codes: {str(e)}")
@app.get("/secret-codes/valid")
async def get_all_valid_secret_codes():
    """Get only currently valid secret codes."""
    try:
        all_codes = await get_all_secret_codes()
        valid_codes = [code for code in all_codes if code["is_valid"]]
       
        return {
            "success": True,
            "count": len(valid_codes),
            "codes": valid_codes,
            "timestamp": datetime.now().isoformat()
        }
       
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get valid secret codes: {str(e)}")
@app.get("/secret-code/{faucet_address}")
async def get_secret_code_enhanced(faucet_address: str):
    """Enhanced endpoint to get secret code with full metadata."""
    try:
        code_data = await get_secret_code_from_db(faucet_address)
       
        if not code_data:
            raise HTTPException(status_code=404, detail=f"No secret code found for faucet: {faucet_address}")
       
        return {
            "success": True,
            "data": code_data,
            "timestamp": datetime.now().isoformat()
        }
       
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get secret code: {str(e)}")
@app.get("/get-secret-code")
async def get_secret_code(request: GetSecretCodeRequest):
    """Legacy endpoint for backward compatibility."""
    try:
        if not Web3.is_address(request.faucetAddress):
            raise HTTPException(status_code=400, detail=f"Invalid faucetAddress: {request.faucetAddress}")
       
        faucet_address = smart_checksum(request.faucetAddress)
        code_data = await get_secret_code_from_db(faucet_address)
       
        if not code_data:
            raise HTTPException(status_code=404, detail=f"No secret code found for faucet address: {faucet_address}")
       
        return {
            "faucetAddress": faucet_address,
            "secretCode": code_data["secret_code"],
            "startTime": code_data["start_time"],
            "endTime": code_data["end_time"],
            "isValid": code_data["is_valid"],
            "createdAt": code_data["created_at"]
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in get_secret_code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve secret code: {str(e)}")

@quiz_router.delete("/{code}", summary="Delete a quiz and clean up its data")
async def delete_quiz(code: str, walletAddress: str):
    """
    Deletes a quiz from the database and clears it from active memory.
    Requires the walletAddress of the creator as a query parameter.
    """
    code = code.upper()
    
    try:
        async with pool.acquire() as conn:
            # 1. Fetch the quiz to verify it exists and check ownership
            quiz_row = await conn.fetchrow(
                "SELECT id, creator_address, status, reward_is_funded FROM faucet_quizzes WHERE code = $1", 
                code
            )
            
            if not quiz_row:
                # If it's only stuck in memory, clear it anyway
                quizzes.pop(code, None)
                game_state.pop(code, None)
                raise HTTPException(status_code=404, detail="Quiz not found")
                
            # 2. Verify the caller is the creator
            if quiz_row["creator_address"].lower() != walletAddress.lower():
                raise HTTPException(status_code=403, detail="Only the creator can delete this quiz")
                
            # 3. Prevent deleting a quiz that is currently live
            if quiz_row["status"] == "active":
                raise HTTPException(status_code=400, detail="Cannot delete a quiz while it is live. Wait for it to finish.")
                
            quiz_id = quiz_row["id"]
            
            # 4. Delete from database (Using a transaction to ensure all related data is cleaned up)
            # Note: If you have ON DELETE CASCADE set up in Supabase, the first query is enough, 
            # but doing it manually guarantees no orphaned data errors.
            async with conn.transaction():
                # Delete options first, then questions
                await conn.execute("DELETE FROM faucet_quiz_question_options WHERE question_id IN (SELECT id FROM faucet_quiz_questions WHERE quiz_id = $1)", quiz_id)
                await conn.execute("DELETE FROM faucet_quiz_questions WHERE quiz_id = $1", quiz_id)
                
                # Delete reward tiers and rewards
                await conn.execute("DELETE FROM faucet_quiz_reward_tiers WHERE quiz_id = $1", quiz_id)
                await conn.execute("DELETE FROM faucet_quiz_rewards WHERE quiz_id = $1", quiz_id)
                
                # Delete participants and their answers/payouts
                await conn.execute("DELETE FROM faucet_quiz_answers WHERE quiz_id = $1", quiz_id)
                await conn.execute("DELETE FROM faucet_quiz_reward_payouts WHERE quiz_id = $1", quiz_id)
                await conn.execute("DELETE FROM faucet_quiz_participants WHERE quiz_id = $1", quiz_id)
                
                # Finally, delete the main quiz record
                await conn.execute("DELETE FROM faucet_quizzes WHERE id = $1", quiz_id)
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Error deleting quiz {code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    # 5. Clean up Python in-memory dictionaries
    quizzes.pop(code, None)
    game_state.pop(code, None)
    
    # 6. Disconnect any players waiting in the lobby
    for ws in connections.get(code, []):
        try:
            await ws.send_text(json.dumps({
                "type": "error", 
                "message": "The host has deleted this quiz."
            }))
            await ws.close(code=4004, reason="Quiz deleted by creator")
        except Exception:
            pass
            
    connections.pop(code, None)
    player_sockets.pop(code, None)
    
    print(f"🗑️ [Quiz {code}] Successfully deleted by {walletAddress}")
    return {"success": True, "message": "Quiz deleted successfully"}

@app.delete("/api/quests/{faucet_address}/submissions/{submission_id}")
async def cancel_submission(faucet_address: str, submission_id: str):
    """
    Called by the frontend when an auto-verification fails.
    Removes the stuck record so the user can retry cleanly.
    """
    try:
        faucet_checksum = smart_checksum(faucet_address)
        result = (
            supabase.table("submissions")          # ✅ correct table
            .delete()
            .eq("submission_id", submission_id)    # ✅ correct PK column
            .eq("faucet_address", faucet_checksum)
            .in_("status", ["pending", "auto_verifying"])  # ✅ catches both states
            .execute()
        )
        deleted = len(result.data) if result.data else 0
        if deleted == 0:
            # Already approved/rejected — don't error, just report
            return {"success": True, "deleted": 0, "note": "Submission not found or already processed"}
        return {"success": True, "deleted": deleted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# ✅ NOT indented inside cancel_submission — this is a top-level route
@app.get("/api/quests/{faucet_address}/submissions/pending")
async def get_pending_submissions_endpoint(faucet_address: str):
    try:
        if faucet_address.startswith("draft-") or faucet_address.startswith("demo-"):
            return {"success": True, "submissions": [], "count": 0}
        faucet_checksum = smart_checksum(faucet_address)
        response = (
            supabase.table("submissions")
            .select("*")
            .eq("faucet_address", faucet_checksum)
            .in_("status", ["pending", "auto_verifying"])   # ✅ both states
            .order("submitted_at", desc=True)
            .execute()
        )
        formatted = [
            {
                "submissionId": s["submission_id"],
                "walletAddress": s["wallet_address"],
                "taskId": s["task_id"],
                "taskTitle": s["task_title"],
                "submittedData": s["submitted_data"],
                "notes": s["notes"],
                "submittedAt": s["submitted_at"],
                "status": s["status"],               # expose so admin can see if it's stuck auto
                "submissionType": s.get("submission_type"),
            }
            for s in response.data
        ]
        return {"success": True, "submissions": formatted, "count": len(formatted)}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
        
@app.put("/api/quests/{faucet_address}")
async def update_quest_details(
    faucet_address: str, 
    update: QuestUpdate
):
    """
    Update Quest Details (Admin Only)
    """
    try:
        # 1. Verify Quest Exists
        # (In production, also verify the request comes from the creator)
        
        # 2. Prepare Update Data
        # We only update fields that are not None
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        
        if not update_data:
            return {"success": False, "message": "No data provided"}
        # 3. Update in Supabase
        # Assuming you have a 'quests' table. 
        # If using the mock structure from previous steps, we just return success.
        # REAL DB CALL EXAMPLE:
        # response = supabase.table("quests").update(update_data).eq("faucet_address", faucet_address).execute()
        
        return {
            "success": True, 
            "message": "Quest updated successfully",
            "updatedFields": update_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/api/quests/{faucet_address}/progress/{wallet_address}")
async def get_user_progress(faucet_address: str, wallet_address: str):
    try:
        if faucet_address.startswith("draft-") or faucet_address.startswith("demo-"):
            return {"success": True, "progress": {
                "totalPoints": 0, "stagePoints": {}, "currentStage": "Beginner",
                "completedTasks": [], "activeStages": [], "stageTotals": {},
                "stagesMeta": {}, "submissions": []
            }}
        faucet_checksum = smart_checksum(faucet_address)
        wallet_checksum = smart_checksum(wallet_address)
        # 1. Fetch or create user_progress row
        response = supabase.table("user_progress") \
            .select("*") \
            .eq("wallet_address", wallet_checksum) \
            .eq("faucet_address", faucet_checksum) \
            .execute()
        if not response.data:
            new_profile = {
                "wallet_address": wallet_checksum,
                "faucet_address": faucet_checksum,
                "total_points": 0,
                "stage_points": {
                    "Beginner": 0, "Intermediate": 0,
                    "Advance": 0, "Legend": 0, "Ultimate": 0
                },
                "completed_tasks": [],
                "current_stage": "Beginner"
            }
            insert_res = supabase.table("user_progress").insert(new_profile).execute()
            user_data = insert_res.data[0] if insert_res.data else new_profile
        else:
            user_data = response.data[0]
        if not user_data:
            raise HTTPException(status_code=500, detail="Failed to retrieve or create user progress")
        # 2. Fetch tasks — needed to calculate stage totals and thresholds
        tasks_res = supabase.table("faucet_tasks") \
            .select("tasks") \
            .eq("faucet_address", faucet_checksum) \
            .execute()
        tasks = []
        if tasks_res.data:
            tasks = tasks_res.data[0].get("tasks") or []
        # 3. Ensure all stage_points keys exist
        stage_points = user_data.get("stage_points") or {}
        for s in ["Beginner", "Intermediate", "Advance", "Legend", "Ultimate"]:
            if s not in stage_points:
                stage_points[s] = 0
        # 4. Derive active stages and totals from tasks
        active_stages = get_active_stages(tasks)   # only stages with tasks
        stage_totals  = get_stage_totals(tasks)    # total pts per stage
        # 5. Self-heal: recalculate correct stage and fix DB if wrong
        calculated_stage = calculate_current_stage(stage_points, tasks)
        db_stage = user_data.get("current_stage", "Beginner")
        if calculated_stage != db_stage:
            print(f"🔧 Self-heal stage: {db_stage} → {calculated_stage}")
            supabase.table("user_progress").update({
                "current_stage": calculated_stage,
                "stage_points":  stage_points,
            }).eq("wallet_address", wallet_checksum) \
              .eq("faucet_address", faucet_checksum) \
              .execute()
            user_data["current_stage"] = calculated_stage
            user_data["stage_points"]  = stage_points
        current_stage = user_data["current_stage"]
        # 6. Build per-stage metadata for the frontend
        # Frontend uses this to render progress bars, badges, and lock states
        stages_meta = {}
        for i, stage in enumerate(active_stages):
            total     = stage_totals.get(stage, 0)
            threshold = math.ceil(total * 0.70) if total > 0 else 0
            earned    = stage_points.get(stage, 0)
            is_unlocked = earned >= threshold if threshold > 0 else False
            stages_meta[stage] = {
                "stageTotal":      total,       # total pts available in this stage
                "unlockThreshold": threshold,   # 70% — what user needs to advance
                "userEarned":      earned,      # what user has earned in this stage
                "isUnlocked":      is_unlocked, # True = stage passed, show badge
                "isCurrent":       stage == current_stage,
                "stageIndex":      i,
                "isLastStage":     i == len(active_stages) - 1,
            }
        # 7. Current stage convenience fields
        current_meta      = stages_meta.get(current_stage, {})
        current_earned    = current_meta.get("userEarned", 0)
        current_threshold = current_meta.get("unlockThreshold", 0)
        current_total     = current_meta.get("stageTotal", 0)
        # 8. Fetch submissions
        subs_response = supabase.table("submissions") \
            .select("*") \
            .eq("wallet_address", wallet_checksum) \
            .eq("faucet_address", faucet_checksum) \
            .execute()
        submissions_data = subs_response.data or []
        # 9. Build and return response
        formatted_progress = {
            # Existing fields (keep for backward compatibility)
            "totalPoints":    user_data["total_points"],
            "stagePoints":    stage_points,
            "currentStage":   current_stage,
            "completedTasks": user_data.get("completed_tasks") or [],
            # New fields — frontend uses these for progress bars
            "activeStages":            active_stages,   # e.g. ["Beginner","Intermediate","Ultimate"]
            "stageTotals":             stage_totals,    # total pts per stage
            "stagesMeta":              stages_meta,     # full breakdown per stage
            "currentStageEarned":      current_earned,
            "currentStageTotal":       current_total,
            "currentStageThreshold":   current_threshold,  # 70% of currentStageTotal
            "submissions": [
                {
                    "submissionId":  s["submission_id"],
                    "taskId":        s["task_id"],
                    "taskTitle":     s["task_title"],
                    "status":        s["status"],
                    "submittedData": s["submitted_data"],
                    "submittedAt":   s["submitted_at"],
                    "notes":         s["notes"],
                }
                for s in submissions_data
            ],
        }
        return {"success": True, "progress": formatted_progress}
    except Exception as e:
        print(f"Error getting progress: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
  

@app.post("/api/admin/send-monthly-greeting")
async def trigger_monthly_greeting(req: MonthlyGreetingRequest, background_tasks: BackgroundTasks):
    # Verify Admin
    if req.adminAddress.lower() != PLATFORM_OWNER.lower():
        raise HTTPException(status_code=403, detail="Unauthorized")

    background_tasks.add_task(send_bulk_greeting, req.title, req.content, req.imageUrl)
    return {"success": True, "message": "Broadcast started"}

async def send_bulk_greeting(title: str, content: str, image_url: str):
    emails = await get_all_user_emails()
    if not emails: return

    try:
        resend.Emails.send({
            "from": f"FaucetDrops <{FROM_EMAIL}>",
            "to": emails,
            "subject": title,
            "html": f"""
            <html>
            <head><style>{QUEST_EMAIL_STYLE}</style></head>
            <body>
                <div class="wrap">
                    <img src="{image_url}" class="hero" />
                    <div class="content">
                        <h1>{title}</h1>
                        <p>{content}</p>
                        <p>Keep dripping, keep building.</p>
                        <a href="{FRONTEND_URL}" class="btn">Go to Dashboard</a>
                    </div>
                    <div class="footer">© FaucetDrops · {datetime.now().year}</div>
                </div>
            </body>
            </html>
            """
        })
    except Exception as e:
        print(f"⚠️ Monthly greeting failed: {e}")  
           
@app.post("/api/quests/{faucet_address}/submissions")
async def submit_task(
    faucet_address: str,
    walletAddress: str = Form(...),
    taskId: str = Form(...),
    submittedData: str = Form(None),
    notes: str = Form(""),
    submissionType: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    try:
        faucet_checksum = smart_checksum(faucet_address)
        wallet_checksum = smart_checksum(walletAddress)
        
        # 1. Fetch Task Details FIRST
        _, tasks_list = await get_quest_context(faucet_checksum)
        target_task = next((t for t in tasks_list if t['id'] == taskId), None)
        
        # Fallback for system tasks
        if not target_task:
            if taskId == "sys_daily":
                target_task = {"id": "sys_daily", "action": "checkin", "title": "Daily Check-in"}
            elif taskId == "sys_share_x":
                target_task = {"id": "sys_share_x", "action": "share_quest", "title": "Share Quest"}
            elif taskId == "sys_referral":
                target_task = {"id": "sys_referral", "action": "refer", "title": "Referral"}
            else:
                raise HTTPException(status_code=404, detail="Task configuration not found")
        # 2. CLEAN UP SUBMITTED DATA (The user's Link/TxHash)
        clean_submitted_data = submittedData if submittedData not in ["undefined", "null", "None"] else ""
        
        # Prevent saving the Task Reference URL as the user's proof by mistake
        if clean_submitted_data and target_task.get("url"):
            if clean_submitted_data.strip().lower() == target_task.get("url").strip().lower():
                clean_submitted_data = ""
        # 3. Handle File Uploads & Combined Submissions
        verification_note = notes
        final_data_link = clean_submitted_data 
        
        if file:
            file_ext = file.filename.split(".")[-1]
            file_path = f"{faucet_checksum}/{wallet_checksum}/{uuid.uuid4()}.{file_ext}"
            file_content = await file.read()
            supabase.storage.from_("quest-proofs").upload(
                file_path, file_content, {"content-type": file.content_type}
            )
            image_url = supabase.storage.from_("quest-proofs").get_public_url(file_path)
            
            # SMART ROUTING: Save both the Image AND the Link/TxHash!
            if clean_submitted_data and clean_submitted_data.strip():
                if notes:
                    verification_note = f"User Proof Link: {clean_submitted_data}\n\nUser Notes: {notes}"
                else:
                    verification_note = f"User Proof Link: {clean_submitted_data}"
            
            final_data_link = image_url
        # 4. VERIFICATION LOGIC SWITCH
        initial_status = "pending"
        # Case A: Instant Tasks
        if submissionType == "none":
            initial_status = "approved"
            verification_note = "Instant Reward (No Verification Required)"
        # Case B: On-Chain Verification Engine 
        elif submissionType == "onchain":
            print("\n" + "=" * 60)
            print("🔗 [submit_task] ON-CHAIN BRANCH ENTERED")
            print(f"   faucet_address : {faucet_address}")
            print(f"   wallet         : {wallet_checksum}")
            print(f"   taskId         : {taskId}")
            print(f"   target_task    : {target_task}")
            print("=" * 60)
 
            # Resolve chain_id from userfaucets (same as before)
            f_meta = supabase.table("userfaucets").select("chain_id").eq(
                "faucet_address", faucet_address.lower()
            ).execute()
 
            print(f"   userfaucets query result : {f_meta.data}")
 
            raw_chain_id = f_meta.data[0]["chain_id"] if f_meta.data else 42220
            print(f"   raw_chain_id : {raw_chain_id}")
 
            chain_map = {
                1: Chain.ethereum, 8453: Chain.base, 42161: Chain.arbitrum,
                42220: Chain.celo, 56: Chain.bnb, 1135: Chain.lisk
            }
            target_chain_enum = chain_map.get(raw_chain_id, Chain.celo)
            print(f"   target_chain_enum : {target_chain_enum}")
 
            action = target_task.get("action")
            print(f"   task action : {action!r}")
            print(f"   task fields : minAmount={target_task.get('minAmount')!r}  "
                  f"targetContractAddress={target_task.get('targetContractAddress')!r}")
 
            try:
                passed = await run_onchain_verification(
                    wallet_checksum, target_chain_enum, target_task
                )
                print(f"   run_onchain_verification returned: {passed}")
            except Exception as verify_err:
                print(f"   ❌ run_onchain_verification RAISED: {verify_err}")
                import traceback; traceback.print_exc()
                passed = False
 
            if passed:
                initial_status = "approved"
                verification_note = "Verified On-Chain Successfully"
                final_data_link = "On-Chain Verified"
                print("   → APPROVED ✅")
            else:
                print("   → FAILED ❌")
                return {
                    "success": False,
                    "message": (
                        "Verification failed. Requirements not met "
                        "(check balance, timeframe, or transaction history)."
                    ),
                }
                # Case C: Bot Auto Verifications
        elif submissionType in ["auto_social", "system_x_share", "auto_tx"]:
            initial_status = "auto_verifying"
            verification_note = "Awaiting automatic bot verification..."
        existing = (
            supabase.table("submissions")
            .select("submission_id, status")
            .eq("faucet_address", faucet_checksum)
            .eq("wallet_address", wallet_checksum)
            .eq("task_id", taskId)
            .in_("status", ["pending", "auto_verifying"])
            .execute()
        )
        if existing.data:
            return {
                "success": False,
                "message": "Error: Please try again."
            }
        # 5. DB INSERT & POINT AWARD
        submission_entry = {
            "faucet_address": faucet_checksum,
            "wallet_address": wallet_checksum,
            "task_id": taskId,
            "task_title": target_task.get('title', 'Task Submission'),
            "submitted_data": final_data_link or "No proof attached",
            "notes": verification_note,
            "submission_type": submissionType,
            "status": initial_status,
            "submitted_at": datetime.utcnow().isoformat()
        }
        
        res = supabase.table("submissions").insert(submission_entry).execute()
        
        # IF APPROVED, TRIGGER POINTS IMMEDIATELY
        if initial_status == "approved" and res.data:
            try:
                await process_auto_approval(
                    res.data[0]['submission_id'],
                    faucet_checksum,
                    wallet_checksum
                )
            except Exception as e:
                # process_auto_approval already deleted the submission on failure.
                # Tell the frontend it failed so it doesn't show a false "pending" state.
                print(f"❌ process_auto_approval raised: {e}")
                return {
                    "success": False,
                    "message": "Verification failed. Please try again."
                }

        return {
            "success": True,
            "message": "Verified! Points added." if initial_status == "approved" else "Checking requirements...",
            "submissionId": res.data[0]['submission_id'] if res.data else None
        }
        
    except Exception as e:
        print(f"Submission error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
# --- 1. VERIFY GROUP/CHANNEL MEMBERSHIP ---
class VerifyTelegramRequest(BaseModel):
    wallet_address: str
    chat_id: str # The @username of the channel or the numeric ID of the group
@app.post("/api/quests/verify/telegram-join")
async def verify_telegram_join(req: VerifyTelegramRequest):
    try:
        # 1. Get the user's numeric Telegram ID from Supabase
        user_res = supabase.table("user_profiles").select("telegram_user_id").eq("wallet_address", req.wallet_address.lower()).execute()
        
        if not user_res.data or not user_res.data[0].get("telegram_user_id"):
            return {"verified": False, "message": "Telegram account not linked properly."}
            
        telegram_user_id = user_res.data[0]["telegram_user_id"]
        # 2. Ask Telegram if the user is in the chat
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{TELEGRAM_API_URL}/getChatMember", params={
                "chat_id": req.chat_id,
                "user_id": telegram_user_id
            })
            data = res.json()
        if data.get("ok"):
            status = data["result"]["status"]
            # 'left' and 'kicked' mean they are not in the group
            if status not in ["left", "kicked"]:
                return {"verified": True, "message": "User is in the group/channel!"}
        
        return {"verified": False, "message": "User has not joined the group/channel."}
    except Exception as e:
        print(f"Telegram Verification Error: {e}")
        return {"verified": False, "message": "Internal verification error."}
# ============================================================
# TELEGRAM MESSAGE TRACKING — Full Rebuild
# ============================================================

class TelegramMessageCountVerifyRequest(BaseModel):
    submission_id:  str
    faucet_address: str
    wallet_address: str
    chat_id:        str   # numeric chat ID e.g. "-1001234567890"
    required_count: int

async def _resolve_chat_id(chat_identifier: str) -> str | None:
    """
    Resolves @username or numeric string to the canonical numeric chat ID
    that Telegram puts in webhook payloads (e.g. '-1001234567890').
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{TELEGRAM_API_URL}/getChat",
                json={"chat_id": chat_identifier}
            )
            data = resp.json()

        if not data.get("ok"):
            print(f"[TG-MSG] getChat failed for '{chat_identifier}': {data.get('description')}")
            return None

        numeric_id = str(data["result"]["id"])
        print(f"[TG-MSG] Resolved '{chat_identifier}' → numeric ID '{numeric_id}'")
        return numeric_id

    except Exception as e:
        print(f"[TG-MSG] _resolve_chat_id error: {e}")
        return None
# ── helpers ──────────────────────────────────────────────────

# Add this helper function somewhere in main.py
async def is_quest_admin_or_creator(faucet_address: str, caller_address: str) -> bool:
    """Returns True if caller is the quest creator, an added admin, or platform owner."""
    faucet_cs = smart_checksum(faucet_address)
    caller_cs = smart_checksum(caller_address)

    # 1. PLATFORM OWNER BYPASS (God Mode)
    if caller_cs.lower() == PLATFORM_OWNER.lower():
        return True

    # 2. Check creator
    quest_res = supabase.table("quests").select("creator_address").eq("faucet_address", faucet_cs).execute()
    if quest_res.data and quest_res.data[0]["creator_address"].lower() == caller_cs.lower():
        return True
                                                                                                                                
    # 3. Check quest_admins table
    admin_res = supabase.table("quest_admins") \
        .select("id") \
        .eq("quest_address", faucet_cs) \
        .eq("admin_address", caller_cs) \
        .execute()
    return bool(admin_res.data)

def _upsert_message_count(telegram_user_id: str, chat_id: str) -> None:
    """
    Atomically increments the message counter.
    Runs in a background task — never blocks the webhook response.
    """
    try:
        existing = (
            supabase
            .table("telegram_message_counts")
            .select("message_count")
            .eq("telegram_user_id", telegram_user_id)
            .eq("chat_id", chat_id)
            .execute()
        )

        now_iso = datetime.now(timezone.utc).isoformat()

        if existing.data:
            new_count = existing.data[0]["message_count"] + 1
            supabase.table("telegram_message_counts").update({
                "message_count":   new_count,
                "last_message_at": now_iso,
            }).eq("telegram_user_id", telegram_user_id).eq("chat_id", chat_id).execute()
        else:
            supabase.table("telegram_message_counts").insert({
                "telegram_user_id": telegram_user_id,
                "chat_id":          chat_id,
                "message_count":    1,
                "last_message_at":  now_iso,
            }).execute()

    except Exception as e:
        print(f"❌ _upsert_message_count error: {e}")


async def _get_message_count(telegram_user_id: str, chat_id: str) -> int:
    """Returns the tracked message count for a user in a chat. 0 if none."""
    try:
        res = (
            supabase
            .table("telegram_message_counts")
            .select("message_count")
            .eq("telegram_user_id", str(telegram_user_id))
            .eq("chat_id", str(chat_id))
            .execute()
        )
        return res.data[0]["message_count"] if res.data else 0
    except Exception as e:
        print(f"❌ _get_message_count error: {e}")
        return 0


async def _confirm_user_in_group(telegram_user_id: str, chat_id: str) -> bool:
    """
    Uses getChatMember to confirm the user is CURRENTLY in the group.
    Prevents ex-members from keeping their count.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{TELEGRAM_API_URL}/getChatMember",
                json={
                    "chat_id": chat_id,
                    "user_id": int(telegram_user_id),
                }
            )
            data = resp.json()

        if not data.get("ok"):
            print(f"⚠️  getChatMember failed: {data.get('description')}")
            return False

        status = data["result"].get("status", "left")
        return status in ("member", "administrator", "creator", "restricted")

    except Exception as e:
        print(f"❌ _confirm_user_in_group error: {e}")
        return False


# ── unified webhook ──────────────────────────────────────────

@app.post("/api/telegram/webhook", tags=["Telegram"])
async def telegram_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Single webhook for ALL Telegram updates.
    - Handles /start and /myid bot commands
    - Counts every non-bot message in groups/supergroups
    Register with:
      https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_URL>/api/telegram/webhook
    """
    try:
        body = await request.json()
    except Exception:
        return {"ok": True}

    message = body.get("message") or body.get("channel_post")
    if not message:
        return {"ok": True}

    sender    = message.get("from", {})
    chat      = message.get("chat", {})
    chat_id   = str(chat.get("id", ""))
    chat_type = chat.get("type", "")
    user_id   = str(sender.get("id", ""))
    username  = sender.get("username", "")
    is_bot    = sender.get("is_bot", False)
    text      = message.get("text", "") or ""

    # ── bot commands (work in DM and groups) ─────────────────
    if text.startswith("/start"):
        await send_telegram_message(
            int(chat_id),
            f"👋 Hi @{username}!\n\n"
            f"I'm the FaucetDrops Quest Bot 🤖\n\n"
            f"🆔 Your Telegram User ID:\n`{user_id}`\n\n"
            f"Copy it and paste into your FaucetDrops profile settings "
            f"to enable quest auto-verification!"
        )
        return {"ok": True}

    if text.startswith("/myid"):
        await send_telegram_message(
            int(chat_id),
            f"🆔 Your Telegram User ID: `{user_id}`"
        )
        return {"ok": True}

    if text.startswith("/mycount"):
        # Let user check their own count in the current group
        if chat_type in ("group", "supergroup") and user_id:
            count = await _get_message_count(user_id, chat_id)
            await send_telegram_message(
                int(chat_id),
                f"📊 @{username}, you've sent **{count}** tracked messages in this group."
            )
        return {"ok": True}

    # ── count non-bot messages in groups/supergroups ─────────
    if not is_bot and user_id and chat_type in ("group", "supergroup"):
        background_tasks.add_task(_upsert_message_count, user_id, chat_id)

    return {"ok": True}


# ── verification endpoint ─────────────────────────────────────

@app.post("/api/quests/verify/telegram-message-count", tags=["Quest Verifications"])
async def verify_telegram_message_count(
    req: TelegramMessageCountVerifyRequest,
    background_tasks: BackgroundTasks,
):
    submission_id = req.submission_id
    try:
        wallet_cs = smart_checksum(req.wallet_address)
        faucet_cs = smart_checksum(req.faucet_address)
 
        raw_chat = str(req.chat_id).strip()
        chat_id = extract_telegram_chat_id(raw_chat) or raw_chat
 
        if req.required_count < 1:
            await delete_submission(submission_id)
            raise HTTPException(status_code=400, detail="required_count must be ≥ 1")
 
        profile_res = (
            supabase.table("user_profiles")
            .select("telegram_user_id, telegram_handle, username")
            .eq("wallet_address", wallet_cs.lower())
            .execute()
        )
 
        if not profile_res.data:
            await delete_submission(submission_id)
            return {
                "verified": False, "reason": "profile_not_found",
                "current_count": 0, "required_count": req.required_count,
                "message": "❌ No profile found for this wallet.",
            }
 
        telegram_user_id = profile_res.data[0].get("telegram_user_id")
        if not telegram_user_id:
            await delete_submission(submission_id)
            return {
                "verified": False, "reason": "telegram_not_linked",
                "current_count": 0, "required_count": req.required_count,
                "message": "⚠️ Link your Telegram account in Profile Settings first.",
            }
 
        numeric_chat_id = await _resolve_chat_id(chat_id)
        if not numeric_chat_id:
            await delete_submission(submission_id)
            return {
                "verified": False, "reason": "chat_not_found",
                "current_count": 0, "required_count": req.required_count,
                "message": "❌ Could not find this Telegram group. Make sure the bot is added as admin.",
            }
 
        still_member = await _confirm_user_in_group(telegram_user_id, numeric_chat_id)
        if not still_member:
            await delete_submission(submission_id)
            return {
                "verified": False, "reason": "not_in_group",
                "current_count": 0, "required_count": req.required_count,
                "message": "❌ You are not a member of this group.",
            }
 
        current_count = await _get_message_count(telegram_user_id, numeric_chat_id)
 
        if current_count >= req.required_count:
            background_tasks.add_task(
                process_auto_approval, submission_id, faucet_cs, wallet_cs
            )
            return {
                "verified": True,
                "current_count": current_count,
                "required_count": req.required_count,
                "message": f"✅ Verified! {current_count}/{req.required_count} messages sent.",
            }
 
        await delete_submission(submission_id)
        return {
            "verified": False, "reason": "insufficient_messages",
            "current_count": current_count,
            "required_count": req.required_count,
            "message": f"❌ Only {current_count}/{req.required_count} messages tracked.",
        }
 
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ verify_telegram_message_count error: {e}")
        traceback.print_exc()
        await delete_submission(submission_id)   # guaranteed cleanup
        raise HTTPException(status_code=500, detail="Internal verification error.")
# ── admin debug endpoint ──────────────────────────────────────

@app.get("/api/debug/telegram-count", tags=["Telegram"])
async def debug_telegram_count(telegram_user_id: str, chat_id: str):
    """Quick admin check — how many messages has a user sent in a group."""
    count = await _get_message_count(telegram_user_id, chat_id)
    in_group = await _confirm_user_in_group(telegram_user_id, chat_id)
    return {
        "telegram_user_id": telegram_user_id,
        "chat_id":          chat_id,
        "message_count":    count,
        "currently_in_group": in_group,
    }

@app.post("/api/quests/verify-bot-admin")
async def verify_bot_admin(req: dict):
    """
    Checks if the FaucetDrops bot is an admin in the requested chat.
    Expected payload: {"chat_id": "@GroupUsername"}
    """
    chat_id = req.get("chat_id")
    if not chat_id:
        return {"is_admin": False, "message": "Missing chat_id"}
        
    # Standardize format (must start with @ for public chats)
    if not chat_id.startswith("@") and not chat_id.startswith("-100"):
        chat_id = f"@{chat_id}"
    try:
        # Extract the Bot's own numeric ID from its token
        bot_id = TELEGRAM_BOT_TOKEN.split(":")[0]
        
        async with httpx.AsyncClient() as client:
            # Check the bot's own status in that specific chat
            res = await client.get(f"{TELEGRAM_API_URL}/getChatMember", params={
                "chat_id": chat_id,
                "user_id": bot_id
            })
            data = res.json()
        if not data.get("ok"):
            # Telegram returns 400 if the bot hasn't been added or the chat doesn't exist
            error_msg = data.get("description", "Unknown Telegram error")
            return {"is_admin": False, "message": f"Cannot find chat or bot is not inside. ({error_msg})"}
        status = data["result"]["status"]
        
        # 'administrator' or 'creator' means it has the rights we need
        if status in ["administrator", "creator"]:
            return {"is_admin": True, "message": "Bot is an admin!"}
        else:
            return {"is_admin": False, "message": "Bot is in the chat, but is NOT an admin."}
    except Exception as e:
        print(f"Bot Admin Verify Error: {e}")
        return {"is_admin": False, "message": "Internal server error connecting to Telegram."}
@app.post("/api/profile/sync")
async def sync_profile(req: SyncProfileRequest):
    try:
        # FIX: Use the smart normalizer instead of .lower()
        wallet = normalize_db_address(req.wallet_address)
        
        # 1. Check if user already exists
        existing = supabase.table("user_profiles").select("*").eq("wallet_address", wallet).execute()
        if existing.data:
            # OPTIONAL: Add a chain_type identifier to the response for the frontend
            profile_data = existing.data[0]
            profile_data["chain_type"] = "solana" if is_solana_address(wallet) else "evm"
            return {"success": True, "profile": profile_data}
        
        # 2. Check if the fallback username is already taken
        username_check = supabase.table("user_profiles").select("username").eq("username", req.username).execute()
        
        final_username = req.username
        if username_check.data:
            # If taken, append the last 4 characters
            final_username = f"{req.username}_{wallet[-4:]}"
        
        # 3. Create the new profile
        new_profile = {
            "wallet_address": wallet,
            "username": final_username,
            "avatar_url": req.avatar_url,
            "email": req.email
        }
        
        insert_res = supabase.table("user_profiles").insert(new_profile).execute()
        
        profile_data = insert_res.data[0]
        profile_data["chain_type"] = "solana" if is_solana_address(wallet) else "evm"
        return {"success": True, "profile": profile_data}
        
    except Exception as e:
        print(f"Error auto-syncing profile: {e}")
        return {"success": False, "error": str(e)}
    
@app.post("/api/admin/approve-submission")
async def admin_approve_submission(req: ApprovalRequest):
    """
    Called by the external Verifier Service when a task is passed.
    """
    # In production, check for a shared SECRET_KEY header here for security!
    
    if req.status == "approved":
        # 1. Fetch submission details
        sub_res = supabase.table("submissions").select("*").eq("submission_id", req.submissionId).execute()
        if not sub_res.data:
            return {"success": False, "message": "Submission not found"}
            
        sub = sub_res.data[0]
        
        # 2. Call your existing auto-approval logic
        await process_auto_approval(
            req.submissionId, 
            sub['faucet_address'], 
            sub['wallet_address']
        )
        
        return {"success": True}
    
    return {"success": False}


@app.delete("/api/quest/{faucet_address}")
async def delete_quest(
    faucet_address: str,
    body: DeleteQuestRequest,
    db: asyncpg.Pool = Depends(get_db),
):
    quest = await db.fetchrow("""
        SELECT id, title, creator_address, rewards_distributed
        FROM quests
        WHERE faucet_address = $1
    """, faucet_address)

    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")

    if quest["creator_address"].lower() != body.walletAddress.lower() and body.walletAddress.lower() != PLATFORM_OWNER.lower():
        raise HTTPException(status_code=403, detail="Only the quest owner can delete this quest")

    if quest["title"].strip().lower() != body.questTitle.strip().lower():
        raise HTTPException(status_code=400, detail="Quest name does not match. Please type the exact quest name.")

    if quest["rewards_distributed"]:
        raise HTTPException(status_code=400, detail="Cannot delete a quest that has already distributed rewards")

    quiz_id = quest["id"]

    async with db.transaction():
        await db.execute("DELETE FROM quest_participants  WHERE quest_address = $1", faucet_address)
        await db.execute("DELETE FROM quest_tasks         WHERE quest_id = $1",      quiz_id)
        await db.execute("DELETE FROM quest_submissions   WHERE quest_id = $1",      quiz_id)
        await db.execute("DELETE FROM quests              WHERE id = $1",            quiz_id)

    return {"success": True, "message": f"Quest '{quest['title']}' deleted successfully"}
     
@app.put("/api/quests/{faucet_address}/submissions/{submission_id}")
async def update_submission(
    faucet_address: str,
    submission_id: str,
    update: SubmissionUpdate,
    adminAddress: str = Query(...)
):
    try:
        faucet_checksum = smart_checksum(faucet_address)
        
        is_authorized = await is_quest_admin_or_creator(faucet_checksum, adminAddress)
        if not is_authorized:
            raise HTTPException(status_code=403, detail="Not authorized to review submissions")

        now = datetime.utcnow().isoformat()
        
        update_payload = {"status": update.status, "reviewed_at": now}
        if update.notes:
            update_payload["notes"] = f"Admin Note: {update.notes}"

        sub_update = supabase.table("submissions").update(update_payload).eq("submission_id", submission_id).execute()
        
        if not sub_update.data:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        submission = sub_update.data[0]
        wallet_checksum = submission['wallet_address']
        task_id = submission['task_id']
        
        if update.status == "approved":
            stage_reqs, tasks = await get_quest_context(faucet_checksum)
            task = next((t for t in tasks if t['id'] == task_id), None)
            
            if not task and task_id in SYSTEM_TASK_REGISTRY:
                task = SYSTEM_TASK_REGISTRY[task_id]
            
            if task:
                points_to_add = int(task.get('points', 0))
                task_stage = task.get('stage', 'Beginner')
                
                prog_res = supabase.table("user_progress")\
                    .select("*")\
                    .eq("wallet_address", wallet_checksum)\
                    .eq("faucet_address", faucet_checksum)\
                    .execute()
                
                if not prog_res.data:
                    new_profile = {
                        "wallet_address": wallet_checksum,
                        "faucet_address": faucet_checksum,
                        "total_points": 0,
                        "stage_points": {"Beginner": 0, "Intermediate": 0, "Advance": 0, "Legend": 0, "Ultimate": 0},
                        "completed_tasks": [],
                        "current_stage": "Beginner"
                    }
                    prog_res = supabase.table("user_progress").insert(new_profile).execute()
                
                if prog_res.data:
                    curr_prog = prog_res.data[0]
                    new_total = curr_prog['total_points'] + points_to_add
                    current_stage_points = curr_prog['stage_points'] or {}
                    if task_stage not in current_stage_points:
                        current_stage_points[task_stage] = 0
                    current_stage_points[task_stage] += points_to_add
                    completed_list = curr_prog['completed_tasks'] or []
                    if task_id not in completed_list:
                        completed_list.append(task_id)
                    new_stage_name = calculate_current_stage(current_stage_points, tasks) if stage_reqs else curr_prog['current_stage']
                    
                    supabase.table("user_progress").update({
                        "total_points": new_total,
                        "stage_points": current_stage_points,
                        "completed_tasks": completed_list,
                        "current_stage": new_stage_name
                    }).eq("wallet_address", wallet_checksum).eq("faucet_address", faucet_checksum).execute()

                    part_res = supabase.table("quest_participants").select("points").eq("quest_address", faucet_checksum).eq("wallet_address", wallet_checksum).execute()
                    if part_res.data:
                        current_lb_points = part_res.data[0].get('points', 0)
                        supabase.table("quest_participants").update({
                            "points": current_lb_points + points_to_add,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }).eq("quest_address", faucet_checksum).eq("wallet_address", wallet_checksum).execute()

                    # ── ADD THIS BLOCK: Referral fulfillment for manual approvals ──
                    try:
                        pending_res = supabase.table("pending_referrals").select("*")\
                            .eq("quest_address", faucet_checksum)\
                            .eq("referee_wallet", wallet_checksum)\
                            .eq("required_task_id", task_id)\
                            .eq("awarded", False)\
                            .execute()

                        for pending in (pending_res.data or []):
                            referrer_wallet = pending["referrer_wallet"]
                            referral_points = int(pending.get("referral_points", 200))

                            ref_part_res = supabase.table("quest_participants").select("points")\
                                .eq("quest_address", faucet_checksum)\
                                .eq("wallet_address", referrer_wallet)\
                                .execute()

                            if ref_part_res.data:
                                current_ref_pts = ref_part_res.data[0].get("points", 0)
                                supabase.table("quest_participants").update({
                                    "points": current_ref_pts + referral_points,
                                    "updated_at": datetime.now(timezone.utc).isoformat()
                                }).eq("quest_address", faucet_checksum).eq("wallet_address", referrer_wallet).execute()

                            supabase.table("pending_referrals").update({"awarded": True})\
                                .eq("quest_address", faucet_checksum)\
                                .eq("referee_wallet", wallet_checksum)\
                                .eq("required_task_id", task_id)\
                                .execute()

                            print(f"✅ [Manual Approval] Referral points ({referral_points}) awarded to {referrer_wallet} because {wallet_checksum} completed task {task_id}")
                    except Exception as ref_err:
                        print(f"⚠️ Referral fulfillment check failed in manual approval: {ref_err}")
                    # ── END REFERRAL BLOCK ──

        return {"success": True, "message": f"Submission {update.status}"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update submission error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
       
@app.post("/api/quests/{faucet_address}/set-funded", tags=["Quest Management"])
async def set_quest_funded(faucet_address: str):
    """
    Called by the frontend after the creator successfully funds the reward pool on-chain.
    Marks the quest as 'is_funded = True' in the database so users can participate.
    """
    try:
        if not Web3.is_address(faucet_address):
            raise HTTPException(status_code=400, detail="Invalid address format")
            
        faucet_checksum = smart_checksum(faucet_address)
        
        # Update the quest status in Supabase
        res = supabase.table("quests").update({
            "is_funded": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("faucet_address", faucet_checksum).execute()
        
        if not res.data:
            # If nothing was updated, the quest doesn't exist
            raise HTTPException(status_code=404, detail="Quest not found")
            
        print(f"✅ Quest {faucet_checksum} marked as FUNDED.")
        return {"success": True, "message": "Quest successfully marked as funded."}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error setting quest to funded: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    
@app.get("/api/quests/{faucet_address}/leaderboard")
async def get_leaderboard_endpoint(faucet_address: str):
    try:
        if faucet_address.startswith("draft-") or faucet_address.startswith("demo-"):
            return {"success": True, "leaderboard": []}
        faucet_checksum = smart_checksum(faucet_address)
        # 1. Fetch Quest Metadata to identify the Creator
        quest_res = supabase.table("quests").select("creator_address").eq("faucet_address", faucet_checksum).execute()
        creator_address = quest_res.data[0].get("creator_address", "").lower() if quest_res.data else ""
        participants_query = supabase.table("quest_participants")\
            .select("wallet_address, points, updated_at")\
            .eq("quest_address", faucet_checksum)
        
        if creator_address:
            participants_query = participants_query.neq("wallet_address", creator_address)\
                                                   .neq("wallet_address", smart_checksum(creator_address))
        
        participants_response = participants_query.order("points", desc=True).order("updated_at", desc=False).execute()
        
        participants_data = participants_response.data or []
        if not participants_data:
            return {"success": True, "leaderboard": []}
        # FIX: Ensure all addresses are lowercase for consistent matching with profile table
        wallet_addresses_lower = [row['wallet_address'].lower() for row in participants_data]
        # 3. Parallel Fetch: Profiles using lowercase addresses
        profiles_res = supabase.table("user_profiles")\
            .select("wallet_address, username, avatar_url")\
            .in_("wallet_address", wallet_addresses_lower)\
            .execute()
            
        progress_res = supabase.table("user_progress")\
            .select("wallet_address, completed_tasks")\
            .in_("wallet_address", wallet_addresses_lower)\
            .eq("faucet_address", faucet_checksum)\
            .execute()
        # 4. Create maps for quick lookup (store keys as lowercase)
        profiles_map = {p['wallet_address'].lower(): p for p in profiles_res.data}
        progress_map = {pr['wallet_address'].lower(): pr for pr in progress_res.data}
        # 5. Final Merge
        leaderboard = []
        for i, row in enumerate(participants_data):
            wallet = row['wallet_address']
            wallet_l = wallet.lower() 
            
            profile = profiles_map.get(wallet_l, {})
            progress = progress_map.get(wallet_l, {})
            
            username = profile.get('username') or f"{wallet[:6]}...{wallet[-4:]}"
            
            leaderboard.append({
                "rank": i + 1,
                "walletAddress": wallet,
                "username": username,
                "avatarUrl": profile.get('avatar_url'), 
                "points": row['points'],
                "completedTasks": len(progress.get('completed_tasks') or []),
                "updatedAt": row.get('updated_at') # <--- ADD THIS
            })
            
        return {"success": True, "leaderboard": leaderboard}
    
    except Exception as e:
        print(f"Leaderboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/usdt-contracts")
async def get_usdt_contracts():
    """Get known USDT contract addresses for supported networks."""
    return {
        "success": True,
        "contracts": USDT_CONTRACTS,
        "supported_chains": VALID_CHAIN_IDS,
        "note": "These are common USDT contract addresses. Always verify the correct address for your use case."
    }
@app.post("/faucet-metadata")
async def save_faucet_metadata(metadata: FaucetMetadata):
    """Save faucet description and image"""
    try:
        print(f"\n{'='*60}")
        print(f"📥 Received metadata request:")
        print(f" Faucet: {metadata.faucetAddress}")
        print(f" Description: {metadata.description[:50]}..." if len(metadata.description) > 50 else f" Description: {metadata.description}")
        print(f" Image URL: {metadata.imageUrl}")
        print(f" Creator: {metadata.createdBy}")
        print(f" Chain ID: {metadata.chainId}")
        print(f"{'='*60}\n")
       
        # Validate addresses
        if not Web3.is_address(metadata.faucetAddress):
            raise HTTPException(status_code=400, detail="Invalid faucet address")
       
        if not Web3.is_address(metadata.createdBy):
            raise HTTPException(status_code=400, detail="Invalid creator address")
       
        faucet_address = smart_checksum(metadata.faucetAddress)
        creator_address = smart_checksum(metadata.createdBy)
       
        # Prepare data - ✅ FIXED: Use created_by to match database column name
        data = {
            "faucet_address": faucet_address,
            "description": metadata.description,
            "image_url": metadata.imageUrl,
            "created_by": creator_address, # ✅ Changed to created_by
            "chain_id": metadata.chainId,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
       
        print(f"📝 Prepared data for Supabase:")
        print(f" {data}\n")
       
        # Insert or update
        try:
            response = supabase.table("faucet_metadata").upsert(
                data,
                on_conflict="faucet_address"
            ).execute()
           
            print(f"✅ Supabase response:")
            print(f" Data: {response.data}")
           
        except Exception as db_error:
            print(f"❌ Database error: {str(db_error)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=500,
                detail=f"Database error: {str(db_error)}"
            )
       
        if not response.data:
            print(f"⚠️ Warning: No data returned from upsert")
       
        print(f"✅ Metadata stored successfully for {faucet_address}\n")
       
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "message": "Faucet metadata saved successfully"
        }
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Unexpected error saving faucet metadata: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save metadata: {str(e)}"
        )
# --- API Endpoints ---
@app.post("/register-faucet")
async def register_faucet_endpoint(request: RegisterFaucetRequest):
    """
    Registers a new faucet in the 'userfaucets' table.
    """
    try:
        print(f"📝 Registering new faucet: {request.name} ({request.faucetAddress})")
        if not Web3.is_address(request.faucetAddress) or not Web3.is_address(request.ownerAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
        # --- FIX: CONVERT TO LOWERCASE FOR DB STORAGE ---
        faucet_address_lower = request.faucetAddress.lower()
        owner_address_lower = request.ownerAddress.lower()
        data = {
            "faucet_address": faucet_address_lower, # Stored as lowercase
            "owner_address": owner_address_lower,   # Stored as lowercase
            "chain_id": request.chainId,
            "faucet_type": request.faucetType,
            "name": request.name,
            "created_at": datetime.now().isoformat()
        }
        # UPDATED: Table name is now 'userfaucets'
        response = supabase.table("userfaucets").upsert(
            data, 
            on_conflict="faucet_address"
        ).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to register faucet in database")
        # For logging, we can still use checksum if desired, but DB has lowercase
        print(f"✅ Faucet registered in userfaucets: {faucet_address_lower}")
        
        return {
            "success": True,
            "message": "Faucet registered successfully",
            "data": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Error registering faucet: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
@app.get("/user-faucets/{user_address}")
async def get_user_faucets_endpoint(user_address: str):
    """
    Fetches all faucets from 'userfaucets' for a specific user.
    """
    try:
        if not Web3.is_address(user_address):
            raise HTTPException(status_code=400, detail="Invalid user address")
        # FIX: Convert to lowercase to match the data stored by the sync script
        owner_address_lower = user_address.lower()
        # Query Supabase using the lowercase address
        response = supabase.table("userfaucets").select("*").eq(
            "owner_address", owner_address_lower
        ).order("created_at", desc=True).execute()
        faucets = response.data or []
        formatted_faucets = []
        for f in faucets:
            formatted_faucets.append({
                # Return checksummed addresses to the frontend for display consistency
                "faucetAddress": smart_checksum(f.get("faucet_address")),
                "ownerAddress": smart_checksum(f.get("owner_address")),
                "chainId": f.get("chain_id"),
                "faucetType": f.get("faucet_type"),
                "name": f.get("name"),
                "createdAt": f.get("created_at")
            })
        return {
            "success": True,
            "faucets": formatted_faucets,
            "count": len(formatted_faucets)
        }
    except Exception as e:
        print(f"💥 Error fetching user faucets: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch faucets: {str(e)}")
@app.get("/faucet-metadata/{faucetAddress}")
async def get_faucet_metadata(faucetAddress: str):
    """Get faucet description and image"""
    try:
        if not Web3.is_address(faucetAddress):
            raise HTTPException(status_code=400, detail="Invalid faucet address")
       
        faucet_address = smart_checksum(faucetAddress)
       
        response = supabase.table("faucet_metadata").select("*").eq(
            "faucet_address", faucet_address
        ).execute()
       
        if response.data and len(response.data) > 0:
            return {
                "success": True,
                "faucetAddress": faucet_address,
                "description": response.data[0].get("description"),
                "imageUrl": response.data[0].get("image_url"),
                "createdBy": response.data[0].get("created_by"), # ✅ Changed to created_by
                "chainId": response.data[0].get("chain_id"),
                "createdAt": response.data[0].get("created_at"),
                "updatedAt": response.data[0].get("updated_at")
            }
       
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "description": None,
            "imageUrl": None,                                                                                                                                                               
            "message": "No metadata found for this faucet"
        }
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Error getting faucet metadata: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get metadata: {str(e)}")
# ============================================================
# INTERNAL QUEST AUTOMATION (Runs continuously in background)
# ============================================================
async def auto_start_scheduled_quizzes():
    """
    Background loop that checks for scheduled quizzes whose start_time has arrived.
    It will automatically start them IF the reward pool is funded.
    """
    print("⏰ Quiz Auto-Starter running...")
    while True:
        try:
            now = datetime.now(timezone.utc)
            
            # Find quizzes that are scheduled to start NOW, are still waiting, and ARE FUNDED
            async with pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT id, code 
                    FROM faucet_quizzes 
                    WHERE status = 'waiting' 
                      AND start_time IS NOT NULL 
                      AND start_time <= $1
                      AND reward_is_funded = TRUE
                """, now)
                
                for row in rows:
                    code = row["code"].upper()
                    print(f"⏰ Auto-starting scheduled quiz: {code}")
                    
                    # 1. Update database
                    await conn.execute("UPDATE faucet_quizzes SET status = 'active' WHERE id = $1", row["id"])
                    
                    # 2. Update memory state
                    if code in game_state:
                        game_state[code]["status"] = "active"
                    if code in quizzes:
                        quizzes[code]["status"] = "active"
                        
                    # 3. Notify players in the lobby
                    await broadcast(code, {
                        "type": "game_starting",
                        "message": "Scheduled time reached! Quiz starting in 3 seconds..."
                    })
                    
                    # 4. Launch the game loop!
                    import asyncio
                    asyncio.create_task(run_quiz_loop(code))

        except Exception as e:
            print(f"💥 Auto-Starter Error: {e}")
            
        # Check every 10 seconds
        await asyncio.sleep(10)
        
        
async def internal_quest_processor():
    print("⏳ Internal Quest Processor started. Watching for ended quests...")
    while True:
        try:
            review_passed_iso = (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat()
            
            response = supabase.table("quests")\
                .select("*")\
                .eq("is_active", True)\
                .eq("is_draft", False)\
                .eq("rewards_distributed", False)\
                .lt("end_date", review_passed_iso)\
                .execute()
                
            ended_quests = response.data or []
            
            # 👇 THIS LOOP DECLARATION WAS LIKELY MISSING OR INDENTED WRONG 👇
            for quest in ended_quests:
                faucet_address = quest["faucet_address"]
            
                if not faucet_address or not Web3.is_address(faucet_address):
                    print(f"⏭️ Skipping non-EVM address: {faucet_address}")
                    continue    
                print(f"🎯 Quest Ended! Auto-processing rewards for: {faucet_address}")
                
                # --- PER-QUEST MULTI-CHAIN PROCESSING ---
                try:
                    faucet_checksum = smart_checksum(faucet_address)
                    chain_id = quest.get("chain_id", 42220) 
                    
                    # 1. Fetch Token Decimals safely based on chain
                    token_address = quest.get("token_address")
                    decimals = 18 # Default EVM
                    
                    if is_solana_chain(chain_id):
                        decimals = 9 if (not token_address or token_address == "native") else 6
                    else:
                        w3 = await get_web3_instance(chain_id) 
                        contract = w3.eth.contract(address=faucet_checksum, abi=QUEST_ABI)
                        if token_address and token_address != "0x0000000000000000000000000000000000000000":
                            erc20 = w3.eth.contract(address=Web3.to_checksum_address(token_address), abi=ERC20_BALANCE_ABI)
                            decimals = erc20.functions.decimals().call()
                    # 2. Get Leaderboard for this quest
                    participants_res = supabase.table("quest_participants")\
                        .select("wallet_address, points")\
                        .eq("quest_address", faucet_address)\
                        .order("points", desc=True)\
                        .execute()
                        
                    participants = participants_res.data or []
                    
                    # 3. Parse Distribution Config
                    dist_config = quest.get("distribution_config", {})
                    if isinstance(dist_config, str):
                        dist_config = json.loads(dist_config)
                        
                    total_winners = int(dist_config.get("totalWinners", 1))
                    pool_amount = float(quest.get("reward_pool", 0))
                    
                    # 4. Fetch Token Decimals (for Wei conversion)
                    token_address = quest.get("token_address")
                    # Handle both ADDRESS_ZERO and your existing ZeroAddress import variable
                    if token_address and token_address != "0x0000000000000000000000000000000000000000":
                        erc20 = w3.eth.contract(address=smart_checksum(token_address), abi=ERC20_BALANCE_ABI)
                        decimals = erc20.functions.decimals().call()
                    else:
                        decimals = 18
                        
                    winners = []
                    amounts_int = []
                    
                    # FILTER PREP: Remove creator from eligible participants to keep ranks accurate
                    creator_address = quest.get("creator_address", "").lower()
                    valid_participants = [p for p in participants if p["wallet_address"].lower() != creator_address]
                    
                    # --- Handle "Equal" Distribution ---
                    if dist_config.get("model") == "equal" and len(valid_participants) > 0:
                        actual_winners = valid_participants[:total_winners]
                        amount_per_winner = pool_amount / len(actual_winners)
                        amount_wei = int(amount_per_winner * (10 ** decimals))
                        
                        for p in actual_winners:
                            winners.append(smart_checksum(p["wallet_address"]))
                            amounts_int.append(amount_wei)
                            
                    # --- Handle "Quadratic" Distribution ---
                    elif dist_config.get("model") == "quadratic" and len(valid_participants) > 0:
                        actual_winners = valid_participants[:total_winners]
                        
                        # Calculate square roots of points for weights
                        weights = [math.sqrt(p.get("points", 0)) for p in actual_winners]
                        total_weight = sum(weights)
                        
                        for i, p in enumerate(actual_winners):
                            if total_weight > 0:
                                share_pct = weights[i] / total_weight
                                amount_for_user = pool_amount * share_pct
                                
                                if amount_for_user > 0:
                                    winners.append(smart_checksum(p["wallet_address"]))
                                    amounts_int.append(int(amount_for_user * (10 ** decimals)))
                                
                    # --- Handle "Custom Tiers" Distribution ---
                    # --- Handle "Custom Tiers" Distribution ---
                    elif dist_config.get("model") == "custom_tiers" and len(valid_participants) > 0:
                        tiers = dist_config.get("tiers", [])
                        for p in valid_participants:
                            rank = len(winners) + 1
                            amount_for_rank = 0
                            
                            # Find the exact rank in the tiers array
                            for t in tiers:
                                if t.get("rank") == rank:
                                    amount_for_rank = float(t.get("amount", 0))
                                    break
                            
                            if amount_for_rank > 0:
                                winners.append(smart_checksum(p["wallet_address"]))
                                amounts_int.append(int(amount_for_rank * (10 ** decimals)))
                                
                    # 5. Execute Smart Contract Transaction with Backend Signer
                    if len(winners) > 0:
                        print(f"🚀 Pushing {len(winners)} winners to blockchain for {faucet_address}...")
                        tx = build_transaction_with_standard_gas(
                            w3,
                            contract.functions.setRewardAmountsBatch(winners, amounts_int),
                            signer.address
                        )
                        signed_tx = w3.eth.account.sign_transaction(tx, signer.key)
                        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                        
                        await wait_for_transaction_receipt(w3, tx_hash.hex())
                        print(f"✅ Success! Winners logged on chain. Tx: {tx_hash.hex()}")
                    else:
                        print(f"⚠️ No eligible winners found for {faucet_address}. Marking as distributed anyway to close loop.")
                    
                    # 6. Finally, update the database so this quest is never processed again
                    # (This is skipped if an exception is thrown above, allowing it to retry next minute)
                    supabase.table("quests").update({"rewards_distributed": True}).eq("faucet_address", faucet_address).execute()
                    
                except Exception as quest_err:
                    print(f"❌ Error processing specific quest {faucet_address}: {quest_err}")
                    traceback.print_exc()
                    # Do NOT update 'rewards_distributed'. It will retry next loop.
                    
        except Exception as e:
            print(f"💥 Background Processor Major Error: {e}")
            traceback.print_exc()
            
        # Wait 60 seconds before checking the clock again
        await asyncio.sleep(60)


async def internal_quiz_reward_processor():
    print("⏳ Internal Quiz Reward Processor started...")
    while True:
        try:
            # Always acquire a FRESH connection — never reuse across loop iterations
            async with pool.acquire() as conn:
                pending_quizzes = await conn.fetch("""
                    SELECT 
                        q.id,
                        q.code,
                        q.creator_address,
                        q.chain_id,
                        q.faucet_address,
                        COALESCE(r.pool_amount, 0)             as pool_amount,
                        COALESCE(r.token_symbol, '')           as token_symbol,
                        COALESCE(r.token_address, '')          as token_address,
                        COALESCE(r.token_decimals, 18)         as token_decimals,
                        COALESCE(r.total_winners, 1)           as total_winners,
                        COALESCE(r.distribution_type, 'equal') as distribution_type,
                        COALESCE(r.faucet_address, '')         as contract_address
                    FROM faucet_quizzes q
                    INNER JOIN faucet_quiz_rewards r ON r.quiz_id = q.id
                    WHERE q.status            = 'finished'
                      AND r.reward_is_funded  = true
                      AND q.rewards_distributed = false
                      AND r.pool_amount       > 0
                    ORDER BY q.updated_at ASC
                """)

            if not pending_quizzes:
                await asyncio.sleep(60)
                continue

            print(f"[QuizProcessor] Found {len(pending_quizzes)} quiz(zes) pending reward distribution")

            for quiz_row in pending_quizzes:
                code    = quiz_row["code"].upper()
                quiz_id = quiz_row["id"]

                print(f"[QuizProcessor] Processing rewards for quiz {code}...")
                try:
                    # Fetch leaderboard with a fresh connection
                    async with pool.acquire() as conn:
                        participants = await conn.fetch("""
                            SELECT 
                                wallet_address,
                                username,
                                COALESCE(final_points, points, 0) as points,
                                COALESCE(final_rank, 0)           as rank
                            FROM faucet_quiz_participants
                            WHERE quiz_id = $1
                            ORDER BY 
                                COALESCE(final_rank, 9999) ASC,
                                COALESCE(final_points, points, 0) DESC
                        """, quiz_id)

                    if not participants:
                        print(f"[QuizProcessor] {code} — no participants, skipping")
                        await _mark_quiz_rewards_distributed(quiz_id)
                        continue

                    creator = quiz_row["creator_address"].lower()
                    valid_players = [
                        {
                            "walletAddress": p["wallet_address"],
                            "username":      p["username"],
                            "points":        p["points"],
                            "rank":          p["rank"] if p["rank"] > 0 else (i + 1),
                        }
                        for i, p in enumerate(participants)
                        if p["wallet_address"].lower() != creator
                    ]

                    for i, p in enumerate(valid_players):
                        if p["rank"] == 0:
                            p["rank"] = i + 1

                    if not valid_players:
                        print(f"[QuizProcessor] {code} — no valid players after filtering")
                        await _mark_quiz_rewards_distributed(quiz_id)
                        continue

                    # Fetch tiers with a fresh connection
                    async with pool.acquire() as conn:
                        tiers = await conn.fetch("""
                            SELECT rank, percentage, amount
                            FROM faucet_quiz_reward_tiers
                            WHERE quiz_id = $1
                            ORDER BY rank ASC
                        """, quiz_id)

                    distribution = [
                        {"rank": t["rank"], "pct": float(t["percentage"]), "amount": float(t["amount"])}
                        for t in tiers
                    ]

                    total_winners  = int(quiz_row["total_winners"])
                    pool_amount    = float(quiz_row["pool_amount"])
                    token_decimals = int(quiz_row["token_decimals"])
                    token_symbol   = quiz_row["token_symbol"]
                    token_address  = quiz_row["token_address"]
                    dist_type      = quiz_row["distribution_type"]

                    winners       = []
                    human_amounts = {}

                    if dist_type == "equal":
                        actual_winners = valid_players[:total_winners]
                        if not actual_winners:
                            raise ValueError("No players for equal distribution")
                        amount_per = pool_amount / len(actual_winners)
                        amount_wei = int(amount_per * (10 ** token_decimals))
                        for p in actual_winners:
                            winners.append(FinalizeWinner(
                                address=smart_checksum(p["walletAddress"]),
                                amount=str(amount_wei),
                                rank=p["rank"]
                            ))
                            human_amounts[p["walletAddress"].lower()] = round(amount_per, 6)

                    elif dist_type == "quadratic":
                        actual_winners = valid_players[:total_winners]
                        weights        = [math.sqrt(max(p.get("points", 0), 0)) for p in actual_winners]
                        total_weight   = sum(weights)
                        for i, p in enumerate(actual_winners):
                            if total_weight > 0:
                                share      = weights[i] / total_weight
                                amount_per = pool_amount * share
                                amount_wei = int(amount_per * (10 ** token_decimals))
                                if amount_wei > 0:
                                    winners.append(FinalizeWinner(
                                        address=smart_checksum(p["walletAddress"]),
                                        amount=str(amount_wei),
                                        rank=p["rank"]
                                    ))
                                    human_amounts[p["walletAddress"].lower()] = round(amount_per, 6)

                    elif dist_type in ("custom_tiers", "custom"):
                        for tier in distribution:
                            rank         = int(tier.get("rank", 0))
                            amount_human = float(tier.get("amount", 0))
                            if rank < 1 or amount_human <= 0:
                                continue
                            player = next(
                                (p for p in valid_players if p.get("rank") == rank), None
                            )
                            if player:
                                winners.append(FinalizeWinner(
                                    address=smart_checksum(player["walletAddress"]),
                                    amount=str(int(amount_human * (10 ** token_decimals))),
                                    rank=rank
                                ))
                                human_amounts[player["walletAddress"].lower()] = round(amount_human, 6)

                    if not winners:
                        print(f"[QuizProcessor] {code} — no winners calculated")
                        await _mark_quiz_rewards_distributed(quiz_id)
                        continue

                    print(f"[QuizProcessor] {code} — dispatching {len(winners)} winners...")

                    db     = await get_db()
                    result = await finalize_rewards(
                        code=code,
                        body=FinalizeRewardsRequest(winners=winners),
                        db=db
                    )

                    if result.get("success") or result.get("skipped"):
                        print(f"[QuizProcessor] {code} ✅ On-chain dispatch complete!")

                        try:
                            async with pool.acquire() as conn:
                                for w in winners:
                                    wallet       = w.address.lower()
                                    amount_human = human_amounts.get(wallet, 0.0)
                                    player_entry = next(
                                        (p for p in valid_players if p["walletAddress"].lower() == wallet),
                                        None
                                    )
                                    username = player_entry.get("username", "") if player_entry else ""
                                    points   = player_entry.get("points", 0)   if player_entry else 0

                                    await conn.execute("""
                                        INSERT INTO faucet_quiz_reward_payouts
                                            (quiz_id, wallet_address, username, rank, points,
                                            amount, percentage, token_symbol, token_address, chain_id, status)
                                        VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, 'pending')
                                        ON CONFLICT (quiz_id, wallet_address) DO UPDATE
                                            SET amount       = EXCLUDED.amount,
                                                rank         = EXCLUDED.rank,
                                                points       = EXCLUDED.points,
                                                token_symbol = EXCLUDED.token_symbol,
                                                status       = CASE
                                                    WHEN faucet_quiz_reward_payouts.status = 'claimed'
                                                    THEN 'claimed'
                                                    ELSE 'pending'
                                                END
                                    """,
                                        quiz_id, wallet, username, w.rank, points,
                                        amount_human, token_symbol, token_address,
                                        quiz_row["chain_id"],
                                    )
                            print(f"[QuizProcessor] {code} ✅ Payouts saved to DB")
                        except Exception as db_err:
                            print(f"[QuizProcessor] {code} ⚠️ Failed to save payouts: {db_err}")
                            traceback.print_exc()

                        await _mark_quiz_rewards_distributed(quiz_id)

                        if code in connections:
                            await broadcast(code, {
                                "type":    "rewards_dispatched",
                                "winners": [w.dict() for w in winners],
                                "message": "Winners whitelisted! Claim window is now open.",
                            })
                    else:
                        print(f"[QuizProcessor] {code} ❌ On-chain dispatch failed: {result}")

                except (asyncpg.exceptions.ConnectionDoesNotExistError,
                        asyncpg.exceptions.InterfaceError) as db_conn_err:
                    # Stale connection — pool will create a fresh one next iteration
                    print(f"[QuizProcessor] {code} ⚠️ DB connection lost, will retry: {db_conn_err}")
                except Exception as quiz_err:
                    print(f"[QuizProcessor] {code} ❌ Error: {quiz_err}")
                    traceback.print_exc()

        except (asyncpg.exceptions.ConnectionDoesNotExistError,
                asyncpg.exceptions.InterfaceError) as e:
            print(f"[QuizProcessor] ⚠️ Pool connection reset, retrying in 10s: {e}")
            await asyncio.sleep(10)
            continue
        except Exception as e:
            print(f"[QuizProcessor] 💥 Major error: {e}")
            traceback.print_exc()

        await asyncio.sleep(60)

async def _mark_quiz_rewards_distributed(quiz_id: str):
    """Marks quiz as distributed in DB AND in-memory cache."""
    try:
        async with pool.acquire() as conn:
            # 1. Update DB
            await conn.execute("""
                UPDATE faucet_quizzes
                SET rewards_distributed = true,
                    rewards_distributed_at = NOW()
                WHERE id = $1
            """, quiz_id)
            
            # 2. Update Memory Cache (Find the code first)
            code_row = await conn.fetchval("SELECT code FROM faucet_quizzes WHERE id = $1", quiz_id)
            if code_row:
                code = code_row.upper()
                if code in quizzes:
                    quizzes[code]["rewards_distributed"] = True
                    print(f"✅ [Memory] Marked quiz {code} rewards as ready.")

        print(f"[QuizProcessor] Marked quiz {quiz_id} as rewards_distributed=true")
    except Exception as e:
        print(f"[QuizProcessor] Failed to mark quiz {quiz_id} as distributed: {e}")
                
async def db_save_quiz_progress(quiz_id: str, current_q: int, players: dict):
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute("""
                UPDATE faucet_quizzes 
                SET current_question_index = $1
                WHERE id = $2
            """, current_q, quiz_id)

            for addr, player in players.items():
                await conn.execute("""
                    UPDATE faucet_quiz_participants
                    SET points = $1, streak = $2
                    WHERE quiz_id = $3 AND wallet_address = $4
                """, player.get("points", 0), player.get("streak", 0), quiz_id, addr.lower())
        
        
async def load_quizzes_from_db():
    """Optimized Bulk Fetch to prevent N+1 connection timeouts"""
    async with pool.acquire() as conn:
        # 1. Fetch all quizzes
        rows = await conn.fetch("""
            SELECT 
                q.*,
                r.pool_amount,
                r.token_symbol,
                r.total_winners,
                r.distribution_type,
                r.token_address,
                r.token_decimals,
                r.token_logo_url,
                r.faucet_address as reward_contract_address,
                r.reward_is_funded
            FROM faucet_quizzes q
            LEFT JOIN faucet_quiz_rewards r ON r.quiz_id = q.id
            ORDER BY q.created_at DESC
        """)
        
        if not rows:
            return
            
        quiz_ids = [row["id"] for row in rows]

        # 2. Fetch ALL tiers for ALL quizzes in one query
        tiers = await conn.fetch("""
            SELECT quiz_id, rank, percentage, amount
            FROM faucet_quiz_reward_tiers
            WHERE quiz_id = ANY($1)
            ORDER BY rank ASC
        """, quiz_ids)

        # 3. Fetch ALL questions for ALL quizzes in one query
        q_rows = await conn.fetch("""
            SELECT * FROM faucet_quiz_questions 
            WHERE quiz_id = ANY($1) ORDER BY position
        """, quiz_ids)

        question_ids = [q["id"] for q in q_rows]

        # 4. Fetch ALL options for ALL questions in one query
        opts = []
        if question_ids:
            opts = await conn.fetch("""
                SELECT question_id, option_id as id, option_text as text 
                FROM faucet_quiz_question_options 
                WHERE question_id = ANY($1)
            """, question_ids)

        # --- MAP THE DATA IN MEMORY ---
        tier_map = collections.defaultdict(list)
        for t in tiers:
            tier_map[t["quiz_id"]].append({
                "rank": t["rank"], "pct": float(t["percentage"]), "amount": float(t["amount"])
            })

        opt_map = collections.defaultdict(list)
        for o in opts:
            opt_map[o["question_id"]].append({"id": o["id"], "text": o["text"]})

        q_map = collections.defaultdict(list)
        for q in q_rows:
            q_map[q["quiz_id"]].append({
                "question": q["question_text"],
                "options": opt_map[q["id"]],
                "correctId": q["correct_id"],
                "timeLimit": q["time_limit"]
            })

        # --- BUILD THE QUIZ DICTIONARIES ---
        for row in rows:
            code = row["code"].upper()
            
            quiz = {
                "code": code,
                "title": row["title"],
                "description": row["description"],
                "coverImageUrl": row["cover_image_url"],
                "status": row["status"],
                "creatorAddress": row["creator_address"],
                "creatorUsername": row["creator_username"],
                "timePerQuestion": row["time_per_question"],
                "maxParticipants": row["max_participants"],
                "startTime": row["start_time"].isoformat() if row["start_time"] else None,
                "createdAt": row["created_at"].isoformat(),
                "chainId": row["chain_id"],
                "faucetAddress": row["faucet_address"],
                "isAiGenerated": row["is_ai_generated"],
                "db_id": str(row["id"]),
                "questions": q_map[row["id"]],
                "totalQuestions": len(q_map[row["id"]]),
                "reward": {
                    "poolAmount": float(row["pool_amount"]),
                    "tokenSymbol": row["token_symbol"] or "",
                    "tokenAddress": row["token_address"] or "",
                    "tokenDecimals": row["token_decimals"] or 18,
                    "tokenLogoUrl": row["token_logo_url"] or "",
                    "totalWinners": row["total_winners"] or 0,
                    "distributionType": row["distribution_type"] or "equal",
                    "contractAddress": row["reward_contract_address"] or "",
                    "isOnChain": True,
                    "isFunded": row.get("reward_is_funded", False),
                    "distribution": tier_map[row["id"]]
                } if row.get("pool_amount") and float(row["pool_amount"]) > 0 else None,
            }

            quizzes[code] = quiz
            game_state[code] = {
                "status": quiz["status"],
                "players": {},
                "answers": {},
                "prev_ranks": {},
                "current_q": -1,
            }
            connections[code] = []
            player_sockets[code] = {}

    print(f"[Startup] Loaded {len(quizzes)} quizzes from database")


async def load_all_active_quizzes():
    """Optimized Bulk Fetch for Active Quizzes"""
    global quizzes, game_state, connections, player_sockets
    print("[Startup] Loading active quizzes + joined players from DB...")
    
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT 
                q.*,
                COALESCE(r.pool_amount, 0) as pool_amount,
                COALESCE(r.token_symbol, '') as token_symbol,
                COALESCE(r.total_winners, 0) as total_winners,
                COALESCE(r.distribution_type, 'equal') as distribution_type,
                r.token_address,
                r.token_decimals,
                r.token_logo_url,
                r.faucet_address as reward_contract_address,
                r.reward_is_funded
            FROM faucet_quizzes q
            LEFT JOIN faucet_quiz_rewards r ON r.quiz_id = q.id
            WHERE q.status IN ('waiting', 'active')
            ORDER BY q.created_at DESC
        """)

        if not rows:
            return

        quiz_ids = [row["id"] for row in rows]

        # Bulk Fetch Tiers, Questions, Options, and Participants
        tiers = await conn.fetch("SELECT * FROM faucet_quiz_reward_tiers WHERE quiz_id = ANY($1)", quiz_ids)
        q_rows = await conn.fetch("SELECT * FROM faucet_quiz_questions WHERE quiz_id = ANY($1) ORDER BY position", quiz_ids)
        question_ids = [q["id"] for q in q_rows]
        opts = await conn.fetch("SELECT * FROM faucet_quiz_question_options WHERE question_id = ANY($1)", question_ids) if question_ids else []
        participants = await conn.fetch("SELECT * FROM faucet_quiz_participants WHERE quiz_id = ANY($1)", quiz_ids)

        # Map Data
        tier_map = collections.defaultdict(list)
        for t in tiers: tier_map[t["quiz_id"]].append({"rank": t["rank"], "pct": float(t["percentage"]), "amount": float(t["amount"])})
        
        opt_map = collections.defaultdict(list)
        for o in opts: opt_map[o["question_id"]].append({"id": o["option_id"], "text": o["option_text"]})
        
        q_map = collections.defaultdict(list)
        for q in q_rows: q_map[q["quiz_id"]].append({
            "question": q["question_text"], "options": opt_map[q["id"]], 
            "correctId": q["correct_id"], "timeLimit": q["time_limit"]
        })

        p_map = collections.defaultdict(list)
        for p in participants: p_map[p["quiz_id"]].append(p)

        # Assemble
        for row in rows:
            code = row["code"].upper()
            was_active = row["status"] == "active"
            resume_from = row.get("current_question_index") or 0

            quiz = {
                "code": code,
                "title": row["title"],
                "description": row["description"],
                "coverImageUrl": row["cover_image_url"],
                "status": row["status"],
                "creatorAddress": row["creator_address"],
                "creatorUsername": row["creator_username"],
                "timePerQuestion": row["time_per_question"],
                "maxParticipants": row["max_participants"],
                "startTime": row["start_time"].isoformat() if row["start_time"] else None,
                "createdAt": row["created_at"].isoformat(),
                "chainId": row["chain_id"],
                "faucetAddress": row["faucet_address"],
                "isAiGenerated": row["is_ai_generated"],
                "db_id": str(row["id"]),
                "questions": q_map[row["id"]],
                "totalQuestions": len(q_map[row["id"]]),
                "reward": {
                    "poolAmount": float(row["pool_amount"]),
                    "tokenSymbol": row["token_symbol"] or "",
                    "tokenAddress": row["token_address"] or "",
                    "tokenDecimals": row["token_decimals"] or 18,
                    "tokenLogoUrl": row["token_logo_url"] or "",
                    "totalWinners": row["total_winners"] or 0,
                    "distributionType": row["distribution_type"] or "equal",
                    "contractAddress": row["reward_contract_address"] or "",
                    "isOnChain": True,
                    "isFunded": row.get("reward_is_funded", False),
                    "distribution": tier_map[row["id"]]
                } if row.get("pool_amount") and float(row["pool_amount"]) > 0 else None,
            }

            state = {
                "status": row["status"],
                "players": {},
                "answers": {},
                "prev_ranks": {},
                "current_q": resume_from - 1,
            }
            
            for p in p_map[row["id"]]:
                addr = p["wallet_address"]
                state["players"][addr] = {
                    "walletAddress": addr,
                    "username": p["username"],
                    "avatarUrl": p["avatar_url"],
                    "points": p.get("points", 0),
                    "streak": p.get("streak", 0),
                    "pointsThisRound": 0,
                    "answeredCorrectly": False,
                    "joinedAt": row["created_at"].timestamp() * 1000, 
                }

            quizzes[code] = quiz
            game_state[code] = state
            connections[code] = []
            player_sockets[code] = {}

            print(f"[Startup] Loaded quiz {code} | status={row['status']} | players={len(p_map[row['id']])} | resume_from_q={resume_from}")

            if was_active:
                import asyncio
                print(f"[Startup] Resuming quiz {code} from question {resume_from}...")
                asyncio.create_task(run_quiz_loop(code, start_from=resume_from))

    print(f"[Startup] ✅ Loaded {len(quizzes)} active quizzes with their players")  
    
@app.on_event("startup")
async def startup():
    global pool
    db_url = os.getenv("DATABASE_URL", "")
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    pool = await asyncpg.create_pool(
        dsn=db_url,
        min_size=5,
        max_size=20,
        statement_cache_size=0,
        server_settings={"jit": "off"},
    )
    print("✅ DB pool created")
    await load_quizzes_from_db()
    await load_all_active_quizzes()
    asyncio.create_task(internal_quest_processor())
    asyncio.create_task(internal_quiz_reward_processor())
    asyncio.create_task(draft_quest_reminder_processor())  # ← ADD THIS
      
    
@app.on_event("shutdown")
async def shutdown():
    global pool
    if pool:
        await pool.close()
        print("🛑 Postgres connection pool closed.")
# Scheduled task endpoint (can be called by cron jobs)
# ====================== X VERIFICATION ======================
class XVerifyRequest(BaseModel):
    walletAddress: str
    taskId: str
    submittedHandle: str          # What user claims their X is
    submissionId: str             # From your submissions table
    elapsedSeconds: float = 0.0         # Time since button click
    modalElapsedSeconds: float = 0.0    # Time since modal open
    clickedAction: bool = False
class XQuoteVerifyRequest(BaseModel):
    submissionId: str
    walletAddress: str
    taskId: str
    proofUrl: str 
    requiredTag: Optional[str] = None
class XShareVerifyRequest(BaseModel):
    submissionId: str
    walletAddress: str
    taskId: str
    proofUrl: str
    requiredTag: str               # e.g., "#FaucetDrops

async def check_tag_via_oembed(tweet_url: str, required_text: str) -> dict:
    """
    Checks if a tweet exists and contains a specific text (tag, mention, or word) via oEmbed API.
    """
    try:
        # 1. Standardize the required text (lowercase it)
        text_to_check = required_text.lower().strip()
        # 2. Extract username and tweet ID
        match = re.search(r'(?:x\.com|twitter\.com)/([a-zA-Z0-9_]{1,15})/status/(\d+)', tweet_url.lower())
        if not match:
            return {"success": False, "message": "Invalid X URL."}
        standardized_url = f"https://twitter.com/{match.group(1)}/status/{match.group(2)}"
        oembed_url = f"https://publish.twitter.com/oembed?url={standardized_url}"
        # 3. Fetch data
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(oembed_url)
        if response.status_code == 404:
            return {"success": False, "message": "Tweet not found or is private."}
        elif response.status_code != 200:
            return {"success": False, "message": "X verification unavailable."}
        # 4. Check the HTML content for the exact text (e.g., "@faucetdrops")
        data = response.json()
        html_content = data.get("html", "").lower()
        if text_to_check in html_content:
            return {"success": True, "message": f"Required text '{text_to_check}' found!"}
        else:
            return {"success": False, "message": f"Post missing requirement"}
    except Exception as e:
        print(f"oEmbed Tag Check Error: {e}")
        return {"success": False, "message": "Internal error during verification."}


dramatic_verification_tracker = {}


# ====================== X VERIFICATION ======================
@app.post("/api/tasks/verify-x-comment")
async def verify_x_comment(request: XCommentVerifyRequest):
    submission_id = request.submissionId
    try:
        wallet = smart_checksum(request.walletAddress)
        proof_url = request.proofUrl.strip().lower()
 
        profile_res = supabase.table("user_profiles") \
            .select("twitter_handle") \
            .eq("wallet_address", wallet.lower()) \
            .execute()
 
        if not profile_res.data or not profile_res.data[0].get("twitter_handle"):
            await delete_submission(submission_id)
            return {"verified": False, "message": "Please connect your X account in Profile Settings first."}
 
        saved_handle = profile_res.data[0]["twitter_handle"].lower().replace("@", "")
 
        match = re.search(
            r'(?:x\.com|twitter\.com)/([a-zA-Z0-9_]{1,15})/status/(\d+)',
            proof_url
        )
        if not match:
            await delete_submission(submission_id)
            return {"verified": False, "message": "Invalid X URL format."}
 
        url_username = match.group(1)
        tweet_id = match.group(2)
 
        if url_username.lower() == "i":
            url_username = saved_handle
            proof_url = f"https://x.com/{saved_handle}/status/{tweet_id}"
 
        if url_username != saved_handle:
            await delete_submission(submission_id)
            return {"verified": False, "message": "This comment doesn't belong to your linked X account."}
 
        standardized_url = f"https://twitter.com/{url_username}/status/{tweet_id}"
        oembed_api_url = f"https://publish.twitter.com/oembed?url={standardized_url}"
 
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(oembed_api_url)
            except httpx.RequestError:
                await delete_submission(submission_id)
                return {"verified": False, "message": "Network error while checking X. Please try again."}
 
        if response.status_code == 404:
            await delete_submission(submission_id)
            return {"verified": False, "message": "Comment not found. It may be deleted or your account is private."}
        elif response.status_code != 200:
            await delete_submission(submission_id)
            return {"verified": False, "message": "X verification service is currently unavailable."}
 
        sub_data = supabase.table("submissions") \
            .select("faucet_address") \
            .eq("submission_id", submission_id) \
            .execute()
        faucet_addr = sub_data.data[0]["faucet_address"] if sub_data.data else ""
 
        supabase.table("submissions").update({"status": "approved"}) \
            .eq("submission_id", submission_id).execute()
        await process_auto_approval(
            submission_id, faucet_address=faucet_addr, wallet_address=wallet
        )
 
        return {"verified": True, "message": "✅ Comment verified successfully! Points awarded."}
 
    except Exception as e:
        print(f"X Comment Verify Error: {e}")
        await delete_submission(submission_id)   # guaranteed cleanup
        return {"verified": False, "message": "Something went wrong during verification. Try again."}

    

@app.post("/api/tasks/verify-x")
async def verify_x(request: XVerifyRequest, background_tasks: BackgroundTasks):
    try:
        # ==========================================
        # 🐛 DEBUG PRINTS: SEE EXACTLY WHAT ARRIVED
        # ==========================================
        print("\n" + "="*50)
        print("📥 [VERIFY-X] RECEIVED PAYLOAD:")
        print(f"   Task: {request.taskId} | Sub: {request.submissionId}")
        print(f"   Submitted Handle: {request.submittedHandle}")
        print(f"   Modal Open: {request.modalElapsedSeconds}s | Clicked?: {request.clickedAction} | Click Wait: {request.elapsedSeconds}s")
        print("="*50 + "\n")

        wallet = smart_checksum(request.walletAddress)

        # =================================================================
        # 🛡️ 1. PRE-FLIGHT CHECK: X ACCOUNT VALIDATION
        # =================================================================
        submitted_handle = request.submittedHandle.strip().lower().replace("@", "")
        
        # Check if they have a linked Twitter handle in their profile
        profile = supabase.table("user_profiles").select("twitter_handle").eq("wallet_address", wallet.lower()).execute()
            
        if not profile.data or not profile.data[0].get("twitter_handle"):
            print("❌  No X account linked.")
            return {"verified": False, "message": "⚠️ Please connect your X account in Profile Settings first."}
            
        saved_handle = profile.data[0]["twitter_handle"].lower().replace("@", "")
        if saved_handle != submitted_handle:
            print(f"❌ Error trying to verify your X account.")
            return {"verified": False, "message": "❌ Error trying to verify your X account."}

        # =================================================================
        # 🎭 2. THE QUEUE ENGINE (Time-gated Intent) 
        # =================================================================
        
        # We need the faucet address to process points later
        sub_data = supabase.table("submissions").select("faucet_address").eq("submission_id", request.submissionId).execute()
        faucet_addr = sub_data.data[0]["faucet_address"] if sub_data.data else ""

        # 1. Did they open the modal for at least 10 seconds total? (Bot check)
        # 2. Did they actually click the action button?
        # 3. Did they spend at least 10 seconds away after clicking?
        
        if request.modalElapsedSeconds > 10 and request.clickedAction and request.elapsedSeconds >= 10:
            print(f"✅ Success Path! Modal open {request.modalElapsedSeconds}s, Click waited {request.elapsedSeconds}s.")
            # Happy Path: Wait 3 to 10 minutes (180 to 600 seconds)
            delay = random.randint(180, 600)
            is_success = True
        else:
            print(f"❌ Queue Fail Path triggered.")
            # Sad Path: Wait exactly 5 minutes (300 seconds) and fail them
            delay = 300
            is_success = False
            
        # Spawn the background task so we don't freeze the user's screen
        background_tasks.add_task(
            process_delayed_x_verification,
            request.submissionId,
            faucet_addr,
            wallet,
            is_success,
            delay
        )
        
        # Return True immediately so the frontend closes the modal and shows "Reviewing"
        return {
            "verified": True, 
            "message": "⏱️ Submission received! Your post is in queue for verification (usually takes 3-10 mins)."
        }
        
    except Exception as e:
        print(f"X Verify Error: {e}")
        return {"verified": False, "message": "Something went wrong. Try again."} 
      
# ====================== X SYSTEM TASK (SHARE WITH TAG) ======================
@app.post("/api/tasks/verify-x-share")
async def verify_x_share(
    request: XShareVerifyRequest,
    background_tasks: BackgroundTasks
):
    submission_id = request.submissionId
    try:
        wallet = smart_checksum(request.walletAddress)
        proof_url = request.proofUrl.strip().lower()
        required_tag = request.requiredTag.strip()
 
        profile_res = supabase.table("user_profiles") \
            .select("twitter_handle") \
            .eq("wallet_address", wallet.lower()) \
            .execute()
 
        if not profile_res.data or not profile_res.data[0].get("twitter_handle"):
            await delete_submission(submission_id)
            return {"verified": False, "message": "Please connect your X account in Profile Settings first."}
 
        saved_handle = profile_res.data[0]["twitter_handle"].lower().replace("@", "")
 
        match = re.search(
            r'(?:x\.com|twitter\.com)/([a-zA-Z0-9_]{1,15})/status/(\d+)',
            proof_url
        )
        if not match:
            await delete_submission(submission_id)
            return {"verified": False, "message": "Invalid X URL format."}
 
        url_username = match.group(1)
        if url_username.lower() == "i":
            status_id = match.group(2)
            url_username = saved_handle
            proof_url = f"https://x.com/{saved_handle}/status/{status_id}"
 
        if url_username != saved_handle:
            await delete_submission(submission_id)
            return {"verified": False, "message": "Error, do the task and try again."}
 
        tag_check = await check_tag_via_oembed(proof_url, required_tag)
        if not tag_check["success"]:
            await delete_submission(submission_id)
            return {"verified": False, "message": tag_check["message"]}
 
        sub_data = supabase.table("submissions") \
            .select("faucet_address") \
            .eq("submission_id", submission_id) \
            .execute()
        faucet_addr = sub_data.data[0]["faucet_address"] if sub_data.data else ""
 
        supabase.table("submissions").update({"status": "approved"}) \
            .eq("submission_id", submission_id).execute()
        await process_auto_approval(submission_id, faucet_address=faucet_addr, wallet_address=wallet)
 
        try:
            quest_res = supabase.table("quests").select("chain_id") \
                .eq("faucet_address", faucet_addr).execute()
            chain_id = quest_res.data[0].get("chain_id", 42220) if quest_res.data else 42220
            background_tasks.add_task(
                _trigger_quest_action_onchain,
                faucet_addr, wallet, "submitQuest", chain_id
            )
        except Exception as e:
            print(f"⚠️ on-chain submit trigger failed: {e}")
 
        return {"verified": True, "message": "✅ Post verified! Points awarded."}
 
    except Exception as e:
        print(f"X Share Verify Error: {e}")
        await delete_submission(submission_id)   # guaranteed cleanup
        return {"verified": False, "message": "Something went wrong during verification. Try again."}
 
 
# ══════════════════════════════════════════════════════════════
# 7. PATCHED  verify_x_quote
# ══════════════════════════════════════════════════════════════
 
@app.post("/api/tasks/verify-x-quote")
async def verify_x_quote(request: XQuoteVerifyRequest):
    submission_id = request.submissionId
    try:
        wallet = smart_checksum(request.walletAddress)
        proof_url = request.proofUrl.strip().lower()
 
        profile_res = supabase.table("user_profiles") \
            .select("twitter_handle") \
            .eq("wallet_address", wallet.lower()) \
            .execute()
 
        if not profile_res.data or not profile_res.data[0].get("twitter_handle"):
            await delete_submission(submission_id)
            return {"verified": False, "message": "Please connect your X account in Profile Settings first."}
 
        saved_handle = profile_res.data[0]["twitter_handle"].lower().replace("@", "")
 
        match = re.search(
            r'(?:x\.com|twitter\.com)/([a-zA-Z0-9_]{1,15})/status/(\d+)',
            proof_url
        )
        if not match:
            await delete_submission(submission_id)
            return {"verified": False, "message": "Invalid X/Twitter URL format."}
 
        url_username = match.group(1)
        tweet_id = match.group(2)
 
        if url_username == "i":
            url_username = saved_handle
            proof_url = re.sub(
                r'(x\.com|twitter\.com)/i/status/',
                f'x.com/{saved_handle}/status/',
                proof_url
            )
 
        if url_username != saved_handle:
            await delete_submission(submission_id)
            return {"verified": False, "message": "Error: do the task and try again."}
 
        standardized_url = f"https://twitter.com/{url_username}/status/{tweet_id}"
        oembed_api_url = f"https://publish.twitter.com/oembed?url={standardized_url}"
 
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(oembed_api_url)
            except httpx.RequestError:
                await delete_submission(submission_id)
                return {"verified": False, "message": "Network error while checking X. Please try again."}
 
        if response.status_code == 404:
            await delete_submission(submission_id)
            return {"verified": False, "message": "We couldn't find your post. It might be deleted or your account is private."}
        elif response.status_code != 200:
            await delete_submission(submission_id)
            return {"verified": False, "message": "X verification service is currently unavailable. Please try again later."}
 
        if request.requiredTag:
            clean_tag = request.requiredTag.strip().replace("@", "").lower()
            html_content = response.json().get("html", "").lower()
            if clean_tag not in html_content:
                await delete_submission(submission_id)
                return {"verified": False, "message": "Your quote tweet is invalid."}
 
        sub_data = supabase.table("submissions") \
            .select("faucet_address") \
            .eq("submission_id", submission_id) \
            .execute()
        faucet_addr = sub_data.data[0]["faucet_address"] if sub_data.data else ""
 
        supabase.table("submissions").update({"status": "approved"}) \
            .eq("submission_id", submission_id).execute()
        await process_auto_approval(submission_id, faucet_address=faucet_addr, wallet_address=wallet)
 
        return {"verified": True, "message": "✅ Quote verified successfully! Points awarded."}
 
    except Exception as e:
        print(f"X Quote Verify Error: {e}")
        await delete_submission(submission_id)   # guaranteed cleanup
        return {"verified": False, "message": "Something went wrong during verification. Try again."}
    
# ============================================================
# DISCORD AUTO-VERIFICATION ENGINE
# ============================================================
# ---- HELPER: Extract Invite Code ----
def extract_discord_invite_code(url: str) -> str:
    """Extracts the invite code from various Discord link formats."""
    match = re.search(r'(?:discord\.gg/|discord\.com/invite/)([a-zA-Z0-9-]+)', url)
    if match:
        return match.group(1)
    return None
# ---- HELPER: Get Guild ID from Invite ----
import asyncio
import httpx
from functools import lru_cache
# Simple in-memory cache: {invite_code: guild_id}
_invite_cache: dict[str, str] = {}
async def get_guild_id_from_invite(invite_code: str, bot_token: str) -> str | None:
    """
    Resolves a Discord invite code to a guild ID.
    - Uses bot token authentication to avoid rate limits
    - Caches results in-memory to minimize API calls
    - Handles 429 rate limit with retry-after backoff
    """
    if not invite_code:
        print("❌ No invite code extracted")
        return None
    # Return cached result if available
    if invite_code in _invite_cache:
        print(f"✅ Cache hit for invite: {invite_code} → {_invite_cache[invite_code]}")
        return _invite_cache[invite_code]
    print(f"🔍 Resolving invite: {invite_code} (Render live)")
    headers = {
        "Authorization": f"Bot {DISCORD_BOT_TOKEN}",
        "User-Agent": "FaucetDrops-Bot (https://faucetdrops.io, 1.0)",
        "Accept": "application/json"
    }
    url = f"https://discord.com/api/v10/invites/{invite_code}?with_counts=True"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            for attempt in range(3):
                resp = await client.get(url, headers=headers)
                print(f"Discord invite API status: {resp.status_code} (attempt {attempt + 1})")
                if resp.status_code == 200:
                    data = resp.json()
                    guild_id = data.get("guild", {}).get("id")
                    if guild_id:
                        _invite_cache[invite_code] = guild_id
                        print(f"✅ SUCCESS - Guild ID: {guild_id}")
                    else:
                        print("⚠️ 200 OK but no guild ID in response")
                    return guild_id
                elif resp.status_code == 429:
                    retry_after = float(resp.headers.get("Retry-After", 1.0))
                    print(f"⏳ Rate limited. Retrying after {retry_after}s...")
                    await asyncio.sleep(retry_after)
                    continue
                elif resp.status_code == 404:
                    print(f"❌ Invite not found or expired: {invite_code}")
                    return None
                else:
                    print(f"❌ Discord returned {resp.status_code}: {resp.text[:300]}")
                    return None
            print("❌ Exhausted retries after repeated rate limiting")
            return None
    except httpx.TimeoutException:
        print(f"❌ Timeout resolving invite: {invite_code}")
        return None
    except Exception as e:
        print(f"❌ Exception resolving invite: {str(e)}")
        return None
@app.get("/debug/discord-invite")
async def debug_discord_invite(invite: str):
    """Full debug tool for Discord invite resolution on Render"""
    print(f"🔍 DEBUG INVITE REQUEST: {invite}")
    
    # Normalize input
    invite_code = extract_discord_invite_code(invite)
    if not invite_code:
        return {"error": "Invalid invite link", "received": invite}
    print(f"📌 Extracted invite code: {invite_code}")
    headers = {
        "User-Agent": "FaucetDrops-Debug-Bot",
        "Accept": "application/json"
    }
    results = []
    # Try multiple Discord API patterns
    test_urls = [
        f"https://discord.com/api/v10/invites/{invite_code}",
        f"https://discord.com/api/v10/invites/{invite_code}?with_counts=True",
        f"https://discord.com/api/invites/{invite_code}"
    ]
    async with httpx.AsyncClient(timeout=15.0) as client:
        for i, url in enumerate(test_urls):
            try:
                print(f"🌐 Attempt {i+1}: {url}")
                resp = await client.get(url, headers=headers)
                
                result = {
                    "attempt": i+1,
                    "url": url,
                    "status": resp.status_code,
                    "response_preview": resp.text[:500] if resp.text else None
                }
                
                if resp.status_code == 200:
                    data = resp.json()
                    guild_id = data.get("guild", {}).get("id")
                    result["success"] = True
                    result["guild_id"] = guild_id
                    print(f"✅ SUCCESS! Guild ID: {guild_id}")
                else:
                    result["success"] = False
                    print(f"❌ Failed with {resp.status_code}")
                
                results.append(result)
                
            except Exception as e:
                results.append({
                    "attempt": i+1,
                    "url": url,
                    "error": str(e)
                })
                print(f"💥 Exception: {e}")
    return {
        "invite_code": invite_code,
        "original_url": invite,
        "results": results,
        "final_message": "Check the logs above. The first successful guild_id is what matters."
    }
@app.get("/debug/env-check")
async def debug_env():
    return {
        "DISCORD_BOT_TOKEN_set": bool(DISCORD_BOT_TOKEN),
        "DISCORD_BOT_TOKEN_preview": DISCORD_BOT_TOKEN[:12] + "..." if DISCORD_BOT_TOKEN else None,
        "TELEGRAM_BOT_TOKEN_set": bool(TELEGRAM_BOT_TOKEN),
    }
# ---- CORE: Check Membership and Roles ----
class DiscordVerifyRequest(BaseModel):
    submissionId: str
    faucetAddress: str
    walletAddress: str
    taskId: str         # Needed to look up the role requirement in DB
    taskUrl: str        # The Discord invite link
    taskAction: str     # "join" or "role"
class CheckDiscordBotRequest(BaseModel):
    inviteUrl: Optional[str] = None
    serverId: str
PROXY_URL = os.getenv("PROXY_URL") 
@app.post("/api/bot/check-discord-status", tags=["Bot Verification"])
async def check_discord_bot_status(req: CheckDiscordBotRequest):
    if not DISCORD_BOT_TOKEN:
        return {"is_in_server": False, "message": "Bot token not configured"}
    guild_id = req.serverId
    if not guild_id:
        return {"is_in_server": False, "message": "Server ID is required"}
    headers = {
        "Authorization": f"Bot {DISCORD_BOT_TOKEN.strip()}"
    }
    
    # TELL HTTPX TO USE THE PROXY IF ONE EXISTS
    client_options = {"timeout": 15.0}
    if PROXY_URL:
        # MUST BE SINGULAR 'proxy', NOT 'proxies'!
        client_options["proxy"] = PROXY_URL 
    try:
        async with httpx.AsyncClient(**client_options) as client:
            resp = await client.get(
                f"{DISCORD_API_URL}/guilds/{guild_id}",
                headers=headers
            )
            
            if resp.status_code == 200:
                return {"is_in_server": True, "message": "Bot is successfully in the server"}
            else:
                return {"is_in_server": False, "message": f"API Error {resp.status_code}: {resp.text[:100]}"}
    except Exception as e:
        return {"is_in_server": False, "message": f"Proxy/Connection Error: {str(e)}"}
        
# ---- MAIN VERIFICATION ENDPOINT ----
async def check_discord_membership_and_roles(
    guild_id: str,
    discord_user_id: str,
    required_role_id: str = None,
    max_retries: int = 4,
) -> dict:
    if not DISCORD_BOT_TOKEN:
        return {"verified": False, "reason": "server_error", "message": "Bot token missing."}

    headers = {
        "Authorization": f"Bot {DISCORD_BOT_TOKEN.strip()}",
        "Content-Type": "application/json",
    }

    client_options: dict = {"timeout": 20.0}
    if PROXY_URL:
        client_options["proxy"] = PROXY_URL
        print(f"[Discord] 🔀 Using proxy: {PROXY_URL[:40]}...")
    else:
        print(f"[Discord] ⚠️  No proxy — direct connection (will 429 on live)")

    url = f"{DISCORD_API_URL}/guilds/{guild_id}/members/{discord_user_id}"

    for attempt in range(1, max_retries + 1):
        try:
            async with httpx.AsyncClient(**client_options) as client:
                resp = await client.get(url, headers=headers)

            print(f"[Discord] attempt={attempt} status={resp.status_code} guild={guild_id} user={discord_user_id}")

            if resp.status_code == 429:
                body = {}
                try:
                    body = resp.json()
                except Exception:
                    pass
                retry_after = float(body.get("retry_after", 10)) + (2 ** attempt)
                print(f"[Discord] ⚠️  429 rate limit. Waiting {retry_after}s... attempt={attempt}/{max_retries}")
                if attempt < max_retries:
                    await asyncio.sleep(retry_after)
                    continue
                return {
                    "verified": False,
                    "reason": "rate_limited",
                    "message": "Discord is rate limiting our server. Please try again in a minute.",
                }

            if resp.status_code == 200:
                data = resp.json()
                user_roles = data.get("roles", [])
                if not required_role_id:
                    return {"verified": True, "message": "Discord membership confirmed!"}
                if required_role_id in user_roles:
                    return {"verified": True, "message": "Role requirement met!"}
                return {
                    "verified": False,
                    "reason": "missing_role",
                    "message": "You are in the server but do not have the required role yet.",
                }

            elif resp.status_code == 404:
                return {"verified": False, "reason": "not_member", "message": "You have not joined this server."}
            elif resp.status_code == 401:
                print(f"[Discord] ❌ 401 — invalid bot token")
                return {"verified": False, "reason": "server_error", "message": "Bot token is invalid. Contact support."}
            elif resp.status_code == 403:
                return {"verified": False, "reason": "bot_not_in_server", "message": "FaucetDrops Bot is not in this server."}
            else:
                print(f"[Discord] ❌ Unexpected {resp.status_code}: {resp.text[:200]}")
                return {"verified": False, "reason": "api_error", "message": f"Discord API error ({resp.status_code}). Try again."}

        except httpx.ProxyError as e:
            print(f"[Discord] ❌ ProxyError attempt={attempt}: {e}")
            if attempt == max_retries:
                return {"verified": False, "reason": "server_error", "message": "Proxy connection failed. Try again."}
            await asyncio.sleep(3)

        except httpx.TimeoutException as e:
            print(f"[Discord] ❌ Timeout attempt={attempt}: {e}")
            if attempt == max_retries:
                return {"verified": False, "reason": "server_error", "message": "Request timed out. Try again."}
            await asyncio.sleep(3)

        except Exception as e:
            print(f"[Discord] ❌ Error attempt={attempt}: {e}")
            if attempt == max_retries:
                return {"verified": False, "reason": "server_error", "message": "Unexpected error. Try again."}
            await asyncio.sleep(3)

    return {"verified": False, "reason": "rate_limited", "message": "Discord rate limit exhausted. Try again in a minute."}

async def _check_via_bot_api(guild_id: str, discord_user_id: str, required_role_id: str = None) -> dict:
    """Bot API fallback — uses proxy if configured."""
    if not DISCORD_BOT_TOKEN:
        return {"verified": False, "reason": "server_error", "message": "Bot token missing."}

    headers = {
        "Authorization": f"Bot {DISCORD_BOT_TOKEN.strip()}",
        "Content-Type": "application/json",
    }

    client_options: dict = {"timeout": 20.0}
    if PROXY_URL:
        client_options["proxy"] = PROXY_URL
        print(f"[Discord] Bot API via proxy: {PROXY_URL[:40]}...")
    else:
        print("[Discord] Bot API direct (no proxy)")

    url = f"{DISCORD_API_URL}/guilds/{guild_id}/members/{discord_user_id}"

    for attempt in range(1, 4):
        try:
            async with httpx.AsyncClient(**client_options) as client:
                resp = await client.get(url, headers=headers)

            print(f"[Discord] Bot API attempt={attempt} status={resp.status_code}")

            if resp.status_code == 429:
                body = {}
                try:
                    body = resp.json()
                except Exception:
                    pass
                retry_after = float(body.get("retry_after", 10)) + (2 ** attempt)
                print(f"[Discord] 429 — waiting {retry_after}s")
                await asyncio.sleep(retry_after)
                continue

            if resp.status_code == 200:
                data = resp.json()
                user_roles = data.get("roles", [])
                if not required_role_id:
                    return {"verified": True, "message": "Discord membership confirmed!"}
                if required_role_id in user_roles:
                    return {"verified": True, "message": "Role requirement met!"}
                return {"verified": False, "reason": "missing_role", "message": "You do not have the required role yet."}

            elif resp.status_code == 404:
                return {"verified": False, "reason": "not_member", "message": "You have not joined this server."}
            elif resp.status_code == 401:
                return {"verified": False, "reason": "server_error", "message": "Bot token is invalid."}
            elif resp.status_code == 403:
                return {"verified": False, "reason": "bot_not_in_server", "message": "FaucetDrops Bot is not in this server."}
            else:
                return {"verified": False, "reason": "api_error", "message": f"Discord API error ({resp.status_code})."}

        except Exception as e:
            print(f"[Discord] Bot API error attempt={attempt}: {e}")
            if attempt == 3:
                return {"verified": False, "reason": "server_error", "message": "Connection failed. Try again."}
            await asyncio.sleep(3)

    return {"verified": False, "reason": "rate_limited", "message": "Discord rate limit exhausted. Try again in a minute."}

@app.post("/api/bot/verify-discord", tags=["Bot Verification"])
async def verify_discord_task(
    request: DiscordVerifyRequest,
    background_tasks: BackgroundTasks
):
    submission_id = request.submissionId
    try:
        wallet_cs = smart_checksum(request.walletAddress)
        faucet_cs = smart_checksum(request.faucetAddress)
 
        # 1. Fetch Discord ID
        profile_res = supabase.table("user_profiles") \
            .select("discord_id") \
            .eq("wallet_address", wallet_cs.lower()) \
            .execute()
 
        if not profile_res.data or not profile_res.data[0].get("discord_id"):
            await delete_submission(submission_id)
            return {
                "verified": False,
                "reason": "discord_not_linked",
                "message": "⚠️ Connect your Discord in Profile Settings first."
            }
 
        raw_discord_id = profile_res.data[0]["discord_id"]
        discord_user_id = raw_discord_id.split(":")[-1] if ":" in str(raw_discord_id) else raw_discord_id
 
        # 2. Fetch task config
        _, tasks_list = await get_quest_context(faucet_cs)
        target_task = next((t for t in tasks_list if t["id"] == request.taskId), None)
 
        if not target_task:
            await delete_submission(submission_id)
            return {"verified": False, "message": "❌ Task configuration not found."}
 
        guild_id = target_task.get("targetServerId")
        if not guild_id:
            await delete_submission(submission_id)
            return {
                "verified": False,
                "reason": "missing_server_id",
                "message": "❌ The quest creator did not configure the Discord Server ID correctly."
            }
 
        action = target_task.get("action", "join")
        required_role_id = target_task.get("targetHandle") if action in ("role", "verify") else None
 
        # 3. Check membership
        membership = await check_discord_membership_and_roles(
            guild_id, discord_user_id, required_role_id
        )
 
        if membership["verified"]:
            background_tasks.add_task(
                process_auto_approval, submission_id, faucet_cs, wallet_cs
            )
            return {"verified": True, "message": f"✅ {membership['message']} Points awarded."}
 
        # Verification failed — delete so user can retry
        await delete_submission(submission_id)
        return {
            "verified": False,
            "reason": membership["reason"],
            "message": f"❌ {membership['message']}"
        }
 
    except Exception as e:
        print(f"❌ Discord verification error: {e}")
        traceback.print_exc()
        await delete_submission(submission_id)   # guaranteed cleanup
        raise HTTPException(status_code=500, detail=str(e))


def name_to_slug(name: str) -> str:
    """
    Convert a faucet name to a URL-safe slug segment.
    "My Cool Faucet 🚀" → "my-cool-faucet"
    Mirrors the same function in the indexer.
    """
    slug = name.lower()
    slug = re.sub(r"[^\w\s-]", "", slug)   # strip emoji / punctuation
    slug = re.sub(r"[\s_]+", "-", slug)     # spaces → hyphens
    slug = re.sub(r"-+", "-", slug)         # collapse runs
    return slug.strip("-")
def build_faucet_slug(name: str, faucet_address: str) -> str:
    """
    Canonical slug:  "{name-slug}-{last6ofAddress}"
    Example:  "Social Faucet" / 0x...ab1234  →  "social-faucet-ab1234"
    Mirrors build_faucet_slug() in the indexer so slugs are consistent
    even when generated client-side for redirect purposes.
    """
    addr_suffix = faucet_address[-6:].lower()
    return f"{name_to_slug(name)}-{addr_suffix}"
# ═══════════════════════════════════════════════════════════════════
# SLUG LOOKUP ENDPOINT
# Add this alongside the existing /api/faucets/by-slug/{} endpoint.
# ═══════════════════════════════════════════════════════════════════
@app.get("/api/faucet/slug/{slug}", tags=["Faucet Management"])
async def get_faucet_by_slug_endpoint(slug: str):
    """
    Resolve a URL slug → full faucet row.
    Lookup order (same as indexer):
      1. faucet_details.slug       — primary indexed column (fast)
      2. network_faucets.slug      — fallback for rows not yet promoted
      3. faucet_details by address — backward-compat for raw 0x slugs
    Always returns the same shape so the frontend can use
    row.faucet_address for every subsequent API call.
    """
    slug_clean = slug.strip().lower()
    try:
        # ── 1. faucet_details  ──────────────────────────────────────────
        rows = (
            supabase.table("faucet_details")
            .select("*")
            .eq("slug", slug_clean)
            .limit(1)
            .execute()
            .data
        )
        if rows:
            return rows[0]
        # ── 2. network_faucets fallback ──────────────────────────────────
        nf_rows = (
            supabase.table("network_faucets")
            .select("*")
            .eq("slug", slug_clean)
            .limit(1)
            .execute()
            .data
        )
        if nf_rows:
            nf = nf_rows[0]
            addr = nf.get("faucet_address", "")
            # Try to enrich with the full detail row via address
            if addr:
                detail_rows = (
                    supabase.table("faucet_details")
                    .select("*")
                    .eq("faucet_address", addr)
                    .limit(1)
                    .execute()
                    .data
                )
                if detail_rows:
                    row = detail_rows[0]
                    # Patch slug if the detail row was written before slugs existed
                    if not row.get("slug"):
                        row["slug"] = slug_clean
                    return row
            # Return normalised network_faucets shape as last resort
            return {
                "faucet_address":  nf.get("faucet_address"),
                "chain_id":        nf.get("chain_id"),
                "network_name":    nf.get("network_name"),
                "factory_address": nf.get("factory_address"),
                "factory_type":    nf.get("factory_type"),
                "faucet_name":     nf.get("faucet_name"),
                "slug":            nf.get("slug") or slug_clean,
                "token_symbol":    nf.get("token_symbol"),
                "is_ether":        nf.get("is_ether"),
                "is_claim_active": nf.get("is_claim_active"),
                "owner_address":   nf.get("owner_address"),
                "start_time":      nf.get("start_time"),
                # Safe defaults for fields only in faucet_details
                "token_address":   "",
                "token_decimals":  18,
                "balance":         "0",
                "claim_amount":    "0",
                "end_time":        0,
                "is_paused":       False,
                "use_backend":     False,
                "image_url":       "",
                "description":     "",
            }
        # ── 3. Raw 0x address typed into the slug param ──────────────────
        if slug_clean.startswith("0x") and len(slug_clean) == 42:
            addr_rows = (
                supabase.table("faucet_details")
                .select("*")
                .eq("faucet_address", slug_clean)
                .limit(1)
                .execute()
                .data
            )
            if addr_rows:   
                return addr_rows[0]
        raise HTTPException(status_code=404, detail=f"No faucet found for slug '{slug}'")
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 [slug] lookup error for '{slug}': {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
# ── Helper ───────────────────────────────────────────────────
def _is_system_task(task: dict) -> bool:
    """Returns True if a task is a system-managed task."""
    task_id = str(task.get("id", ""))
    return task.get("isSystem", False) or task_id.startswith("sys_")
# ── Endpoints ────────────────────────────────────────────────
@app.patch("/api/quests/{faucet_address}/meta", tags=["Quest Management"])
async def update_quest_meta(faucet_address: str, payload: QuestMetaUpdate):
    """
    Update quest title and/or image URL.
    Reward pool and token details are intentionally NOT editable here.
    Only the quest creator (or an admin) may call this.
    """
    try:
        if not Web3.is_address(faucet_address) or not Web3.is_address(payload.adminAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
        faucet_cs = smart_checksum(faucet_address)
        admin_cs  = smart_checksum(payload.adminAddress)
        # 1. Verify caller is the quest creator
        quest_res = supabase.table("quests").select("creator_address").eq(
            "faucet_address", faucet_cs
        ).execute()
        if not quest_res.data:
            raise HTTPException(status_code=404, detail="Quest not found")
        creator = quest_res.data[0]["creator_address"]
        if creator.lower() != admin_cs.lower() and admin_cs.lower() != PLATFORM_OWNER.lower():
            raise HTTPException(status_code=403, detail="Only the quest creator can edit meta")
        # 2. Build update dict — only allowed fields
        update_data: dict = {"updated_at": datetime.now().isoformat()}
        
        if payload.title is not None:
            title = payload.title.strip()
            if len(title) < 3:
                raise HTTPException(status_code=400, detail="Title must be at least 3 characters")
            update_data["title"] = title
            
        if payload.imageUrl is not None:
            update_data["image_url"] = payload.imageUrl
        # 👇 ADD THESE TWO BLOCKS 👇
        if payload.distributionConfig is not None:
            update_data["distribution_config"] = payload.distributionConfig
            
        if payload.rewardPool is not None:
            update_data["reward_pool"] = payload.rewardPool
        if len(update_data) == 1:  # only updated_at → nothing to change
            return {"success": True, "message": "No changes requested"}
        # 3. Persist to DB
        res = supabase.table("quests").update(update_data).eq(
            "faucet_address", faucet_cs
        ).execute()
        # 3. Persist
        res = supabase.table("quests").update(update_data).eq(
            "faucet_address", faucet_cs
        ).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Update failed")
        print(f"✅ Quest meta updated for {faucet_cs}: {list(update_data.keys())}")
        return {"success": True, "message": "Quest metadata updated", "updated": update_data}
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 update_quest_meta error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
@app.patch("/api/quests/{faucet_address}/tasks", tags=["Quest Management"])
async def update_quest_tasks(faucet_address: str, payload: QuestTasksUpdate):
    """
    Replace the user-defined (non-system) tasks for a quest.
    • System tasks (id starts with 'sys_' or isSystem=True) already stored in
      the DB are automatically preserved and re-appended after the update.
    • Caller must be the quest creator.
    • Points must be positive integers.
    • Stage must be one of: Beginner, Intermediate, Advance, Legend, Ultimate.
    """
    VALID_STAGES = {"Beginner", "Intermediate", "Advance", "Legend", "Ultimate"}
    try:
        if not Web3.is_address(faucet_address) or not Web3.is_address(payload.adminAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
        faucet_cs = smart_checksum(faucet_address)
        admin_cs  = smart_checksum(payload.adminAddress)
        # 1. Auth check
        quest_res = supabase.table("quests").select("creator_address").eq(
            "faucet_address", faucet_cs
        ).execute()
        if not quest_res.data:
            raise HTTPException(status_code=404, detail="Quest not found")
        creator = quest_res.data[0]["creator_address"]
        if creator.lower() != admin_cs.lower() and admin_cs.lower() != PLATFORM_OWNER.lower():
            raise HTTPException(status_code=403, detail="Only the quest creator can perform this action")
        # 2. Validate incoming tasks
        incoming_tasks = []
        for t in payload.tasks:
            task_dict = t.dict()
            # Block system task IDs from being submitted via this route
            if _is_system_task(task_dict):
                raise HTTPException(
                    status_code=400,
                    detail=f"System task '{t.id}' cannot be edited via this endpoint"
                )
            # Validate stage
            if t.stage not in VALID_STAGES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid stage '{t.stage}' for task '{t.id}'"
                )
            # Validate points
            try:
                pts = int(t.points)
                if pts < 0:
                    raise ValueError
                task_dict["points"] = pts
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=400,
                    detail=f"Points must be a non-negative integer for task '{t.id}'"
                )
            incoming_tasks.append(task_dict)
        # 3. Fetch current tasks to preserve system tasks
        existing_res = supabase.table("faucet_tasks").select("tasks").eq(
            "faucet_address", faucet_cs
        ).execute()
        system_tasks = []
        if existing_res.data:
            all_existing = existing_res.data[0].get("tasks") or []
            system_tasks = [t for t in all_existing if _is_system_task(t)]
        # 4. Merge: system tasks first, then user tasks
        merged_tasks = system_tasks + incoming_tasks
        # 5. Upsert faucet_tasks
        upsert_payload = {
            "faucet_address": faucet_cs,
            "tasks": merged_tasks,
            "created_by": admin_cs,
            "updated_at": datetime.now().isoformat(),
        }
        res = supabase.table("faucet_tasks").upsert(
            upsert_payload, on_conflict="faucet_address"
        ).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Task update failed")
        print(
            f"✅ Tasks updated for {faucet_cs}: "
            f"{len(system_tasks)} system + {len(incoming_tasks)} user tasks"
        )
        return {
            "success": True,
            "message": f"Tasks updated ({len(incoming_tasks)} user tasks, {len(system_tasks)} system tasks preserved)",
            "totalTasks": len(merged_tasks),
            "systemTasksPreserved": len(system_tasks),
            "userTasksCount": len(incoming_tasks),
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 update_quest_tasks error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/api/quests/{faucet_address}/tasks/editable", tags=["Quest Management"])
async def get_editable_tasks(faucet_address: str, adminAddress: str):
    """
    Returns only the user-editable (non-system) tasks for the admin panel.
    System tasks are excluded from the response.
    """
    try:
        if not Web3.is_address(faucet_address) or not Web3.is_address(adminAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
        faucet_cs = smart_checksum(faucet_address)
        admin_cs  = smart_checksum(adminAddress)
        # Auth check
        quest_res = supabase.table("quests").select("creator_address").eq(
            "faucet_address", faucet_cs
        ).execute()
        if not quest_res.data:
            raise HTTPException(status_code=404, detail="Quest not found")
        creator = quest_res.data[0]["creator_address"]
        if creator.lower() != admin_cs.lower() and admin_cs.lower() != PLATFORM_OWNER.lower():
            raise HTTPException(status_code=403, detail="Only the quest creator can perform this action")
        # Fetch tasks
        tasks_res = supabase.table("faucet_tasks").select("tasks").eq(
            "faucet_address", faucet_cs
        ).execute()
        all_tasks = []
        if tasks_res.data:
            all_tasks = tasks_res.data[0].get("tasks") or []
        user_tasks   = [t for t in all_tasks if not _is_system_task(t)]
        system_tasks = [t for t in all_tasks if _is_system_task(t)]
        return {
            "success": True,
            "userTasks": user_tasks,
            "systemTasksCount": len(system_tasks),
            "totalTasks": len(all_tasks),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# ============================================================
# TELEGRAM AUTO-VERIFICATION ENGINE
# ============================================================
import httpx
from fastapi import BackgroundTasks
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
# ---- HELPER: Extract Chat ID from URL ----
def extract_telegram_chat_id(url: str) -> str:
    """
    Extracts the username/handle from a Telegram link.
    Supports: t.me/mychannel, t.me/+inviteHash, @mychannel
    """
    import re
    # Handle invite links (private groups) — can't check membership, return None
    if "/+" in url or "joinchat" in url:
        return None  # Private group — can't auto-verify
    
    match = re.search(r't\.me/([a-zA-Z0-9_]+)', url)
    if match:
        return f"@{match.group(1)}"
    
    # Already a handle
    if url.startswith("@"):
        return url
    
    return None
# ---- CORE: Check if user is member of a chat ----
async def check_telegram_membership(
    chat_id: str,           # e.g. "@mychannel" or numeric chat ID
    telegram_user_id: str   # User's Telegram numeric ID
) -> dict:
    """
    Uses getChatMember API to verify if user is in a group/channel.
    Bot must be an admin of the target chat.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{TELEGRAM_API}/getChatMember",
                json={
                    "chat_id": chat_id,
                    "user_id": int(telegram_user_id)
                }
            )
            data = resp.json()
            
            if not data.get("ok"):
                error_desc = data.get("description", "Unknown error")
                
                # Bot is not admin in the chat
                if "bot is not a member" in error_desc or "CHAT_ADMIN_REQUIRED" in error_desc:
                    return {
                        "success": False,
                        "verified": False,
                        "reason": "bot_not_admin",
                        "message": "Bot is not an admin in this chat. Ask the channel owner to add @YourQuestBot as admin."
                    }
                
                # User not found
                if "user not found" in error_desc or "USER_ID_INVALID" in error_desc:
                    return {
                        "success": False,
                        "verified": False,
                        "reason": "user_not_found",
                        "message": "Could not find your Telegram account. Make sure your Telegram ID is linked in your profile."
                    }
                
                return {
                    "success": False,
                    "verified": False,
                    "reason": "api_error",
                    "message": error_desc
                }
            
            member = data.get("result", {})
            status = member.get("status")
            
            # Valid member statuses
            is_member = status in ["member", "administrator", "creator", "restricted"]
            # Excluded: "left", "kicked", "banned"
            
            return {
                "success": True,
                "verified": is_member,
                "status": status,
                "reason": "verified" if is_member else "not_member",
                "message": "Membership confirmed!" if is_member else f"User has not joined. Status: {status}"
            }
            
    except Exception as e:
        print(f"❌ Telegram API Error: {e}")
        return {
            "success": False,
            "verified": False,
            "reason": "exception",
            "message": str(e)
        }
# ---- VERIFY BOT IS ADMIN IN CHAT ----
async def verify_bot_is_admin(chat_id: str) -> dict:
    """
    Checks if our bot has admin rights in the target channel/group.
    Called when admin sets up the task to validate configuration.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Get bot's own info first
            me_resp = await client.get(f"{TELEGRAM_API}/getMe")
            me_data = me_resp.json()
            if not me_data.get("ok"):
                return {"is_admin": False, "message": "Could not fetch bot info"}
            
            bot_id = me_data["result"]["id"]
            bot_username = me_data["result"]["username"]
            
            # Check bot's membership in the chat
            member_resp = await client.post(
                f"{TELEGRAM_API}/getChatMember",
                json={"chat_id": chat_id, "user_id": bot_id}
            )
            member_data = member_resp.json()
            
            if not member_data.get("ok"):
                return {
                    "is_admin": False,
                    "bot_username": bot_username,
                    "message": f"Bot @{bot_username} is not in this chat or chat doesn't exist."
                }
            
            status = member_data["result"].get("status")
            is_admin = status in ["administrator", "creator"]
            
            return {
                "is_admin": is_admin,
                "bot_username": bot_username,
                "status": status,
                "message": f"Bot @{bot_username} is {'an admin ✅' if is_admin else 'NOT an admin ❌'} in this chat."
            }
            
    except Exception as e:
        return {"is_admin": False, "message": str(e)}
# ---- MAIN: Telegram Task Verification Endpoint ----
class TelegramVerifyRequest(BaseModel):
    submissionId: str
    faucetAddress: str
    walletAddress: str
    taskUrl: str        # The Telegram channel/group link (from task.url)
    taskAction: str     # "join", "subscribe", etc.

@app.post("/api/telegram/backfill-updates", tags=["Telegram"])
async def backfill_telegram_updates():
    """
    One-time use: fetches all pending updates from Telegram and
    processes message counts into the DB.
    Call this once after setting the webhook to recover lost messages.
    """
    processed = 0
    skipped   = 0
    counted   = 0

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{TELEGRAM_API_URL}/getUpdates?limit=100")
            data = resp.json()

        if not data.get("ok"):
            return {"success": False, "error": data.get("description")}

        updates = data.get("result", [])
        print(f"[BACKFILL] Found {len(updates)} pending updates")

        for update in updates:
            message = update.get("message") or update.get("channel_post")
            if not message:
                skipped += 1
                continue

            sender    = message.get("from", {})
            chat      = message.get("chat", {})
            chat_type = chat.get("type", "")
            user_id   = str(sender.get("id", ""))
            chat_id   = str(chat.get("id", ""))
            is_bot    = sender.get("is_bot", False)
            text      = message.get("text", "") or ""

            # Only count real user messages in groups (skip join events, bot msgs, etc.)
            if (
                not is_bot
                and user_id
                and chat_id
                and chat_type in ("group", "supergroup")
                and not message.get("new_chat_members")      # skip join events
                and not message.get("new_chat_participant")  # skip join events
                and not message.get("left_chat_member")      # skip leave events
            ):
                _upsert_message_count(user_id, chat_id)
                counted += 1
                print(f"[BACKFILL] Counted msg from user={user_id} in chat={chat_id} | text='{text[:30]}'")
            else:
                skipped += 1

            processed += 1

        # Tell Telegram we've processed everything so it clears the queue
        if updates:
            last_update_id = updates[-1]["update_id"]
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.get(f"{TELEGRAM_API_URL}/getUpdates?offset={last_update_id + 1}")
            print(f"[BACKFILL] ✅ Cleared queue up to update_id={last_update_id}")

        return {
            "success":   True,
            "total":     processed,
            "counted":   counted,
            "skipped":   skipped,
        }

    except Exception as e:
        print(f"[BACKFILL] ❌ Error: {e}")
        traceback.print_exc()
        return {"success": False, "error": str(e)}
    
@app.post("/api/bot/verify-telegram")
async def verify_telegram_task(
    request: TelegramVerifyRequest,
    background_tasks: BackgroundTasks
):
    submission_id = request.submissionId
    try:
        wallet_cs = smart_checksum(request.walletAddress)
        faucet_cs = smart_checksum(request.faucetAddress)
 
        profile_res = supabase.table("user_profiles") \
            .select("telegram_user_id, telegram_handle, username") \
            .eq("wallet_address", wallet_cs.lower()) \
            .execute()
 
        if not profile_res.data or not profile_res.data[0].get("telegram_user_id"):
            await delete_submission(submission_id)
            return {
                "verified": False,
                "reason": "telegram_not_linked",
                "message": "⚠️ Connect your Telegram in Profile Settings first."
            }
 
        telegram_user_id = profile_res.data[0]["telegram_user_id"]
        chat_id = extract_telegram_chat_id(request.taskUrl)
 
        if not chat_id:
            await delete_submission(submission_id)
            return {
                "verified": False,
                "reason": "private_group",
                "message": "❌ Cannot verify private groups automatically."
            }
 
        bot_check = await verify_bot_is_admin(chat_id)
        if not bot_check["is_admin"]:
            await delete_submission(submission_id)
            return {
                "verified": False,
                "reason": "bot_not_admin",
                "message": "❌ Bot verification unavailable for this channel.",
                "bot_username": bot_check.get("bot_username")
            }
 
        membership = await check_telegram_membership(chat_id, telegram_user_id)
 
        if membership["verified"]:
            background_tasks.add_task(
                process_auto_approval, submission_id,
                request.faucetAddress, request.walletAddress
            )
            return {
                "verified": True,
                "message": "✅ Telegram membership verified! Points awarded.",
                "status": membership.get("status")
            }
 
        await delete_submission(submission_id)
        return {
            "verified": False,
            "reason": "not_member",
            "message": "❌ You are not a member of this channel yet. Join first then try again."
        }
 
    except Exception as e:
        print(f"❌ Telegram verification error: {e}")
        traceback.print_exc()
        await delete_submission(submission_id)   # guaranteed cleanup
        raise HTTPException(status_code=500, detail=str(e))
 

# ---- ADMIN: Verify Bot Setup for a Channel ----
class BotAdminCheckRequest(BaseModel):
    channelUrl: str
    
@app.post("/api/bot/check-telegram-admin")
async def check_bot_admin_status(request: BotAdminCheckRequest):
    """
    Quest creators call this when setting up a Telegram task.
    Returns whether the bot is already admin in their channel.
    """
    chat_id = extract_telegram_chat_id(request.channelUrl)
    
    if not chat_id:
        return {
            "success": False,
            "is_admin": False,
            "message": "Invalid or private Telegram link. Only public channels/groups support auto-verification."
        }
    
    result = await verify_bot_is_admin(chat_id)
    
    # Get bot username for display
    async with httpx.AsyncClient() as client:
        me = await client.get(f"{TELEGRAM_API}/getMe")
        bot_username = me.json().get("result", {}).get("username", "YourQuestBot")
    
    return {
        "success": True,
        "chat_id": chat_id,
        "is_admin": result["is_admin"],
        "bot_username": bot_username,
        "instructions": f"Add @{bot_username} as an admin to {chat_id} to enable auto-verification.",
        "message": result["message"]
    }
# ---- WEBHOOK: Telegram Bot receives messages (optional but useful) ----
@app.post("/api/telegram/webhook")
async def telegram_webhook(request: Request):
    """
    Receives updates from Telegram (when users interact with the bot directly).
    Set this as your webhook: https://api.telegram.org/bot{TOKEN}/setWebhook?url=YOUR_URL/api/telegram/webhook
    """
    try:
        body = await request.json()
        message = body.get("message") or body.get("channel_post", {})
        
        if not message:
            return {"ok": True}
        
        chat_id = message.get("chat", {}).get("id")
        text = message.get("text", "")
        user = message.get("from", {})
        user_id = user.get("id")
        username = user.get("username", "")
        
        # Respond to /start command
        if text == "/start":
            await send_telegram_message(
                chat_id,
                f"👋 Hi @{username}!\n\n"
                f"I'm the FaucetDrops Quest Bot 🤖\n\n"
                f"To use auto-verification:\n"
                f"1. Link your Telegram account in your FaucetDrops profile\n"
                f"2. Your Telegram User ID: `{user_id}`\n\n"
                f"Copy your ID above and paste it in your profile settings!"
            )
        
        # Respond to /myid command
        elif text == "/myid":
            await send_telegram_message(
                chat_id,
                f"🆔 Your Telegram User ID: `{user_id}`\n\n"
                f"Use this in your FaucetDrops profile to enable auto-verification!"
            )
        
        return {"ok": True}
        
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"ok": True}  # Always return 200 to Telegram
async def send_telegram_message(chat_id: int, text: str):
    async with httpx.AsyncClient() as client:
        await client.post(f"{TELEGRAM_API}/sendMessage", json={
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "Markdown"
        })
import asyncio
import logging
import os
import time
from decimal import Decimal
from typing import Optional
import asyncpg
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)
from web3 import Web3
from web3.exceptions import ContractLogicError
try:
    from web3.middleware import ExtraDataToPOAMiddleware as _poa_middleware  # web3 >= 6
except ImportError:
    from web3.middleware import geth_poa_middleware as _poa_middleware  # web3 < 6
from web3.types import TxReceipt
logger = logging.getLogger(__name__)
router = APIRouter(tags=["quiz-onchain"])
# ── Config ─────────────────────────────────────────────────────────────────────
RPC_URLS: dict[int, str] = {
    42220: os.getenv("RPC_CELO",  "https://forno.celo.org"),
    11142220: os.getenv("RPC_CELO_SEPOLIA",  "https://sepolia.celo.org"),
    1135:  os.getenv("RPC_LISK",  "https://rpc.api.lisk.com"),
    42161: os.getenv("RPC_ARB",   "https://arb1.arbitrum.io/rpc"),
    8453:  os.getenv("RPC_BASE",  "https://mainnet.base.org"),
    56:    os.getenv("RPC_BNB",   "https://bsc-dataseed.binance.org"),
}
BACKEND_PRIVATE_KEY_A: str  = os.getenv("BACKEND_PRIVATE_KEY_A", "")
BACKUP_PRIVATE_KEY_B:  str  = os.getenv("BACKUP_PRIVATE_KEY_B", "")
DATABASE_URL:          str  = os.getenv("DATABASE_URL", "")
RPC_TIMEOUT:           int  = int(os.getenv("RPC_TIMEOUT_SECONDS",     "30"))
TX_WAIT_TIMEOUT:       int  = int(os.getenv("TX_WAIT_TIMEOUT_SECONDS", "120"))
MAX_GAS_MULTIPLIER:    float = float(os.getenv("MAX_GAS_MULTIPLIER",   "1.2"))
# ── ABI fragments ──────────────────────────────────────────────────────────────

# ── Custom Exceptions ──────────────────────────────────────────────────────────
class OnChainError(Exception):
    """Base on-chain error."""
class ContractRevertedError(OnChainError):
    """Tx was sent but reverted."""
class NonceTooLowError(OnChainError):
    """Nonce collision — safe to retry."""
class InsufficientFundsError(OnChainError):
    """Backend wallet has no gas."""
class RPCError(OnChainError):
    """RPC node unreachable or errored."""


    # ── DB Pool ────────────────────────────────────────────────────────────────────
_db_pool: Optional[asyncpg.Pool] = None

async def get_db() -> asyncpg.Pool:
    global _db_pool
    if _db_pool is None:
        if not DATABASE_URL:
            raise RuntimeError("DATABASE_URL not set")
        _db_pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=2,
            max_size=10,
            command_timeout=30,
            statement_cache_size=0,  # required for pgbouncer transaction mode
        )
    return _db_pool


async def close_db():
    global _db_pool
    if _db_pool:
        await _db_pool.close()
        _db_pool = None
# ── Per-chain nonce serialisation ──────────────────────────────────────────────
# One asyncio.Lock per chain keeps transactions sequential, preventing nonce collisions.
_chain_locks: dict[int, asyncio.Lock] = {}
_chain_locks_guard: asyncio.Lock = asyncio.Lock()
async def _get_chain_lock(chain_id: int) -> asyncio.Lock:
    async with _chain_locks_guard:
        if chain_id not in _chain_locks:
            _chain_locks[chain_id] = asyncio.Lock()
        return _chain_locks[chain_id]
# ── Web3 instances (cached per chain) ─────────────────────────────────────────
_w3_cache: dict[int, Web3] = {}
def _get_w3(chain_id: int) -> Web3:
    if chain_id in _w3_cache:
        return _w3_cache[chain_id]
    rpc = RPC_URLS.get(chain_id)
    if not rpc:
        raise OnChainError(f"No RPC configured for chainId {chain_id}")
    w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": RPC_TIMEOUT}))
    w3.middleware_onion.inject(_poa_middleware, layer=0)
    if not w3.is_connected():
        raise RPCError(f"Cannot connect to RPC for chainId {chain_id}: {rpc}")
    _w3_cache[chain_id] = w3
    return w3

def _get_signer(use_backup: bool = False):
    """
    Loads the explicit PRIVATE_KEY from environment variables to act as the backend signer.
    """
    if use_backup:
        # If you have a backup key, you can define it here. 
        # Otherwise, just fall back to the main one or raise an error.
        pk = os.getenv("PRIVATE_KEY") or os.getenv("PRIVATE_KEY")
    else:
        pk = os.getenv("PRIVATE_KEY")

    if not pk:
        raise ValueError("❌ PRIVATE_KEY environment variable is not set! Check your .env file or hosting config.")
    
    # Web3.py expects the key to ideally start with '0x'
    if not pk.startswith("0x"):
        pk = "0x" + pk
        
    account = Account.from_key(pk)
    
    return account

# ── Transaction sender ────────────────────────────────────────────────────────
@retry(
    retry=retry_if_exception_type(NonceTooLowError),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=3),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
def _send_tx_sync(w3: Web3, account, built_tx: dict, chain_id: int) -> str:
    """Blocking: sign, broadcast, wait for receipt. Retries on nonce errors."""
    try:
        built_tx["from"]  = account.address
        built_tx["nonce"] = w3.eth.get_transaction_count(account.address, "pending")
        try:
            estimated = w3.eth.estimate_gas(built_tx)
            built_tx["gas"] = int(estimated * MAX_GAS_MULTIPLIER)
        except ContractLogicError as e:
            raise ContractRevertedError(f"Simulation failed (would revert): {e}") from e
        signed   = account.sign_transaction(built_tx)
        raw_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt: TxReceipt = w3.eth.wait_for_transaction_receipt(
            raw_hash, timeout=TX_WAIT_TIMEOUT
        )
        if receipt["status"] != 1:
            raise ContractRevertedError(f"Reverted on-chain: 0x{raw_hash.hex()}")
        return "0x" + raw_hash.hex()
    except Exception as e:
        msg = str(e).lower()
        if "nonce too low" in msg or "replacement transaction underpriced" in msg:
            raise NonceTooLowError(str(e)) from e
        if "insufficient funds" in msg:
            raise InsufficientFundsError(str(e)) from e
        if any(k in msg for k in ("connection", "timeout", "rpc", "socket")):
            raise RPCError(str(e)) from e
        raise
async def _send_tx(chain_id: int, built_tx: dict) -> str:
    """
    Async entry point: acquires the per-chain lock, then runs the blocking
    send in a thread. Falls back to the backup key on InsufficientFunds.
    """
    lock = await _get_chain_lock(chain_id)
    w3   = _get_w3(chain_id)
    async with lock:
        for use_backup in (False, True):
            try:
                account = _get_signer(use_backup)
                return await asyncio.get_event_loop().run_in_executor(
                    None, _send_tx_sync, w3, account, built_tx.copy(), chain_id
                )
            except InsufficientFundsError:
                if use_backup:
                    raise
                logger.warning("Primary wallet has insufficient funds — switching to backup")
                continue

# ── DB helpers ─────────────────────────────────────────────────────────────────

async def call_gemini(prompt: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            GEMINI_URL,
            params={"key": GEMINI_API_KEY},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 8192,
                    "responseMimeType": "application/json",
                },
            },
        )
    if resp.status_code != 200:
        raise Exception(f"Gemini failed: {resp.status_code} {resp.text}")
    raw = resp.json()
    text = raw["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(text)


async def call_groq(prompt: str) -> dict:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a quiz master. Return ONLY valid JSON, no markdown, no extra text.",
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.7,
                "max_tokens": 8192,
            },
        )
    if resp.status_code != 200:
        raise Exception(f"Groq failed: {resp.status_code} {resp.text}")
    raw = resp.json()
    text = raw["choices"][0]["message"]["content"]
    # Strip markdown fences if Groq wraps in ```json ... ```
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text.strip())
    return json.loads(text)


async def generate_quiz_data(body: GenerateQuizRequest) -> dict:
    """Try Gemini first, fall back to Groq."""
    prompt = f"""
You are a quiz master. Generate exactly {body.numQuestions} multiple-choice questions about "{body.topic}".
Difficulty: {body.difficulty}.
Return ONLY valid JSON (no markdown, no extra text):
{{
  "title": "Quiz title here",
  "questions": [
    {{
      "question": "Question text?",
      "options": [
        {{"id": "A", "text": "Option A"}},
        {{"id": "B", "text": "Option B"}},
        {{"id": "C", "text": "Option C"}},
        {{"id": "D", "text": "Option D"}}
      ],
      "correctId": "B",
      "timeLimit": {body.timePerQuestion}
    }}
  ]
}}
Rules: 4 options per question, correctId in [A,B,C,D], vary correct answer positions.
"""
    # ── Try Gemini ──
    if GEMINI_API_KEY:
        try:
            print("DEBUG: Trying Gemini...")
            data = await call_gemini(prompt)
            print("DEBUG: Gemini succeeded.")
            return data
        except Exception as e:
            print(f"WARNING: Gemini failed ({e}), falling back to Groq...")

    # ── Fallback: Groq ──
    if GROQ_API_KEY:
        try:
            print("DEBUG: Trying Groq fallback...")
            data = await call_groq(prompt)
            print("DEBUG: Groq succeeded.")
            return data
        except Exception as e:
            print(f"ERROR: Groq also failed: {e}")
            raise HTTPException(status_code=502, detail=f"Both Gemini and Groq failed. Last error: {e}")

    raise HTTPException(status_code=502, detail="No AI provider configured (set GEMINI_API_KEY or GROQ_API_KEY)")

async def db_save_final_leaderboard(quiz_id: str, leaderboard: list):
    """Save final ranked leaderboard to faucet_quiz_participants after game ends."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            for entry in leaderboard:
                await conn.execute("""
                    UPDATE faucet_quiz_participants
                    SET final_points = $1,
                        final_rank   = $2,
                        streak       = $3
                    WHERE quiz_id = $4 AND wallet_address = $5
                """,
                    entry.get("points", 0),
                    entry.get("rank", 0),
                    entry.get("streak", 0),
                    quiz_id,
                    entry["walletAddress"].lower(),
                )

async def _get_quiz_contract(code: str, db: asyncpg.Pool) -> dict:
    # Use acquire() explicitly to avoid pgbouncer prepared statement issues
    async with db.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT 
                r.faucet_address as reward_contract_address,
                q.chain_id,
                r.token_decimals as reward_token_decimals,
                q.reward_is_funded
            FROM faucet_quizzes q
            LEFT JOIN faucet_quiz_rewards r ON r.quiz_id = q.id
            WHERE q.code = $1
        """, code)

    if not row:
        raise HTTPException(status_code=404, detail=f"Quiz '{code}' not found")
    if not row["reward_contract_address"]:
        raise HTTPException(status_code=409, detail=f"Quiz '{code}' has no on-chain reward contract")

    return {
        "contractAddress": row["reward_contract_address"],
        "chainId":         row["chain_id"],
        "tokenDecimals":   row["reward_token_decimals"] or 18,
        "isFunded":        row["reward_is_funded"] or False,
    }
    
    
async def _record_join_db(code: str, wallet: str, tx_hash: str, db: asyncpg.Pool):
    await db.execute(
        """
        INSERT INTO faucet_quiz_participants (quiz_id, wallet_address, joined_tx_hash)
        SELECT id, $2, $3 FROM faucet_quizzes WHERE code = $1
        ON CONFLICT (quiz_id, wallet_address) DO NOTHING
        """,
        code, wallet.lower(), tx_hash,
    )
    
    
async def _record_submission_db(
    code: str, wallet: str, tx_hash: str,
    question_index: int, answer_id: str, time_taken: float,
    db: asyncpg.Pool,
):
    await db.execute(
        """
        INSERT INTO faucet_quiz_answers
            (quiz_id, question_id, wallet_address, answer_id, time_taken_s, answered_at)
        SELECT q.id, qq.id, $2, $4, $5, NOW()
        FROM faucet_quizzes q
        JOIN faucet_quiz_questions qq ON qq.quiz_id = q.id AND qq.position = $3
        WHERE q.code = $1
        ON CONFLICT (quiz_id, question_id, wallet_address) DO NOTHING
        """,
        code, wallet.lower(), question_index, answer_id, time_taken,
    )


# ── Rate limiting (in-memory; swap for Redis in multi-worker deployments) ──────
_rate_store: dict[str, list[float]] = {}
_RATE_WINDOW  = 60.0   # seconds
_RATE_MAX_REQ = 30     # per wallet per endpoint per window
def _check_rate_limit(key: str):
    now = time.monotonic()
    bucket = _rate_store.setdefault(key, [])
    _rate_store[key] = [t for t in bucket if now - t < _RATE_WINDOW]
    if len(_rate_store[key]) >= _RATE_MAX_REQ:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests — please slow down.",
        )
    _rate_store[key].append(now)
# ── Pydantic models ───────────────────────────────────────────────────────────
def _checksum(v: str) -> str:
    v = v.strip()
    if not Web3.is_address(v):
        raise ValueError(f"Invalid Ethereum address: {v}")
    return smart_checksum(v)
class OnChainJoinRequest(BaseModel):
    walletAddress: str
    _validate_wallet = field_validator("walletAddress")(_checksum)
class OnChainSubmitRequest(BaseModel):
    walletAddress: str
    questionIndex: int
    answerId: str
    timeTaken: float
    _validate_wallet = field_validator("walletAddress")(_checksum)
    

# ✅ CORRECT
class QuizClaimRequest(BaseModel):
    walletAddress: str
    _validate_wallet = field_validator("walletAddress")(_checksum)

class MarkFundedRequest(BaseModel):
    txHash: str
    contractAddress: str
    _validate_contract = field_validator("contractAddress")(_checksum)
class FinalizeWinner(BaseModel):
    address: str
    amount: str
    rank: int
    _validate_address = field_validator("address")(_checksum)
    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: str) -> str:
        try:
            if int(v) <= 0: raise ValueError()
        except (ValueError, TypeError):
            raise ValueError(f"amount must be a positive integer string, got: {v}")
        return v
    @field_validator("rank")
    @classmethod
    def rank_positive(cls, v: int) -> int:
        if v < 1: raise ValueError("rank must be >= 1")
        return v
class FinalizeRewardsRequest(BaseModel):
    winners: list[FinalizeWinner]
    @field_validator("winners")
    @classmethod
    def validate_winners(cls, v: list) -> list:
        if not v:
            raise ValueError("winners list cannot be empty")
        if len(v) > 10:
            raise ValueError("Maximum 10 winners")
        if len({w.rank for w in v}) != len(v):
            raise ValueError("Duplicate ranks in winners list")
        return v
# ── Endpoints ──────────────────────────────────────────────────────────────────
async def process_onchain_quiz_join(code: str, wallet_address: str):
    """Background task to trigger joinQuiz() on the blockchain silently."""
    try:
        db = await get_db()
        
        # Get contract info
        row = await db.fetchrow("""
            SELECT 
                r.faucet_address as reward_contract_address,
                q.chain_id,
                r.token_decimals as reward_token_decimals,
                q.reward_is_funded
            FROM faucet_quizzes q
            LEFT JOIN faucet_quiz_rewards r ON r.quiz_id = q.id
            WHERE q.code = $1
        """, code)

        if not row or not row["reward_contract_address"]:
            print(f"⚠️ [{code}] No on-chain contract found for join — skipping")
            return

        contract_address = smart_checksum(row["reward_contract_address"])
        chain_id = row["chain_id"]
        w3 = _get_w3(chain_id)
        account = _get_signer()

        tx = w3.eth.contract(address=contract_address, abi=QUIZ_ABI) \
                  .functions.joinQuiz(smart_checksum(wallet_address)) \
                  .build_transaction({
                      "chainId": chain_id,
                      "from": account.address
                  })
        tx_hash = await _send_tx(chain_id, tx)

        # Record tx hash back to DB
        await db.execute("""
            UPDATE faucet_quiz_participants
            SET joined_tx_hash = $1
            WHERE quiz_id = (SELECT id FROM faucet_quizzes WHERE code = $2)
            AND wallet_address = $3
        """, tx_hash, code, wallet_address.lower())

        print(f"✅ [{code}] On-chain join successful for {wallet_address} → {tx_hash}")

    except ContractRevertedError as e:
        if "already" in str(e).lower():
            print(f"⏭️ [{code}] {wallet_address} already joined on-chain — skipping")
        else:
            print(f"❌ [{code}] On-chain join reverted for {wallet_address}: {e}")
    except Exception as e:
        print(f"❌ [{code}] Internal on-chain join failed for {wallet_address}: {e}")
        
        
async def process_onchain_quiz_submit(code: str, wallet_address: str, q_idx: int, answer_id: str, time_taken: float):
    """Background task to trigger submitQuiz() on the blockchain silently."""
    try:
        db = await get_db()

        # Idempotency — only submit once per player per quiz
        already = await db.fetchval("""
            SELECT 1 FROM faucet_quiz_answers
            WHERE quiz_id = (SELECT id FROM faucet_quizzes WHERE code = $1)
            AND wallet_address = $2
            LIMIT 1
        """, code, wallet_address.lower())

        if already:
            print(f"⏭️ [{code}] {wallet_address} already submitted on-chain — skipping")
            return

        row = await db.fetchrow("""
            SELECT 
                r.faucet_address as reward_contract_address,
                q.chain_id,
                q.reward_is_funded
            FROM faucet_quizzes q
            LEFT JOIN faucet_quiz_rewards r ON r.quiz_id = q.id
            WHERE q.code = $1
        """, code)

        if not row or not row["reward_contract_address"]:
            print(f"⚠️ [{code}] No on-chain contract found for submit — skipping")
            return

        if not row["reward_is_funded"]:
            print(f"⚠️ [{code}] Contract not funded yet — skipping on-chain submit")
            return

        contract_address = smart_checksum(row["reward_contract_address"])
        chain_id = row["chain_id"]
        w3 = _get_w3(chain_id)
        account = _get_signer()

        tx = w3.eth.contract(address=contract_address, abi=QUIZ_ABI) \
                  .functions.submitQuiz(smart_checksum(wallet_address)) \
                  .build_transaction({
                      "chainId": chain_id,
                      "from": account.address
                  })
        tx_hash = await _send_tx(chain_id, tx)

        # Record the answer in DB
        quiz_row = await db.fetchrow(
            "SELECT id FROM faucet_quizzes WHERE code = $1", code
        )
        if quiz_row:
            q_row = await db.fetchrow("""
                SELECT id FROM faucet_quiz_questions
                WHERE quiz_id = $1 AND position = $2
            """, quiz_row["id"], q_idx)

            if q_row:
                await db.execute("""
                    INSERT INTO faucet_quiz_answers
                        (quiz_id, question_id, wallet_address, answer_id, time_taken_s, answered_at)
                    VALUES ($1, $2, $3, $4, $5, NOW())
                    ON CONFLICT (quiz_id, question_id, wallet_address) DO NOTHING
                """, quiz_row["id"], q_row["id"], wallet_address.lower(), answer_id, time_taken)

        print(f"✅ [{code}] On-chain submit successful for {wallet_address} → {tx_hash}")

    except ContractRevertedError as e:
        if "already" in str(e).lower():
            print(f"⏭️ [{code}] {wallet_address} already submitted on-chain — skipping")
        else:
            print(f"❌ [{code}] On-chain submit reverted for {wallet_address}: {e}")
    except Exception as e:
        print(f"❌ [{code}] Internal on-chain submit failed for {wallet_address}: {e}")
        
        
        
@quiz_router.get("/user/{wallet_address}", summary="Get all quizzes created by a specific user")
async def get_user_quizzes(wallet_address: str):
    wallet_lower = wallet_address.lower()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    q.id, q.code, q.title, q.description, q.cover_image_url, 
                    q.status, q.creator_address, q.creator_username, 
                    q.max_participants, q.created_at,
                    r.pool_amount, r.token_symbol, r.total_winners,
                    (SELECT COUNT(*) FROM faucet_quiz_participants p WHERE p.quiz_id = q.id) AS player_count
                FROM faucet_quizzes q
                LEFT JOIN faucet_quiz_rewards r ON r.quiz_id = q.id
                WHERE LOWER(q.creator_address) = $1
                ORDER BY q.created_at DESC
            """, wallet_lower)
            
        result = []
        for row in rows:
            code = row["code"].upper()
            db_count = row["player_count"] or 0
            
            # For active quizzes, prefer memory if it has more (mid-game joins not yet persisted)
            memory_count = len(game_state.get(code, {}).get("players", {}))
            player_count = max(db_count, memory_count)

            result.append({
                "code": code,
                "title": row["title"] or "",
                "description": row["description"] or "",
                "coverImageUrl": row["cover_image_url"],
                "status": row["status"] or "waiting",
                "creatorAddress": row["creator_address"] or "",
                "playerCount": player_count,
                "maxParticipants": row["max_participants"] or 0,
                "createdAt": row["created_at"].isoformat() if row["created_at"] else ""
            })
            
        return {"success": True, "quizzes": result, "total": len(result)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# 🚀 FIX 1: Change @router to @quiz_router and shorten the path!
@quiz_router.post("/{code}/mark-funded", summary="Mark contract as funded after creator funds it")
async def mark_funded(
    code: str,
    body: MarkFundedRequest,
    db: asyncpg.Pool = Depends(get_db),
):
    code = code.upper()

    # 1. Fetch quiz row
    row = await db.fetchrow("SELECT id, chain_id, faucet_address FROM faucet_quizzes WHERE code=$1", code)
    if not row:
        raise HTTPException(status_code=404, detail=f"Quiz '{code}' not found")

    quiz_id = row["id"]

    # 2. Update faucet_quizzes — mark funded
    await db.execute("""
        UPDATE faucet_quizzes
        SET reward_is_funded    = true,
            reward_fund_tx_hash = $1,
            reward_funded_at    = NOW()
        WHERE id = $2
    """, body.txHash, quiz_id)

    # 3. Update faucet_quiz_rewards — sync funded state and contract address
    await db.execute("""
        UPDATE faucet_quiz_rewards
        SET faucet_address      = $1,
            reward_is_funded    = true,
            funded_at           = NOW(),
            fund_tx_hash        = $2
        WHERE quiz_id = $3
    """, body.contractAddress, body.txHash, quiz_id)

    # 4. Update in-memory quizzes dict instantly
    if code in quizzes:
        if quizzes[code].get("reward"):
            quizzes[code]["reward"]["isFunded"] = True
            quizzes[code]["reward"]["contractAddress"] = body.contractAddress

    # 5. Update in-memory game_state if present
    if code in game_state:
        game_state[code]["reward_is_funded"] = True

    # 6. Broadcast to any connected players/host so UI updates without refresh
    await broadcast(code, {
        "type": "reward_funded",
        "isFunded": True,
        "contractAddress": body.contractAddress,
        "txHash": body.txHash,
    })

    logger.info(f"[{code}] Marked funded. contract={body.contractAddress} tx={body.txHash}")
    return {"success": True}

@router.post("/api/quiz/{code}/finalize-rewards", summary="Set reward amounts + open claim window at game end")
async def finalize_rewards(
    code: str,
    body: FinalizeRewardsRequest,
    db: asyncpg.Pool = Depends(get_db),
):
    """
    Called once by your game engine on game_over.
    Idempotent: returns early if already finalized.
    """
    info = await _get_quiz_contract(code, db)
    if not info["isFunded"]:
        raise HTTPException(status_code=409, detail="Contract is not funded — cannot finalize")

    # Idempotency guard
    finalized_at = await db.fetchval(
        "SELECT reward_finalized_at FROM faucet_quizzes WHERE code=$1", code
    )
    if finalized_at:
        return {"success": True, "skipped": True, "reason": "already_finalized",
                "finalizedAt": str(finalized_at)}

    contract_address = smart_checksum(info["contractAddress"])
    chain_id = info["chainId"]

    # Format data for both EVM and Solana
    addresses = [smart_checksum(w.address) for w in body.winners]
    amounts   = [int(w.amount) for w in body.winners]

    # --- 🔀 THE ROUTER ---
    try:
        if is_solana_chain(chain_id):
            print(f"[{code}] 🪐 Finalizing Solana Quiz Rewards...")
            tx_hash1_str = await dispatch_solana_batch_rewards(contract_address, addresses, amounts)
        else:
            print(f"[{code}] 🌐 Finalizing EVM Quiz Rewards...")
            w3 = _get_w3(chain_id)
            contract = w3.eth.contract(address=contract_address, abi=QUIZ_ABI)
            account = _get_signer()
            
            tx1 = contract.functions.setRewardAmountsBatch(addresses, amounts) \
                                    .build_transaction({
                                        "chainId": chain_id,
                                        "from": account.address
                                    })
            tx_hash1_str = await _send_tx(chain_id, tx1)
            
        logger.info(f"[{code}] setRewardAmountsBatch({len(body.winners)}) → {tx_hash1_str}")
        
    except (ContractRevertedError, RPCError, OnChainError) as e:
        logger.error(f"[{code}] setRewardAmountsBatch failed: {e}")
        raise HTTPException(status_code=502, detail=f"setRewardAmountsBatch failed: {e}")
    except Exception as e:
        logger.error(f"[{code}] Dispatch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    tx_hash2_str = None # We no longer need openClaimWindow for EVM or Solana natively

    # Persist finalization
    async with db.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """
                UPDATE faucet_quizzes
                SET reward_set_rewards_tx = $1,
                    reward_open_claim_tx  = $2,
                    reward_finalized_at   = NOW(),
                    reward_finalize_error = NULL
                WHERE code = $3
                """,
                tx_hash1_str, tx_hash2_str, code,
            )

    return {
        "success":      True,
        "setRewardsTx": tx_hash1_str,
        "openClaimTx":  tx_hash2_str,
        "winnersCount": len(body.winners),
    }
    
def make_code(length: int = 6) -> str:
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=length))
        if code not in quizzes:
            return code
def utc_now_ms() -> float:
    return datetime.now(timezone.utc).timestamp() * 1000

def calc_points(time_limit: int, time_taken_s: float, is_correct: bool) -> int:
    if not is_correct:
        return 0
    
    # 🛠️ FIX: Ensure time_taken is never negative
    safe_time_taken = max(0.0, float(time_taken_s))
    
    # 🛠️ FIX: Clamp the ratio between 0.0 and 1.0 just to be incredibly safe
    speed_ratio = max(0.0, min(1.0, 1.0 - (safe_time_taken / time_limit)))
    
    return 1000 + int(speed_ratio * 1000)

async def broadcast(code: str, payload: dict):
    dead: List[WebSocket] = []
    for ws in list(connections.get(code, [])):
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            dead.append(ws)
            
    # FIXED CLEANUP LOGIC
    for ws in dead:
        if ws in connections.get(code, []):
            connections[code].remove(ws)
            
async def send_to_player(code: str, wallet: str, payload: dict):
    ws = player_sockets.get(code, {}).get(wallet)
    if ws:
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            pass
def leaderboard_snapshot(code: str) -> List[dict]:
    state = game_state.get(code, {})
    players = state.get("players", {})
    prev_ranks = state.get("prev_ranks", {})

    # ✅ Exclude creator from leaderboard
    creator_addr = quizzes.get(code, {}).get("creatorAddress", "").lower()

    entries = sorted(
        [
            {
                "walletAddress": addr,
                "username": p["username"],
                "avatarUrl": p.get("avatarUrl"),
                "points": p["points"],
                "pointsThisRound": p.get("pointsThisRound", 0),
                "streak": p.get("streak", 0),
                "answeredCorrectly": p.get("answeredCorrectly", False),
            }
            for addr, p in players.items()
            if addr.lower() != creator_addr  # ✅ filter creator
        ],
        key=lambda x: x["points"],
        reverse=True,
    )
    result = []
    for i, e in enumerate(entries):
        rank = i + 1
        prev = prev_ranks.get(e["walletAddress"], rank)
        result.append({**e, "rank": rank, "rankChange": prev - rank})
    state["prev_ranks"] = {e["walletAddress"]: e["rank"] for e in result}
    return result


async def db_get_quiz_by_code(code: str) -> dict | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM faucet_quizzes WHERE code = $1", code.upper()
        )
        return dict(row) if row else None
    

async def reload_single_quiz_from_db(code: str) -> bool:
    """
    Fetches a specific quiz from the database and hydrates the global memory dicts.
    Includes an Auto-Heal feature to verify blockchain funding status if the DB thinks it's unfunded.
    """
    try:
        # STEP 1: Fetch ALL data holding the pool connection
        async with pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT 
                    q.*,
                    r.pool_amount,
                    r.token_symbol,
                    r.total_winners,
                    r.distribution_type,
                    r.token_address,
                    r.token_decimals,
                    r.token_logo_url,
                    r.faucet_address as reward_contract_address
                FROM faucet_quizzes q
                LEFT JOIN faucet_quiz_rewards r ON r.quiz_id = q.id
                WHERE q.code = $1
            """, code.upper())
            
            if not row:
                return False

            # =================================================================
            # 🛡️ AUTO-HEAL: VERIFY ACTUAL ON-CHAIN BALANCE
            # =================================================================
            is_funded_db = row.get("reward_is_funded", False)
            contract_address = row.get("reward_contract_address")
            pool_amount_human = float(row.get("pool_amount") or 0)
            
            # Only check if the DB says it's NOT funded, but a contract exists
            if not is_funded_db and contract_address and pool_amount_human > 0:
                try:
                    chain_id = row.get("chain_id")
                    w3 = _get_w3(chain_id)
                    contract_cs = smart_checksum(contract_address)
                    token_address = row.get("token_address")
                    decimals = row.get("token_decimals") or 18
                    
                    required_wei = int(pool_amount_human * (10 ** decimals))
                    current_balance_wei = 0
                    
                    # Check Native vs ERC20 Balance
                    if not token_address or token_address == "0x0000000000000000000000000000000000000000":
                        current_balance_wei = w3.eth.get_balance(contract_cs)
                    else:
                        token_cs = smart_checksum(token_address)
                        # Make sure ERC20_BALANCE_ABI is imported at the top of your file
                        erc20 = w3.eth.contract(address=token_cs, abi=ERC20_BALANCE_ABI)
                        current_balance_wei = erc20.functions.balanceOf(contract_cs).call()
                        
                    # If balance is sufficient, heal the database!
                    if current_balance_wei >= required_wei:
                        print(f"🩹 [Auto-Heal] Quiz {code} is actually funded on-chain! Updating DB...")
                        await conn.execute(
                            "UPDATE faucet_quizzes SET reward_is_funded = True, reward_funded_at = NOW() WHERE id = $1", 
                            row["id"]
                        )
                        is_funded_db = True # Update local variable for the memory dict
                except Exception as e:
                    print(f"⚠️ [Auto-Heal] Failed to check balance for {code}: {e}")
            # =================================================================

            q_rows = await conn.fetch("""
                SELECT * FROM faucet_quiz_questions 
                WHERE quiz_id = $1 ORDER BY position
            """, row["id"])

            participants = await conn.fetch("""
                SELECT wallet_address, username, avatar_url, points
                FROM faucet_quiz_participants 
                WHERE quiz_id = $1
            """, row["id"])

            questions_list = []
            for q in q_rows:
                opts = await conn.fetch("""
                    SELECT option_id as id, option_text as text 
                    FROM faucet_quiz_question_options 
                    WHERE question_id = $1
                """, q["id"])
                
                questions_list.append({
                    "question": q["question_text"],
                    "options": [dict(o) for o in opts],
                    "correctId": q["correct_id"],
                    "timeLimit": q["time_limit"],
                })

        # STEP 2: Build local dictionaries
        local_quiz = {
            "code": code.upper(),
            "title": row["title"],
            "description": row["description"],
            "coverImageUrl": row["cover_image_url"],
            "status": row["status"],
            "creatorAddress": row["creator_address"],
            "creatorUsername": row["creator_username"],
            "timePerQuestion": row["time_per_question"],
            "maxParticipants": row["max_participants"],
            "startTime": row["start_time"].isoformat() if row["start_time"] else None,
            "createdAt": row["created_at"].isoformat(),
            "chainId": row["chain_id"],
            "faucetAddress": row["faucet_address"],
            "isAiGenerated": row["is_ai_generated"],
            "db_id": str(row["id"]),
            
            "reward": {
                "poolAmount": float(row["pool_amount"]),
                "tokenSymbol": row["token_symbol"] or "",
                "tokenAddress": row["token_address"] or "",
                "tokenDecimals": row["token_decimals"] or 18,
                "tokenLogoUrl": row["token_logo_url"] or "",
                "totalWinners": row["total_winners"] or 0,
                "distributionType": row["distribution_type"] or "equal",
                "contractAddress": row["reward_contract_address"] or "",
                "isOnChain": True,
                "isFunded": is_funded_db # 🚀 Uses our auto-healed variable!
            } if row.get("pool_amount") and float(row["pool_amount"]) > 0 else None,
            
            "questions": questions_list,
            "totalQuestions": len(questions_list)
        }

        local_state = {
            "status": local_quiz["status"],
            "players": {},
            "answers": {},
            "prev_ranks": {},
            "current_q": -1,
        }

        for p in participants:
            addr = p["wallet_address"]
            local_state["players"][addr] = {
                "walletAddress": addr,
                "username": p["username"],
                "avatarUrl": p["avatar_url"],
                "points": p.get("points", 0),
                "streak": 0,
                "pointsThisRound": 0,
                "answeredCorrectly": False,
                "joinedAt": row["created_at"].timestamp() * 1000, 
            }

        # STEP 3: Atomic Global Update 
        quizzes[code.upper()] = local_quiz
        
        if code.upper() not in game_state:
            game_state[code.upper()] = local_state
            connections.setdefault(code.upper(), [])
            player_sockets.setdefault(code.upper(), {})

        return True

    except asyncio.CancelledError:
        logging.warning(f"Database load for quiz {code} was interrupted by a client disconnect.")
        raise
    except Exception as e:
        logging.error(f"Failed to reload quiz {code}: {str(e)}")
        return False

async def db_join_quiz(code: str, wallet: str, username: str, avatar_url: str | None):
    async with pool.acquire() as conn:
        quiz = await conn.fetchrow(
            "SELECT id, status, max_participants, creator_address FROM faucet_quizzes WHERE code = $1",
            code.upper()
        )
        if not quiz:
            return {"success": False, "message": "Quiz not found"}
        if quiz["status"] != "waiting":
            return {"success": False, "message": "Quiz already started"}

        # ✅ Block creator from joining as a participant
        if quiz["creator_address"].lower() == wallet.lower():
            return {"success": True, "isCreator": True, "message": "Host cannot join as player"}

        count = await conn.fetchval(
            "SELECT COUNT(*) FROM faucet_quiz_participants WHERE quiz_id = $1",
            quiz["id"]
        )
        if quiz["max_participants"] > 0 and count >= quiz["max_participants"]:
            return {"success": False, "message": "Quiz is full"}
        await conn.execute("""
            INSERT INTO faucet_quiz_participants
                (quiz_id, wallet_address, username, avatar_url)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (quiz_id, wallet_address) DO NOTHING
        """, quiz["id"], wallet, username, avatar_url)
        return {"success": True}
    
    
async def db_upsert_answer(
    quiz_id: str, question_id: str, wallet: str,
    answer_id: str, is_correct: bool,
    time_taken_s: float, points_earned: int, streak: int
):
    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO faucet_quiz_answers
                (quiz_id, question_id, wallet_address, answer_id, is_correct,
                 time_taken_s, points_earned, streak_at_time, answered_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
            ON CONFLICT (quiz_id, question_id, wallet_address)
            DO UPDATE SET
                answer_id      = EXCLUDED.answer_id,
                is_correct     = EXCLUDED.is_correct,
                time_taken_s   = EXCLUDED.time_taken_s,
                points_earned  = EXCLUDED.points_earned,
                streak_at_time = EXCLUDED.streak_at_time,
                answered_at    = NOW()
        """, quiz_id, question_id, wallet, answer_id, is_correct,
             time_taken_s, points_earned, streak)
async def db_finalize_quiz(quiz_id: str, final_leaderboard: list):
    async with pool.acquire() as conn:
        async with conn.transaction():
            for entry in final_leaderboard:
                await conn.execute("""
                    UPDATE faucet_quiz_participants
                    SET final_points = $1, final_rank = $2
                    WHERE quiz_id = $3 AND wallet_address = $4
                """, entry["points"], entry["rank"], quiz_id, entry["walletAddress"])
            await conn.execute("""
                UPDATE faucet_quiz_participants qp
                SET is_winner = TRUE
                FROM faucet_quiz_rewards qr
                WHERE qr.quiz_id = $1
                  AND qp.quiz_id = $1
                  AND qp.final_rank <= qr.total_winners
            """, quiz_id)
            await conn.execute("""
                UPDATE faucet_quizzes
                SET status = 'finished', finished_at = NOW()
                WHERE id = $1
            """, quiz_id)

async def db_create_payouts(
    quiz_id: str, winners: list,
    token_symbol: str, token_address: str, chain_id: int
):
    async with pool.acquire() as conn:
        async with conn.transaction():
            for w in winners:
                # 🚀 FIX: Safely default missing values to 0 to prevent DB crashes
                pct = w.get("pct") or 0
                pts = w.get("points") or 0
                
                await conn.execute("""
                    INSERT INTO faucet_quiz_reward_payouts
                        (quiz_id, wallet_address, username, rank, points,
                         percentage, amount, token_symbol, token_address, chain_id)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                    ON CONFLICT (quiz_id, wallet_address) DO NOTHING
                """, quiz_id, w["walletAddress"], w.get("username"),
                     w["rank"], pts,
                     pct, w["amount"], # <--- Safe percentage variable used here
                     token_symbol, token_address, chain_id)
            
            await conn.execute("""
                UPDATE faucet_quiz_rewards
                SET dispatch_status = 'processing'
                WHERE quiz_id = $1
            """, quiz_id)

async def db_update_payout_status(
    quiz_id: str, wallet: str,
    status: str, tx_hash: str | None = None, error: str | None = None
):
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute("""
                UPDATE faucet_quiz_reward_payouts
                SET status = $1, tx_hash = $2, error_message = $3,
                    sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE sent_at END
                WHERE quiz_id = $4 AND wallet_address = $5
            """, status, tx_hash, error, quiz_id, wallet)
            pending = await conn.fetchval("""
                SELECT COUNT(*) FROM faucet_quiz_reward_payouts
                WHERE quiz_id = $1 AND status = 'pending'
            """, quiz_id)
            if pending == 0:
                await conn.execute("""
                    UPDATE faucet_quiz_rewards
                    SET dispatch_status = 'completed', dispatched_at = NOW()
                    WHERE quiz_id = $1
                """, quiz_id)
# ──────────────────────────────────────────────────────────────
#  Reward processing
# ──────────────────────────────────────────────────────────────
async def process_quiz_rewards(code: str, final_leaderboard: List[dict]):
    quiz = quizzes.get(code)
    if not quiz:
        return
    reward_cfg = quiz.get("reward")
    if not reward_cfg or reward_cfg.get("poolAmount", 0) <= 0:
        return

    await asyncio.sleep(2)

    total_winners  = int(reward_cfg.get("totalWinners", 1))
    pool_amount    = float(reward_cfg.get("poolAmount", 0))
    token_decimals = int(reward_cfg.get("tokenDecimals", 18))
    token_symbol   = reward_cfg.get("tokenSymbol", "")
    token_address  = reward_cfg.get("tokenAddress", "")
    dist_type      = reward_cfg.get("distributionType", "equal")
    distribution   = reward_cfg.get("distribution", [])

    # Filter creator out of leaderboard
    try:
        db_pool = await get_db()
        quiz_row = await db_pool.fetchrow(
            "SELECT creator_address, id, chain_id FROM faucet_quizzes WHERE code = $1", code
        )
        creator  = quiz_row["creator_address"].lower() if quiz_row else ""
        quiz_id  = quiz_row["id"] if quiz_row else None
        chain_id = quiz_row["chain_id"] if quiz_row else None
    except Exception:
        creator  = ""
        quiz_id  = None
        chain_id = None

    valid_players = [
        e for e in final_leaderboard
        if e["walletAddress"].lower() != creator
    ]

    if not valid_players:
        print(f"[Quiz {code}] No eligible winners (all filtered out)")
        return

    # Build winners list with both wei amount and human-readable amount
    winners = []          # FinalizeWinner objects for on-chain dispatch
    human_amounts = {}    # wallet → human-readable amount for DB insert

    if dist_type == "equal":
        actual_winners = valid_players[:total_winners]
        amount_per     = pool_amount / len(actual_winners)
        amount_wei     = int(amount_per * (10 ** token_decimals))
        for p in actual_winners:
            winners.append(FinalizeWinner(
                address=smart_checksum(p["walletAddress"]),
                amount=str(amount_wei),
                rank=p["rank"]
            ))
            human_amounts[p["walletAddress"].lower()] = round(amount_per, 6)

    elif dist_type == "quadratic":
        actual_winners = valid_players[:total_winners]
        weights        = [math.sqrt(max(p.get("points", 0), 0)) for p in actual_winners]
        total_weight   = sum(weights)
        for i, p in enumerate(actual_winners):
            if total_weight > 0:
                share      = weights[i] / total_weight
                amount_per = pool_amount * share
                amount_wei = int(amount_per * (10 ** token_decimals))
                if amount_wei > 0:
                    winners.append(FinalizeWinner(
                        address=smart_checksum(p["walletAddress"]),
                        amount=str(amount_wei),
                        rank=p["rank"]
                    ))
                    human_amounts[p["walletAddress"].lower()] = round(amount_per, 6)

    elif dist_type in ("custom_tiers", "custom"):
        for tier in distribution:
            rank         = int(tier.get("rank", 0))
            amount_human = float(tier.get("amount", 0))
            if rank < 1 or amount_human <= 0:
                continue
            player = next((e for e in valid_players if e.get("rank") == rank), None)
            if player:
                winners.append(FinalizeWinner(
                    address=smart_checksum(player["walletAddress"]),
                    amount=str(int(amount_human * (10 ** token_decimals))),
                    rank=rank
                ))
                human_amounts[player["walletAddress"].lower()] = round(amount_human, 6)

    if not winners:
        print(f"[Quiz {code}] No eligible winners to reward.")
        return

    print(f"[Quiz {code}] Dispatching rewards to {len(winners)} winners (dist_type={dist_type})...")

    try:
        db     = await get_db()
        result = await finalize_rewards(
            code=code,
            body=FinalizeRewardsRequest(winners=winners),
            db=db
        )

        if result.get("success") or result.get("skipped"):
            print(f"[Quiz {code}] ✅ Rewards written to chain!")

            # ── Save payouts to faucet_quiz_reward_payouts ────────
            if quiz_id:
                try:
                    async with pool.acquire() as conn:
                        for w in winners:
                            wallet       = w.address.lower()
                            amount_human = human_amounts.get(wallet, 0.0)

                            # Find the player entry for username + points
                            player_entry = next(
                                (p for p in valid_players if p["walletAddress"].lower() == wallet),
                                None
                            )
                            username     = player_entry.get("username", "") if player_entry else ""
                            points       = player_entry.get("points", 0)   if player_entry else 0

                            await conn.execute("""
                                INSERT INTO faucet_quiz_reward_payouts
                                    (quiz_id, wallet_address, username, rank, points,
                                     amount, token_symbol, token_address, chain_id, status)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
                                ON CONFLICT (quiz_id, wallet_address) DO UPDATE
                                    SET amount       = EXCLUDED.amount,
                                        rank         = EXCLUDED.rank,
                                        points       = EXCLUDED.points,
                                        token_symbol = EXCLUDED.token_symbol,
                                        status       = CASE
                                            WHEN faucet_quiz_reward_payouts.status = 'claimed'
                                            THEN 'claimed'
                                            ELSE 'pending'
                                        END
                            """,
                                quiz_id,
                                wallet,
                                username,
                                w.rank,
                                points,
                                amount_human,   # human-readable, not wei
                                token_symbol,
                                token_address,
                                chain_id,
                            )
                    print(f"[Quiz {code}] ✅ Payouts saved to DB for {len(winners)} winners")
                except Exception as db_err:
                    print(f"[Quiz {code}] ⚠️ Failed to save payouts to DB: {db_err}")
                    traceback.print_exc()

            # ── Broadcast to all connected clients ────────────────
            await broadcast(code, {
                "type":    "rewards_dispatched",
                "winners": [w.dict() for w in winners],
                "message": "Winners whitelisted! Claim window is now open.",
            })

    except Exception as e:
        print(f"[Quiz {code}] ❌ Reward dispatch error: {e}")
        traceback.print_exc()

#  REST: List all quizzes
# ──────────────────────────────────────────────────────────────
@quiz_router.get("/list")
async def list_quizzes():
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    q.id, q.code, q.title, q.description, q.cover_image_url,
                    q.status, q.creator_address, 
                    COALESCE(up.username, q.creator_username) as creator_username, 
                    q.time_per_question, q.max_participants, q.chain_id,
                    q.faucet_address, q.is_ai_generated, q.start_time, q.created_at,
                    q.rewards_distributed,
                    r.pool_amount, r.token_symbol, r.total_winners,
                    r.reward_is_funded,
                    r.faucet_address as reward_contract_address,
                    COUNT(p.id) AS player_count
                FROM faucet_quizzes q
                LEFT JOIN faucet_quiz_rewards r ON r.quiz_id = q.id
                LEFT JOIN user_profiles up ON LOWER(up.wallet_address) = LOWER(q.creator_address)
                LEFT JOIN faucet_quiz_participants p ON p.quiz_id = q.id
                GROUP BY q.id, r.pool_amount, r.token_symbol, r.total_winners,
                         r.reward_is_funded, r.faucet_address, up.username
                ORDER BY q.created_at DESC
                LIMIT 100
            """)

        result = []
        for row in rows:
            code = row["code"].upper()

            # Always prefer DB count; use memory only if higher (mid-game joins)
            db_count = int(row["player_count"] or 0)
            memory_count = len(game_state.get(code, {}).get("players", {}))
            player_count = max(db_count, memory_count)

            result.append({
                "code":            code,
                "title":           row["title"] or "",
                "description":     row["description"] or "",
                "coverImageUrl":   row["cover_image_url"],
                "status":          row["status"] or "waiting",
                "creatorUsername": row["creator_username"] or "",
                "creatorAddress":  row["creator_address"] or "",
                "totalQuestions":  quizzes.get(code, {}).get("totalQuestions", 0),
                "playerCount":     player_count,
                "maxParticipants": row["max_participants"] or 0,
                "createdAt":       row["created_at"].isoformat() if row["created_at"] else "",
                "startTime":       row["start_time"].isoformat() if row["start_time"] else None,
                "isAiGenerated":   row["is_ai_generated"] or False,
                "chainId":         row["chain_id"] or 0,
                "faucetAddress":   row["faucet_address"],
                "reward": {
                    "poolAmount":   float(row["pool_amount"]) if row["pool_amount"] else 0,
                    "tokenSymbol":  row["token_symbol"] or "",
                    "totalWinners": row["total_winners"] or 0,
                } if row["pool_amount"] is not None else None,
            })

        # Sort: active first, then waiting, then finished; newest within group
        order = {"active": 0, "waiting": 1, "finished": 2}
        result.sort(
            key=lambda x: (
                order.get(x["status"], 3),
                -datetime.fromisoformat(x["createdAt"]).timestamp() if x["createdAt"] else 0
            )
        )
        return {"success": True, "quizzes": result, "total": len(result)}

    except Exception as e:
        print(f"[list_quizzes] DB error: {e}")
        traceback.print_exc()
        # Fallback to in-memory if DB fails
        result = []
        for code, quiz in quizzes.items():
            state = game_state.get(code, {})
            reward_cfg = quiz.get("reward")
            result.append({
                "code":            code,
                "title":           quiz.get("title", ""),
                "description":     quiz.get("description", ""),
                "coverImageUrl":   quiz.get("coverImageUrl"),
                "status":          quiz.get("status", "waiting"),
                "creatorUsername": quiz.get("creatorUsername", ""),
                "creatorAddress":  quiz.get("creatorAddress", ""),
                "totalQuestions":  quiz.get("totalQuestions", 0),
                "playerCount":     len(state.get("players", {})),
                "maxParticipants": quiz.get("maxParticipants", 0),
                "createdAt":       quiz.get("createdAt", ""),
                "startTime":       quiz.get("startTime"),
                "isAiGenerated":   quiz.get("isAiGenerated", False),
                "chainId":         quiz.get("chainId", 0),
                "faucetAddress":   quiz.get("faucetAddress"),
                "reward": {
                    "poolAmount":   reward_cfg.get("poolAmount", 0),
                    "tokenSymbol":  reward_cfg.get("tokenSymbol", ""),
                    "totalWinners": reward_cfg.get("totalWinners", 0),
                } if reward_cfg else None,
            })
        order = {"active": 0, "waiting": 1, "finished": 2}
        result.sort(
            key=lambda x: (
                order.get(x["status"], 3),
                -datetime.fromisoformat(x["createdAt"]).timestamp() if x["createdAt"] else 0
            )
        )
        return {"success": True, "quizzes": result, "total": len(result)}


@quiz_router.get("/user/{wallet_address}", summary="Get all quizzes created by a specific user")
async def get_user_quizzes(wallet_address: str):
    wallet_lower = wallet_address.lower()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    q.id, q.code, q.title, q.description, q.cover_image_url, 
                    q.status, q.creator_address, q.creator_username, 
                    q.max_participants, q.created_at,
                    r.pool_amount, r.token_symbol, r.total_winners,
                    COUNT(p.id) AS player_count
                FROM faucet_quizzes q
                LEFT JOIN faucet_quiz_rewards r ON r.quiz_id = q.id
                LEFT JOIN faucet_quiz_participants p ON p.quiz_id = q.id
                WHERE LOWER(q.creator_address) = $1
                GROUP BY q.id, r.pool_amount, r.token_symbol, r.total_winners
                ORDER BY q.created_at DESC
            """, wallet_lower)

        result = []
        for row in rows:
            code = row["code"].upper()
            db_count = int(row["player_count"] or 0)
            memory_count = len(game_state.get(code, {}).get("players", {}))
            player_count = max(db_count, memory_count)

            result.append({
                "code":            code,
                "title":           row["title"] or "",
                "description":     row["description"] or "",
                "coverImageUrl":   row["cover_image_url"],
                "status":          row["status"] or "waiting",
                "creatorAddress":  row["creator_address"] or "",
                "playerCount":     player_count,
                "maxParticipants": row["max_participants"] or 0,
                "createdAt":       row["created_at"].isoformat() if row["created_at"] else "",
                "reward": {
                    "poolAmount":   float(row["pool_amount"]) if row["pool_amount"] else 0,
                    "tokenSymbol":  row["token_symbol"] or "",
                    "totalWinners": row["total_winners"] or 0,
                } if row["pool_amount"] is not None else None,
            })

        return {"success": True, "quizzes": result, "total": len(result)}

    except Exception as e:
        print(f"[get_user_quizzes] error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
    
# ──────────────────────────────────────────────────────────────
#  REST: Create quiz
# ──────────────────────────────────────────────────────────────
@quiz_router.post("/create")
async def create_quiz(body: CreateQuizRequest):
    code = make_code()
    quiz = {
        "code": code,
        "title": body.title,
        "description": body.description,
        "questions": [q.model_dump() for q in body.questions],
        "timePerQuestion": body.timePerQuestion,
        "maxParticipants": body.maxParticipants,
        "startTime": body.startTime,
        "creatorAddress": body.creatorAddress,
        "creatorUsername": body.creatorUsername,
        "coverImageUrl": body.coverImageUrl,
        "status": "waiting",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "totalQuestions": len(body.questions),
        "chainId": body.chainId,
        "faucetAddress": body.faucetAddress,
        "reward": {
            **body.reward.model_dump(),
            "distribution": [
                {"rank": t.rank, "pct": t.pct, "amount": t.amount}
                for t in body.reward.distribution
            ]
        } if body.reward else None,
    }
    quizzes[code] = quiz
    game_state[code] = {"status": "waiting", "players": {}, "answers": {}, "prev_ranks": {}, "current_q": -1}
    connections[code] = []
    player_sockets[code] = {}

    async with pool.acquire() as conn:
        async with conn.transaction():
            parsed_start_time = None
            if body.startTime:
                parsed_start_time = datetime.fromisoformat(body.startTime.replace('Z', '+00:00'))

            quiz_id = await conn.fetchval("""
                INSERT INTO faucet_quizzes
                    (code, title, description, cover_image_url, creator_address,
                     creator_username, status, is_ai_generated, time_per_question,
                     max_participants, chain_id, start_time, faucet_address)
                VALUES ($1, $2, $3, $4, $5, $6, 'waiting', $7, $8, $9, $10, $11, $12)
                RETURNING id
            """,
                code, body.title, body.description, body.coverImageUrl,
                body.creatorAddress, body.creatorUsername,
                False, body.timePerQuestion, body.maxParticipants,
                body.chainId, parsed_start_time, body.faucetAddress
            )

            for i, q in enumerate(body.questions):
                q_id = await conn.fetchval("""
                    INSERT INTO faucet_quiz_questions
                        (quiz_id, position, question_text, correct_id, time_limit)
                    VALUES ($1, $2, $3, $4, $5) RETURNING id
                """, quiz_id, i, q.question, q.correctId, q.timeLimit)
                for opt in q.options:
                    await conn.execute("""
                        INSERT INTO faucet_quiz_question_options
                            (question_id, option_id, option_text)
                        VALUES ($1, $2, $3)
                    """, q_id, opt.id, opt.text)

            if body.reward:
                r = body.reward
                await conn.execute("""
                    INSERT INTO faucet_quiz_rewards
                        (quiz_id, pool_amount, token_address, token_symbol,
                         token_decimals, token_logo_url, chain_id, total_winners,
                         distribution_type, pool_usd_value, faucet_address)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                """,
                    quiz_id, r.poolAmount, r.tokenAddress, r.tokenSymbol,
                    r.tokenDecimals, r.tokenLogoUrl, r.chainId,
                    r.totalWinners, r.distributionType, r.poolUsdValue,
                    body.faucetAddress
                )
                for tier in r.distribution:
                    await conn.execute("""
                        INSERT INTO faucet_quiz_reward_tiers
                            (quiz_id, rank, percentage, amount)
                        VALUES ($1, $2, $3, $4)
                    """, quiz_id, tier.rank, tier.pct, tier.amount)

        quizzes[code]["db_id"] = str(quiz_id)

    return {"success": True, "code": code, "quiz": quizzes[code]}


@quiz_router.post("/generate-ai")
async def generate_quiz_ai(body: GenerateQuizRequest):
    data = await generate_quiz_data(body)
    title = body.title or data.get("title", f"{body.topic} Quiz")
    questions = data.get("questions", [])
    if not questions:
        raise HTTPException(status_code=502, detail="AI returned no questions")

    code = make_code()
    quiz = {
        "code": code,
        "title": title,
        "description": f"AI-generated quiz about {body.topic} ({body.difficulty})",
        "questions": questions,
        "timePerQuestion": body.timePerQuestion,
        "maxParticipants": 0,
        "startTime": None,
        "creatorAddress": body.creatorAddress,
        "creatorUsername": body.creatorUsername,
        "coverImageUrl": body.coverImageUrl,
        "status": "waiting",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "totalQuestions": len(questions),
        "faucetAddress": body.faucetAddress,
        "isAiGenerated": True,
        "chainId": body.chainId,
        "reward": {
            **body.reward.model_dump(),
            "distribution": [
                {"rank": t.rank, "pct": t.pct, "amount": t.amount}
                for t in body.reward.distribution
            ]
        } if body.reward else None,
    }
    quizzes[code] = quiz
    game_state[code] = {"status": "waiting", "players": {}, "answers": {}, "prev_ranks": {}, "current_q": -1}
    connections[code] = []
    player_sockets[code] = {}

    async with pool.acquire() as conn:
        async with conn.transaction():
            quiz_id = await conn.fetchval("""
                INSERT INTO faucet_quizzes
                    (code, title, description, cover_image_url, creator_address,
                     creator_username, status, is_ai_generated, time_per_question,
                     max_participants, chain_id, start_time, faucet_address)
                VALUES ($1, $2, $3, $4, $5, $6, 'waiting', TRUE, $7, $8, $9, $10, $11)
                RETURNING id
            """,
                code, title,
                f"AI-generated quiz about {body.topic} ({body.difficulty})",
                body.coverImageUrl,
                body.creatorAddress,
                body.creatorUsername,
                body.timePerQuestion,
                body.maxParticipants,
                body.chainId,
                datetime.fromisoformat(body.startTime.replace('Z', '+00:00')) if body.startTime else None,
                body.faucetAddress
            )

            for i, q in enumerate(questions):
                q_id = await conn.fetchval("""
                    INSERT INTO faucet_quiz_questions
                        (quiz_id, position, question_text, correct_id, time_limit)
                    VALUES ($1, $2, $3, $4, $5) RETURNING id
                """, quiz_id, i, q["question"], q["correctId"],
                     q.get("timeLimit", body.timePerQuestion))
                for opt in q.get("options", []):
                    await conn.execute("""
                        INSERT INTO faucet_quiz_question_options
                            (question_id, option_id, option_text)
                        VALUES ($1, $2, $3)
                    """, q_id, opt["id"], opt["text"])

            if body.reward:
                r = body.reward
                await conn.execute("""
                    INSERT INTO faucet_quiz_rewards
                        (quiz_id, pool_amount, token_address, token_symbol,
                         token_decimals, token_logo_url, chain_id, total_winners,
                         distribution_type, pool_usd_value, faucet_address)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                """,
                    quiz_id, r.poolAmount, r.tokenAddress, r.tokenSymbol,
                    r.tokenDecimals, r.tokenLogoUrl, r.chainId,
                    r.totalWinners, r.distributionType, r.poolUsdValue,
                    body.faucetAddress
                )
                for tier in r.distribution:
                    await conn.execute("""
                        INSERT INTO faucet_quiz_reward_tiers
                            (quiz_id, rank, percentage, amount)
                        VALUES ($1, $2, $3, $4)
                    """, quiz_id, tier.rank, tier.pct, tier.amount)

        quizzes[code]["db_id"] = str(quiz_id)

    return {"success": True, "code": code, "quiz": quizzes[code]}
# ──────────────────────────────────────────────────────────────
#  REST: Get single quiz
# ──────────────────────────────────────────────────────────────
@quiz_router.get("/{code}")
async def get_quiz(code: str):
    code = code.upper()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT q.*, 
                   r.reward_is_funded,
                   r.faucet_address     as reward_contract_address,
                   r.pool_amount,
                   r.token_symbol,
                   r.token_address,
                   r.token_decimals,
                   r.token_logo_url,
                   r.total_winners,
                   r.distribution_type,
                   q.rewards_distributed
            FROM faucet_quizzes q
            LEFT JOIN faucet_quiz_rewards r ON r.quiz_id = q.id
            WHERE q.code = $1
        """, code)

    if not row:
        raise HTTPException(status_code=404, detail="Quiz not found")

    state = game_state.get(code, {})
    quiz_data = dict(row)

    # Build the nested reward object the frontend expects
    reward = None
    if row["pool_amount"] and float(row["pool_amount"]) > 0:
        reward = {
            "poolAmount":      float(row["pool_amount"]),
            "tokenSymbol":     row["token_symbol"] or "",
            "tokenAddress":    row["token_address"] or "",
            "tokenDecimals":   row["token_decimals"] or 18,
            "tokenLogoUrl":    row["token_logo_url"] or "",
            "totalWinners":    row["total_winners"] or 0,
            "distributionType": row["distribution_type"] or "equal",
            "contractAddress": row["reward_contract_address"] or "",
            "isOnChain":       True,
            "isFunded":        row["reward_is_funded"] or False,
        }

    return {
        "success": True,
        "quiz": {
            **quiz_data,
            "reward":       reward,
            "rewardsReady": row["rewards_distributed"],
            "playerCount":  len(state.get("players", {})),
        },
    }
    
# ──────────────────────────────────────────────────────────────
#  REST: Join
# ──────────────────────────────────────────────────────────────
@quiz_router.post("/{code}/join")
async def join_quiz(code: str, body: JoinQuizRequest, background_tasks: BackgroundTasks):
    code = code.upper()
    quiz = quizzes.get(code)

    if not quiz:
        success = await reload_single_quiz_from_db(code)
        if not success:
            raise HTTPException(status_code=404, detail="Quiz not found")
        quiz = quizzes.get(code)

    state = game_state.get(code)
    if not state:
        raise HTTPException(status_code=404, detail="Quiz state not found")

    if state.get("status") == "finished":
        return {"success": False, "finished": True, "status": "finished", "message": "This quiz has already ended."}

    # ✅ Block creator from joining as a participant — return early with isCreator flag
    creator_addr = quiz.get("creatorAddress", "").lower()
    if body.walletAddress.lower() == creator_addr:
        return {"success": True, "isCreator": True, "status": state.get("status", "waiting"), "message": "You are the host"}

    max_p = quiz.get("maxParticipants", 0)
    if max_p > 0 and len(state["players"]) >= max_p:
        return {"success": False, "message": "Quiz is full"}

    # Reconnect — already in memory
    if body.walletAddress in state["players"]:
        return {"success": True, "status": state["status"], "message": "Rejoined successfully"}

    # Add to in-memory state regardless of active/waiting
    state["players"][body.walletAddress] = {
        "walletAddress": body.walletAddress,
        "username": body.username,
        "avatarUrl": body.avatarUrl,
        "points": 0,
        "streak": 0,
        "pointsThisRound": 0,
        "answeredCorrectly": False,
        "joinedAt": utc_now_ms(),
        "isReady": False,
    }

    # Broadcast updated player list — excluding creator
    creator_addr_lower = creator_addr
    asyncio.create_task(broadcast(code, {
        "type": "player_list",
        "players": [
            {
                "walletAddress": addr,
                "username": p["username"],
                "avatarUrl": p.get("avatarUrl"),
                "points": p.get("points", 0),
                "isReady": p.get("isReady", False),
            }
            for addr, p in state["players"].items()
            if addr.lower() != creator_addr_lower  # ✅ filter creator from broadcast
        ]
    }))

    # Record in DB
    quiz_db_id = quiz.get("db_id")
    if quiz_db_id:
        async with pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO faucet_quiz_participants
                    (quiz_id, wallet_address, username, avatar_url)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (quiz_id, wallet_address) DO NOTHING
            """, quiz_db_id, body.walletAddress, body.username, body.avatarUrl)

    background_tasks.add_task(process_onchain_quiz_join, code, body.walletAddress)

    return {"success": True, "status": state["status"]}

class SubscribeRequest(BaseModel):
    wallet_address: str
    tx_hash: str  # We store this in case you want to verify payments later

@app.post("/api/profile/subscribe", tags=["User Management"])
async def activate_creator_subscription(req: SubscribeRequest):
    """
    Activates a creator subscription for 28 days, 23 hours, 59 mins, and 59 secs.
    """
    try:
        wallet_lower = req.wallet_address.lower()
        
        # Calculate exactly 28 days, 23 hours, 59 mins, 59 secs from right now
        expiration_date = datetime.now(timezone.utc) + timedelta(
            days=28, 
            hours=23, 
            minutes=59, 
            seconds=59
        )
        
        # Update the user profile in Supabase
        response = supabase.table("user_profiles").update({
            "is_quest_subscribed": True,
            "quest_subscription_expires_at": expiration_date.isoformat()
        }).eq("wallet_address", wallet_lower).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User profile not found")
            
        return {
            "success": True, 
            "message": "Subscription activated successfully!",
            "expires_at": expiration_date.isoformat()
        }
        
    except Exception as e:
        print(f"Subscription Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@quiz_router.post("/{code}/on-chain-start", summary="startQuiz() when creator starts game")
async def on_chain_start(
    code: str,
    background_tasks: BackgroundTasks,
    db: asyncpg.Pool = Depends(get_db),
):
    _check_rate_limit(f"start:{code}")
    try:
        info = await _get_quiz_contract(code, db)
    except HTTPException:
        # No on-chain contract configured — that's fine, WS already started the game
        return {"success": True, "skipped": True, "reason": "no_contract"}

    contract_address = smart_checksum(info["contractAddress"])
    chain_id = info["chainId"]
    w3 = _get_w3(chain_id)

    try:
        account = _get_signer()
        tx = w3.eth.contract(address=contract_address, abi=QUIZ_ABI) \
                  .functions.startQuiz() \
                  .build_transaction({
                      "chainId": chain_id,
                      "from": account.address
                  })
        tx_hash = await _send_tx(chain_id, tx)
        logger.info(f"[{code}] startQuiz() on-chain triggered → {tx_hash}")
        return {"success": True, "txHash": tx_hash}

    except ContractRevertedError as e:
        # Already started is fine — WS already kicked off the game loop
        if "already" in str(e).lower():
            return {"success": True, "skipped": True, "reason": "already_started_onchain"}
        logger.error(f"[{code}] startQuiz reverted: {e}")
        raise HTTPException(status_code=502, detail=f"Contract reverted: {e}")
    except Exception as e:
        # Catch everything else (ContractLogicError from web3, RPCError, etc.)
        msg = str(e).lower()
        if "already started" in msg or "already" in msg:
            return {"success": True, "skipped": True, "reason": "already_started_onchain"}
        logger.error(f"[{code}] startQuiz error: {e}")
        raise HTTPException(status_code=503, detail=f"On-chain error: {e}")
    
    
@app.get("/api/users/{wallet_address}/subscription", tags=["User Management"])
async def check_subscription_status(wallet_address: str):
    """
    Checks if a wallet address has an active creator subscription.
    """
    try:
        wallet_lower = wallet_address.lower()
        
        response = supabase.table("user_profiles").select(
            "wallet_address, is_quest_subscribed, quest_subscription_expires_at"
        ).eq("wallet_address", wallet_lower).execute()
        
        if not response.data:
            return {
                "success": True,
                "hasActiveSubscription": False,
                "reason": "user_not_found"
            }
        
        user = response.data[0]
        is_subscribed = user.get("is_quest_subscribed", False)
        expires_at = user.get("quest_subscription_expires_at")
        
        # Check expiry if subscribed
        if is_subscribed and expires_at:
            expiry_dt = datetime.fromisoformat(expires_at).replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > expiry_dt:
                # Expired — auto-revoke in DB
                supabase.table("user_profiles").update({
                    "is_quest_subscribed": False
                }).eq("wallet_address", wallet_lower).execute()
                
                return {
                    "success": True,
                    "hasActiveSubscription": False,
                    "reason": "subscription_expired",
                    "expired_at": expires_at
                }
        
        return {
            "success": True,
            "hasActiveSubscription": is_subscribed,
            "expires_at": expires_at,
            "reason": "active" if is_subscribed else "not_subscribed"
        }
        
    except Exception as e:
        print(f"Subscription Check Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    
# ──────────────────────────────────────────────────────────────
#  REST: Reward dispatch endpoint (called by process_quiz_rewards)
#  You can also call this from an external service / admin panel.
# ──────────────────────────────────────────────────────────────
@quiz_router.post("/dispatch-rewards")
async def dispatch_rewards(payload: dict):
    quiz_code        = payload.get("quizCode", "")
    contract_address = payload.get("contractAddress", "")
    chain_id         = int(payload.get("chainId", 0))
    token_address    = payload.get("tokenAddress", "")
    token_decimals   = int(payload.get("tokenDecimals", 18))
    token_symbol     = payload.get("tokenSymbol", "")
    winners          = payload.get("winners", [])
    
    if not winners:
        return {"success": False, "message": "No winners provided"}

    # 🔀 THE ROUTER: Universal Address Validation
    try:
        contract_cs = smart_checksum(contract_address)
        
        winner_addresses = []
        winner_amounts = []
        
        for w in winners:
            raw_addr = w.get("walletAddress", "")
            amount_human = float(w.get("amount", 0))
            if not raw_addr: continue
            
            winner_addresses.append(smart_checksum(raw_addr))
            winner_amounts.append(int(amount_human * (10 ** token_decimals)))
            
        if not winner_addresses:
            return {"success": False, "message": "No valid winners after filtering"}
            
    except ValueError as e:
        return {"success": False, "message": f"Invalid address error: {e}"}

    try:
        # ==========================================
        # 🪐 SOLANA EXECUTION
        # ==========================================
        if chain_id == SOLANA_CHAIN_ID:
            tx_hash_str = await dispatch_solana_batch_rewards(
                contract_address, winner_addresses, winner_amounts
            )
            
        # ==========================================
        # 🌐 EVM EXECUTION
        # ==========================================
        else:
            print(f"[Quiz {quiz_code}] 🌐 Routing to EVM Dispatcher...")
            w3 = await get_web3_instance(chain_id)
            contract = w3.eth.contract(address=contract_cs, abi=QUEST_ABI)
            
            balance_ok, balance_err = check_sufficient_balance(w3, signer.address)
            if not balance_ok:
                return {"success": False, "message": f"Backend wallet low on gas: {balance_err}"}
                
            tx = build_transaction_with_standard_gas(
                w3,
                contract.functions.setRewardAmountsBatch(winner_addresses, winner_amounts),
                signer.address
            )
            signed = w3.eth.account.sign_transaction(tx, signer.key)
            tx_hash_bytes = w3.eth.send_raw_transaction(signed.raw_transaction)
            
            await wait_for_transaction_receipt(w3, tx_hash_bytes.hex())
            tx_hash_str = tx_hash_bytes.hex()
            
        # --- DATABASE UPDATES (UNIVERSAL) ---
        print(f"[Quiz {quiz_code}] ✅ Dispatch confirmed. Tx: {tx_hash_str}")
        
        quiz_db_id = quizzes.get(quiz_code, {}).get("db_id")
        if quiz_db_id:
            await db_create_payouts(
                quiz_db_id, winners, token_symbol, token_address, chain_id
            )
            for addr in winner_addresses:
                await db_update_payout_status(
                    quiz_db_id, normalize_db_address(addr), "sent", tx_hash=tx_hash_str
                )
                
        return {
            "success": True,
            "txHash": tx_hash_str,
            "quizCode": quiz_code,
            "contractAddress": contract_address,
            "chainId": chain_id,
            "winnersWhitelisted": len(winner_addresses)
        }
        
    except Exception as e:
        print(f"[Quiz {quiz_code}] ❌ dispatch_rewards error: {e}")
        traceback.print_exc()
        return {"success": False, "message": str(e)}
    
@quiz_router.get("/{code}/payouts")
async def get_quiz_payouts(code: str, db: asyncpg.Pool = Depends(get_db)):
    code = code.upper()
    
    row = await db.fetchrow("SELECT id FROM faucet_quizzes WHERE code = $1", code)
    if not row:
        raise HTTPException(status_code=404, detail="Quiz not found")

    payouts = await db.fetch("""
        SELECT 
            wallet_address,
            username,
            rank,
            points,
            amount,
            token_symbol,
            status,
            tx_hash
        FROM faucet_quiz_reward_payouts
        WHERE quiz_id = $1
        ORDER BY rank ASC
    """, row["id"])

    return {
        "success": True,
        "payouts": [
            {
                "wallet_address": p["wallet_address"],
                "username":       p["username"],
                "rank":           p["rank"],
                "points":         p["points"],
                "amount":         float(p["amount"] or 0),
                "token_symbol":   p["token_symbol"],
                "status":         p["status"],
                "tx_hash":        p["tx_hash"],
            }
            for p in payouts
        ]
    }

@quiz_router.post("/{code}/claim-ack")
async def acknowledge_claim(code: str, body: dict):
    """
    Called by frontend after user successfully calls claim() on-chain.
    Marks the payout as claimed in the DB.
    
    Body: { walletAddress, txHash }
    """
    code = code.upper()
    quiz = quizzes.get(code)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    wallet = body.get("walletAddress", "")
    tx_hash = body.get("txHash", "")
    if not wallet:
        raise HTTPException(status_code=400, detail="walletAddress required")
    quiz_db_id = quiz.get("db_id")
    if not quiz_db_id:
        return {"success": True, "message": "No DB record to update"}
    try:
        async with pool.acquire() as conn:
            result = await conn.execute("""
                UPDATE faucet_quiz_reward_payouts
                SET status = 'claimed',
                    claimed_at = NOW(),
                    tx_hash = COALESCE($1, tx_hash)
                WHERE quiz_id = $2
                  AND wallet_address = $3
                  AND status != 'claimed'
            """, tx_hash or None, quiz_db_id, wallet.lower())
        updated = int(result.split()[-1]) if result else 0
        return {
            "success": True,
            "updated": updated,
            "message": "Claim acknowledged" if updated > 0 else "Already claimed or not found"
        }
    except Exception as e:
        print(f"[Quiz {code}] claim-ack error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# ──────────────────────────────────────────────────────────────
#  Game loop
# ──────────────────────────────────────────────────────────────
async def run_quiz_loop(code: str, start_from: int = 0):
    print(f"[LOOP] run_quiz_loop started for {code}, starting from question {start_from}")
    quiz  = quizzes.get(code)
    state = game_state.get(code)
    print(f"[LOOP] quiz exists: {quiz is not None}, state exists: {state is not None}")
    questions = quiz["questions"]
    state["status"] = "active"
    quizzes[code]["status"] = "active"

    # ✅ Grab creator address once for filtering throughout the loop
    creator_addr = quiz.get("creatorAddress", "").lower()

    # Only do the countdown if starting fresh
    if start_from == 0:
        for i in range(3, 0, -1):
            await broadcast(code, {"type": "countdown", "value": i})
            await asyncio.sleep(1)

    for q_idx in range(start_from, len(questions)):
        question = questions[q_idx]
        state["current_q"] = q_idx
        state["answers"][q_idx] = {}

        for addr in state["players"]:
            state["players"][addr]["pointsThisRound"] = 0
            state["players"][addr]["answeredCorrectly"] = False

        started_at = utc_now_ms()
        await broadcast(code, {
            "type": "question",
            "index": q_idx,
            "total": len(questions),
            "question": question["question"],
            "options": question["options"],
            "timeLimit": question.get("timeLimit", quiz["timePerQuestion"]),
            "startedAt": started_at,
        })
        await asyncio.sleep(question.get("timeLimit", quiz["timePerQuestion"]))

        correct_id = question["correctId"]
        for addr, ans in state["answers"].get(q_idx, {}).items():
            # ✅ Skip creator answers from scoring
            if addr.lower() == creator_addr:
                continue
            is_correct = ans["answerId"] == correct_id
            pts = calc_points(
                question.get("timeLimit", quiz["timePerQuestion"]),
                ans["timeTaken"],
                is_correct,
            )
            player = state["players"].get(addr)
            if player:
                player["points"] += pts
                player["pointsThisRound"] = pts
                player["answeredCorrectly"] = is_correct
                player["streak"] = (player.get("streak", 0) + 1) if is_correct else 0
                await send_to_player(code, addr, {
                    "type": "answer_result",
                    "isCorrect": is_correct,
                    "pointsEarned": pts,
                    "correctId": correct_id,
                    "streak": player["streak"],
                })

        await broadcast(code, {
            "type": "question_end",
            "correctId": correct_id,
            "correctText": next((o["text"] for o in question["options"] if o["id"] == correct_id), ""),
        })
        await asyncio.sleep(2)

        is_last = q_idx == len(questions) - 1
        lb = leaderboard_snapshot(code)  # already filters creator
        await broadcast(code, {
            "type": "leaderboard",
            "entries": lb,
            "questionIndex": q_idx,
            "isLast": is_last,
        })

        quiz_db_id = quizzes[code].get("db_id")
        if quiz_db_id:
            asyncio.create_task(
                db_save_quiz_progress(quiz_db_id, q_idx + 1, {
                    addr: p for addr, p in state["players"].items()
                    if addr.lower() != creator_addr  # ✅ don't persist creator progress
                })
            )

        if not is_last:
            await asyncio.sleep(6)

    # ── Finish ────────────────────────────────────────────────
    await asyncio.sleep(8)
    final_lb = leaderboard_snapshot(code)  # already filters creator
    state["status"] = "finished"
    quizzes[code]["status"] = "finished"

    quiz_db_id = quizzes[code].get("db_id")
    if quiz_db_id:
        asyncio.create_task(db_save_final_leaderboard(quiz_db_id, final_lb))

    reward_cfg = quiz.get("reward")
    reward_info = None
    if reward_cfg and reward_cfg.get("poolAmount", 0) > 0:
        reward_info = {
            "poolAmount":   reward_cfg["poolAmount"],
            "tokenSymbol":  reward_cfg["tokenSymbol"],
            "totalWinners": reward_cfg.get("totalWinners", 0),
            "faucetAddress": quiz.get("faucetAddress")
        }

    await broadcast(code, {
        "type": "game_over",
        "finalLeaderboard": final_lb,
        "reward": reward_info
    })

    asyncio.create_task(process_quiz_rewards(code, final_lb))

    if quiz_db_id:
        asyncio.create_task(_db_finalize(quiz_db_id, final_lb))
        
        
async def _db_finalize(quiz_db_id: str, final_lb: list):
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                for entry in final_lb:
                    await conn.execute("""
                        UPDATE faucet_quiz_participants
                        SET final_points = $1, final_rank = $2
                        WHERE quiz_id = $3 AND wallet_address = $4
                    """, entry["points"], entry["rank"],
                         quiz_db_id, entry["walletAddress"])
                await conn.execute("""
                    UPDATE faucet_quiz_participants qp
                    SET is_winner = TRUE
                    FROM faucet_quiz_rewards qr
                    WHERE qr.quiz_id = $1 AND qp.quiz_id = $1
                      AND qp.final_rank <= qr.total_winners
                """, quiz_db_id)
                await conn.execute("""
                    UPDATE faucet_quizzes
                    SET status = 'finished', finished_at = NOW()
                    WHERE id = $1
                """, quiz_db_id)
    except Exception as e:
        print(f"[DB] Finalize error: {e}")
@quiz_router.get("/{code}/debug")
async def debug_quiz_state(code: str):
    code = code.upper()
    quiz = quizzes.get(code)
    state = game_state.get(code)
    return {
        "quiz_exists": bool(quiz),
        "state_exists": bool(state),
        "status": state.get("status") if state else None,
        "player_count": len(state.get("players", {})) if state else 0,
        "max_participants": quiz.get("maxParticipants") if quiz else None,
        "db_id": quiz.get("db_id") if quiz else None,
    }
    



@quiz_router.post("/generate-from-pdf")
async def generate_quiz_from_pdf(
    file: UploadFile = File(...),
    numQuestions: int = Form(5)
):
    """Extracts text from a PDF and uses Gemini to generate questions for the manual builder."""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        # 1. Read PDF text
        pdf_bytes = await file.read()
        pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
        
        extracted_text = ""
        # Limit to first 10 pages to avoid hitting Gemini token limits
        for page in pdf_reader.pages[:10]:
            extracted_text += page.extract_text() + "\n"

        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract any text from the PDF.")

        # Limit text size to prevent payload from being too massive
        extracted_text = extracted_text[:20000] 

        # 2. Ask Gemini to generate questions based strictly on this text
        prompt = f"""
You are a quiz master. Read the following document text and generate exactly {numQuestions} multiple-choice questions based ONLY on the facts present in this text.

Document Text:
\"\"\"{extracted_text}\"\"\"

Return ONLY valid JSON (no markdown, no extra text):
{{
  "questions": [
    {{
      "question": "Question text?",
      "options": [
        {{"id": "A", "text": "Option A"}},
        {{"id": "B", "text": "Option B"}},
        {{"id": "C", "text": "Option C"}},
        {{"id": "D", "text": "Option D"}}
      ],
      "correctId": "B",
      "timeLimit": 30
    }}
  ]
}}
Rules: 4 options per question, correctId in [A,B,C,D], vary correct answer positions.
"""
        # 3. Call Gemini
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                GEMINI_URL,
                params={"key": GEMINI_API_KEY},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.2, # Lower temperature for more factual extraction
                        "maxOutputTokens": 8192,
                        "responseMimeType": "application/json",
                    },
                },
            )
            
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Gemini API error: " + resp.text)
            
        raw = resp.json()
        text = raw["candidates"][0]["content"]["parts"][0]["text"]
        
        data = json.loads(text)
        
        return {
            "success": True,
            "questions": data.get("questions", [])
        }

    except Exception as e:
        print(f"PDF Parsing Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@quiz_router.get("/{code}/results")
async def get_quiz_results(code: str, db: asyncpg.Pool = Depends(get_db)):
    code = code.upper()

    quiz_row = await db.fetchrow("""
        SELECT 
            q.*,
            COALESCE(r.pool_amount, 0)       as pool_amount,
            COALESCE(r.token_symbol, '')      as token_symbol,
            COALESCE(r.total_winners, 0)      as total_winners,
            COALESCE(r.distribution_type, 'equal') as distribution_type,
            r.token_address,
            r.token_decimals,
            r.token_logo_url,
            r.faucet_address                  as reward_contract_address
        FROM faucet_quizzes q
        LEFT JOIN faucet_quiz_rewards r ON r.quiz_id = q.id
        WHERE q.code = $1
    """, code)

    if not quiz_row:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if quiz_row["status"] != "finished":
        raise HTTPException(status_code=400, detail="Quiz has not ended yet")

    # ── Load final leaderboard from saved participant data ────
    participants = await db.fetch("""
        SELECT
            p.wallet_address,
            p.username,
            p.avatar_url,
            COALESCE(p.final_rank,   0) as final_rank,
            COALESCE(p.final_points, 0) as final_points,
            COALESCE(p.points,       0) as points,
            COALESCE(p.streak,       0) as streak
        FROM faucet_quiz_participants p
        WHERE p.quiz_id = $1
        ORDER BY
            COALESCE(p.final_rank, 9999) ASC,
            COALESCE(p.final_points, p.points, 0) DESC
    """, quiz_row["id"])

    leaderboard = []
    for i, p in enumerate(participants):
        # Use saved final_rank if available, otherwise derive from order
        rank = p["final_rank"] if p["final_rank"] > 0 else i + 1
        pts  = p["final_points"] if p["final_points"] > 0 else p["points"]
        leaderboard.append({
            "rank":              rank,
            "walletAddress":     p["wallet_address"],
            "username":          p["username"],
            "avatarUrl":         p["avatar_url"],
            "points":            pts,
            "streak":            p["streak"],
            "pointsThisRound":   0,
            "rankChange":        0,
            "answeredCorrectly": False,
        })

    total_questions = await db.fetchval(
        "SELECT COUNT(*) FROM faucet_quiz_questions WHERE quiz_id = $1",
        quiz_row["id"]
    )

    # ── Load payout/winner data from faucet_quiz_reward_payouts ──
    payout_map: dict = {}
    try:
        winners = await db.fetch("""
            SELECT 
                wallet_address,
                username,
                rank,
                points,
                amount,
                token_symbol,
                status,
                tx_hash
            FROM faucet_quiz_reward_payouts
            WHERE quiz_id = $1
        """, quiz_row["id"])

        for w in winners:
            payout_map[w["wallet_address"].lower()] = {
                "amount":      round(float(w["amount"] or 0), 6),
                "tokenSymbol": w["token_symbol"] or quiz_row["token_symbol"] or "",
                "status":      w["status"] or "unclaimed",
                "txHash":      w["tx_hash"],
                "rank":        w["rank"],
                "points":      w["points"],
                "username":    w["username"],
            }
    except Exception as e:
        print(f"[Results] Could not load payouts: {e}")

    return {
        "success": True,
        "quiz": {
            "code":            code,
            "title":           quiz_row["title"],
            "description":     quiz_row["description"],
            "coverImageUrl":   quiz_row["cover_image_url"],
            "totalQuestions":  total_questions,
            "creatorAddress":  quiz_row["creator_address"],
            "creatorUsername": quiz_row["creator_username"],
            "chainId":         quiz_row["chain_id"],
            "reward": {
                "poolAmount":       float(quiz_row["pool_amount"]),
                "tokenSymbol":      quiz_row["token_symbol"] or "",
                "totalWinners":     quiz_row["total_winners"] or 0,
                "contractAddress":  quiz_row["reward_contract_address"] or "",  # ← ADD THIS
                "tokenDecimals":    quiz_row["token_decimals"] or 18,            # ← ADD THIS
                "distributionType": quiz_row["distribution_type"] or "equal",
            } if quiz_row["pool_amount"] and float(quiz_row["pool_amount"]) > 0 else None,
        },
        "leaderboard":  leaderboard,
        "payouts":      payout_map,
        "totalPlayers": len(participants),
        "endedAt":      quiz_row["updated_at"].isoformat() if quiz_row.get("updated_at") else None,
    }

# Add this endpoint to your quiz_router
@quiz_router.post("/{code}/claim")
async def backend_process_claim(
    code: str,
    body: QuizClaimRequest,
    db: asyncpg.Pool = Depends(get_db)
):
    """
    Backend-mediated claim for Quizzes.
    Supports both EVM and Solana chains natively.
    """
    code = code.upper()
    wallet_cs  = body.walletAddress
    wallet_lower = wallet_cs.lower()

    print(f"\n{'='*60}")
    print(f"🎯 [Quiz {code}] CLAIM REQUEST")
    print(f"   wallet      : {wallet_cs}")
    print(f"{'='*60}")

    # ── Step 1: Load quiz from DB ───────────────────────────────
    print(f"📋 [Step 1] Loading quiz record...")
    quiz_row = await db.fetchrow(
        "SELECT id, title, creator_address, faucet_address, chain_id FROM faucet_quizzes WHERE code = $1",
        code
    )
    
    if not quiz_row:
        print(f"   ❌ Quiz '{code}' not found in DB")
        raise HTTPException(status_code=404, detail=f"Quiz '{code}' not found")

    contract_address = smart_checksum(quiz_row["faucet_address"])
    chain_id         = quiz_row["chain_id"]
    quiz_db_id       = quiz_row["id"]
    q_title          = quiz_row["title"]
    q_creator        = quiz_row["creator_address"]
    
    print(f"   ✅ Quiz found — contract: {contract_address}, chain: {chain_id}")

    # ── Step 2: Check DB payout record (warn only) ────────────
    print(f"🗄️  [Step 2] Checking DB payout record...")
    payout_row = await db.fetchrow(
        """
        SELECT status, amount
        FROM faucet_quiz_reward_payouts
        WHERE quiz_id = $1 AND wallet_address = $2
        """,
        quiz_db_id, wallet_lower
    )
    
    if not payout_row:
        print(f"   ⚠️  No DB payout row found for {wallet_lower} (will rely on on-chain data)")
    elif payout_row["status"] == "claimed":
        print(f"   ❌ DB already marked as claimed")
        raise HTTPException(status_code=400, detail="Reward has already been claimed.")
    else:
        print(f"   ✅ DB payout row found — status: {payout_row['status']}")

    reward_amount_human = "0" # Fallback

    # ==========================================
    # 🪐 SOLANA EXECUTION
    # ==========================================
    if is_solana_chain(chain_id):
        quiz_row_db = await db.fetchrow(
            "SELECT title, creator_address FROM faucet_quizzes WHERE code = $1", code
        )
        if not quiz_row_db:
            raise HTTPException(status_code=404, detail="Quiz not found.")
 
        q_title   = quiz_row_db["title"]
        q_creator = quiz_row_db["creator_address"]
 
        # Check eligibility via QuizPlayerRecord
        program_id     = Pubkey.from_string(SOLANA_PROGRAM_ID)
        creator_pubkey = Pubkey.from_string(q_creator)
        user_pubkey    = Pubkey.from_string(wallet_cs)
 
        quiz_state, _ = Pubkey.find_program_address(
            [b"quiz", bytes(creator_pubkey), q_title.encode()],
            program_id,
        )
        player_record_pda, _ = Pubkey.find_program_address(
            [b"quiz_player", bytes(quiz_state), bytes(user_pubkey)],
            program_id,
        )
 
        async with AsyncClient(SOLANA_RPC_URL) as _client:
            _program = Program(idl, program_id, Provider(_client, Wallet(solana_signer)))
            try:
                record = await _program.account["QuizPlayerRecord"].fetch(player_record_pda)
                if record.has_claimed:
                    raise HTTPException(status_code=400, detail="Already claimed on-chain.")
                if int(record.reward_amount) == 0:
                    raise HTTPException(status_code=404, detail="No reward set for this wallet.")
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=404, detail="No reward set for this wallet.")
 
        # claimQuizReward instruction
        quiz_token_vault, _ = Pubkey.find_program_address(
            [b"quiz_vault", bytes(quiz_state)],
            program_id,
        )
        async with AsyncClient(SOLANA_RPC_URL) as _client:
            _provider = Provider(_client, Wallet(solana_signer))
            _program  = Program(idl, program_id, _provider)
            state_data = await _program.account["QuizState"].fetch(quiz_state)
            token_mint = state_data.token_mint
            participant_ata = get_associated_token_address(user_pubkey, token_mint)
 
            tx_hash_str = await _program.rpc["claimQuizReward"](
                ctx=Context(
                    accounts={
                        "backend":                 solana_signer.pubkey(),
                        "quizState":               quiz_state,
                        "participant":             user_pubkey,
                        "playerRecord":            player_record_pda,
                        "quizTokenVault":          quiz_token_vault,
                        "participantTokenAccount": participant_ata,
                        "tokenProgram":            TOKEN_PROGRAM_ID,
                    },
                    signers=[solana_signer],
                ),
            )
        return {"success": True, "txHash": str(tx_hash_str), "message": "Reward claimed!"}

    # ==========================================
    # 🌐 EVM EXECUTION
    # ==========================================
    else:
        print(f"🌐 [Step 3] Executing EVM Claim...")
        w3       = _get_w3(chain_id)
        contract = w3.eth.contract(address=contract_address, abi=QUIZ_ABI)

        # Check claim window
        try:
            is_claim_active = contract.functions.isClaimActive().call()
            if not is_claim_active:
                raise HTTPException(status_code=400, detail="Claim window is not currently active.")
        except HTTPException:
            raise
        except Exception as e:
            print(f"   ⚠️ Could not read claim window (proceeding): {e}")

        # Check eligibility
        try:
            claimed, has_reward_amount, reward_amount, can_claim, time_rem = \
                contract.functions.getClaimStatus(wallet_cs).call()

            if claimed:
                raise HTTPException(status_code=400, detail="Already claimed on-chain.")
            if not has_reward_amount:
                raise HTTPException(status_code=404, detail="No reward set for this wallet.")
            if not can_claim:
                raise HTTPException(status_code=400, detail="Claim window closed or unavailable.")
                
            reward_amount_human = str(w3.from_wei(reward_amount, 'ether'))
        except HTTPException:
            raise
        except Exception as e:
            print(f"   ⚠️ getClaimStatus failed ({e}) — proceeding with caution")

        # Gas check & Execute
        balance_ok, balance_err = check_sufficient_balance(w3, signer.address)
        if not balance_ok:
            raise HTTPException(status_code=500, detail=f"Backend wallet low on gas: {balance_err}")

        print(f"📤 Building and sending EVM Tx...")
        try:
            tx = build_transaction_with_standard_gas(
                w3,
                contract.functions["claim"](wallet_cs),
                signer.address
            )
            signed_tx = w3.eth.account.sign_transaction(tx, signer.key)
            tx_hash_bytes = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            tx_hash = "0x" + tx_hash_bytes.hex()
            
            print(f"⏳ Waiting for confirmation...")
            receipt = await wait_for_transaction_receipt(w3, tx_hash)
            if receipt.get("status", 0) != 1:
                raise HTTPException(status_code=400, detail="Claim transaction reverted.")
            print(f"   ✅ Confirmed in block {receipt.get('blockNumber')}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to execute transaction: {str(e)}")

    # ── Step 4: Update DB ──────────────────────────────────────
        print(f"💾 [Step 4] Updating DB...")

        # The on-chain tx already succeeded — wrap DB update in try/except
        # so a DB failure never prevents returning the txHash to the frontend
        try:
            if payout_row:
                await db.execute(
                    """
                    UPDATE faucet_quiz_reward_payouts
                    SET status = 'claimed', claimed_at = NOW(), tx_hash = $1
                    WHERE quiz_id = $2 AND wallet_address = $3
                    """,
                    tx_hash, quiz_db_id, wallet_lower
                )
            else:
                # Row doesn't exist yet — insert with only allowed status values
                # Use 'pending' first, then immediately update to claimed
                await db.execute(
                    """
                    INSERT INTO faucet_quiz_reward_payouts
                        (quiz_id, wallet_address, rank, amount, percentage, 
                        token_symbol, token_address, chain_id, status)
                    VALUES ($1, $2, 0, 0, 0, '', '', $3, 'pending')
                    ON CONFLICT (quiz_id, wallet_address) DO NOTHING
                    """,
                    quiz_db_id, wallet_lower, chain_id,
                )
                await db.execute(
                    """
                    UPDATE faucet_quiz_reward_payouts
                    SET status = 'claimed', claimed_at = NOW(), tx_hash = $1
                    WHERE quiz_id = $2 AND wallet_address = $3
                    """,
                    tx_hash, quiz_db_id, wallet_lower
                )
        except Exception as db_err:
            # Log but DO NOT raise — the on-chain tx already succeeded
            print(f"⚠️ [Step 4] DB update failed (claim still succeeded on-chain): {db_err}")

        # Always return success with txHash regardless of DB outcome
        print(f"\n🏆 [Quiz {code}] Claim complete for {wallet_cs}")
        print(f"{'='*60}\n")

        return {
            "success": True,
            "txHash": tx_hash,
            "message": "Reward claimed successfully!"
        }
    
# ──────────────────────────────────────────────────────────────
#  WebSocket
# ──────────────────────────────────────────────────────────────
@ws_router.websocket("/ws/quiz/{code}")
async def quiz_websocket(ws: WebSocket, code: str):
    code = code.upper()
    chat_history: Dict[str, List[dict]] = {}
    if code not in quizzes:
        try:
            success = await asyncio.shield(reload_single_quiz_from_db(code))
        except asyncio.CancelledError:
            return
        if not success:
            await ws.close(code=4004, reason="Quiz not found")
            return
    await ws.accept()
    connections.setdefault(code, []).append(ws)
    wallet = None
    try:
        async for raw in ws.iter_text():
            try:
                msg = json.loads(raw)
            except Exception:
                continue
            msg_type = msg.get("type")
            state = game_state.get(code, {})
            quiz = quizzes.get(code, {})
            creator_addr = quiz.get("creatorAddress", "").lower()

            if msg_type == "identify":
                wallet = msg.get("walletAddress", "")
                is_creator = wallet.lower() == creator_addr
                player_sockets.setdefault(code, {})[wallet] = ws

                # ✅ Player list always excludes the creator
                players_list = [
                    {"walletAddress": a, **{k: v for k, v in p.items() if k != "walletAddress"}}
                    for a, p in state.get("players", {}).items()
                    if a.lower() != creator_addr
                ]
                await ws.send_text(json.dumps({
                    "type": "state_sync",
                    "status": state.get("status", "waiting"),
                    "players": players_list,
                    "isCreator": is_creator,
                    "quiz": {
                        "title": quiz.get("title"),
                        "totalQuestions": quiz.get("totalQuestions"),
                        "creatorAddress": quiz.get("creatorAddress"),
                    },
                }))
                await broadcast(code, {
                    "type": "player_list",
                    "players": players_list,
                })
                if code in chat_history and chat_history[code]:
                    await ws.send_text(json.dumps({
                        "type": "chat_history",
                        "messages": chat_history[code],
                    }))

            elif msg_type in ("submit_answer", "change_answer"):
                q_idx = state.get("current_q", -1)
                # ✅ Creator cannot submit answers
                if q_idx < 0 or state.get("status") != "active" or not wallet:
                    continue
                if wallet.lower() == creator_addr:
                    continue
                is_first_answer_ever = not any(
                    wallet in state["answers"].get(qi, {})
                    for qi in state["answers"]
                )
                state["answers"].setdefault(q_idx, {})[wallet] = {
                    "answerId": msg["answerId"],
                    "timeTaken": msg.get("timeTaken", 0),
                }
                await ws.send_text(json.dumps({"type": "answer_ack", "answerId": msg["answerId"]}))
                if is_first_answer_ever:
                    asyncio.create_task(
                        process_onchain_quiz_submit(
                            code,
                            wallet,
                            q_idx,
                            msg["answerId"],
                            msg.get("timeTaken", 0)
                        )
                    )

            elif msg_type == "set_ready":
                wallet = msg.get("walletAddress", "")
                # ✅ Creator cannot set ready state
                if wallet.lower() == creator_addr:
                    continue
                if wallet in state["players"]:
                    state["players"][wallet]["isReady"] = msg.get("isReady", True)
                    await broadcast(code, {
                        "type": "player_list",
                        "players": [
                            {
                                "walletAddress": addr,
                                "username": p["username"],
                                "avatarUrl": p.get("avatarUrl"),
                                "points": p.get("points", 0),
                                "isReady": p.get("isReady", False),
                            }
                            for addr, p in state["players"].items()
                            if addr.lower() != creator_addr  # ✅ filter creator from broadcast
                        ]
                    })

            elif msg_type == "chat_message":
                if not wallet:
                    continue
                rate_key = f"chat:{code}:{wallet}"
                now = time.monotonic()
                last_msg_time = _rate_store.get(rate_key, [0])
                last_time = last_msg_time[-1] if last_msg_time else 0
                if now - last_time < 1.0:
                    await ws.send_text(json.dumps({
                        "type": "chat_error",
                        "message": "Slow down! One message per second."
                    }))
                    continue
                _rate_store[rate_key] = [now]
                raw_text = str(msg.get("text", "")).strip()
                if not raw_text or len(raw_text) > 200:
                    continue
                sender_player = state.get("players", {}).get(wallet, {})
                is_host = wallet.lower() == creator_addr
                sender_username = sender_player.get("username")
                sender_avatar = sender_player.get("avatarUrl")
                if not sender_username:
                    try:
                        profile_res = supabase.table("user_profiles")\
                            .select("username, avatar_url")\
                            .eq("wallet_address", wallet.lower())\
                            .execute()
                        if profile_res.data:
                            sender_username = profile_res.data[0].get("username")
                            sender_avatar = profile_res.data[0].get("avatar_url")
                    except Exception:
                        pass
                if not sender_username:
                    sender_username = wallet[:6] + "..." + wallet[-4:]
                chat_msg = {
                    "type": "chat_message",
                    "wallet": wallet,
                    "username": sender_username,
                    "avatarUrl": sender_avatar,
                    "text": raw_text,
                    "isHost": is_host,
                    "timestamp": int(time.time() * 1000),
                }
                history = chat_history.setdefault(code, [])
                history.append(chat_msg)
                if len(history) > 50:
                    chat_history[code] = history[-50:]
                await broadcast(code, chat_msg)

            elif msg_type == "kick_player":
                sender = msg.get("walletAddress", "").lower()
                target = msg.get("targetWallet", "")
                if sender != creator_addr:
                    await ws.send_text(json.dumps({"type": "error", "message": "Only the host can kick players"}))
                    continue
                if target in state["players"]:
                    target_ws = player_sockets.get(code, {}).get(target)
                    if target_ws:
                        try:
                            await target_ws.send_text(json.dumps({
                                "type": "kicked",
                                "message": "You have been removed from this quiz by the host."
                            }))
                            await target_ws.close(code=4003, reason="Kicked by host")
                        except Exception:
                            pass
                    del state["players"][target]
                    player_sockets.get(code, {}).pop(target, None)
                    await broadcast(code, {
                        "type": "player_list",
                        "players": [
                            {
                                "walletAddress": addr,
                                "username": p["username"],
                                "avatarUrl": p.get("avatarUrl"),
                                "points": p.get("points", 0),
                                "isReady": p.get("isReady", False),
                            }
                            for addr, p in state["players"].items()
                            if addr.lower() != creator_addr  # ✅ filter creator from broadcast
                        ]
                    })

            elif msg_type == "start_quiz":
                sender = msg.get("walletAddress", "").lower()
                if not quiz or sender != creator_addr:
                    await ws.send_text(json.dumps({"type": "error", "message": "Only the creator can start the quiz"}))
                    continue
                if state.get("status") != "waiting":
                    await ws.send_text(json.dumps({"type": "error", "message": "Quiz has already started or finished"}))
                    continue
                not_ready = [
                    p["username"]
                    for addr, p in state["players"].items()
                    if addr.lower() != creator_addr and not p.get("isReady", False)
                ]
                if not_ready:
                    names = ", ".join(not_ready[:3])
                    suffix = f" and {len(not_ready) - 3} more" if len(not_ready) > 3 else ""
                    await ws.send_text(json.dumps({
                        "type": "error",
                        "message": f"Waiting for: {names}{suffix} to ready up"
                    }))
                    await broadcast(code, {
                        "type": "waiting_for_ready",
                        "notReady": not_ready,
                        "message": f"Host is trying to start — {names}{suffix} still not ready!"
                    })
                    continue
                print(f"[START_QUIZ] All players ready. Starting {code}...")
                state["status"] = "active"
                quizzes[code]["status"] = "active"
                quiz_db_id = quizzes[code].get("db_id")
                if quiz_db_id:
                    async with pool.acquire() as conn:
                        await conn.execute("UPDATE faucet_quizzes SET status = 'active' WHERE id = $1", quiz_db_id)
                await broadcast(code, {"type": "game_starting", "message": "Quiz starting in 3 seconds..."})
                asyncio.create_task(run_quiz_loop(code))
                continue

    except WebSocketDisconnect:
        pass
    finally:
        if ws in connections.get(code, []):
            connections[code].remove(ws)
        if wallet and code in player_sockets:
            player_sockets[code].pop(wallet, None)

# ============================================================
# DROPLIST: DAILY CLAIMS & REWARDS ENGINE
# ============================================================

@app.post("/api/droplist/generate-signature", tags=["Droplist"])
async def droplist_generate_signature(req: DroplistClaimRequest):
    """
    Generates a cryptographic signature allowing the user to mint daily points.
    Enforces a strict 24-hour cross-chain cooldown.
    """
    try:
        wallet_cs = smart_checksum(req.walletAddress)
        if req.chainId not in VALID_CHAIN_IDS:
            raise HTTPException(status_code=400, detail="Unsupported chain ID.")

        current_time = (int(time.time()) // 600) * 600

        async with pool.acquire() as conn:
            # 1. Check 24-hour cooldown limit across all chains
            row = await conn.fetchrow(
                "SELECT last_claim_at FROM droplist_balances WHERE wallet_address = $1", 
                wallet_cs.lower()
            )
            
            if row and row["last_claim_at"]:
                last_claim_dt = row["last_claim_at"]
                # Ensure timezone awareness
                if last_claim_dt.tzinfo is None:
                    last_claim_dt = last_claim_dt.replace(tzinfo=timezone.utc)
                
                seconds_since_last_claim = (datetime.now(timezone.utc) - last_claim_dt).total_seconds()
                if seconds_since_last_claim < 86400:  # 24 hours in seconds
                    hours_left = int((86400 - seconds_since_last_claim) // 3600)
                    mins_left = int(((86400 - seconds_since_last_claim) % 3600) // 60)
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Cooldown active. Try again in {hours_left}h {mins_left}m."
                    )

        # 2. Prepare Signature Payload (Matching Solidity ABI)
        amount_to_mint = Web3.to_wei(10, 'ether') # e.g., 10 DROP points
        w3 = _get_w3(req.chainId)
        
        message_hash = Web3.solidity_keccak(
            ['address', 'uint256', 'uint256', 'uint256'],
            [wallet_cs, amount_to_mint, current_time, req.chainId]
        )
        
        # 3. Sign with backend wallet 
        signable_message = encode_defunct(primitive=message_hash)
        signed_message = signer.sign_message(signable_message)

        return {
            "success": True,
            "amount": str(amount_to_mint),
            "timestamp": current_time,
            # ✅ Add the 0x prefix here
            "signature": "0x" + signed_message.signature.hex() 
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Droplist Signature Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/check-faucet-name")
async def check_faucet_name(name: str, chainId: int, conn=Depends(get_db)):
    rows = await conn.fetch(
        """
        SELECT faucet_address, faucet_name, factory_address, factory_type
        FROM faucet_details
        WHERE LOWER(faucet_name) = LOWER($1)
          AND chain_id = $2
        """,
        name.strip(),
        chainId,
    )

    if not rows:
        return {"exists": False}

    faucets = [
        {
            "address": r["faucet_address"],
            "name": r["faucet_name"],
            "owner": None,
            "factoryAddress": r["factory_address"],
            "factoryType": r["factory_type"],
        }
        for r in rows
    ]

    return {
        "exists": True,
        "faucet": faucets[0],
        "faucets": faucets,
    }
    
    
# ─── MERCH ORDER ENDPOINTS ────────────────────────────────────────────────────

@app.post("/api/droplist/verify-merch-order", tags=["Droplist Store"])
async def verify_merch_order(req: MerchOrderRequest):
    try:
        wallet_cs = smart_checksum(req.walletAddress)
        w3 = _get_w3(req.chainId)

        async with pool.acquire() as conn:
            # 1. Prevent replay
            if await conn.fetchval(
                "SELECT 1 FROM droplist_processed_txs WHERE tx_hash = $1",
                req.txHash
            ):
                raise HTTPException(status_code=400, detail="Order already processed.")

            # 2. Fetch receipt
            receipt = None
            for attempt in range(3):
                try:
                    receipt = w3.eth.get_transaction_receipt(req.txHash)
                    if receipt is not None:
                        break
                except Exception as e:
                    if attempt == 2:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Could not fetch receipt: {str(e)}"
                        )
                    await asyncio.sleep(2)

            if receipt is None:
                raise HTTPException(
                    status_code=400,
                    detail="Transaction not yet mined. Please try again in a moment."
                )

            if receipt["status"] != 1:
                raise HTTPException(status_code=400, detail="Transaction failed on-chain.")

            # 3. Parse PointsRedeemed event
            event_abi = [{
                "anonymous": False,
                "inputs": [
                    {"indexed": True,  "internalType": "address", "name": "user",     "type": "address"},
                    {"indexed": False, "internalType": "uint256", "name": "amount",   "type": "uint256"},
                    {"indexed": False, "internalType": "string",  "name": "rewardId", "type": "string"}
                ],
                "name": "PointsRedeemed",
                "type": "event"
            }]

            contract = w3.eth.contract(address=receipt["to"], abi=event_abi)
            logs = contract.events.PointsRedeemed().process_receipt(receipt)

            if not logs:
                raise HTTPException(
                    status_code=400,
                    detail="No valid redemption event found in this transaction."
                )

            event_data = logs[0]["args"]

            if event_data["user"].lower() != wallet_cs.lower():
                raise HTTPException(status_code=403, detail="Redemption does not match wallet.")
            if event_data["rewardId"] != req.itemId:
                raise HTTPException(status_code=400, detail="Redeemed item does not match order.")

            points_burned = int(Web3.from_wei(event_data["amount"], "ether"))

            # 4. Atomic DB writes
            shipping = req.shippingDetails
            addr     = shipping.get("address", {})

            async with conn.transaction():
                # Lock tx
                await conn.execute(
                    "INSERT INTO droplist_processed_txs (tx_hash) VALUES ($1)",
                    req.txHash
                )

                # Deduct points
                await conn.execute(
                    """
                    UPDATE droplist_balances
                    SET total_points = total_points - $1
                    WHERE wallet_address = $2
                    """,
                    points_burned,
                    wallet_cs.lower()
                )

                await conn.execute(
                    """
                    INSERT INTO merch_stock (item_id, stock, updated_at)
                    VALUES ($1, 0, NOW())
                    ON CONFLICT (item_id) DO UPDATE
                    SET stock      = GREATEST(0, merch_stock.stock - 1),
                        updated_at = NOW()
                    """,
                    req.itemId,
                )
                # Insert order
                new_order = await conn.fetchrow(
                    """
                    INSERT INTO merch_orders
                        (tx_hash, chain_id, wallet_address, item_id,
                         full_name, email, shipping_address, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'processing')
                    RETURNING
                        order_id, tx_hash, chain_id, wallet_address, item_id,
                        full_name, email, shipping_address, status, created_at
                    """,
                    req.txHash,
                    req.chainId,
                    wallet_cs.lower(),
                    req.itemId,
                    shipping.get("fullName", ""),
                    shipping.get("email", ""),
                    json.dumps(addr),
                )

        # 5. Fire confirmation emails (non-blocking)
        if new_order:
            order_dict = dict(new_order)
            raw_addr = order_dict.get("shipping_address")
            if isinstance(raw_addr, str):
                order_dict["shipping_address"] = json.loads(raw_addr)
            asyncio.create_task(send_order_confirmation_emails(order_dict))

        return {"success": True, "message": "Order placed successfully!"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 verify_merch_order error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/merch/stock", tags=["Admin Store"])
async def get_all_merch_stock():
    """
    Returns current stock levels for all merch items.
    Reads from the merch_stock table; defaults to 0 if an item has no row yet.
    """
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT item_id, stock FROM merch_stock ORDER BY item_id"
            )
 
        # Build a dict keyed by item_id
        stock_map = {r["item_id"]: r["stock"] for r in rows}
 
        # Ensure every known item appears (default 0 if never inserted)
        result = {item_id: stock_map.get(item_id, 0) for item_id in ITEM_DISPLAY_NAMES}
 
        return {"success": True, "stock": result}
 
    except Exception as e:
        print(f"💥 get_all_merch_stock error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
 
 
@app.patch("/api/merch/stock/{item_id}", tags=["Admin Store"])
async def update_merch_stock(item_id: str, req: StockUpdateRequest):
    """
    Add or subtract stock for a single merch item.
    req.quantity is the *delta* — positive to add, negative to subtract.
    Stock cannot go below 0.
 
    Body:
        { "adminAddress": "0x...", "quantity": 50 }
    """
    try:
        if req.adminAddress.lower() != PLATFORM_OWNER.lower():
            raise HTTPException(status_code=403, detail="Unauthorized.")
 
        if item_id not in ITEM_DISPLAY_NAMES:
            raise HTTPException(status_code=404, detail=f"Unknown item_id: {item_id}")
 
        async with pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO merch_stock (item_id, stock, updated_at)
                VALUES ($1, GREATEST(0, $2), NOW())
                ON CONFLICT (item_id) DO UPDATE
                    SET stock      = GREATEST(0, merch_stock.stock + $2),
                        updated_at = NOW()
                RETURNING item_id, stock
            """, item_id, req.quantity)
 
        return {
            "success":  True,
            "item_id":  row["item_id"],
            "new_stock": row["stock"],
            "message":  f"Stock updated for {ITEM_DISPLAY_NAMES[item_id]}",
        }
 
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 update_merch_stock error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
 
@app.get("/api/admin/merch-orders", tags=["Admin Store"])
async def get_all_merch_orders(admin_address: str):
    try:
        if admin_address.lower() != PLATFORM_OWNER.lower():
            raise HTTPException(status_code=403, detail="Unauthorized.")

        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    order_id, tx_hash, chain_id, wallet_address, item_id,
                    full_name, email, shipping_address, status,
                    tracking_number, tracking_url, shipping_notes,
                    estimated_delivery, created_at, updated_at
                FROM merch_orders
                ORDER BY created_at DESC
                """
            )

        orders = []
        for r in rows:
            addr = r["shipping_address"]
            if isinstance(addr, str):
                addr = json.loads(addr)

            orders.append({
                "orderId":          str(r["order_id"]),
                "txHash":           r["tx_hash"],
                "chainId":          r["chain_id"],
                "walletAddress":    r["wallet_address"],
                "itemId":           r["item_id"],
                "fullName":         r["full_name"],
                "email":            r["email"],
                "shippingAddress":  addr,
                "status":           r["status"],
                "trackingNumber":   r["tracking_number"],
                "trackingUrl":      r["tracking_url"],
                "shippingNotes":    r["shipping_notes"],
                "estimatedDelivery": r["estimated_delivery"].isoformat()
                                     if r["estimated_delivery"] else None,
                "createdAt":        r["created_at"].isoformat()  if r["created_at"]  else None,
                "updatedAt":        r["updated_at"].isoformat()  if r["updated_at"]  else None,
            })

        return {"success": True, "orders": orders, "total": len(orders)}

    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 get_all_merch_orders error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/admin/merch-orders/{order_id}/status", tags=["Admin Store"])
async def update_merch_order_status(order_id: str, req: UpdateOrderStatusRequest):
    try:
        if req.adminAddress.lower() != PLATFORM_OWNER.lower():
            raise HTTPException(status_code=403, detail="Unauthorized.")

        valid_statuses = ["processing", "shipped", "delivered"]
        if req.status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {valid_statuses}"
            )

        # ── Parse estimatedDelivery string → datetime.date ────────────────
        from datetime import date as _date
        est_delivery = None
        raw_est = getattr(req, "estimatedDelivery", None)
        if raw_est:
            try:
                est_delivery = _date.fromisoformat(str(raw_est).strip())
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid estimatedDelivery format '{raw_est}'. Use YYYY-MM-DD."
                )

        async with pool.acquire() as conn:
            updated = await conn.fetchrow(
                """
                UPDATE merch_orders
                SET
                    status             = $1,
                    tracking_number    = COALESCE($2, tracking_number),
                    tracking_url       = COALESCE($3, tracking_url),
                    shipping_notes     = COALESCE($4, shipping_notes),
                    estimated_delivery = COALESCE($5, estimated_delivery),
                    updated_at         = NOW()
                WHERE order_id = $6::uuid
                RETURNING
                    order_id, tx_hash, chain_id, wallet_address, item_id,
                    full_name, email, status, tracking_number, tracking_url,
                    shipping_notes, estimated_delivery, shipping_address
                """,
                req.status,
                getattr(req, "trackingNumber", None),
                getattr(req, "trackingUrl",    None),
                getattr(req, "shippingNotes",  None),
                est_delivery,   # ← datetime.date object, not a string
                order_id,
            )

        if not updated:
            raise HTTPException(status_code=404, detail="Order not found.")

        # Fire shipping/delivery update email (non-blocking)
        if req.status in ("shipped", "delivered"):
            order_dict = dict(updated)
            addr = order_dict.get("shipping_address")
            if isinstance(addr, str):
                order_dict["shipping_address"] = json.loads(addr)
            if order_dict.get("estimated_delivery"):
                order_dict["estimated_delivery"] = str(order_dict["estimated_delivery"])
            asyncio.create_task(send_shipping_update_email(order_dict))

        return {"success": True, "message": f"Order marked as {req.status}."}

    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 update_merch_order_status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/droplist/order/{order_id}", tags=["Droplist Store"])
async def get_order_by_id(order_id: str):
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT
                    order_id, tx_hash, chain_id, wallet_address, item_id,
                    full_name, email, status, shipping_address,
                    tracking_number, tracking_url, shipping_notes,
                    estimated_delivery, created_at, updated_at
                FROM merch_orders
                WHERE order_id = $1::uuid
                """,
                order_id,
            )

        if not row:
            raise HTTPException(status_code=404, detail="Order not found.")

        addr = row["shipping_address"]
        if isinstance(addr, str):
            addr = json.loads(addr)

        return {
            "success": True,
            "order": {
                "orderId":          str(row["order_id"]),
                "txHash":           row["tx_hash"],
                "chainId":          row["chain_id"],
                "walletAddress":    row["wallet_address"],
                "itemId":           row["item_id"],
                "fullName":         row["full_name"],
                "email":            row["email"],
                "status":           row["status"],
                "shippingAddress":  addr,
                "trackingNumber":   row["tracking_number"],
                "trackingUrl":      row["tracking_url"],
                "shippingNotes":    row["shipping_notes"],
                "estimatedDelivery": row["estimated_delivery"].isoformat()
                                     if row["estimated_delivery"] else None,
                "createdAt":        row["created_at"].isoformat() if row["created_at"] else None,
                "updatedAt":        row["updated_at"].isoformat() if row["updated_at"] else None,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 get_order_by_id error: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/droplist/order/{order_id}/confirm-delivery", tags=["Droplist Store"])
async def confirm_delivery(order_id: str, req: ConfirmDeliveryRequest):
    try:
        async with pool.acquire() as conn:
            # Fetch order — verify it belongs to this wallet and is in "shipped" state
            row = await conn.fetchrow(
                """
                SELECT order_id, wallet_address, status, item_id,
                       full_name, email, chain_id, tracking_number,
                       tracking_url, shipping_notes, estimated_delivery,
                       shipping_address
                FROM merch_orders
                WHERE order_id = $1::uuid
                """,
                order_id,
            )

            if not row:
                raise HTTPException(status_code=404, detail="Order not found.")

            if row["wallet_address"].lower() != req.walletAddress.lower():
                raise HTTPException(status_code=403, detail="This order does not belong to your wallet.")

            if row["status"] == "delivered":
                return {"success": True, "message": "Already confirmed as delivered."}

            if row["status"] != "shipped":
                raise HTTPException(
                    status_code=400,
                    detail=f"Order is '{row['status']}' — can only confirm delivery once shipped."
                )

            # Mark as delivered
            await conn.execute(
                """
                UPDATE merch_orders
                SET status     = 'delivered',
                    updated_at = NOW()
                WHERE order_id = $1::uuid
                """,
                order_id,
            )

        # Fire delivery confirmation email (non-blocking)
        order_dict = dict(row)
        order_dict["status"] = "delivered"
        addr = order_dict.get("shipping_address")
        if isinstance(addr, str):
            import json as _j
            order_dict["shipping_address"] = _j.loads(addr)
        if order_dict.get("estimated_delivery"):
            order_dict["estimated_delivery"] = str(order_dict["estimated_delivery"])
        order_dict["order_id"] = order_id

        asyncio.create_task(send_shipping_update_email(order_dict))

        return {"success": True, "message": "Delivery confirmed!"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 confirm_delivery error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/droplist/my-orders", tags=["Droplist Store"])
async def get_my_orders(wallet_address: str):
    try:
        wallet_lower = wallet_address.lower()

        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    order_id, tx_hash, chain_id, wallet_address, item_id,
                    full_name, email, status, shipping_address,
                    tracking_number, tracking_url, shipping_notes,
                    estimated_delivery, created_at, updated_at
                FROM merch_orders
                WHERE LOWER(wallet_address) = $1
                ORDER BY created_at DESC
                """,
                wallet_lower,
            )

        orders = []
        for r in rows:
            addr = r["shipping_address"]
            if isinstance(addr, str):
                addr = json.loads(addr)

            orders.append({
                "orderId":          str(r["order_id"]),
                "txHash":           r["tx_hash"],
                "chainId":          r["chain_id"],
                "walletAddress":    r["wallet_address"],
                "itemId":           r["item_id"],
                "fullName":         r["full_name"],
                "email":            r["email"],
                "status":           r["status"],
                "shippingAddress":  addr,
                "trackingNumber":   r["tracking_number"],
                "trackingUrl":      r["tracking_url"],
                "shippingNotes":    r["shipping_notes"],
                "estimatedDelivery": r["estimated_delivery"].isoformat()
                                     if r["estimated_delivery"] else None,
                "createdAt":        r["created_at"].isoformat() if r["created_at"] else None,
                "updatedAt":        r["updated_at"].isoformat() if r["updated_at"] else None,
            })

        return {"success": True, "orders": orders, "total": len(orders)}

    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 get_my_orders error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    

@app.get("/api/droplist/history/{wallet_address}", tags=["Droplist"])
async def get_droplist_history(wallet_address: str):
    """
    Returns the 50 most recent claims for this wallet from the DB.
    The frontend also fetches on-chain events directly, but this endpoint
    is the fast/cached source for the History tab.
    """
    try:
        wallet_cs = smart_checksum(wallet_address)
 
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT amount, chain_id, tx_hash, claimed_at
                FROM droplist_history
                WHERE wallet_address = $1
                ORDER BY claimed_at DESC
                LIMIT 50
                """,
                wallet_cs.lower()
            )
 
        history = [
            {
                "amount":    float(r["amount"]),
                "chain_id":  r["chain_id"],
                "tx_hash":   r["tx_hash"],
                "timestamp": r["claimed_at"].isoformat() if r["claimed_at"] else None
            }
            for r in rows
        ]
 
        return {"success": True, "claims": history}
 
    except Exception as e:
        print(f"💥 History Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

 
@app.post("/api/droplist/verify-claim", tags=["Droplist"])
async def droplist_verify_claim(req: DroplistVerifyTxRequest):
    """
    Called by the frontend after a successful on-chain claim() transaction.
    1. Prevents replay via droplist_processed_txs
    2. Parses the Transfer (mint) event from the receipt to get the exact amount
    3. Updates droplist_balances (total_points, last_claim_at)
    4. Appends a row to droplist_history
    5. Returns the new running total so the frontend can update immediately
    """
    try:
        wallet_cs = smart_checksum(req.walletAddress)
 
        # ── Guard: validate chain ────────────────────────────────────────────
        if req.chainId not in VALID_CHAIN_IDS:
            raise HTTPException(status_code=400, detail="Unsupported chain ID.")
 
        # ── Build a provider with a generous timeout (mobile RPCs are slow) ──
        rpc_url = RPC_URLS.get(req.chainId)
        if not rpc_url:
            raise HTTPException(status_code=400, detail=f"No RPC configured for chain {req.chainId}")
 
        w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 60}))
        if req.chainId in [42220, 8453, 56, 1135, 42161]:
            w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
 
        async with pool.acquire() as conn:
 
            # ── Idempotency: already processed → return current balance ──────
            already = await conn.fetchval(
                "SELECT 1 FROM droplist_processed_txs WHERE tx_hash = $1",
                req.txHash
            )
            if already:
                new_balance = await conn.fetchval(
                    "SELECT total_points FROM droplist_balances WHERE wallet_address = $1",
                    wallet_cs.lower()
                ) or 0
                return {
                    "success": True,
                    "new_balance": float(new_balance),
                    "message": "Claim already verified!"
                }
 
            # ── Fetch receipt (retry 3× for flaky mobile RPCs) ───────────────
            receipt = None
            for attempt in range(3):
                try:
                    receipt = w3.eth.get_transaction_receipt(req.txHash)
                    if receipt is not None:
                        break
                except Exception as e:
                    if attempt == 2:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Could not fetch receipt after 3 attempts: {str(e)}"
                        )
                    await asyncio.sleep(2)
 
            if receipt is None:
                raise HTTPException(
                    status_code=400,
                    detail="Transaction not yet mined. Please try again in a moment."
                )
 
            if receipt["status"] != 1:
                raise HTTPException(status_code=400, detail="Transaction failed on-chain.")
 
            # ── Parse Transfer (mint) event ──────────────────────────────────
            # A mint is a Transfer from the zero address to the user.
            # We read the contract address from the receipt so we don't need
            # it hard-coded here.
            ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
            TRANSFER_TOPIC = Web3.keccak(text="Transfer(address,address,uint256)").hex()
 
            points_earned_wei = None
            for log in receipt.get("logs", []):
                topics = log.get("topics", [])
                if len(topics) != 3:
                    continue
                # topics[0] = event sig, topics[1] = from (padded), topics[2] = to (padded)
                if topics[0].hex() != TRANSFER_TOPIC:
                    continue
                # Decode `from` — it's a 32-byte padded address
                from_addr = "0x" + topics[1].hex()[-40:]
                to_addr   = "0x" + topics[2].hex()[-40:]
                if from_addr.lower() != ZERO_ADDRESS.lower():
                    continue  # not a mint
                if to_addr.lower() != wallet_cs.lower():
                    continue  # mint went to someone else
                # data field is the uint256 amount (32 bytes, big-endian)
                raw_data = log.get("data", "0x")
                if isinstance(raw_data, (bytes, bytearray)):
                    points_earned_wei = int.from_bytes(raw_data, "big")
                else:
                    points_earned_wei = int(raw_data, 16)
                break  # found it
 
            if points_earned_wei is None:
                raise HTTPException(
                    status_code=400,
                    detail="No mint Transfer event found in this transaction. "
                           "Make sure the tx is a valid Drop Points claim."
                )
 
            # Convert from wei (18 decimals) to human-readable units
            points_earned = float(Web3.from_wei(points_earned_wei, "ether"))
 
            # ── Fetch block timestamp for accurate cooldown & history ────────
            try:
                block = w3.eth.get_block(receipt["blockNumber"])
                block_dt = datetime.fromtimestamp(block["timestamp"], tz=timezone.utc)
            except Exception:
                block_dt = datetime.now(timezone.utc)
 
            # ── Atomic DB update ─────────────────────────────────────────────
            async with conn.transaction():
 
                # 1. Lock this tx so no double-processing
                await conn.execute(
                    "INSERT INTO droplist_processed_txs (tx_hash) VALUES ($1)",
                    req.txHash
                )
 
                # 2. Upsert balance — increment total_points, set cooldown timer
                await conn.execute(
                    """
                    INSERT INTO droplist_balances
                        (wallet_address, total_points, last_claim_at)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (wallet_address) DO UPDATE SET
                        total_points  = droplist_balances.total_points + EXCLUDED.total_points,
                        last_claim_at = EXCLUDED.last_claim_at
                    """,
                    wallet_cs.lower(), points_earned, block_dt
                )
 
                # 3. Append to history so the history tab is populated
                await conn.execute(
                    """
                    INSERT INTO droplist_history
                        (wallet_address, chain_id, amount, tx_hash, claimed_at)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT DO NOTHING
                    """,
                    wallet_cs.lower(), req.chainId, points_earned,
                    req.txHash, block_dt
                )
 
                # 4. Read the new running total to return to the frontend
                new_balance = await conn.fetchval(
                    "SELECT total_points FROM droplist_balances WHERE wallet_address = $1",
                    wallet_cs.lower()
                ) or 0
 
         # ── On-chain balance sweep across ALL chains ────────────────────
        BALANCE_ABI = [{"inputs":[{"internalType":"address","name":"account","type":"address"}],
                        "name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
                        "stateMutability":"view","type":"function"},
                       {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],
                        "stateMutability":"view","type":"function"}]
        async def _fetch_chain_balance(chain_id: int) -> dict:
            try:
                rpc = RPC_URLS.get(chain_id)
                contract_addr = CONTRACT_ADDRESSES.get(chain_id)  # see note below
                if not rpc or not contract_addr:
                    return {"chain_id": chain_id, "balance": None, "error": "not_configured"}
                _w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 15}))
                if chain_id in [42220, 8453, 56, 1135, 42161, 11142220]:
                    _w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
                contract = _w3.eth.contract(
                    address=Web3.to_checksum_address(contract_addr),
                    abi=BALANCE_ABI
                )
                raw = contract.functions.balanceOf(wallet_cs).call()
                dec = contract.functions.decimals().call()
                human = float(raw) / (10 ** dec)
                return {"chain_id": chain_id, "balance": human, "error": None}
            except Exception as e:
                return {"chain_id": chain_id, "balance": None, "error": str(e)}
        tasks = [_fetch_chain_balance(cid) for cid in VALID_CHAIN_IDS]
        chain_results = await asyncio.gather(*tasks)
        total_onchain = sum(r["balance"] for r in chain_results if r["balance"] is not None)
        return {
            "success":        True,
            "new_balance":    float(new_balance),       # DB total (fast)
            "points_earned":  points_earned,
            "last_claim_at":  block_dt.isoformat(),       # exact on-chain block time
            "chain_balances": chain_results,             # per-chain on-chain truth
            "total_onchain":  total_onchain,             # sum of all chain balances
            "message":        "Claim verified!"
        }

 
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Verify Claim Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
 

@app.post("/api/droplist/verify-redemption", tags=["Droplist"])
async def droplist_verify_redemption(req: DroplistVerifyTxRequest):
    """
    Verifies when a user burns their points on-chain for a reward, 
    and deducts those points from their global database balance.
    """
    try:
        wallet_cs = smart_checksum(req.walletAddress)
        w3 = _get_w3(req.chainId)

        async with pool.acquire() as conn:
            # 1. Prevent Replay with Auto-Healing
            if await conn.fetchval("SELECT 1 FROM droplist_processed_txs WHERE tx_hash = $1", req.txHash):
                # 👇 AUTO-HEAL INSTEAD OF CRASHING 👇
                print(f"   ⚠️ Redemption transaction {req.txHash} already processed. Auto-healing...")
                new_balance = await conn.fetchval(
                    "SELECT total_points FROM droplist_balances WHERE wallet_address = $1", 
                    wallet_cs.lower()
                )
                return {
                    "success": True, 
                    "reward_id": "already_redeemed",
                    "new_balance": new_balance or 0, 
                    "message": "Reward already redeemed successfully!"
                }

            # 2. Fetch Receipt
            receipt = w3.eth.get_transaction_receipt(req.txHash)
            if receipt['status'] != 1:
                raise HTTPException(status_code=400, detail="Transaction failed on-chain.")

            # 3. Parse Custom Burn Event
            event_abi = [{
                "anonymous": False,
                "inputs": [
                    {"indexed": True, "internalType": "address", "name": "user", "type": "address"},
                    {"indexed": False, "internalType": "uint256", "name": "amount", "type": "uint256"},
                    {"indexed": False, "internalType": "string", "name": "rewardId", "type": "string"}
                ],
                "name": "PointsRedeemed", "type": "event"
            }]
            
            contract = w3.eth.contract(address=receipt['to'], abi=event_abi)
            logs = contract.events.PointsRedeemed().process_receipt(receipt)
            
            if not logs:
                raise HTTPException(status_code=400, detail="No valid redemption event found.")
                
            event_data = logs[0]['args']
            
            if event_data['user'].lower() != wallet_cs.lower():
                raise HTTPException(status_code=403, detail="Redemption does not match user.")

            points_burned = int(Web3.from_wei(event_data['amount'], 'ether'))
            reward_id = event_data['rewardId']

            # 4. Process Burn in Database
            async with conn.transaction():
                await conn.execute("INSERT INTO droplist_processed_txs (tx_hash) VALUES ($1)", req.txHash)
                
                await conn.execute("""
                    UPDATE droplist_balances 
                    SET total_points = total_points - $1
                    WHERE wallet_address = $2
                """, points_burned, wallet_cs.lower())
                
                new_balance = await conn.fetchval(
                    "SELECT total_points FROM droplist_balances WHERE wallet_address = $1", 
                    wallet_cs.lower()
                )
                
                # OPTIONAL: You can hook into your existing reward dispatch logic here based on `reward_id`

        return {
            "success": True, 
            "reward_id": reward_id,
            "new_balance": new_balance,
            "message": "Reward redeemed successfully!"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Verify Redemption Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/droplist/dashboard/{wallet_address}", tags=["Droplist"])
async def droplist_dashboard(wallet_address: str):
    """
    Returns total cross-chain points and last_claim_at for cooldown enforcement.
    Used by the frontend on page load.
    """
    try:
        wallet_cs = smart_checksum(wallet_address)
 
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT total_points, last_claim_at FROM droplist_balances WHERE wallet_address = $1",
                wallet_cs.lower()
            )
 
        return {
            "success":       True,
            "wallet":        wallet_cs,
            "total_points":  float(row["total_points"]) if row else 0,
            "last_claim_at": row["last_claim_at"].isoformat() if row and row["last_claim_at"] else None
        }
 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


                  
app.include_router(quiz_router, prefix="/api/quiz", tags=["quiz"])
app.include_router(ws_router)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 