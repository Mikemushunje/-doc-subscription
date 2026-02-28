import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";

describe("Test 7.6 Only - Allowance after multiple charges", function () {
  it("Should handle allowance exactly after multiple charges", async function () {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    
    const privateKey1 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const privateKey2 = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
    
    const subscriberWallet = new ethers.Wallet(privateKey1, provider);
    const receiverWallet = new ethers.Wallet(privateKey2, provider);
    
    // Deploy mock token
    const MockTokenArtifact = await hre.artifacts.readArtifact("MockERC20");
    const mockFactory = new ethers.ContractFactory(
      MockTokenArtifact.abi,
      MockTokenArtifact.bytecode,
      subscriberWallet
    );
    const mockToken = await mockFactory.deploy("Mock DOC", "mDOC", 18);
    await mockToken.waitForDeployment();
    
    // Mint tokens
    await mockToken.mint(subscriberWallet.address, ethers.parseEther("1000"));
    
    // Deploy subscription
    const subscriptionArtifact = await hre.artifacts.readArtifact("DOCSubscription");
    const factory = new ethers.ContractFactory(
      subscriptionArtifact.abi,
      subscriptionArtifact.bytecode,
      subscriberWallet
    );
    
    const subscription = await factory.deploy(
      subscriberWallet.address,
      receiverWallet.address,
      ethers.parseEther("10"),
      7 * 24 * 60 * 60,
      await mockToken.getAddress()
    );
    await subscription.waitForDeployment();
    
    // Approve 25 DOC (enough for 2.5 charges)
    await mockToken.connect(subscriberWallet).approve(
      await subscription.getAddress(),
      ethers.parseEther("25")
    );
    
    // First charge
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    await subscription.charge();
    
    // Second charge
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    await subscription.charge();
    
    // Check allowance after two charges - compare using parseEther, not raw numbers
    let details = await subscription.getSubscriptionDetails();
    expect(details.currentAllowance).to.equal(ethers.parseEther("5"));
    
    // Third charge should fail (only 5 DOC left)
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    
    try {
      await subscription.charge();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
      console.log("✅ 7.6 Passed: Allowance depletes correctly");
    }
  });
});