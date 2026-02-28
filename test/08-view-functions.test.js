import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";

describe("View Functions Tests", function () {
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

  it("8.1 getSubscriptionDetails should return all 7 fields correctly", async function () {
    const { subscription, subscriberWallet, receiverWallet, mockToken } = await setupContract();
    
    const details = await subscription.getSubscriptionDetails();
    
    expect(details.subscriber).to.equal(subscriberWallet.address);
    expect(details.receiver).to.equal(receiverWallet.address);
    expect(details.amountDOC).to.equal(ethers.parseEther("10"));
    // Fix: Convert BigInt to Number for comparison
    expect(Number(details.intervalSeconds)).to.equal(7 * 24 * 60 * 60);
    expect(details.currentAllowance).to.equal(ethers.parseEther("100"));
    expect(details.active).to.be.true;
    expect(Number(details.nextDueTimestamp)).to.be.greaterThan(0);
    
    console.log("✅ 8.1 Passed: getSubscriptionDetails returns all fields correctly");
    console.log(`   Subscriber: ${details.subscriber}`);
    console.log(`   Receiver: ${details.receiver}`);
    console.log(`   Amount: ${ethers.formatEther(details.amountDOC)} DOC`);
    console.log(`   Interval: ${Number(details.intervalSeconds)} seconds`);
    console.log(`   Allowance: ${ethers.formatEther(details.currentAllowance)} DOC`);
    console.log(`   Active: ${details.active}`);
    console.log(`   Next Due: ${Number(details.nextDueTimestamp)}`);
  });

  it("8.2 timeUntilNextCharge should return correct positive time before due", async function () {
    const { provider, subscription } = await setupContract();
    
    const timeUntil = await subscription.timeUntilNextCharge();
    const dueDate = await subscription.s_nextDueTimestamp();
    const block = await provider.getBlock("latest");
    
    // Fix: Convert BigInt to Number for comparison
    const expected = Number(dueDate) - block.timestamp;
    expect(Number(timeUntil)).to.be.closeTo(expected, 2);
    
    console.log(`✅ 8.2 Passed: timeUntilNextCharge = ${timeUntil} seconds`);
    console.log(`   Expected: ~${expected} seconds`);
  });

  it("8.3 timeUntilNextCharge should return 0 if past due", async function () {
    const { provider, subscription } = await setupContract();
    
    // Advance time past due date
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    
    const timeUntil = await subscription.timeUntilNextCharge();
    expect(Number(timeUntil)).to.equal(0);
    
    console.log("✅ 8.3 Passed: timeUntilNextCharge returns 0 when past due");
  });

  it("8.4 timeUntilNextCharge should return 0 after cancellation", async function () {
    const { subscription, subscriberWallet } = await setupContract();
    
    // Cancel subscription
    await subscription.connect(subscriberWallet).cancelSubscription();
    
    const timeUntil = await subscription.timeUntilNextCharge();
    expect(Number(timeUntil)).to.equal(0);
    
    console.log("✅ 8.4 Passed: timeUntilNextCharge returns 0 after cancellation");
  });
});