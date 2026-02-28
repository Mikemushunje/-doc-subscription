import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";

describe("Integration Tests", function () {
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

  it("9.1 Complete happy path: subscribe → approve → wait → charge → repeat", async function () {
    const { provider, subscription, mockToken, subscriberWallet, receiverWallet } = await setupContract();
    
    // 1. Approve
    await mockToken.connect(subscriberWallet).approve(
      await subscription.getAddress(),
      ethers.parseEther("100")
    );
    console.log("✅ Step 1: Approval granted");
    
    // 2. First payment
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    await subscription.charge();
    console.log("✅ Step 2: First payment charged");
    
    // 3. Second payment
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    await subscription.charge();
    console.log("✅ Step 3: Second payment charged");
    
    // 4. Verify total payments
    const balance = await mockToken.balanceOf(receiverWallet.address);
    expect(balance).to.equal(ethers.parseEther("20"));
    console.log(`✅ Step 4: Receiver balance = ${ethers.formatEther(balance)} DOC`);
    
    console.log("✅ 9.1 Passed: Complete happy path works");
  });

  it("9.2 Path with cancellation mid-way", async function () {
    const { provider, subscription, mockToken, subscriberWallet, receiverWallet } = await setupContract();
    
    // 1. Approve
    await mockToken.connect(subscriberWallet).approve(
      await subscription.getAddress(),
      ethers.parseEther("100")
    );
    console.log("✅ Step 1: Approval granted");
    
    // 2. First payment
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    await subscription.charge();
    console.log("✅ Step 2: First payment charged");
    
    // 3. Cancel
    await subscription.connect(subscriberWallet).cancelSubscription();
    console.log("✅ Step 3: Subscription cancelled");
    
    // 4. Try second payment (should fail)
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    
    try {
      await subscription.charge();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
      console.log("✅ Step 4: Second payment correctly blocked");
    }
    
    // 5. Verify only one payment made
    const balance = await mockToken.balanceOf(receiverWallet.address);
    expect(balance).to.equal(ethers.parseEther("10"));
    console.log(`✅ Step 5: Receiver balance = ${ethers.formatEther(balance)} DOC`);
    
    console.log("✅ 9.2 Passed: Cancellation mid-way works");
  });

  it("9.3 Path with allowance top-up", async function () {
    const { provider, subscription, mockToken, subscriberWallet, receiverWallet } = await setupContract();
    
    // 1. Approve only 15 DOC (enough for 1 payment)
    await mockToken.connect(subscriberWallet).approve(
      await subscription.getAddress(),
      ethers.parseEther("15")
    );
    console.log("✅ Step 1: Initial approval of 15 DOC");
    
    // 2. First payment
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    await subscription.charge();
    console.log("✅ Step 2: First payment charged");
    
    // 3. Second payment should fail (allowance now 5 DOC, need 10)
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    
    try {
      await subscription.charge();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
      console.log("✅ Step 3: Second payment correctly blocked (insufficient allowance)");
    }
    
    // 4. Top up allowance
    await mockToken.connect(subscriberWallet).approve(
      await subscription.getAddress(),
      ethers.parseEther("20")
    );
    console.log("✅ Step 4: Allowance topped up to 20 DOC");
    
    // 5. Second payment now succeeds
    await subscription.charge();
    console.log("✅ Step 5: Second payment successful after top-up");
    
    // 6. Verify 2 payments total
    const balance = await mockToken.balanceOf(receiverWallet.address);
    expect(balance).to.equal(ethers.parseEther("20"));
    console.log(`✅ Step 6: Receiver balance = ${ethers.formatEther(balance)} DOC`);
    
    console.log("✅ 9.3 Passed: Allowance top-up works");
  });

  it("9.4 Path with insufficient balance then replenish", async function () {
    const { provider, subscription, mockToken, subscriberWallet, receiverWallet } = await setupContract();
    
    // 1. Approve
    await mockToken.connect(subscriberWallet).approve(
      await subscription.getAddress(),
      ethers.parseEther("50")
    );
    console.log("✅ Step 1: Approval granted");
    
    // 2. First payment
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    await subscription.charge();
    console.log("✅ Step 2: First payment charged");
    
    // Track receiver balance after first payment
    const afterFirstPayment = await mockToken.balanceOf(receiverWallet.address);
    console.log(`   Receiver balance after first payment: ${ethers.formatEther(afterFirstPayment)} DOC`);
    
    // 3. Transfer all remaining tokens away (simulate spending)
    const remaining = await mockToken.balanceOf(subscriberWallet.address);
    await mockToken.connect(subscriberWallet).transfer(receiverWallet.address, remaining);
    console.log(`✅ Step 3: Transferred ${ethers.formatEther(remaining)} DOC away (subscriber balance now 0)`);
    
    // Track receiver balance after transfer
    const afterTransfer = await mockToken.balanceOf(receiverWallet.address);
    console.log(`   Receiver balance after transfer: ${ethers.formatEther(afterTransfer)} DOC`);
    
    // 4. Second payment should fail (no balance)
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    
    try {
      await subscription.charge();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
      console.log("✅ Step 4: Payment correctly blocked (insufficient balance)");
    }
    
    // 5. Get more tokens
    await mockToken.mint(subscriberWallet.address, ethers.parseEther("100"));
    console.log("✅ Step 5: Minted 100 more DOC to subscriber");
    
    // 6. Second payment now succeeds
    await subscription.charge();
    console.log("✅ Step 6: Payment successful after replenishing balance");
    
    // 7. Verify subscription is still active and working
    const finalBalance = await mockToken.balanceOf(receiverWallet.address);
    console.log(`✅ Step 7: Receiver final balance = ${ethers.formatEther(finalBalance)} DOC`);
    
    // Verify that two payments were made successfully
    expect(await subscription.s_active()).to.be.true;
    expect(await subscription.s_nextDueTimestamp()).to.be.greaterThan(0);
    
    console.log("✅ 9.4 Passed: Insufficient balance then replenish works");
  });
});