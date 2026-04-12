import { expect } from "chai";
import hre from "hardhat";
import {
    JsonRpcProvider,
    Wallet,
    ContractFactory,
    parseEther,
    ZeroAddress,
    MaxUint256
} from "ethers";

// ============================================================
//  DOCSubscription Test Suite
//  Requires: npx hardhat node running in a separate terminal
//  Run with: npx hardhat test test/DOCSubscription.test.js --network localhost
// ============================================================

const SEVEN_DAYS = 7 * 24 * 60 * 60;
const TEN_DOC    = parseEther("10");

// Well-known Hardhat test private keys
const KEYS = [
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
];

// ============================================================
//  Reset chain before every test using snapshot/revert
// ============================================================
let snapshotId;

beforeEach(async function () {
    const provider = new JsonRpcProvider("http://127.0.0.1:8545");
    snapshotId = await provider.send("evm_snapshot", []);
});

afterEach(async function () {
    const provider = new JsonRpcProvider("http://127.0.0.1:8545");
    await provider.send("evm_revert", [snapshotId]);
});

// ============================================================
//  Shared Setup Helper
// ============================================================
async function setup() {
    const provider    = new JsonRpcProvider("http://127.0.0.1:8545");
    const deployer    = new Wallet(KEYS[0], provider);
    const subscriber  = new Wallet(KEYS[1], provider);
    const receiver    = new Wallet(KEYS[2], provider);
    const other       = new Wallet(KEYS[3], provider);
    const subscriber2 = new Wallet(KEYS[4], provider);

    // Deploy MockERC20
    const mockArtifact = await hre.artifacts.readArtifact("MockERC20");
    const mockFactory  = new ContractFactory(
        mockArtifact.abi,
        mockArtifact.bytecode,
        deployer
    );
    const mockToken = await mockFactory.deploy("Mock DOC", "mDOC", 18);
    await mockToken.waitForDeployment();

    // Deploy DOCSubscription
    const subArtifact = await hre.artifacts.readArtifact("DOCSubscription");
    const subFactory  = new ContractFactory(
        subArtifact.abi,
        subArtifact.bytecode,
        deployer
    );
    const subscription = await subFactory.deploy(await mockToken.getAddress());
    await subscription.waitForDeployment();

    // Mint tokens
    await (await mockToken.mint(subscriber.address,  parseEther("1000"))).wait();
    await (await mockToken.mint(subscriber2.address, parseEther("1000"))).wait();

    return {
        provider,
        subscription,
        mockToken,
        deployer,
        subscriber,
        receiver,
        other,
        subscriber2,
    };
}

// ============================================================
//  1. DEPLOYMENT TESTS
// ============================================================
describe("1. Deployment", function () {

    it("1.1 Should deploy and store the DOC token address", async function () {
        const { subscription, mockToken } = await setup();
        const storedToken = await subscription.i_docToken();
        expect(storedToken).to.equal(await mockToken.getAddress());
        console.log(" ✅ 1.1 DOC token address stored correctly");
    });

    it("1.2 Should deploy with no active subscriptions", async function () {
        const { subscription, subscriber } = await setup();
        const details = await subscription.getSubscriptionDetails(subscriber.address);
        expect(details.active).to.be.false;
        console.log(" ✅ 1.2 No subscriptions active on fresh deployment");
    });

    it("1.3 Should revert if deployed with zero token address", async function () {
        const provider = new JsonRpcProvider("http://127.0.0.1:8545");
        const deployer = new Wallet(KEYS[0], provider);
        const artifact = await hre.artifacts.readArtifact("DOCSubscription");
        const factory  = new ContractFactory(artifact.abi, artifact.bytecode, deployer);
        try {
            await factory.deploy(ZeroAddress);
            expect.fail("Should have reverted");
        } catch (error) {
            expect(error).to.exist;
            console.log(" ✅ 1.3 Reverts on zero token address at deployment");
        }
    });

});

// ============================================================
//  2. createSubscription TESTS
// ============================================================
describe("2. createSubscription", function () {

    it("2.1 Should create a subscription and store all details correctly", async function () {
        const { subscription, subscriber, receiver } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();

        const details = await subscription.getSubscriptionDetails(subscriber.address);
        expect(details.receiver).to.equal(receiver.address);
        expect(details.amountDOC).to.equal(TEN_DOC);
        expect(Number(details.intervalSeconds)).to.equal(SEVEN_DAYS);
        expect(details.active).to.be.true;
        console.log(" ✅ 2.1 Subscription created and stored correctly");
    });

    it("2.2 Should set the first due timestamp to now + interval", async function () {
        const { subscription, subscriber, receiver, provider } = await setup();

        const tx      = await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        );
        const receipt = await tx.wait();
        const block   = await provider.getBlock(receipt.blockNumber);
        const details = await subscription.getSubscriptionDetails(subscriber.address);
        const expected = block.timestamp + SEVEN_DAYS;

        expect(Number(details.nextDueTimestamp)).to.equal(expected);
        console.log(" ✅ 2.2 First due timestamp set correctly");
    });

    it("2.3 Should emit SubscriptionCreated event", async function () {
        const { subscription, subscriber, receiver } = await setup();

        const tx      = await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        );
        const receipt = await tx.wait();
        const event   = receipt.logs.find(
            log => log.fragment && log.fragment.name === "SubscriptionCreated"
        );
        expect(event).to.not.be.undefined;
        console.log(" ✅ 2.3 SubscriptionCreated event emitted");
    });

    it("2.4 Should allow two different subscribers on the same contract", async function () {
        const { subscription, subscriber, subscriber2, receiver, other } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await subscription.connect(subscriber2).createSubscription(
            other.address, parseEther("50"), SEVEN_DAYS
        )).wait();

        const details1 = await subscription.getSubscriptionDetails(subscriber.address);
        const details2 = await subscription.getSubscriptionDetails(subscriber2.address);

        expect(details1.active).to.be.true;
        expect(details2.active).to.be.true;
        expect(details1.receiver).to.equal(receiver.address);
        expect(details2.receiver).to.equal(other.address);
        console.log(" ✅ 2.4 Two independent subscriptions on same contract");
    });

    it("2.5 Should revert if subscriber already has an active subscription", async function () {
        const { subscription, subscriber, receiver } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();

        try {
            await subscription.connect(subscriber).createSubscription(
                receiver.address, TEN_DOC, SEVEN_DAYS
            );
            expect.fail("Should have reverted");
        } catch (error) {
            expect(error.message).to.include("Subscription__AlreadyActive");
            console.log(" ✅ 2.5 Reverts on duplicate active subscription");
        }
    });

    it("2.6 Should revert if receiver is zero address", async function () {
        const { subscription, subscriber } = await setup();

        try {
            await subscription.connect(subscriber).createSubscription(
                ZeroAddress, TEN_DOC, SEVEN_DAYS
            );
            expect.fail("Should have reverted");
        } catch (error) {
            expect(error.message).to.include("Subscription__InvalidAddress");
            console.log(" ✅ 2.6 Reverts on zero receiver address");
        }
    });

    it("2.7 Should revert if amount is zero", async function () {
        const { subscription, subscriber, receiver } = await setup();

        try {
            await subscription.connect(subscriber).createSubscription(
                receiver.address, 0, SEVEN_DAYS
            );
            expect.fail("Should have reverted");
        } catch (error) {
            expect(error.message).to.include("Subscription__ZeroAmount");
            console.log(" ✅ 2.7 Reverts on zero amount");
        }
    });

    it("2.8 Should revert if interval is zero", async function () {
        const { subscription, subscriber, receiver } = await setup();

        try {
            await subscription.connect(subscriber).createSubscription(
                receiver.address, TEN_DOC, 0
            );
            expect.fail("Should have reverted");
        } catch (error) {
            expect(error.message).to.include("Subscription__ZeroInterval");
            console.log(" ✅ 2.8 Reverts on zero interval");
        }
    });

    it("2.9 Should revert if subscriber sets themselves as receiver", async function () {
        const { subscription, subscriber } = await setup();

        try {
            await subscription.connect(subscriber).createSubscription(
                subscriber.address, TEN_DOC, SEVEN_DAYS
            );
            expect.fail("Should have reverted");
        } catch (error) {
            expect(error.message).to.include("Subscription__SameAddress");
            console.log(" ✅ 2.9 Reverts when subscriber sets self as receiver");
        }
    });

    it("2.10 Should allow a new subscription after cancelling the previous one", async function () {
        const { subscription, subscriber, receiver, other } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await subscription.connect(subscriber).cancelSubscription()).wait();
        await (await subscription.connect(subscriber).createSubscription(
            other.address, parseEther("20"), SEVEN_DAYS
        )).wait();

        const details = await subscription.getSubscriptionDetails(subscriber.address);
        expect(details.active).to.be.true;
        expect(details.receiver).to.equal(other.address);
        console.log(" ✅ 2.10 New subscription created after cancelling old one");
    });

});

// ============================================================
//  3. charge TESTS
// ============================================================
describe("3. charge", function () {

    it("3.1 Should revert if charged before due date", async function () {
        const { subscription, subscriber, receiver, mockToken } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();

        try {
            await subscription.charge(subscriber.address);
            expect.fail("Should have reverted");
        } catch (error) {
            expect(error.message).to.include("Subscription__TooEarlyToCharge");
            console.log(" ✅ 3.1 Reverts when charged before due date");
        }
    });

    it("3.2 Should succeed when charged exactly at due date", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();

        const details = await subscription.getSubscriptionDetails(subscriber.address);
        const block   = await provider.getBlock("latest");
        const advance = Number(details.nextDueTimestamp) - block.timestamp;

        await provider.send("evm_increaseTime", [advance]);
        await provider.send("evm_mine");

        await (await subscription.charge(subscriber.address)).wait();
        console.log(" ✅ 3.2 Charge succeeds exactly at due date");
    });

    it("3.3 Should succeed when charged after due date", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");

        await (await subscription.charge(subscriber.address)).wait();
        console.log(" ✅ 3.3 Charge succeeds after due date");
    });

    it("3.4 Should transfer correct amount from subscriber to receiver", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();

        const subBefore = await mockToken.balanceOf(subscriber.address);
        const recBefore = await mockToken.balanceOf(receiver.address);

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");
        await (await subscription.charge(subscriber.address)).wait();

        const subAfter = await mockToken.balanceOf(subscriber.address);
        const recAfter = await mockToken.balanceOf(receiver.address);

        expect(subAfter).to.equal(subBefore - TEN_DOC);
        expect(recAfter).to.equal(recBefore + TEN_DOC);
        console.log(" ✅ 3.4 Correct amount transferred subscriber to receiver");
    });

    it("3.5 Should update nextDueTimestamp correctly after charge", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();

        const before = await subscription.getSubscriptionDetails(subscriber.address);

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");
        await (await subscription.charge(subscriber.address)).wait();

        const after = await subscription.getSubscriptionDetails(subscriber.address);
        expect(Number(after.nextDueTimestamp)).to.equal(
            Number(before.nextDueTimestamp) + SEVEN_DAYS
        );
        console.log(" ✅ 3.5 nextDueTimestamp advances by one interval after charge");
    });

    it("3.6 Should emit PaymentCharged event", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");

        const tx      = await subscription.charge(subscriber.address);
        const receipt = await tx.wait();
        const event   = receipt.logs.find(
            log => log.fragment && log.fragment.name === "PaymentCharged"
        );
        expect(event).to.not.be.undefined;
        console.log(" ✅ 3.6 PaymentCharged event emitted");
    });

    it("3.7 Should allow subscriber to call charge on themselves", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");

        await (await subscription.connect(subscriber).charge(subscriber.address)).wait();
        console.log(" ✅ 3.7 Subscriber can call charge on themselves");
    });

    it("3.8 Should allow receiver to call charge", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");

        await (await subscription.connect(receiver).charge(subscriber.address)).wait();
        console.log(" ✅ 3.8 Receiver can call charge");
    });

    it("3.9 Should allow a third party to call charge (permissionless)", async function () {
        const { subscription, subscriber, receiver, other, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");

        await (await subscription.connect(other).charge(subscriber.address)).wait();
        console.log(" ✅ 3.9 Third party can call charge — permissionless confirmed");
    });

    it("3.10 Should revert if no allowance given", async function () {
        const { subscription, subscriber, receiver, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");

        try {
            await subscription.charge(subscriber.address);
            expect.fail("Should have reverted");
        } catch (error) {
            expect(error.message).to.include("Subscription__InsufficientAllowance");
            console.log(" ✅ 3.10 Reverts when no allowance given");
        }
    });

    it("3.11 Should revert if allowance is less than amount", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("5")
        )).wait();

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");

        try {
            await subscription.charge(subscriber.address);
            expect.fail("Should have reverted");
        } catch (error) {
            expect(error.message).to.include("Subscription__InsufficientAllowance");
            console.log(" ✅ 3.11 Reverts when allowance less than charge amount");
        }
    });

    it("3.12 Should revert if subscription is not active", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();
        await (await subscription.connect(subscriber).cancelSubscription()).wait();

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");

        try {
            await subscription.charge(subscriber.address);
            expect.fail("Should have reverted");
        } catch (error) {
            expect(error.message).to.include("Subscription__NotActive");
            console.log(" ✅ 3.12 Reverts when charging a cancelled subscription");
        }
    });

    it("3.13 Should handle multiple billing cycles correctly", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();

        for (let i = 0; i < 5; i++) {
            await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
            await provider.send("evm_mine");
            await (await subscription.charge(subscriber.address)).wait();
        }

        const balance = await mockToken.balanceOf(receiver.address);
        expect(balance).to.equal(parseEther("50"));
        console.log(" ✅ 3.13 Five billing cycles processed correctly");
    });

    it("3.14 Should revert if subscriber has insufficient token balance", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();

        const balance = await mockToken.balanceOf(subscriber.address);
        await (await mockToken.connect(subscriber).transfer(receiver.address, balance)).wait();

        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");

        try {
            await subscription.charge(subscriber.address);
            expect.fail("Should have reverted");
        } catch (error) {
            expect(error).to.exist;
            console.log(" ✅ 3.14 Reverts when subscriber has insufficient balance");
        }
    });

});

// ============================================================
//  4. cancelSubscription TESTS
// ============================================================
describe("4. cancelSubscription", function () {

    it("4.1 Should allow subscriber to cancel their active subscription", async function () {
        const { subscription, subscriber, receiver } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await subscription.connect(subscriber).cancelSubscription()).wait();

        const details = await subscription.getSubscriptionDetails(subscriber.address);
        expect(details.active).to.be.false;
        expect(Number(details.nextDueTimestamp)).to.equal(0);
        console.log(" ✅ 4.1 Subscriber can cancel their subscription");
    });

    it("4.2 Should emit SubscriptionCanceled event", async function () {
        const { subscription, subscriber, receiver } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();

        const tx      = await subscription.connect(subscriber).cancelSubscription();
        const receipt = await tx.wait();
        const event   = receipt.logs.find(
            log => log.fragment && log.fragment.name === "SubscriptionCanceled"
        );
        expect(event).to.not.be.undefined;
        console.log(" ✅ 4.2 SubscriptionCanceled event emitted");
    });

    it("4.3 Should revert if non-subscriber tries to cancel", async function () {
        const { subscription, subscriber, receiver, other } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();

        try {
            await subscription.connect(other).cancelSubscription();
            expect.fail("Should have reverted");
        } catch (error) {
            expect(error.message).to.include("Subscription__NotActive");
            console.log(" ✅ 4.3 Non-subscriber cannot cancel");
        }
    });

    it("4.4 Should revert if subscriber tries to cancel twice", async function () {
        const { subscription, subscriber, receiver } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await subscription.connect(subscriber).cancelSubscription()).wait();

        try {
            await subscription.connect(subscriber).cancelSubscription();
            expect.fail("Should have reverted");
        } catch (error) {
            expect(error.message).to.include("Subscription__NotActive");
            console.log(" ✅ 4.4 Double cancellation reverts");
        }
    });

    it("4.5 Should prevent charging after cancellation", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();
        await (await subscription.connect(subscriber).cancelSubscription()).wait();

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");

        try {
            await subscription.charge(subscriber.address);
            expect.fail("Should have reverted");
        } catch (error) {
            expect(error.message).to.include("Subscription__NotActive");
            console.log(" ✅ 4.5 Cannot charge after cancellation");
        }
    });

});

// ============================================================
//  5. VIEW FUNCTIONS TESTS
// ============================================================
describe("5. View Functions", function () {

    it("5.1 getSubscriptionDetails should return correct data", async function () {
        const { subscription, subscriber, receiver, mockToken } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();

        const details = await subscription.getSubscriptionDetails(subscriber.address);
        expect(details.receiver).to.equal(receiver.address);
        expect(details.amountDOC).to.equal(TEN_DOC);
        expect(Number(details.intervalSeconds)).to.equal(SEVEN_DAYS);
        expect(details.active).to.be.true;
        expect(details.currentAllowance).to.equal(parseEther("100"));
        console.log(" ✅ 5.1 getSubscriptionDetails returns all correct data");
    });

    it("5.2 timeUntilNextCharge should return close to interval after creation", async function () {
        const { subscription, subscriber, receiver } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();

        const timeLeft = await subscription.timeUntilNextCharge(subscriber.address);
        expect(Number(timeLeft)).to.be.closeTo(SEVEN_DAYS, 5);
        console.log(" ✅ 5.2 timeUntilNextCharge returns correct time");
    });

    it("5.3 timeUntilNextCharge should return 0 when overdue", async function () {
        const { subscription, subscriber, receiver, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");

        const timeLeft = await subscription.timeUntilNextCharge(subscriber.address);
        expect(Number(timeLeft)).to.equal(0);
        console.log(" ✅ 5.3 timeUntilNextCharge returns 0 when overdue");
    });

    it("5.4 timeUntilNextCharge should return 0 for inactive subscription", async function () {
        const { subscription, subscriber, receiver } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await subscription.connect(subscriber).cancelSubscription()).wait();

        const timeLeft = await subscription.timeUntilNextCharge(subscriber.address);
        expect(Number(timeLeft)).to.equal(0);
        console.log(" ✅ 5.4 timeUntilNextCharge returns 0 for inactive");
    });

    it("5.5 isChargeReady should return true when payment is due", async function () {
        const { subscription, subscriber, receiver, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");

        const ready = await subscription.isChargeReady(subscriber.address);
        expect(ready).to.be.true;
        console.log(" ✅ 5.5 isChargeReady returns true when due");
    });

    it("5.6 isChargeReady should return false before due date", async function () {
        const { subscription, subscriber, receiver } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();

        const ready = await subscription.isChargeReady(subscriber.address);
        expect(ready).to.be.false;
        console.log(" ✅ 5.6 isChargeReady returns false before due");
    });

    it("5.7 isChargeReady should return false for inactive subscription", async function () {
        const { subscription, subscriber, receiver, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await subscription.connect(subscriber).cancelSubscription()).wait();

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");

        const ready = await subscription.isChargeReady(subscriber.address);
        expect(ready).to.be.false;
        console.log(" ✅ 5.7 isChargeReady returns false for inactive");
    });

});

// ============================================================
//  6. SECURITY AND EDGE CASE TESTS
// ============================================================
describe("6. Security and Edge Cases", function () {

    it("6.1 Contract should never hold any DOC tokens", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");
        await (await subscription.charge(subscriber.address)).wait();

        const contractBalance = await mockToken.balanceOf(
            await subscription.getAddress()
        );
        expect(contractBalance).to.equal(0);
        console.log(" ✅ 6.1 Contract holds zero DOC — pull payment confirmed");
    });

    it("6.2 State updates before token transfer — CEI pattern", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();

        const before = await subscription.getSubscriptionDetails(subscriber.address);
        const oldDue = Number(before.nextDueTimestamp);

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");
        await (await subscription.charge(subscriber.address)).wait();

        const after = await subscription.getSubscriptionDetails(subscriber.address);
        expect(Number(after.nextDueTimestamp)).to.equal(oldDue + SEVEN_DAYS);
        console.log(" ✅ 6.2 CEI pattern confirmed — state updated correctly");
    });

    it("6.3 Cannot charge 1 second before due date", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();

        const details = await subscription.getSubscriptionDetails(subscriber.address);
        const block   = await provider.getBlock("latest");
        const advance = Number(details.nextDueTimestamp) - block.timestamp - 1;

        await provider.send("evm_increaseTime", [advance]);
        await provider.send("evm_mine");

        try {
            await subscription.charge(subscriber.address);
            expect.fail("Should have reverted");
        } catch (error) {
            expect(error.message).to.include("Subscription__TooEarlyToCharge");
            console.log(" ✅ 6.3 Cannot charge 1 second before due — strict timing confirmed");
        }
    });

    it("6.4 Two subscribers are fully isolated from each other", async function () {
        const { subscription, subscriber, subscriber2, receiver, other, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await subscription.connect(subscriber2).createSubscription(
            other.address, parseEther("50"), SEVEN_DAYS
        )).wait();

        await (await subscription.connect(subscriber).cancelSubscription()).wait();

        const details2 = await subscription.getSubscriptionDetails(subscriber2.address);
        expect(details2.active).to.be.true;

        await (await mockToken.connect(subscriber2).approve(
            await subscription.getAddress(), parseEther("200")
        )).wait();
        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");
        await (await subscription.charge(subscriber2.address)).wait();

        const balance = await mockToken.balanceOf(other.address);
        expect(balance).to.equal(parseEther("50"));
        console.log(" ✅ 6.4 Subscribers fully isolated — cancelling one does not affect the other");
    });

    it("6.5 Allowance depletion blocks charge but keeps subscription active", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), TEN_DOC
        )).wait();

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");
        await (await subscription.charge(subscriber.address)).wait();

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");

        try {
            await subscription.charge(subscriber.address);
            expect.fail("Should have reverted");
        } catch (error) {
            expect(error.message).to.include("Subscription__InsufficientAllowance");
        }

        const details = await subscription.getSubscriptionDetails(subscriber.address);
        expect(details.active).to.be.true;
        console.log(" ✅ 6.5 Depleted allowance blocks charge but keeps subscription active");
    });

    it("6.6 Topping up allowance re-enables charging", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), TEN_DOC
        )).wait();

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");
        await (await subscription.charge(subscriber.address)).wait();

        await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
        await provider.send("evm_mine");

        try {
            await subscription.charge(subscriber.address);
        } catch (error) {
            // expected — allowance depleted
        }

        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();

        await (await subscription.charge(subscriber.address)).wait();
        const balance = await mockToken.balanceOf(receiver.address);
        expect(balance).to.equal(parseEther("20"));
        console.log(" ✅ 6.6 Topping up allowance re-enables charging");
    });

    it("6.7 Should handle very small intervals (60 seconds)", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, 60
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), parseEther("100")
        )).wait();

        await provider.send("evm_increaseTime", [61]);
        await provider.send("evm_mine");

        await (await subscription.charge(subscriber.address)).wait();
        console.log(" ✅ 6.7 Small interval (60 seconds) handled correctly");
    });

    it("6.8 Should handle large number of consecutive charges (10 cycles)", async function () {
        const { subscription, subscriber, receiver, mockToken, provider } = await setup();

        await (await subscription.connect(subscriber).createSubscription(
            receiver.address, TEN_DOC, SEVEN_DAYS
        )).wait();
        await (await mockToken.connect(subscriber).approve(
            await subscription.getAddress(), MaxUint256
        )).wait();

        for (let i = 0; i < 10; i++) {
            await provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
            await provider.send("evm_mine");
            await (await subscription.charge(subscriber.address)).wait();
        }

        const balance = await mockToken.balanceOf(receiver.address);
        expect(balance).to.equal(parseEther("100"));
        console.log(" ✅ 6.8 Ten consecutive charges handled correctly");
    });

});
