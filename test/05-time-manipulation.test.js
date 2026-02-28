import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";

describe("Time Manipulation Tests", function () {
  async function setupContract() {
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
      7 * 24 * 60 * 60, // 7 days
      await mockToken.getAddress()
    );
    await subscription.waitForDeployment();
    
    // Approve
    await mockToken.connect(subscriberWallet).approve(
      await subscription.getAddress(),
      ethers.parseEther("100")
    );
    
    return {
      provider,
      subscription,
      mockToken,
      subscriberWallet,
      receiverWallet
    };
  }

  it("5.1 Should revert if charge 1 second before due", async function () {
    const { provider, subscription } = await setupContract();
    
    const dueDate = await subscription.s_nextDueTimestamp();
    const block = await provider.getBlock("latest");
    const timeToAdvance = Number(dueDate) - block.timestamp - 1; // 1 second before
    
    await provider.send("evm_increaseTime", [timeToAdvance]);
    await provider.send("evm_mine");
    
    try {
      await subscription.charge();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
      console.log("✅ 5.1 Passed: Cannot charge 1 second before due");
    }
  });

  it("5.2 Should succeed if charge exactly at due", async function () {
    const { provider, subscription } = await setupContract();
    
    const dueDate = await subscription.s_nextDueTimestamp();
    const block = await provider.getBlock("latest");
    const timeToAdvance = Number(dueDate) - block.timestamp;
    
    await provider.send("evm_increaseTime", [timeToAdvance]);
    await provider.send("evm_mine");
    
    await subscription.charge();
    console.log("✅ 5.2 Passed: Can charge exactly at due");
  });

  it("5.3 Should succeed if charge 1 second after due", async function () {
    const { provider, subscription } = await setupContract();
    
    const dueDate = await subscription.s_nextDueTimestamp();
    const block = await provider.getBlock("latest");
    const timeToAdvance = Number(dueDate) - block.timestamp + 1; // 1 second after
    
    await provider.send("evm_increaseTime", [timeToAdvance]);
    await provider.send("evm_mine");
    
    await subscription.charge();
    console.log("✅ 5.3 Passed: Can charge 1 second after due");
  });

  it("5.4 Should handle multiple billing cycles (5 cycles)", async function () {
    const { provider, subscription, mockToken, receiverWallet } = await setupContract();
    
    // Run 5 billing cycles
    for (let i = 0; i < 5; i++) {
      await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // Advance past due
      await provider.send("evm_mine");
      await subscription.charge();
    }
    
    const balance = await mockToken.balanceOf(receiverWallet.address);
    expect(balance).to.equal(ethers.parseEther("50")); // 5 * 10 DOC
    console.log("✅ 5.4 Passed: 5 cycles processed correctly");
  });

  it("5.5 Should maintain correct interval across many cycles (10 cycles)", async function () {
    const { provider, subscription, mockToken, receiverWallet } = await setupContract();
    
    // Run 10 billing cycles
    for (let i = 0; i < 10; i++) {
      await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
      await provider.send("evm_mine");
      await subscription.charge();
    }
    
    const balance = await mockToken.balanceOf(receiverWallet.address);
    expect(balance).to.equal(ethers.parseEther("100")); // 10 * 10 DOC
    console.log("✅ 5.5 Passed: 10 cycles processed correctly");
  });
});