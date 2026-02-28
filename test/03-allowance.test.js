import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";

describe("Allowance Tests", function () {
  let subscription;
  let mockToken;
  let provider;
  let subscriberWallet;
  let receiverWallet;
  let subscriber;
  let receiver;
  let subscriptionArtifact;

  before(async function () {
    provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    
    const privateKey1 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const privateKey2 = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
    
    subscriberWallet = new ethers.Wallet(privateKey1, provider);
    receiverWallet = new ethers.Wallet(privateKey2, provider);
    
    subscriber = { address: subscriberWallet.address };
    receiver = { address: receiverWallet.address };
    
    // Deploy mock token
    const MockTokenArtifact = await hre.artifacts.readArtifact("MockERC20");
    const mockFactory = new ethers.ContractFactory(
      MockTokenArtifact.abi,
      MockTokenArtifact.bytecode,
      subscriberWallet
    );
    mockToken = await mockFactory.deploy("Mock DOC", "mDOC", 18);
    await mockToken.waitForDeployment();
    
    subscriptionArtifact = await hre.artifacts.readArtifact("DOCSubscription");
  });

  beforeEach(async function () {
    const factory = new ethers.ContractFactory(
      subscriptionArtifact.abi,
      subscriptionArtifact.bytecode,
      subscriberWallet
    );
    
    subscription = await factory.deploy(
      subscriber.address,
      receiver.address,
      ethers.parseEther("10"),
      7 * 24 * 60 * 60,
      await mockToken.getAddress()
    );
    await subscription.waitForDeployment();
    
    // Mint fresh tokens for each test
    await mockToken.mint(subscriber.address, ethers.parseEther("1000"));
  });

  // 🔍 DEBUG TEST - Add this first to check basics
  it("DEBUG: Check if token transfer works directly", async function () {
    console.log("\n🔍 DEBUGGING TOKEN TRANSFERS");
    
    // Check subscriber balance
    const balance = await mockToken.balanceOf(subscriber.address);
    console.log(`💰 Subscriber balance: ${ethers.formatEther(balance)} DOC`);
    
    // Check contract address
    const contractAddress = await subscription.getAddress();
    console.log(`📄 Contract address: ${contractAddress}`);
    
    // Try approve
    console.log("📝 Attempting to approve 50 DOC...");
    const approveTx = await mockToken.connect(subscriberWallet).approve(
      contractAddress,
      ethers.parseEther("50")
    );
    await approveTx.wait();
    console.log("✅ Approval successful");
    
    // Check allowance
    const allowance = await mockToken.allowance(
      subscriber.address,
      contractAddress
    );
    console.log(`📊 Allowance set to: ${ethers.formatEther(allowance)} DOC`);
    
    // Check contract's view of allowance
    const details = await subscription.getSubscriptionDetails();
    console.log(`📊 Contract sees allowance: ${ethers.formatEther(details.currentAllowance)} DOC`);
    
    // Check if we can charge
    console.log("⏰ Advancing time...");
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    
    console.log("💰 Attempting to charge...");
    try {
      const chargeTx = await subscription.connect(subscriberWallet).charge();
      await chargeTx.wait();
      console.log("✅ Charge successful!");
      
      // Check new balance
      const newBalance = await mockToken.balanceOf(subscriber.address);
      console.log(`💰 New balance: ${ethers.formatEther(newBalance)} DOC`);
    } catch (error) {
      console.log("❌ Charge failed!");
      console.log("Error message:", error.message);
      if (error.reason) console.log("Reason:", error.reason);
    }
  });

  it("3.1 Should show zero allowance before approval", async function () {
    const details = await subscription.getSubscriptionDetails();
    expect(Number(details.currentAllowance)).to.equal(0);
    console.log("✅ Initial allowance is 0");
  });

  it("3.2 Should show allowance after approval", async function () {
    await mockToken.connect(subscriberWallet).approve(
      await subscription.getAddress(),
      ethers.parseEther("50")
    );

    const details = await subscription.getSubscriptionDetails();
    expect(details.currentAllowance).to.equal(ethers.parseEther("50"));
    console.log(`✅ Allowance set to: ${ethers.formatEther(details.currentAllowance)} DOC`);
  });

  it("3.3 Should reduce allowance after charge", async function () {
    // Approve 50 DOC
    await mockToken.connect(subscriberWallet).approve(
      await subscription.getAddress(),
      ethers.parseEther("50")
    );

    // Advance time past due date
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");

    // Charge 10 DOC
    await subscription.connect(subscriberWallet).charge();

    // Check allowance reduced to 40
    const details = await subscription.getSubscriptionDetails();
    expect(details.currentAllowance).to.equal(ethers.parseEther("40"));
    console.log(`✅ Allowance after charge: ${ethers.formatEther(details.currentAllowance)} DOC`);
  });

  it("3.4 Should allow multiple approvals (top-ups)", async function () {
    // First approval: 20 DOC
    await mockToken.connect(subscriberWallet).approve(
      await subscription.getAddress(),
      ethers.parseEther("20")
    );

    const details1 = await subscription.getSubscriptionDetails();
    expect(details1.currentAllowance).to.equal(ethers.parseEther("20"));
    console.log(`✅ First approval: ${ethers.formatEther(details1.currentAllowance)} DOC`);

    // Second approval: 50 DOC (overwrites)
    await mockToken.connect(subscriberWallet).approve(
      await subscription.getAddress(),
      ethers.parseEther("50")
    );

    const details2 = await subscription.getSubscriptionDetails();
    expect(details2.currentAllowance).to.equal(ethers.parseEther("50"));
    console.log(`✅ Second approval: ${ethers.formatEther(details2.currentAllowance)} DOC`);
  });

  it("3.5 Should show correct allowance after multiple charges", async function () {
    // Approve 50 DOC
    await mockToken.connect(subscriberWallet).approve(
      await subscription.getAddress(),
      ethers.parseEther("50")
    );

    // First charge
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    await subscription.connect(subscriberWallet).charge();

    // Check allowance after first charge
    let details = await subscription.getSubscriptionDetails();
    expect(details.currentAllowance).to.equal(ethers.parseEther("40"));

    // Second charge
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    await subscription.connect(subscriberWallet).charge();

    // Check allowance after second charge
    details = await subscription.getSubscriptionDetails();
    expect(details.currentAllowance).to.equal(ethers.parseEther("30"));
    console.log(`✅ Allowance after two charges: ${ethers.formatEther(details.currentAllowance)} DOC`);
  });
});