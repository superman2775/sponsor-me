import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

/**
 * CONFIGURATION
 * Replace this address with your actual Polygon wallet address
 */
const MY_WALLET_ADDRESS = "0x9d2bBc9397F59ac888BF9F12359f1BEa55297C1C";
const POLYGON_CHAIN_ID = "0x89";
const USD_TO_POL_RATE = 1; // Mock rate: 1 USD = 1 POL

function App() {
  const [account, setAccount] = useState(null);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState({ message: "Ready to connect", type: "" });
  const [isLoading, setIsLoading] = useState(false);

  const updateStatus = (message, type = "") => {
    setStatus({ message, type });
  };

  const handleQuickSelect = (val) => {
    setAmount(val);
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      updateStatus("Please install MetaMask", "error");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const userAccount = accounts[0];
      setAccount(userAccount);

      // Network Switch
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: POLYGON_CHAIN_ID }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: POLYGON_CHAIN_ID,
              chainName: 'Polygon Mainnet',
              nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
              rpcUrl: 'https://polygon-rpc.com',
              blockExplorerUrl: 'https://polygonscan.com'
            }],
          });
        } else {
          throw switchError;
        }
      }

      updateStatus(`Connected: ${userAccount.substring(0,6)}...${userAccount.substring(38)}`);
    } catch (err) {
      console.error(err);
      updateStatus("Connection failed", "error");
    }
  };

  const handlePayment = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      updateStatus("Please enter a valid amount", "error");
      return;
    }

    try {
      setIsLoading(true);
      updateStatus("Processing...");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const polAmount = numAmount * USD_TO_POL_RATE;
      const valueWei = ethers.parseEther(polAmount.toString());

      const tx = await signer.sendTransaction({
        to: MY_WALLET_ADDRESS,
        value: valueWei
      });

      updateStatus("Waiting for confirmation...");
      await tx.wait();

      updateStatus("Payment successful!", "success");
    } catch (err) {
      console.error(err);
      const errorMsg = err.reason || err.message || "Transaction failed";
      updateStatus(errorMsg.includes("user rejected") ? "User rejected transaction" : errorMsg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const actionBtnText = () => {
    if (isLoading) return "Processing...";
    if (!account) return "Connect MetaMask";
    if (!amount) return "Enter amount to pay";
    return `Pay $${amount} POL`;
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-5 font-sans text-white">
      <div className="bg-[#1e293b] w-full max-w-sm p-8 rounded-[24px] shadow-2xl border border-[#334155] text-center">

        {/* Quick Select */}
        <div className="flex gap-2 justify-center mb-5">
          {['5', '15', '50'].map((val) => (
            <button
              key={val}
              onClick={() => handleQuickSelect(val)}
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                amount === val
                ? 'bg-[#8b5cf6] text-white border-[#8b5cf6]'
                : 'bg-[#0f172a] text-white border-[#334155] hover:border-[#8b5cf6] hover:text-[#8b5cf6]'
              } border`}
            >
              ${val}
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <div className="mb-6">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            className="w-full bg-[#0f172a] border border-[#334155] text-white p-4 rounded-xl text-lg text-center outline-none focus:border-[#8b5cf6] transition-colors"
          />
        </div>

        {/* Primary Action */}
        <button
          onClick={account ? handlePayment : connectWallet}
          disabled={isLoading}
          className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-60 disabled:grayscale disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-base transition-all active:scale-[0.98] mb-5"
        >
          {actionBtnText()}
        </button>

        {/* Status Area */}
        <div className={`min-h-[24px] text-xs transition-colors duration-300 ${
          status.type === 'success' ? 'text-[#4ade80]' :
          status.type === 'error' ? 'text-[#f87171]' : 'text-[#94a3b8]'
        }`}>
          {status.message}
        </div>
      </div>
    </div>
  );
}

export default App;
