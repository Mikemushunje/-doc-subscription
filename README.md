# 🔄 DOC Subscription Contract

> A trust-minimized recurring payment engine on Rootstock using the DOC stablecoin. Subscriber funds are never held in custody — payments are pulled directly from wallets only when due.

<br>

[![Rootstock Testnet](https://img.shields.io/badge/Network-Rootstock%20Testnet-orange)](https://explorer.testnet.rootstock.io/address/0x8A7563e6c68763AEC4bD89cAbF0A40a54E1A49DA)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-blue)](https://docs.soliditylang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-47%20passing-brightgreen)]()

<br>

---

## 📌 Live Deployments

| | |
|---|---|
| **Smart Contract** | [`0x8A7563e6c68763AEC4bD89cAbF0A40a54E1A49DA`](https://explorer.testnet.rootstock.io/address/0x8A7563e6c68763AEC4bD89cAbF0A40a54E1A49DA) |
| **DOC Token** | [`0xCb46C0DdC60d18eFEB0e586c17AF6Ea36452DaE0`](https://explorer.testnet.rootstock.io/address/0xCb46C0DdC60d18eFEB0e586c17AF6Ea36452DaE0) |
| **Live dApp** | [dapp-frontend--michaelmushunje.replit.app](https://dapp-frontend--michaelmushunje.replit.app) |

---

## 💡 Overview

The **DOCSubscription** contract implements a non-custodial recurring payment system on Rootstock. A subscriber grants the contract a limited DOC allowance. When payment becomes due, anyone can trigger the `charge()` function — the contract pulls the exact owed amount directly from the subscriber's wallet to the receiver's wallet.

```
Setup     →  Subscriber calls createSubscription()
           →  Subscriber approves DOC allowance

Payment   →  Anyone calls charge(subscriberAddress)
           →  Contract validates: active? time passed? allowance sufficient?
           →  DOC pulled: subscriber wallet → receiver wallet (0 held in contract)

Cancel    →  Subscriber calls cancelSubscription()
           →  All future charges blocked immediately
```

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔒 **Pull Payment** | Contract holds zero funds — only permission to pull when due |
| 💵 **Stable Value** | DOC stablecoin eliminates crypto price volatility |
| ⏱️ **Time-Based** | Configurable billing intervals with second-level precision |
| 🌐 **Permissionless** | Anyone can trigger `charge()` — enables Gelato automation |
| 🔑 **Self-Sovereign** | Subscriber can cancel anytime with no lock-in |
| 🛡️ **Security Layers** | ReentrancyGuard + SafeERC20 + Checks-Effects-Interactions |

---

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.28 + OpenZeppelin v5 |
| Development | Hardhat 3 |
| Testing | Mocha, Chai, Ethers.js v6 |
| Frontend | React + Ethers.js |
| Network | Rootstock Testnet (Chain ID: 31) |
| Wallet | MetaMask |
| Stablecoin | DOC (Dollar on Chain) |

---

## 📁 Project Structure

```
doc-subscription/
├── contracts/
│   ├── DOCSubscription.sol       ← Main subscription contract
│   └── mocks/
│       └── MockERC20.sol         ← Mock DOC token for testing
├── scripts/
│   └── deploy.js                 ← Rootstock Testnet deployment
├── test/
│   └── DOCSubscription.test.js   ← Full test suite (47 tests)
├── frontend/
│   └── src/
│       ├── App.js
│       ├── App.css
│       └── contractDetails.js
├── hardhat.config.ts
├── .env.example
└── README.md
```

---

## 📦 Getting Started

### Prerequisites

- Node.js v22+
- npm
- MetaMask (configured for Rootstock Testnet)
- Testnet RBTC from [faucet.rootstock.io](https://faucet.rootstock.io)

### Installation

```bash
git clone https://github.com/Mikemushunje/-doc-subscription.git
cd -doc-subscription
npm install
npx hardhat compile
```

---

## 🧪 Testing

47 tests across 6 sections — run locally against Hardhat's built-in network.

```bash
# Terminal 1 — start local node
npx hardhat node

# Terminal 2 — run test suite
npx hardhat test test/DOCSubscription.test.js --network localhost
```

### Test Coverage

| # | Section | Tests | What It Validates |
|---|---|---|---|
| 1 | **Deployment** | 3 | Contract deploys as blank engine, rejects zero token address |
| 2 | **createSubscription** | 10 | Input validation, storage, events, multiple subscribers |
| 3 | **charge** | 14 | Timing, transfers, permissionless access, all failure modes |
| 4 | **cancelSubscription** | 5 | Access control, state cleanup, post-cancel charge blocking |
| 5 | **View Functions** | 7 | Data aggregation, countdown timer, charge readiness |
| 6 | **Security & Edge Cases** | 8 | Pull payment proof, CEI pattern, subscriber isolation |
| | **Total** | **47** | |

---

## 🚀 Deployment

### Set Up Environment

```bash
cp .env.example .env
```

Add your private key to `.env`:

```
ROOTSTOCK_TESTNET_PRIVATE_KEY=0xyour_private_key_here
```

### Deploy to Rootstock Testnet

```bash
node scripts/deploy.js
```

```


✅ Contract deployed: 0x8A7563e6c68763AEC4bD89cAbF0A40a54E1A49DA
🔍 https://explorer.testnet.rootstock.io/address/0x8A7563e6c68763AEC4bD89cAbF0A40a54E1A49DA
```

---

## 💻 Frontend

The React frontend provides a minimal interface for wallet connection and subscription management.

**Live Demo →** [dapp-frontend--michaelmushunje.replit.app](https://dapp-frontend--michaelmushunje.replit.app)

```bash
cd frontend
npm install
npm start
```

### Capabilities

- ✅ Connect MetaMask with automatic Rootstock Testnet switching
- ✅ View active subscription details (receiver, amount, interval, next due date)
- ✅ Approve DOC allowance + create subscription in two transactions
- ✅ Trigger charge when payment is due
- ✅ Cancel subscription instantly

---

## 🔒 Security

| Pattern | Protection Against | Verified By |
|---|---|---|
| Pull Payment | Fund custody / honeypot attacks | Test 6.1 |
| Checks-Effects-Interactions | Reentrancy (state updated before transfer) | Test 6.2 |
| ReentrancyGuard | Reentrancy second layer | All charge tests |
| SafeERC20 | Silent token transfer failures | All charge tests |
| Immutable token address | Post-deployment token swap attacks | Test 1.1 |
| Custom errors | Gas-efficient, unambiguous reverts | All revert tests |

> **Before mainnet deployment:** Professional security audit, bug bounty period, and formal verification of core payment logic are strongly recommended.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch — `git checkout -b feature/your-feature`
3. Commit your changes — `git commit -m 'Add your feature'`
4. Push — `git push origin feature/your-feature`
5. Open a Pull Request

---

## 🙏 Acknowledgments

- **[Rootstock](https://rootstock.io)** — Bitcoin-secured EVM infrastructure
- **[Money on Chain](https://moneyonchain.com)** — DOC stablecoin
- **[OpenZeppelin](https://openzeppelin.com)** — Audited contract libraries
- **[Hardhat](https://hardhat.org)** — Development and testing framework
- **[Ethers.js](https://ethers.org)** — Blockchain interaction library


---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## ⚠️ Disclaimer

This contract is provided for educational purposes. Exercise caution and conduct your own security review before using any smart contract with real funds.

---

<div align="center">

Built on **Rootstock** — Bitcoin's Smart Contract Layer

[Contract](https://explorer.testnet.rootstock.io/address/0x8A7563e6c68763AEC4bD89cAbF0A40a54E1A49DA) · [Live dApp](https://dapp-frontend--michaelmushunje.replit.app) · [Repository](https://github.com/Mikemushunje/-doc-subscription)

</div>
