import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";
import "dotenv/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    version: "0.8.28",
  },
  networks: {
    hardhat: {
      type: "http",
      url: "http://127.0.0.1:8545",
    },
    rootstockTestnet: {
      type: "http",
      url: "https://public-node.testnet.rsk.co",
      chainId: 31,
      accounts: [process.env.ROOTSTOCK_TESTNET_PRIVATE_KEY || ""]
    }
  }
});