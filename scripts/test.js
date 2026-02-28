import hre from "hardhat";

async function main() {
  console.log("🔍 TEST SCRIPT RUNNING");
  console.log("🔍 This is a test");
  
  try {
    const accounts = await hre.ethers.getSigners();
    console.log(`🔍 Found ${accounts.length} signers`);
    
    if (accounts.length > 0) {
      const address = await accounts[0].getAddress();
      console.log(`🔍 First signer: ${address}`);
    }
  } catch (error) {
    console.log("🔍 ERROR:", error);
  }
}

main();