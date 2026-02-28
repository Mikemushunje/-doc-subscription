import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Starting deployment to Rootstock Testnet...");

  try {
    // Get the network URL directly
    const networkUrl = "https://public-node.testnet.rsk.co";
    console.log(`🔌 Connecting to: ${networkUrl}`);

    // Create provider and signer from the private key in .env
    const provider = new ethers.JsonRpcProvider(networkUrl);
    const privateKey = process.env.ROOTSTOCK_TESTNET_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error("Private key not found in .env file");
    }

    const signer = new ethers.Wallet(privateKey, provider);
    const deployerAddress = await signer.getAddress();

    console.log(`📌 Deploying from: ${deployerAddress}`);

    // Check balance
    const balance = await provider.getBalance(deployerAddress);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} tRBTC`);

    // The DOC token address - this is the correct one from explorer
    const DOC_TOKEN_ADDRESS = "0xCb46C0DdC60d18eFEB0e586c17AF6Ea36452DaE0";
    console.log(`✅ Using token address: ${DOC_TOKEN_ADDRESS}`);

    const amountDOC = ethers.parseEther("10");
    const intervalSeconds = 30 * 24 * 60 * 60;
    const receiver = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

    console.log("📋 Subscription Details:");
    console.log(`   Subscriber: ${deployerAddress}`);
    console.log(`   Receiver: ${receiver}`);
    console.log(`   Amount: ${ethers.formatEther(amountDOC)} DOC`);
    console.log(`   Interval: ${intervalSeconds / 86400} days`);

    console.log("⏳ Loading contract artifact...");

    // Read the contract's ABI and bytecode from the artifacts folder
    const contractPath = path.join(process.cwd(), "artifacts", "contracts", "DOCSubscription.sol", "DOCSubscription.json");
    
    if (!fs.existsSync(contractPath)) {
      throw new Error(`Contract artifact not found at ${contractPath}. Did you run npx hardhat compile?`);
    }
    
    const contractArtifact = JSON.parse(fs.readFileSync(contractPath, "utf8"));

    // Manually construct the deployment data
    // First, remove the 0x prefix from all addresses for raw encoding
    const deployerAddressRaw = deployerAddress.slice(2).toLowerCase();
    const receiverRaw = receiver.slice(2).toLowerCase();
    const tokenAddressRaw = DOC_TOKEN_ADDRESS.slice(2).toLowerCase();

    // Convert amounts to hex with proper padding
    const amountHex = amountDOC.toString(16).padStart(64, '0');
    const intervalHex = intervalSeconds.toString(16).padStart(64, '0');

    // Build the constructor arguments in the correct order
    // The constructor expects: address, address, uint256, uint256, address
    const constructorArgs = 
      "000000000000000000000000" + deployerAddressRaw + 
      "000000000000000000000000" + receiverRaw +
      amountHex +
      intervalHex +
      "000000000000000000000000" + tokenAddressRaw;

    // Combine bytecode with constructor arguments
    const deployData = contractArtifact.bytecode + constructorArgs;

    console.log("⏳ Sending deployment transaction...");
    
    // Send the deployment transaction manually
    const tx = await signer.sendTransaction({
      data: deployData,
      gasLimit: 3000000 // Set a reasonable gas limit
    });

    console.log(`📝 Transaction sent: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation (this may take 30-60 seconds)...");
    
    const receipt = await tx.wait();
    
    if (!receipt || !receipt.contractAddress) {
      throw new Error("Deployment failed - no contract address in receipt");
    }

    console.log(`✅✅✅ SUCCESS! Contract deployed to: ${receipt.contractAddress}`);
    console.log(`🔍 View at: https://explorer.testnet.rootstock.io/address/${receipt.contractAddress}`);
    console.log(`📝 Transaction: https://explorer.testnet.rootstock.io/tx/${tx.hash}`);
    
  } catch (error) {
    console.error("❌ Deployment failed:");
    console.error(error);
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:");
  console.error(error);
  process.exitCode = 1;
});