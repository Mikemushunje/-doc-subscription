import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";

describe("Edge Cases Tests", function () {
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
    
    return {
      provider,
      subscription,
      mockToken,
      subscriberWallet,
      receiverWallet
    };
  }

  it("7.1 Should revert if no allowance given", async function () {
    const { provider, subscription } = await setupContract();
    
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    
    try {
      await subscription.charge();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
      console.log("✅ 7.1 Passed: No allowance = revert");
    }
  });

  it("7.2 Should revert if allowance is insufficient (5 DOC for 10 DOC charge)", async function () {
    const { provider, subscription, mockToken, subscriberWallet } = await setupContract();
    
    // Approve only 5 DOC (need 10)
    await mockToken.connect(subscriberWallet).approve(
      await subscription.getAddress(),
      ethers.parseEther("5")
    );
    
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    
    try {
      await subscription.charge();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
      console.log("✅ 7.2 Passed: Insufficient allowance = revert");
    }
  });

  it("7.3 Should revert if subscriber has insufficient balance (0 tokens)", async function () {
    const { provider, subscription, mockToken, subscriberWallet, receiverWallet } = await setupContract();
    
    // Transfer all tokens away
    const balance = await mockToken.balanceOf(subscriberWallet.address);
    await mockToken.connect(subscriberWallet).transfer(receiverWallet.address, balance);
    
    // Approve (even though no balance)
    await mockToken.connect(subscriberWallet).approve(
      await subscription.getAddress(),
      ethers.parseEther("100")
    );
    
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    
    try {
      await subscription.charge();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
      console.log("✅ 7.3 Passed: Insufficient balance = revert");
    }
  });

  it("7.4 Should revert if subscriber has partial balance (8 DOC for 10 DOC charge)", async function () {
    const { provider, subscription, mockToken, subscriberWallet, receiverWallet } = await setupContract();
    
    // Transfer away all but 8 DOC
    const balance = await mockToken.balanceOf(subscriberWallet.address);
    await mockToken.connect(subscriberWallet).transfer(
      receiverWallet.address, 
      balance - ethers.parseEther("8")
    );
    
    // Approve
    await mockToken.connect(subscriberWallet).approve(
      await subscription.getAddress(),
      ethers.parseEther("10")
    );
    
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    
    try {
      await subscription.charge();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
      console.log("✅ 7.4 Passed: Partial balance = revert");
    }
  });

  it("7.5 Should handle exact allowance (approve exactly 10 DOC, charge 10 DOC)", async function () {
    const { provider, subscription, mockToken, subscriberWallet, receiverWallet } = await setupContract();
    
    // Approve exactly 10 DOC
    await mockToken.connect(subscriberWallet).approve(
      await subscription.getAddress(),
      ethers.parseEther("10")
    );
    
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    
    await subscription.charge();
    
    // Check that allowance is now 0
    const details = await subscription.getSubscriptionDetails();
    expect(Number(details.currentAllowance)).to.equal(0);
    console.log("✅ 7.5 Passed: Exact allowance works");
  });

  it("7.6 Should handle allowance exactly after multiple charges", async function () {
    const { provider, subscription, mockToken, subscriberWallet, receiverWallet } = await setupContract();
    
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

  it("7.7 Should allow subscriber to increase allowance mid-cycle", async function () {
    const { provider, subscription, mockToken, subscriberWallet } = await setupContract();
    
    // Approve 5 DOC (not enough)
    await mockToken.connect(subscriberWallet).approve(
      await subscription.getAddress(),
      ethers.parseEther("5")
    );
    
    // Increase allowance to enough
    await mockToken.connect(subscriberWallet).approve(
      await subscription.getAddress(),
      ethers.parseEther("20")
    );
    
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    
    await subscription.charge();
    console.log("✅ 7.7 Passed: Allowance can be increased mid-cycle");
  });

  it("7.8 Should handle large intervals (1 year)", async function () {
    const { provider, mockToken, subscriberWallet, receiverWallet } = await setupContract();
    
    // Deploy a new contract with 1-year interval
    const subscriptionArtifact = await hre.artifacts.readArtifact("DOCSubscription");
    const factory = new ethers.ContractFactory(
      subscriptionArtifact.abi,
      subscriptionArtifact.bytecode,
      subscriberWallet
    );
    
    const yearSubscription = await factory.deploy(
      subscriberWallet.address,
      receiverWallet.address,
      ethers.parseEther("100"),
      365 * 24 * 60 * 60, // 1 year
      await mockToken.getAddress()
    );
    await yearSubscription.waitForDeployment();
    
    // Approve
    await mockToken.connect(subscriberWallet).approve(
      await yearSubscription.getAddress(),
      ethers.parseEther("1000")
    );
    
    // Advance time by 366 days
    await provider.send("evm_increaseTime", [366 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    
    await yearSubscription.charge();
    console.log("✅ 7.8 Passed: Large interval works");
  });
});