"""
services/quest_processor.py — Background loop that monitors ended quests
and distributes on-chain rewards automatically.
"""
from __future__ import annotations

import asyncio
import json
import logging
import traceback
from datetime import datetime, timezone

from web3 import Web3
from web3.constants import ADDRESS_ZERO as ZeroAddress

from abis import QUEST_ABI, ERC20_BALANCE_ABI
from config import supabase
from utils.blockchain import (
    build_transaction_with_standard_gas,
    wait_for_transaction_receipt,
)
from utils.web3_utils import get_web3_instance

logger = logging.getLogger(__name__)


async def internal_quest_processor() -> None:
    """
    Background loop: every 60 s, find quests that have ended but haven't had
    rewards distributed, compute winners, push setRewardAmountsBatch on-chain,
    and mark the quest as distributed in Supabase.
    """
    logger.info("⏳ Internal Quest Processor started. Watching for ended quests...")
    while True:
        try:
            from dependencies import get_signer
            signer = get_signer()

            now_iso = datetime.now(timezone.utc).isoformat()

            response = (
                supabase.table("quests")
                .select("*")
                .eq("is_active", True)
                .eq("rewards_distributed", False)
                .lt("end_date", now_iso)
                .execute()
            )
            ended_quests = response.data or []

            for quest in ended_quests:
                faucet_address = quest["faucet_address"]
                logger.info("🎯 Quest ended! Auto-processing rewards for: %s", faucet_address)

                faucet_checksum = Web3.to_checksum_address(faucet_address)
                chain_id = quest.get("chain_id", 42220)

                w3 = await get_web3_instance(chain_id)
                contract = w3.eth.contract(address=faucet_checksum, abi=QUEST_ABI)

                # Get leaderboard
                participants_res = (
                    supabase.table("quest_participants")
                    .select("wallet_address, points")
                    .eq("quest_address", faucet_address)
                    .order("points", desc=True)
                    .execute()
                )
                participants = participants_res.data or []

                # Parse distribution config
                dist_config = quest.get("distribution_config", {})
                if isinstance(dist_config, str):
                    dist_config = json.loads(dist_config)

                total_winners = int(dist_config.get("totalWinners", 1))
                pool_amount = float(quest.get("reward_pool", 0))

                # Get token decimals
                token_address = quest.get("token_address")
                if token_address and token_address != ZeroAddress:
                    erc20 = w3.eth.contract(
                        address=Web3.to_checksum_address(token_address),
                        abi=ERC20_BALANCE_ABI,
                    )
                    decimals = erc20.functions.decimals().call()
                else:
                    decimals = 18

                winners: list[str] = []
                amounts_int: list[int] = []
                creator_addr = quest.get("creator_address", "").lower()

                model = dist_config.get("model")

                if model == "equal" and participants:
                    actual_winners = participants[:total_winners]
                    amount_per_winner = pool_amount / len(actual_winners)
                    amount_wei = int(amount_per_winner * (10 ** decimals))
                    for p in actual_winners:
                        if p["wallet_address"].lower() != creator_addr:
                            winners.append(Web3.to_checksum_address(p["wallet_address"]))
                            amounts_int.append(amount_wei)

                elif model == "custom_tiers" and participants:
                    tiers = dist_config.get("tiers", [])
                    for p in participants:
                        if p["wallet_address"].lower() == creator_addr:
                            continue
                        rank = len(winners) + 1
                        amount_for_rank = 0
                        for t in tiers:
                            if t["rankStart"] <= rank <= t["rankEnd"]:
                                amount_for_rank = float(t["amountPerUser"])
                                break
                        if amount_for_rank > 0:
                            winners.append(Web3.to_checksum_address(p["wallet_address"]))
                            amounts_int.append(int(amount_for_rank * (10 ** decimals)))

                if winners:
                    logger.info("🚀 Pushing %d winners to blockchain...", len(winners))
                    tx = build_transaction_with_standard_gas(
                        w3,
                        contract.functions.setRewardAmountsBatch(winners, amounts_int),
                        signer.address,
                    )
                    signed_tx = w3.eth.account.sign_transaction(tx, signer.key)
                    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                    await wait_for_transaction_receipt(w3, tx_hash.hex())
                    logger.info("✅ Winners on chain. Tx: %s", tx_hash.hex())
                else:
                    logger.warning("⚠️  No eligible winners for %s", faucet_address)

                # Mark as distributed
                supabase.table("quests").update({"rewards_distributed": True}).eq(
                    "faucet_address", faucet_address
                ).execute()

        except Exception as exc:
            logger.error("💥 Background Processor Error: %s", exc)
            traceback.print_exc()

        await asyncio.sleep(60)
