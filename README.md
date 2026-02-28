# -doc-subscription
Recurring subscription contract on Rootstock using DOC stablecoin
# DOC Subscription Contract

A trust-minimized recurring payment system on Rootstock using the DOC stablecoin. This contract enables subscribers to make automated monthly payments without any intermediary holding funds. The pull payment pattern ensures that the contract never custodies user funds, eliminating the primary attack vector for financial smart contracts.

## 📋 Overview

The DOCSubscription contract implements a recurring payment mechanism where a subscriber pays a fixed amount of DOC to a receiver at regular intervals. Anyone can trigger payments when conditions are met, enabling automation through services like Gelato. Subscribers retain full control and can cancel at any time.

### Key Features

- **Pull Payment Pattern**: Contract never holds funds; only has allowance to transfer
- **Stable Value**: Uses DOC stablecoin for predictable payments
- **Time-Based**: 30-day billing intervals with precise timestamp validation
- **Permissionless**: Anyone can call the charge function when payment is due
- **Self-Sovereign**: Subscriber can cancel anytime; no lock-in periods
- **Secure**: ReentrancyGuard, SafeERC20, and Checks-Effects-Interactions pattern
- **Comprehensive Testing**: 59 tests covering all edge cases and failure modes

## 🚀 Deployed Contract

The contract is deployed on **Rootstock Testnet**:
Contract Address: 0x778696Ccc58CcA40d457742B926B56A52B843414
DOC Token Address: 0xCb46C0DdC60d18eFEB0e586c17AF6Ea36452DaE0

view on Explorer: [Rootstock Testnet Explorer](https://explorer.testnet.rootstock.io/address/0x778696Ccc58CcA40d457742B926B56A52B843414)

## 📁 Project Structure
doc-subscription/
├── contracts/
│ ├── DOCSubscription.sol # Main subscription contract
│ └── mocks/
│ └── MockERC20.sol # Mock DOC token for testing
├── scripts/
│ └── deploy.js # Deployment script
├── test/ # Comprehensive test suite (59 tests)
│ ├── 01-deployment.test.js
│ ├── 02-constructor-validation.test.js
│ ├── 03-allowance.test.js
│ ├── 04-charging.test.js
│ ├── 05-time-manipulation.test.js
│ ├── 06-cancellation.test.js
│ ├── 07-edge-cases.test.js
│ ├── 08-view-functions.test.js
│ └── 09-integration.test.js
├── frontend/ # React frontend application
│ ├── public/
│ ├── src/
│ │ ├── App.js
│ │ ├── App.css
│ │ ├── index.js
│ │ └── contractDetails.js
│ └── package.json
├── hardhat.config.ts
├── package.json
└── README.md

text

## 🛠️ Technology Stack

| Component | Technology |
|-----------|------------|
| Smart Contracts | Solidity 0.8.28, OpenZeppelin |
| Development Framework | Hardhat 3 |
| Testing | Mocha, Chai, Ethers.js |
| Frontend | React, Ethers.js |
| Blockchain | Rootstock Testnet (Chain ID: 31) |
| Wallet Integration | MetaMask, Ethers.js |

## 📦 Installation

### Prerequisites

- Node.js v22 or later
- npm or yarn
- MetaMask browser extension
- Git

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/michaelmushunje/doc-subscription.git
cd doc-subscription

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test
Frontend Setup
bash
cd frontend
npm install
npm start
The frontend will be available at http://localhost:3000

🧪 Testing
The project includes 59 comprehensive tests covering all contract functionality:

bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/04-charging.test.js

# Run individual test
npx hardhat test test/04-charging.test.js --grep "4.1"
Test Coverage
Test File	Tests	Description
01-deployment.test.js	11	Contract deployment and state initialization
02-constructor-validation.test.js	6	Constructor parameter validation
03-allowance.test.js	5	ERC-20 allowance tracking
04-charging.test.js	9	Core payment functionality
05-time-manipulation.test.js	5	Time-based edge cases
06-cancellation.test.js	7	Subscription cancellation
07-edge-cases.test.js	8	Failure scenarios and edge cases
08-view-functions.test.js	4	Read-only function verification
09-integration.test.js	4	Complete user workflows
🚀 Deployment
Local Network
bash
# Start local Hardhat node
npx hardhat node

# In another terminal, deploy to local network
npx hardhat run scripts/deploy.js --network localhost
Rootstock Testnet
Configure your .env file:

text
ROOTSTOCK_TESTNET_PRIVATE_KEY=0xyour_private_key_here
Deploy:

bash
npx hardhat run scripts/deploy.js --network rootstockTestnet
💻 Frontend Application
The React frontend provides a clean interface for interacting with the contract:

Connect Wallet: MetaMask integration with one-click connection

View Subscription: Display all subscription details including status, receiver, amount, and next due date

Approve DOC: Grant spending allowance to the contract

Charge Payment: Trigger payment when due

Cancel Subscription: Terminate the subscription

Transaction History: Links to Rootstock Explorer for verification

Features
Responsive design for mobile and desktop

Real-time balance and allowance updates

Loading states and error handling

Transaction status notifications

Copy-to-clipboard for addresses

🔒 Security Considerations
The contract implements multiple security patterns:

Pull Payment Pattern: Funds never held in contract

ReentrancyGuard: Protection against reentrancy attacks

SafeERC20: Secure token transfer handling

Checks-Effects-Interactions: State updates before external calls

Custom Errors: Gas-efficient error handling

Immutable Token Address: Token address fixed at construction

Access Control: Only subscriber can cancel

Audit Recommendations
For mainnet deployment, consider:

Professional security audit

Bug bounty program

Formal verification

Additional fuzz testing

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

Fork the repository

Create your feature branch (git checkout -b feature/AmazingFeature)

Commit your changes (git commit -m 'Add some AmazingFeature')

Push to the branch (git push origin feature/AmazingFeature)

Open a Pull Request

📞 Contact
Project Link: https://github.com/michaelmushunje/doc-subscription

🙏 Acknowledgments
Roostock and Money on chain for the DOC stablecoin and blockchain infrastructure

OpenZeppelin for secure contract libraries

Hardhat for the development framework

Ethers.js for blockchain interaction libraries

⚠️ Disclaimer
This contract is provided as-is for educational purposes. Users should exercise caution and conduct their own security reviews before using any smart contract with real funds.



