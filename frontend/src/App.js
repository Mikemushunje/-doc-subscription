import React, { useState } from 'react';
import { ethers } from 'ethers';
import { ThreeDots } from 'react-loader-spinner';
import './App.css';

// Contract Details - CORRECTED ADDRESSES
const CONTRACT_ADDRESS = "0x778696cCC58cca40d457742b926B56A52b843414";
const DOC_TOKEN_ADDRESS = "0xCb46C0DdC60d18eFEB0e586c17AF6Ea36452DaE0"; // Fixed: ends with E0, not E6

// Minimal ABI for DOC token
const DOC_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

// Contract ABI
const CONTRACT_ABI = [
  "function getSubscriptionDetails() view returns (address subscriber, address receiver, uint256 amountDOC, uint256 intervalSeconds, uint256 nextDueTimestamp, uint256 currentAllowance, bool active)",
  "function charge()",
  "function cancelSubscription()"
];

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [docContract, setDocContract] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [docBalance, setDocBalance] = useState('0');
  const [allowance, setAllowance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const connectWallet = async () => {
    if (!window.ethereum) {
      setMessage({ text: 'MetaMask not installed!', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const docContract = new ethers.Contract(DOC_TOKEN_ADDRESS, DOC_ABI, signer);

      setContract(contract);
      setDocContract(docContract);
      setAccount(address);

      await loadData(contract, docContract, address);
      setMessage({ text: 'Wallet connected!', type: 'success' });
    } catch (error) {
      console.error(error);
      setMessage({ text: 'Connection failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (contract, docContract, address) => {
    try {
      const balance = await docContract.balanceOf(address);
      setDocBalance(ethers.utils.formatEther(balance));

      const allowance = await docContract.allowance(address, CONTRACT_ADDRESS);
      setAllowance(ethers.utils.formatEther(allowance));

      const details = await contract.getSubscriptionDetails();
      setSubscription({
        subscriber: details[0],
        receiver: details[1],
        amount: ethers.utils.formatEther(details[2]),
        interval: details[3].toNumber() / 86400,
        nextDue: new Date(details[4].toNumber() * 1000).toLocaleString(),
        active: details[6]
      });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleApprove = async () => {
    if (!docContract) return;
    setLoading(true);
    try {
      const tx = await docContract.approve(CONTRACT_ADDRESS, ethers.utils.parseEther('100'));
      setTxHash(tx.hash);
      setMessage({ text: 'Approval sent! Waiting...', type: '' });
      await tx.wait();
      await loadData(contract, docContract, account);
      setMessage({ text: 'Approval successful!', type: 'success' });
    } catch (error) {
      setMessage({ text: 'Approval failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCharge = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const tx = await contract.charge();
      setTxHash(tx.hash);
      setMessage({ text: 'Charge sent! Waiting...', type: '' });
      await tx.wait();
      await loadData(contract, docContract, account);
      setMessage({ text: 'Payment charged!', type: 'success' });
    } catch (error) {
      setMessage({ text: 'Charge failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const tx = await contract.cancelSubscription();
      setTxHash(tx.hash);
      setMessage({ text: 'Cancel sent! Waiting...', type: '' });
      await tx.wait();
      await loadData(contract, docContract, account);
      setMessage({ text: 'Subscription cancelled!', type: 'success' });
    } catch (error) {
      setMessage({ text: 'Cancel failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const isSubscriber = subscription && subscription.subscriber.toLowerCase() === account?.toLowerCase();

  return (
    <div className="App">
      <header className="app-header">
        <div className="logo-container">
          <img 
            src="https://cryptologos.cc/logos/rootstock-rsv-logo.png" 
            alt="Rootstock" 
            className="logo rootstock-logo"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://raw.githubusercontent.com/rsksmart/rif-logos/master/rif-logo.png';
            }}
          />
          <span className="logo-plus">+</span>
          <div className="doc-logo">DOC</div>
        </div>
        <h1>DOC Subscription Manager</h1>
        <p className="subtitle">Automated Payments on Rootstock Testnet</p>
      </header>

      <main>
        {!account ? (
          <div className="connect-section">
            <button onClick={connectWallet} disabled={loading} className="connect-btn">
              {loading ? <ThreeDots height="20" width="20" color="white" /> : 'Connect MetaMask'}
            </button>
          </div>
        ) : (
          <>
            <div className="wallet-info glass-card">
              <div className="wallet-row">
                <span className="label">Wallet:</span>
                <span className="value address" onClick={() => navigator.clipboard.writeText(account)}>
                  {account.slice(0,6)}...{account.slice(-4)}
                </span>
              </div>
              <div className="wallet-row">
                <span className="label">DOC Balance:</span>
                <span className="value highlight">{parseFloat(docBalance).toFixed(2)} DOC</span>
              </div>
              <div className="wallet-row">
                <span className="label">Allowance:</span>
                <span className="value">{parseFloat(allowance).toFixed(2)} DOC</span>
              </div>
            </div>

            {subscription && (
              <div className="subscription-card glass-card">
                <h2>Subscription Details</h2>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="label">Status:</span>
                    <span className={`status-badge ${subscription.active ? 'active' : 'inactive'}`}>
                      {subscription.active ? '✅ Active' : '❌ Inactive'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Receiver:</span>
                    <span className="value address" onClick={() => navigator.clipboard.writeText(subscription.receiver)}>
                      {subscription.receiver.slice(0,6)}...{subscription.receiver.slice(-4)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Amount:</span>
                    <span className="value highlight">{subscription.amount} DOC</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Interval:</span>
                    <span className="value">{subscription.interval} days</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Next Due:</span>
                    <span className="value">{subscription.nextDue}</span>
                  </div>
                </div>

                {isSubscriber && (
                  <div className="action-buttons">
                    <button onClick={handleApprove} disabled={loading} className="action-btn approve">
                      {loading ? <ThreeDots height="16" width="16" color="white" /> : 'Approve 100 DOC'}
                    </button>
                    <button onClick={handleCharge} disabled={loading || !subscription.active} className="action-btn charge">
                      {loading ? <ThreeDots height="16" width="16" color="white" /> : 'Charge Payment'}
                    </button>
                    <button onClick={handleCancel} disabled={loading || !subscription.active} className="action-btn cancel">
                      {loading ? <ThreeDots height="16" width="16" color="white" /> : 'Cancel'}
                    </button>
                  </div>
                )}

                {!isSubscriber && subscription && (
                  <p className="note">You are not the subscriber of this contract</p>
                )}
              </div>
            )}

            {txHash && (
              <div className="tx-link glass-card">
                <a href={`https://explorer.testnet.rootstock.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                  View Transaction →
                </a>
              </div>
            )}
          </>
        )}

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>⚡ Non-custodial • Pull Payments • Rootstock Testnet ⚡</p>
      </footer>
    </div>
  );
}

export default App;