'use client';

import { Connection, LAMPORTS_PER_SOL, PublicKey, Transaction } from '@solana/web3.js';
import { FiCheck, FiCopy } from 'react-icons/fi';
import React, { Suspense, useEffect, useState } from 'react';
import { TOKEN_2022_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { useRouter, useSearchParams } from 'next/navigation';

import { GrantsClient } from '../../lib/client';
import { WalletButton } from '../../components/WalletButton';
import { useWallet } from '@solana/wallet-adapter-react';

const RPC_ENDPOINT = 'https://api.devnet.solana.com';
const PYUSD_MINT = new PublicKey('CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM');

interface GrantFormData {
    easeliteId: string;
    amount: string;
    reason: string;
}

interface GrantApplication {
    easeliteId: string;
    amount: string;
    reason: string;
    solanaAddress: string;
    studentPyusdAddress: string;
}

function StudentRequestContent() {
    const searchParams = useSearchParams();
    const verifiedId = searchParams.get('id');
    const verifiedName = searchParams.get('name');
    const { publicKey, signTransaction } = useWallet();
    const router = useRouter();
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [client, setClient] = useState<GrantsClient | null>(null);
    const [tokenAccount, setTokenAccount] = useState<PublicKey | null>(null);
    const [tokenBalance, setTokenBalance] = useState<number | null>(null);
    const [solBalance, setSolBalance] = useState<number | null>(null);
    const [checkingAccounts, setCheckingAccounts] = useState(true);
    const [copyStatus, setCopyStatus] = useState<{[key: string]: boolean}>({});
    const [formData, setFormData] = useState<GrantFormData>({
        easeliteId: verifiedId || '',
        amount: '',
        reason: ''
    });

    useEffect(() => {
        if (!verifiedId || !verifiedName) {
            router.push('/student');
        }
    }, [verifiedId, verifiedName, router]);

    useEffect(() => {
        if (publicKey) {
            initializeClient();
        }
   
    }, [publicKey]);

    const handleCopy = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopyStatus({ ...copyStatus, [key]: true });
            setTimeout(() => {
                setCopyStatus({ ...copyStatus, [key]: false });
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const initializeClient = async () => {
        try {
            setCheckingAccounts(true);
            const connection = new Connection(RPC_ENDPOINT);
            const newClient = new GrantsClient(connection, null);
            setClient(newClient);
    
            if (publicKey) {
                const solBalanceAmount = await connection.getBalance(publicKey);
                setSolBalance(solBalanceAmount / LAMPORTS_PER_SOL);

                const tokenAddress = getAssociatedTokenAddressSync(
                    PYUSD_MINT,
                    publicKey,
                    false,
                    TOKEN_2022_PROGRAM_ID
                );

                const accountInfo = await connection.getAccountInfo(tokenAddress);
                if (accountInfo) {
                    setTokenAccount(tokenAddress);
                    const balance = await newClient.getBalance(tokenAddress);
                    setTokenBalance(balance ? Number(balance) / 1_000_000 : 0);
                }
            }
        } catch (err) {
            console.error('Error initializing:', err);
            setError('Failed to initialize. Please try again.');
        } finally {
            setCheckingAccounts(false);
        }
    };

    const createPyusdAccount = async () => {
        if (!publicKey || !signTransaction) return;
        
        try {
            setError(null);
            setCheckingAccounts(true);
            const connection = new Connection(RPC_ENDPOINT);
    
            const tokenAccountAddress = getAssociatedTokenAddressSync(
                PYUSD_MINT,
                publicKey,
                false,
                TOKEN_2022_PROGRAM_ID
            );
    
            const createAccountInstruction = createAssociatedTokenAccountInstruction(
                publicKey,
                tokenAccountAddress,
                publicKey,
                PYUSD_MINT,
                TOKEN_2022_PROGRAM_ID
            );
    
            const transaction = new Transaction();
            transaction.add(createAccountInstruction);
            
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;
            transaction.feePayer = publicKey;

            const signedTx = await signTransaction(transaction);
    
            const signature = await connection.sendRawTransaction(signedTx.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
                maxRetries: 5
            });
    
            const confirmation = await connection.confirmTransaction({
                blockhash,
                lastValidBlockHeight,
                signature
            }, 'confirmed');
    
            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
            }
    
            setTokenAccount(tokenAccountAddress);
            setTokenBalance(0);
    
        } catch (err) {
            console.error('Error creating PYUSD account:', err);
            setError(err instanceof Error ? err.message : 'Failed to create PYUSD account');
        } finally {
            setCheckingAccounts(false);
        }
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!publicKey || !client || !tokenAccount) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (!formData.amount || !formData.reason) {
                throw new Error('Please fill in all fields');
            }

            if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
                throw new Error('Please enter a valid amount');
            }

            const grantApplication: GrantApplication = {
                easeliteId: formData.easeliteId,
                amount: formData.amount,
                reason: formData.reason,
                solanaAddress: publicKey.toString(),
                studentPyusdAddress: tokenAccount.toString()
            };

            const response = await fetch('https://api.easelite.com/general/grants/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(grantApplication)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to submit grant application');
            }

            setSuccess('Grant request submitted successfully! Please wait for admin approval.');
            setFormData(prev => ({
                ...prev,
                amount: '',
                reason: ''
            }));
        } catch (err) {
            console.error('Error submitting request:', err);
            setError(err instanceof Error ? err.message : 'Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
            <nav className="bg-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-gray-900">Grant Request Portal</h1>
                        </div>
                        <WalletButton />
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-white shadow-xl rounded-xl p-8">
                    {/* Student Info Card */}
                    <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Verified Student Information</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-500">Student Name</p>
                                <p className="text-lg font-semibold text-gray-900">{verifiedName}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-500">Easelite ID</p>
                                <p className="text-lg font-semibold text-gray-900">{verifiedId}</p>
                            </div>
                        </div>
                    </div>

                    {/* Wallet Information */}
                    <div className="mb-8 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">Wallet Information</h3>
                        <div className="space-y-6">
                            {/* Solana Address */}
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-500">Solana Address</p>
                                <div className="flex items-center space-x-2">
                                    <code className="text-sm bg-white px-3 py-1 rounded-lg border border-gray-200 flex-1 overflow-x-auto">
                                        {publicKey?.toString() || 'Not connected'}
                                    </code>
                                    {publicKey && (
                                        <button
                                            onClick={() => handleCopy(publicKey.toString(), 'solana')}
                                            className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                                            title="Copy address"
                                        >
                                            {copyStatus['solana'] ? <FiCheck /> : <FiCopy />}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* PYUSD Address */}
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-500">PYUSD Address</p>
                                <div className="flex items-center space-x-2">
                                    <code className="text-sm bg-white px-3 py-1 rounded-lg border border-gray-200 flex-1 overflow-x-auto">
                                        {tokenAccount?.toString() || 'Not created'}
                                    </code>
                                    {tokenAccount && (
                                        <button
                                            onClick={() => handleCopy(tokenAccount.toString(), 'pyusd')}
                                            className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                                            title="Copy address"
                                        >
                                            {copyStatus['pyusd'] ? <FiCheck /> : <FiCopy />}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Balances */}
                            <div className="grid md:grid-cols-2 gap-6 pt-2">
                                <div className="bg-white p-4 rounded-lg border border-gray-200">
                                    <p className="text-sm font-medium text-gray-500">SOL Balance</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        {solBalance !== null ? `${solBalance.toFixed(4)} SOL` : 'Loading...'}
                                    </p>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-gray-200">
                                    <p className="text-sm font-medium text-gray-500">PYUSD Balance</p>
                                    {tokenAccount ? (
                                        <p className="text-lg font-semibold text-gray-900">
                                            {tokenBalance !== null ? `${tokenBalance.toFixed(2)} PYUSD` : 'Loading...'}
                                        </p>
                                    ) : (
                                        <button
                                            onClick={createPyusdAccount}
                                            disabled={checkingAccounts}
                                            className="mt-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 transition-colors"
                                        >
                                            Create PYUSD Account
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Grant Request Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                                Request Amount (PYUSD)
                            </label>
                            <input
                                type="number"
                                id="amount"
                                name="amount"
                                value={formData.amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                                placeholder="Enter amount in PYUSD"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                                Reason for Request
                            </label>
                            <textarea
                                id="reason"
                                name="reason"
                                value={formData.reason}
                                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                                rows={4}
                                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                                placeholder="Please explain why you need this grant..."
                                required
                            />
                        </div>

                        {error && (
                            <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                                <p className="text-sm text-green-700">{success}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !tokenAccount}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </span>
                            ) : (
                                'Submit Grant Request'
                            )}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}

export default function StudentRequest() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <StudentRequestContent />
        </Suspense>
    );
}
