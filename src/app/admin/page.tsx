'use client';

import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction } from '@solana/web3.js';
import React, { useEffect, useState } from 'react';
import {
    TOKEN_2022_PROGRAM_ID,
    createAssociatedTokenAccount,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    getAssociatedTokenAddressSync,
} from '@solana/spl-token';

import { GrantsClient } from '../lib/client';
import { WalletButton } from '../components/WalletButton';

const RPC_ENDPOINT = 'https://api.devnet.solana.com';


// Admin wallet configuration
const ADMIN_SECRET_KEY = new Uint8Array([60,75,171,71,80,65,28,208,88,150,70,83,236,46,85,214,180,99,35,114,48,11,218,196,106,200,158,37,220,150,34,34,145,79,113,118,10,235,90,251,189,202,164,133,100,240,223,221,246,186,182,23,25,22,122,170,234,69,24,244,205,77,121,244]); // You'll need to add this
const ADMIN_KEYPAIR = Keypair.fromSecretKey(ADMIN_SECRET_KEY);
const ADMIN_PUBLIC_KEY = ADMIN_KEYPAIR.publicKey;
const PYUSD_MINT = new PublicKey('CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM');

// Admin wallet adapter for client
const adminWallet = {
    publicKey: ADMIN_PUBLIC_KEY,
    signTransaction: async (tx: any) => {
        tx.sign(ADMIN_KEYPAIR);
        return tx;
    },
    signAllTransactions: async (txs: any[]) => {
        return txs.map(tx => {
            tx.sign(ADMIN_KEYPAIR);
            return tx;
        });
    }
};

interface GrantRequest {
    id: number;
    easeliteId: string;
    reason: string;
    amount: string;
    pyusdAddress: string;
    status: 'pending' | 'approved' | 'rejected';
    walletAddress: string;
    timestamp: string;
}

export default function AdminDashboard() {
    const [grantRequests, setGrantRequests] = useState<GrantRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [client, setClient] = useState<GrantsClient | null>(null);
    const [solBalance, setSolBalance] = useState<number | null>(null);
    const [pyusdBalance, setPyusdBalance] = useState<number | null>(null);
    const [pyusdAccount, setPyusdAccount] = useState<PublicKey | null>(null);
    const [checkingAccounts, setCheckingAccounts] = useState(true);

    const connection = new Connection(RPC_ENDPOINT);

    useEffect(() => {
        initializeAdmin();
        fetchGrantRequests();
    }, []);

    const initializeAdmin = async () => {
        try {
            setCheckingAccounts(true);
            const newClient = new GrantsClient(connection, adminWallet);
            setClient(newClient);

            // Get SOL balance
            const solBalanceAmount = await connection.getBalance(ADMIN_PUBLIC_KEY);
            setSolBalance(solBalanceAmount / LAMPORTS_PER_SOL);

            // Get PYUSD token account
            const tokenAddress = getAssociatedTokenAddressSync(
                PYUSD_MINT,
                ADMIN_PUBLIC_KEY,
                false,
                TOKEN_2022_PROGRAM_ID
            );

            // Check if token account exists
            const accountInfo = await connection.getAccountInfo(tokenAddress);
            if (accountInfo) {
                setPyusdAccount(tokenAddress);
                const balance = await newClient.getBalance(tokenAddress);
                setPyusdBalance(balance ? Number(balance) / 1_000_000 : 0);
            }
        } catch (err) {
            console.error('Error initializing admin:', err);
            setError('Failed to initialize admin account');
        } finally {
            setCheckingAccounts(false);
        }
    };

    
    const createPyusdAccount = async () => {
        try {
            setError(null);
            setCheckingAccounts(true);
    
            // Get the associated token account address
            const tokenAccountAddress = getAssociatedTokenAddressSync(
                PYUSD_MINT,
                ADMIN_PUBLIC_KEY,
                false,
                TOKEN_2022_PROGRAM_ID
            );
    
            // Create the instruction
            const createAccountInstruction = createAssociatedTokenAccountInstruction(
                ADMIN_PUBLIC_KEY, // payer
                tokenAccountAddress, // associated token account address
                ADMIN_PUBLIC_KEY, // owner
                PYUSD_MINT, // mint
                TOKEN_2022_PROGRAM_ID // program id
            );
    
            // Create transaction
            const transaction = new Transaction();
            
            // Add instruction
            transaction.add(createAccountInstruction);
            
            // Get latest blockhash and properly set it
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;
            transaction.feePayer = ADMIN_PUBLIC_KEY;
    
            // Sign transaction
            transaction.sign(ADMIN_KEYPAIR);
    
            // Send transaction with preflight checks enabled
            const signature = await connection.sendRawTransaction(transaction.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
                maxRetries: 5
            });
    
            console.log('Transaction sent:', signature);
    
            // Wait for confirmation with timeout and retry
            const confirmation = await connection.confirmTransaction({
                blockhash,
                lastValidBlockHeight,
                signature
            }, 'confirmed');
    
            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
            }
    
            setPyusdAccount(tokenAccountAddress);
            setPyusdBalance(0);
    
            console.log('PYUSD account created successfully:', tokenAccountAddress.toString());
    
        } catch (err) {
            console.error('Error creating PYUSD account:', err);
            // More detailed error message
            if (err instanceof Error) {
                setError(`Failed to create PYUSD account: ${err.message}`);
            } else {
                setError('Failed to create PYUSD account: Unknown error');
            }
        } finally {
            setCheckingAccounts(false);
        }
    };
    
    // Wrapper function with retries
    const createPyusdAccountWithRetry = async () => {
        const maxRetries = 3;
        let lastError;
    
        for (let i = 0; i < maxRetries; i++) {
            try {
                await createPyusdAccount();
                return; // Success
            } catch (err) {
                console.log(`Attempt ${i + 1} failed, retrying...`);
                lastError = err;
                // Wait longer between each retry
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
        
        // If we get here, all retries failed
        throw lastError;
    };
    
 

    const fetchGrantRequests = async () => {
        try {
            // Mock data for demonstration
            const mockRequests: GrantRequest[] = [
                {
                    id: 1,
                    easeliteId: 'EAS123',
                    reason: 'Textbook expenses',
                    amount: '2',
                    pyusdAddress: 'DEDkXAFDcoc7rbxZ1k5G6qCgtwXLeDu6CLszsyXTbptj',
                    status: 'pending',
                    walletAddress: 'FbCp61RpoRcU9SafVXsb3xRh4QNs9nvjWqFG3dqtgTwT',
                    timestamp: new Date().toISOString()
                },
                {
                    id: 2,
                    easeliteId: 'EAS124',
                    reason: 'Laboratory fees',
                    amount: '3',
                    pyusdAddress: 'DEDkXAFDcoc7rbxZ1k5G6qCgtwXLeDu6CLszsyXTbptj',
                    status: 'pending',
                    walletAddress: 'FbCp61RpoRcU9SafVXsb3xRh4QNs9nvjWqFG3dqtgTwT',
                    timestamp: new Date().toISOString()
                }
            ];
            
            setGrantRequests(mockRequests);
        } catch (err) {
            setError('Failed to fetch grant requests');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveGrant = async (request: GrantRequest) => {
        if (!client || !pyusdAccount) return;
        
        setProcessingId(request.id);
        setError(null);
        
        try {
            // Get or create student token account
            const studentTokenAccount = await client.getOrCreateStudentAccount(
                new PublicKey(request.walletAddress)
            );
            
            // Convert amount from string to number (assumed to be in PYUSD)
            const amount = Math.floor(parseFloat(request.amount) * 1_000_000);
            
            // Check if admin has enough balance
            if (pyusdBalance !== null && amount / 1_000_000 > pyusdBalance) {
                throw new Error('Insufficient PYUSD balance');
            }
            
            // Send the grant using admin wallet
            const tx = await client.sendGrant(
                pyusdAccount,
                studentTokenAccount,
                amount
            );
            
            // Update the UI
            setGrantRequests(prevRequests =>
                prevRequests.map(r =>
                    r.id === request.id ? { ...r, status: 'approved' } : r
                )
            );
            
            // Refresh admin balance
            const newBalance = await client.getBalance(pyusdAccount);
            setPyusdBalance(newBalance ? Number(newBalance) / 1_000_000 : 0);
            
        } catch (err) {
            console.error('Error approving grant:', err);
            setError(err instanceof Error ? err.message : 'Failed to approve grant');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between h-16 items-center">
                        <h1 className="text-xl font-bold">Grant Admin Portal</h1>
                        <WalletButton />
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Admin Account Information Card */}
                <div className="bg-white shadow rounded-lg mb-6 p-6">
                    <h2 className="text-lg font-medium mb-4">Admin Account Information</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-500">Solana Address</p>
                            <p className="font-mono bg-gray-50 p-2 rounded break-all">
                                {ADMIN_PUBLIC_KEY.toString()}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <div className="bg-blue-50 rounded-md p-3 min-w-[200px]">
                                <p className="text-sm text-gray-500">SOL Balance</p>
                                <p className="text-lg font-medium">
                                    {solBalance !== null ? `${solBalance.toFixed(4)} SOL` : 'Loading...'}
                                </p>
                            </div>

                            <div className="bg-green-50 rounded-md p-3 min-w-[200px]">
                                <p className="text-sm text-gray-500">PYUSD Balance</p>
                                <p className="text-lg font-medium">
                                    {pyusdBalance !== null ? `${pyusdBalance.toFixed(2)} PYUSD` : 'Not Available'}
                                </p>
                            </div>
                        </div>

                        {pyusdAccount ? (
                            <div>
                                <p className="text-sm text-gray-500">PYUSD Token Account</p>
                                <p className="font-mono bg-gray-50 p-2 rounded break-all">
                                    {pyusdAccount.toString()}
                                </p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-red-500 mb-2">No PYUSD token account detected</p>
                                <button
                                    onClick={createPyusdAccountWithRetry}
                                    disabled={checkingAccounts}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                                >
                                    {checkingAccounts ? 'Checking...' : 'Create PYUSD Account'}
                                </button>

                                
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
                        {error}
                    </div>
                )}

                {/* Grant Requests Table */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-4 py-5 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-medium text-gray-900">Grant Requests</h2>
                            <button 
                                onClick={fetchGrantRequests}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>
                    
                    {loading ? (
                        <div className="text-center py-4">Loading...</div>
                    ) : grantRequests.length === 0 ? (
                        <div className="text-center py-4">No grant requests found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Easelite ID
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Reason
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount (PYUSD)
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {grantRequests.map((request) => (
                                        <tr key={request.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {request.easeliteId}
                                            </td>
                                            <td className="px-6 py-4">
                                                {request.reason}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {request.amount}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    request.status === 'approved' 
                                                        ? 'bg-green-100 text-green-800'
                                                        : request.status === 'rejected'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {request.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {request.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleApproveGrant(request)}
                                                        disabled={processingId === request.id || !pyusdAccount}
                                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                                                    >{processingId === request.id ? 'Processing...' : 'Approve'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

