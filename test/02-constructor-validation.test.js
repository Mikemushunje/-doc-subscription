import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";

describe("Constructor Validation Tests", function () {
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

  it("2.1 Should revert if subscriber is zero address", async function () {
    const factory = new ethers.ContractFactory(
      subscriptionArtifact.abi,
      subscriptionArtifact.bytecode,
      subscriberWallet
    );
    
    try {
      await factory.deploy(
        ethers.ZeroAddress,
        receiver.address,
        ethers.parseEther("10"),
        7 * 24 * 60 * 60,
        await mockToken.getAddress()
      );
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it("2.2 Should revert if receiver is zero address", async function () {
    const factory = new ethers.ContractFactory(
      subscriptionArtifact.abi,
      subscriptionArtifact.bytecode,
      subscriberWallet
    );
    
    try {
      await factory.deploy(
        subscriber.address,
        ethers.ZeroAddress,
        ethers.parseEther("10"),
        7 * 24 * 60 * 60,
        await mockToken.getAddress()
      );
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it("2.3 Should revert if token address is zero", async function () {
    const factory = new ethers.ContractFactory(
      subscriptionArtifact.abi,
      subscriptionArtifact.bytecode,
      subscriberWallet
    );
    
    try {
      await factory.deploy(
        subscriber.address,
        receiver.address,
        ethers.parseEther("10"),
        7 * 24 * 60 * 60,
        ethers.ZeroAddress
      );
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it("2.4 Should revert if amount is zero", async function () {
    const factory = new ethers.ContractFactory(
      subscriptionArtifact.abi,
      subscriptionArtifact.bytecode,
      subscriberWallet
    );
    
    try {
      await factory.deploy(
        subscriber.address,
        receiver.address,
        0,
        7 * 24 * 60 * 60,
        await mockToken.getAddress()
      );
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it("2.5 Should revert if interval is zero", async function () {
    const factory = new ethers.ContractFactory(
      subscriptionArtifact.abi,
      subscriptionArtifact.bytecode,
      subscriberWallet
    );
    
    try {
      await factory.deploy(
        subscriber.address,
        receiver.address,
        ethers.parseEther("10"),
        0,
        await mockToken.getAddress()
      );
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it("2.6 Should revert if amount is zero even with large interval", async function () {
    const factory = new ethers.ContractFactory(
      subscriptionArtifact.abi,
      subscriptionArtifact.bytecode,
      subscriberWallet
    );
    
    try {
      await factory.deploy(
        subscriber.address,
        receiver.address,
        0,
        365 * 24 * 60 * 60,
        await mockToken.getAddress()
      );
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.exist;
    }
  });
});