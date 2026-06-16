Here is a comprehensive `README.md` tailored for your FaucetDrops backend. It breaks down the architecture, core modules, and operational flow of the application to serve as a solid foundation for your team's documentation.

---

# FaucetDrops Backend API 🚀

Welcome to the FaucetDrops backend repository. This is a highly concurrent, feature-rich FastAPI application designed to power a next-generation Web3 marketing, questing, and reward distribution platform.

It handles everything from secure on-chain transactions across multiple EVM networks to real-time, WebSocket-driven multiplayer quizzes and complex off-chain social verifications.

## 🛠 Tech Stack

* **Framework:** FastAPI (Python)
* **Web3 Integration:** `web3.py`, Alchemy (RPCs), EVM Smart Contracts (ABIs for Quests, Faucets, ERC20, ERC721)
* **Database:** * `supabase-py` (REST client for general CRUD and Storage)
* `asyncpg` (High-performance asynchronous PostgreSQL pooling for real-time quiz state)


* **AI Integration:** Google Gemini API (for generative quiz creation)
* **External APIs:** Discord Bot API, Telegram Bot API & Webhooks, X (Twitter) oEmbed API
* **Concurrency:** `asyncio` background tasks, WebSocket connections, per-chain transaction locks.

---

## 🏗 Core Architecture & Modules

The application is built around several massive, interconnected modules. Here is what the backend actually *does*:

### 1. Web3 Transaction & Smart Contract Engine

The backend acts as an automated relayer and verifier for smart contract interactions.

* **Multi-Chain Support:** Native support for Ethereum, Base, Arbitrum, Celo, BNB Chain, and Lisk.
* **Robust Transaction Manager (`_send_tx`):** * Uses `asyncio.Lock` per chain to prevent nonce collisions during high-concurrency reward distributions.
* Implements exponential backoff and retries for `NonceTooLow` errors.
* Includes a fallback mechanism (`BACKUP_PRIVATE_KEY_B`) if the primary backend wallet runs out of gas.
* Automatically calculates gas limits with a configurable safety buffer (`MAX_GAS_MULTIPLIER`).


* **Reward Dispatching:** Automatically calculates shares (Equal, Quadratic, Custom Tiers) and calls `setRewardAmountsBatch` on-chain to whitelist winners for claiming.

### 2. The Verification Engine (On-Chain & Off-Chain)

A massive sub-system dedicated to verifying user actions before awarding points or unlocking stages.

* **On-Chain Verifiers:** Queries Alchemy or Block Explorers (via API fallback) to verify:
* Token/NFT holdings (`verify_hold_token`, `verify_hold_nft`)
* Minimum transaction counts (`verify_tx_count`)
* Wallet age (`verify_wallet_age`)
* Time-bound smart contract interactions (`verify_timebound_interaction`).


* **Discord Auto-Verifier:** Uses the Discord Bot API (with proxy support) to verify if a user has joined a specific guild (`serverId`) and attained a specific role (`roleId`).
* **Telegram Verification & Webhooks:** * Tracks Telegram group joins.
* Features a robust Webhook listener (`/api/telegram/webhook`) that counts messages sent by users in specific groups, linking their Telegram ID to their FaucetDrops wallet to verify activity-based tasks.


* **X (Twitter) Verifier:** Uses the public oEmbed API to verify quotes and tags. Includes a **"Drama Engine"** that intentionally adds artificial friction/delays to prevent API spamming and bot abuse.

### 3. Real-Time Multiplayer Quiz Engine

A fully fledged WebSocket server built directly into the FastAPI app for live trivia events.

* **In-Memory State Management:** Tracks active connections, player scores, streaks, and response times in high-speed dictionaries (`game_state`, `quizzes`, `player_sockets`).
* **Game Loop (`run_quiz_loop`):** Manages the entire lifecycle of a live quiz: countdowns, broadcasting questions, timing out, calculating points based on response speed, and ending the game.
* **Gemini AI Generator:** Endpoints that accept a topic and difficulty, dynamically querying Google's Gemini Flash model to generate structured JSON trivia questions and inserting them directly into the database.
* **Auto-Finalization:** Once a quiz ends, it automatically calculates the leaderboard, updates the database, and triggers the on-chain reward whitelist via `process_quiz_rewards`.

### 4. Quest & Faucet Metadata Management

* **Drafts & Publishing:** Full CRUD for creating quests, storing them as drafts, and finalizing them.
* **Progression System:** Calculates a user's current "Stage" (Beginner, Intermediate, Ultimate, etc.) based on completed tasks and dynamic point thresholds.
* **Supabase Storage:** Handles direct uploads of quest cover images and user-submitted proof screenshots.

### 5. User Profiles & Social Sync

* **EIP-191 Signatures:** Enforces cryptographic signature verification (`verify_signature`) before allowing users to update their profiles.
* **Unified Identity:** Links a single Web3 wallet checksum to Discord IDs, Telegram IDs, X handles, and Farcaster handles to prevent Sybil attacks.

---

## 🚦 Application Flow: Example Lifecycle (Quest Creation to Claim)

1. **Creation:** A creator hits `/api/quests/draft` to save a quest, then `/api/quests/finalize` once the smart contract is deployed. The backend resolves token symbols directly from the chain if they are missing.
2. **Participation:** A user links their wallet and socials. They hit `/api/quests/{faucet_address}/join`. The backend triggers a background task to call `joinQuest()` on-chain.
3. **Verification:** The user submits a Telegram task. The backend resolves the chat ID, queries the Telegram API, and if successful, updates the `submissions` table to `approved`.
4. **Auto-Approval:** The `process_auto_approval` function adds points to the user's `user_progress` row, recalculates their Stage, and updates the leaderboard.
5. **Distribution:** The background worker `internal_quest_processor` detects the quest's end date has passed. It grabs the top users, calculates their slice of the `reward_pool`, and pushes the `setRewardAmountsBatch` transaction to the blockchain.
6. **Claim:** The user hits the `/claim` endpoint. The backend verifies the user's custom amount, signs a transaction with the backend wallet, and executes the claim, transferring tokens to the user.

---
