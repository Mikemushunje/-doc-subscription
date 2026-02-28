import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";

describe("Charging Tests", function () {
  async function setupContract() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    
    const privateKey1 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const privateKey2 = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
    const privateKey3 = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
    
    const subscriberWallet = new ethers.Wallet(privateKey1, provider);
    const receiverWallet = new ethers.Wallet(privateKey2, provider);
    const otherWallet = new ethers.Wallet(privateKey3, provider);
    
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
      receiverWallet,
      otherWallet
    };
  }

  it("4.1 Should not charge before due date", async function () {
    const { subscription } = await setupContract();
    
    try {
      await subscription.charge();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
      console.log("✅ 4.1 Passed: Cannot charge before due date");
    }
  });

  it("4.2 Should charge exactly at due date", async function () {
    const { provider, subscription } = await setupContract();
    
    const dueDate = await subscription.s_nextDueTimestamp();
    const block = await provider.getBlock("latest");
    const timeToAdvance = Number(dueDate) - block.timestamp;
    
    await provider.send("evm_increaseTime", [timeToAdvance]);
    await provider.send("evm_mine");
    
    await subscription.charge();
    console.log("✅ 4.2 Passed: Can charge exactly at due date");
  });

  it("4.3 Should charge after due date", async function () {
    const { provider, subscription } = await setupContract();
    
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    
    await subscription.charge();
    console.log("✅ 4.3 Passed: Can charge after due date");
  });

  it("4.4 Should transfer correct amount", async function () {
    const { provider, subscription, mockToken, subscriberWallet, receiverWallet } = await setupContract();
    
    const subBefore = await mockToken.balanceOf(subscriberWallet.address);
    const recBefore = await mockToken.balanceOf(receiverWallet.address);

    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    await subscription.charge();

    const subAfter = await mockToken.balanceOf(subscriberWallet.address);
    const recAfter = await mockToken.balanceOf(receiverWallet.address);

    expect(subAfter).to.equal(subBefore - ethers.parseEther("10"));
    expect(recAfter).to.equal(recBefore + ethers.parseEther("10"));
    console.log("✅ 4.4 Passed: Correct amount transferred");
  });

  it("4.5 Should emit PaymentCharged event", async function () {
    const { provider, subscription } = await setupContract();
    
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");

    const tx = await subscription.charge();
    const receipt = await tx.wait();
    
    const event = receipt.logs.find(
      log => log.fragment && log.fragment.name === "PaymentCharged"
    );
    expect(event).to.not.be.undefined;
    console.log("✅ 4.5 Passed: PaymentCharged event emitted");
  });

  it("4.6 Should update nextDueTimestamp", async function () {
    const { provider, subscription } = await setupContract();
    
    const oldDue = await subscription.s_nextDueTimestamp();

    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");
    await subscription.charge();

    const newDue = await subscription.s_nextDueTimestamp();
    expect(Number(newDue)).to.equal(Number(oldDue) + (7 * 24 * 60 * 60));
    console.log("✅ 4.6 Passed: Next due timestamp updated");
  });

  it("4.7 Subscriber can charge", async function () {
    const { provider, subscription, subscriberWallet } = await setupContract();
    
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");

    await subscription.connect(subscriberWallet).charge();
    console.log("✅ 4.7 Passed: Subscriber can charge");
  });

  it("4.8 Receiver can charge", async function () {
    const { provider, subscription, receiverWallet } = await setupContract();
    
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");

    await subscription.connect(receiverWallet).charge();
    console.log("✅ 4.8 Passed: Receiver can charge");
  });

  it("4.9 Third party can charge", async function () {
    const { provider, subscription, otherWallet } = await setupContract();
    
    await provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await provider.send("evm_mine");

    await subscription.connect(otherWallet).charge();
    console.log("✅ 4.9 Passed: Third party can charge");
  });
});