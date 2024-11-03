'use client';

import { FC, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

import { PublicKey } from '@solana/web3.js';

export const SendGrantForm: FC = () => {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const [recipientAddress, setRecipientAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendGrant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!publicKey) return;

        setLoading(true);
        try {
            // Will implement the actual sending logic in the next step
            alert(`Sending ${amount} PYUSD to ${recipientAddress}`);
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to send grant');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Send Grant</h2>
            <form onSubmit={handleSendGrant} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Recipient Address
                    </label>
                    <input
                        type="text"
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Amount (PYUSD)
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                        min="0"
                        step="0.1"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || !publicKey}
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                >
                    {loading ? 'Sending...' : 'Send Grant'}
                </button>
            </form>
        </div>
    );
};
