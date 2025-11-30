# 💧 FaucetDrops

FaucetDrops is a lightweight, user-friendly platform for crypto and blockchain communities to distribute **ETH, ERC20 tokens, or stablecoins** seamlessly.  
Built for **events, hackathons, DAOs, and testnet incentives**, it automates token drops with **sybil-resistance, privacy, and cross-chain support**.

Prevent bot abuse, ensure fair distribution, and track everything in real-time.  
Powered by **Self Protocol** for **ZK-powered identity verification**, FaucetDrops makes onboarding faster and more secure—verify users in under a minute without compromising privacy.

---

## 🌟 Why FaucetDrops?

Manual token distribution is slow, error-prone, and vulnerable to bots. FaucetDrops solves this with automated, verifiable drops.

**Key Benefits:**
- **Gasless & Fast:** Users claim tokens instantly without fees.
- **Sybil-Resistant:** ZK proof-of-humanity to ensure real users (no bots).
- **Customizable Types:** DropCode (code-based), DropList (whitelisted), or Custom (individual amounts).
- **Social Verification:** Require Twitter follows, Telegram joins, etc.
- **Multi-Admin:** Collaborate with team members to manage faucets.
- **Cross-Chain:** Supports Celo, Lisk, Arbitrum, Base, Ethereum, Polygon, and Optimism.
- **Traceable & Secure:** View history, reset claims, and withdraw unclaimed funds.
- **Developer-Friendly:** Factory + Instance pattern for scalable smart contracts.

---

## 🧩 How It Works

1. **Create a Faucet:** Choose type, set token/ETH, amount, whitelist, and time windows.
2. **Fund & Configure:** Deposit tokens, set social tasks, and add admins.
3. **Share & Claim:** Users verify tasks, enter codes (if required), and claim.
4. **Track & Manage:** Monitor history, reset claims, or delete inactive faucets.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Faucet Types** | DropCode (code-protected), DropList (whitelisted), Custom (per-user amounts). |
| **Social Tasks** | Require Twitter/Telegram joins with username verification. |
| **Multi-Admin** | Add/remove admins (owner/factory owner protected). |
| **Fund/Withdraw** | Deposit ETH/tokens (3% fee); withdraw leftovers post-campaign. |
| **Time Controls** | Set start/end times; auto-expire. |
| **Claim Reset** | Allow repeat claims by resetting user status. |
| **Cross-Chain Tracking** | Prevent double-claims across networks. |
| **Transaction History** | View activity with pagination. |
| **Analytics** | Charts for claims, engagement, and distribution metrics. |

**Supported Networks:**  
Celo (CELO, cUSD, cEUR, $G), Lisk (LISK), Arbitrum (ETH), Base (ETH), Ethereum (ETH), Polygon (MATIC), Optimism (ETH).

---

## 💬 Use Cases

- **Events/Hackathons:** Onboard attendees with instant tokens.
- **Airdrops:** Fair, verifiable distributions without manual sends.
- **Community Rewards:** Whitelist loyal members or require social tasks.
- **Testnet Incentives:** Distribute test tokens securely to devs/testers.
- **UBI/DAOs:** Custom payouts (e.g., $G on Celo).

---

## 🛠 Technical Architecture

**Smart Contracts:**
- **Factory:** Deploys new faucet instances.
- **Instances:** Handle claims (DropCode, DropList, Custom).
- **Storage:** Tracks claims cross-chain.

**Tokens:** ETH, ERC20, stablecoins via Mento.  
**Security:** Reentrancy guards, admin controls, time-locks, audited.  
**Integrations:** Self Protocol (ZKPoH), WalletConnect.  
**Gas Optimization:** Batch whitelist/custom amount updates.

**Frontend:** Next.js + ethers.js (MetaMask, etc.)  
**Backend:** Node.js for off-chain tasks (code generation, social verification).

---

### Example Workflow
1. Deploy faucet via Factory.
2. Configure type, fund, set tasks.
3. Users verify & claim.
4. Admins track, withdraw, reset.

---

## 🔒 Security & Protections

- **ZK Verification:** Privacy-preserving human checks.
- **Code/Whitelist:** Restrict claims to authorized users.
- **Admin Safeguards:** Owner/factory owner can't be removed.
- **Reentrancy Guards:** Prevent exploits.
- **Time Locks:** Strict claim windows.
- **Audited Contracts:** Secure structure for production.

---

## 🔗 Stay Connected

- **Website:** [faucetdrops.io](https://faucetdrops.io)
- **Twitter/X:** [@Faucetdrops](https://twitter.com/Faucetdrops)
- **GitHub:** [github.com/FaucetDrops](https://github.com/FaucetDrops)
- **Support:** [drops.faucet@gmail.com](mailto:drops.faucet@gmail.com)
- **Docs:** [faucetdrops.io/docs](https://faucetdrops.io/docs)

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.
