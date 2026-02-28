import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";

describe("Deployment Tests", function () {
  let subscription;
  let mockToken;
  let subscriber;
  let receiver;
  let provider;
  let subscriberWallet;
  let receiverWallet;

  before(async function () {
    console.log("🔌 Connecting to network...");
    
    // Connect to the local Hardhat node
    provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    
    // Get the first two private keys from the Hardhat node output
    // Account #0 private key
    const privateKey1 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    // Account #1 private key  
    const privateKey2 = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
    
    // Create actual wallets that can sign transactions
    subscriberWallet = new ethers.Wallet(privateKey1, provider);
    receiverWallet = new ethers.Wallet(privateKey2, provider);
    
    subscriber = { address: subscriberWallet.address };
    receiver = { address: receiverWallet.address };
    
    console.log("✅ Network ready");
    console.log(`📌 Subscriber: ${subscriber.address}`);
    console.log(`📌 Receiver: ${receiver.address}`);
  });

  it("Should deploy MockERC20 token", async function () {
    // Get contract artifact
    const mockTokenArtifact = await hre.artifacts.readArtifact("MockERC20");
    
    // Create contract factory with REAL signer
    const factory = new ethers.ContractFactory(
      mockTokenArtifact.abi,
      mockTokenArtifact.bytecode,
      subscriberWallet
    );
    
    // Deploy contract
    mockToken = await factory.deploy("Mock DOC", "mDOC", 18);
    await mockToken.waitForDeployment();
    
    const tokenAddress = await mockToken.getAddress();
    console.log(`✅ MockERC20 deployed at: ${tokenAddress}`);
    
    expect(tokenAddress).to.not.be.undefined;
  });

  it("Should mint tokens to subscriber", async function () {
    // Connect the contract to subscriber's wallet for minting
    const tokenWithSigner = mockToken.connect(subscriberWallet);
    
    // Mint 1000 DOC to subscriber
    const mintTx = await tokenWithSigner.mint(subscriber.address, ethers.parseEther("1000"));
    await mintTx.wait();
    
    const balance = await mockToken.balanceOf(subscriber.address);
    console.log(`💰 Subscriber balance: ${ethers.formatEther(balance)} DOC`);
    
    expect(balance).to.equal(ethers.parseEther("1000"));
  });

  it("Should deploy DOCSubscription contract", async function () {
    // Get contract artifact
    const subscriptionArtifact = await hre.artifacts.readArtifact("DOCSubscription");
    
    // Create contract factory with subscriber as deployer
    const factory = new ethers.ContractFactory(
      subscriptionArtifact.abi,
      subscriptionArtifact.bytecode,
      subscriberWallet
    );
    
    // Deploy with all parameters
    subscription = await factory.deploy(
      subscriber.address,
      receiver.address,
      ethers.parseEther("10"),
      7 * 24 * 60 * 60, // 7 days in seconds
      await mockToken.getAddress()
    );
    await subscription.waitForDeployment();
    
    const subscriptionAddress = await subscription.getAddress();
    console.log(`✅ DOCSubscription deployed at: ${subscriptionAddress}`);
    
    expect(subscriptionAddress).to.not.be.undefined;
  });

  it("Should set the correct subscriber", async function () {
    const storedSubscriber = await subscription.s_subscriber();
    expect(storedSubscriber).to.equal(subscriber.address);
    console.log(`✅ Subscriber verified: ${storedSubscriber}`);
  });

  it("Should set the correct receiver", async function () {
    const storedReceiver = await subscription.s_receiver();
    expect(storedReceiver).to.equal(receiver.address);
    console.log(`✅ Receiver verified: ${storedReceiver}`);
  });

  it("Should set the correct amount", async function () {
    const amount = await subscription.s_amountDOC();
    expect(amount).to.equal(ethers.parseEther("10"));
    console.log(`✅ Amount verified: ${ethers.formatEther(amount)} DOC`);
  });

  it("Should set the correct interval", async function () {
    const interval = await subscription.s_intervalSeconds();
    // Convert BigInt to Number for comparison
    expect(Number(interval)).to.equal(7 * 24 * 60 * 60);
    console.log(`✅ Interval verified: ${interval} seconds (${Number(interval) / 86400} days)`);
  });

  it("Should be active after deployment", async function () {
    const active = await subscription.s_active();
    expect(active).to.be.true;
    console.log("✅ Subscription is active");
  });

  it("Should store the correct DOC token address", async function () {
    const tokenAddress = await subscription.i_docToken();
    expect(tokenAddress).to.equal(await mockToken.getAddress());
    console.log(`✅ DOC token address verified: ${tokenAddress}`);
  });

  it("Should set nextDueTimestamp correctly", async function () {
    const block = await provider.getBlock("latest");
    const expectedDue = block.timestamp + (7 * 24 * 60 * 60);
    const actualDue = await subscription.s_nextDueTimestamp();
    
    console.log(`⏰ Block timestamp: ${block.timestamp}`);
    console.log(`📅 Expected next due: ${expectedDue}`);
    console.log(`📅 Actual next due: ${actualDue}`);
    
    // Convert both to Numbers for comparison
    expect(Number(actualDue)).to.be.closeTo(expectedDue, 5);
  });

  it("Should approve allowance", async function () {
    // Approve the subscription contract to spend tokens using real wallet
    const tokenWithSigner = mockToken.connect(subscriberWallet);
    
    const approveTx = await tokenWithSigner.approve(
      await subscription.getAddress(),
      ethers.parseEther("100")
    );
    await approveTx.wait();
    
    const allowance = await mockToken.allowance(
      subscriber.address, 
      await subscription.getAddress()
    );
    
    console.log(`✅ Allowance set: ${ethers.formatEther(allowance)} DOC`);
    expect(allowance).to.equal(ethers.parseEther("100"));
  });
});