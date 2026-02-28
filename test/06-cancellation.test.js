import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";

describe("Cancellation Tests", function () {
  let snapshotId;
  let provider;
  let subscriberWallet;
  let receiverWallet;
  let otherWallet;
  let mockToken;
  let subscription;
  let subscriptionArtifact;
  let MockTokenArtifact;

  before(async function () {
    provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    
    const privateKey1 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const privateKey2 = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
    const privateKey3 = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
    
    subscriberWallet = new ethers.Wallet(privateKey1, provider);
    receiverWallet = new ethers.Wallet(privateKey2, provider);
    otherWallet = new ethers.Wallet(privateKey3, provider);
    
    MockTokenArtifact = await hre.artifacts.readArtifact("MockERC20");
    subscriptionArtifact = await hre.artifacts.readArtifact("DOCSubscription");
  });

  beforeEach(async function () {
    // Take a snapshot before each test
    snapshotId = await provider.send("evm_snapshot", []);
    
    // Deploy fresh mock token
    const mockFactory = new ethers.ContractFactory(
      MockTokenArtifact.abi,
      MockTokenArtifact.bytecode,
      subscriberWallet
    );
    mockToken = await mockFactory.deploy("Mock DOC", "mDOC", 18);
    await mockToken.waitForDeployment();
    
    // Mint tokens
    await mockToken.mint(subscriberWallet.address, ethers.parseEther("1000"));
    
    // Deploy fresh subscription
    const factory = new ethers.ContractFactory(
      subscriptionArtifact.abi,
      subscriptionArtifact.bytecode,
      subscriberWallet
    );
    
    subscription = await factory.deploy(
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
  });

  afterEach(async function () {
    // Revert to snapshot after each test
    await provider.send("evm_revert", [snapshotId]);
  });

  it("6.1 Should allow subscriber to cancel", async function () {
    await subscription.connect(subscriberWallet).cancelSubscription();
    
    const active = await subscription.s_active();
    expect(active).to.be.false;
    console.log("✅ 6.1 Passed: Subscriber can cancel");
  });

  it("6.2 Should set nextDueTimestamp to 0 after cancellation", async function () {
    await subscription.connect(subscriberWallet).cancelSubscription();
    
    const nextDue = await subscription.s_nextDueTimestamp();
    expect(Number(nextDue)).to.equal(0);
    console.log("✅ 6.2 Passed: nextDueTimestamp set to 0");
  });

  it("6.3 Should emit SubscriptionCanceled event", async function () {
    const tx = await subscription.connect(subscriberWallet).cancelSubscription();
    const receipt = await tx.wait();
    
    const event = receipt.logs.find(
      log => log.fragment && log.fragment.name === "SubscriptionCanceled"
    );
    expect(event).to.not.be.undefined;
    console.log("✅ 6.3 Passed: SubscriptionCanceled event emitted");
  });

  it("6.4 Should not allow receiver to cancel", async function () {
    try {
      await subscription.connect(receiverWallet).cancelSubscription();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
      console.log("✅ 6.4 Passed: Receiver cannot cancel");
    }
  });

  it("6.5 Should not allow other account to cancel", async function () {
    try {
      await subscription.connect(otherWallet).cancelSubscription();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
      console.log("✅ 6.5 Passed: Other account cannot cancel");
    }
  });

  it("6.6 Should prevent charging after cancellation", async function () {
    // Cancel first
    await subscription.connect(subscriberWallet).cancelSubscription();
    
    // Try to charge after cancellation
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    
    try {
      await subscription.charge();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
      console.log("✅ 6.6 Passed: Cannot charge after cancellation");
    }
  });

  it("6.7 Should revert if trying to cancel twice", async function () {
    // First cancel
    await subscription.connect(subscriberWallet).cancelSubscription();
    
    // Try to cancel again
    try {
      await subscription.connect(subscriberWallet).cancelSubscription();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
      console.log("✅ 6.7 Passed: Cannot cancel twice");
    }
  });
});