// Your deployed contract address
export const CONTRACT_ADDRESS = "0x778696cCC58cca40d457742b926B56A52b843414";

// DOC Token address - with correct checksum (ends with E0, not E6)
export const DOC_TOKEN_ADDRESS = "0xCb46C0DdC60d18eFEB0e586c17AF6Ea36452DaE0";

// Your contract ABI
export const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_subscriber",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_receiver",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_amountDOC",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_intervalSeconds",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_docTokenAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "SafeERC20FailedOperation",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Subscription__InsufficientAllowance",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Subscription__InvalidAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Subscription__NotActive",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Subscription__NotSubscriber",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Subscription__TooEarlyToCharge",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Subscription__ZeroAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Subscription__ZeroInterval",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "nextDue",
        "type": "uint256"
      }
    ],
    "name": "PaymentCharged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "SubscriptionCanceled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "subscriber",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "interval",
        "type": "uint256"
      }
    ],
    "name": "SubscriptionCreated",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "cancelSubscription",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "charge",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getSubscriptionDetails",
    "outputs": [
      {
        "internalType": "address",
        "name": "subscriber",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountDOC",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "intervalSeconds",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "nextDueTimestamp",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "currentAllowance",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "i_docToken",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "s_active",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "s_amountDOC",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "s_intervalSeconds",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "s_nextDueTimestamp",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "s_receiver",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "s_subscriber",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "timeUntilNextCharge",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];