'use client';

import { WalletButton } from '../components/WalletButton';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface VerificationResponse {
    data: {
        success: boolean;
        studentDetails: {
            name: string;
            easeliteId?: string;
            // Add other student details as needed
        };
    };
}

export default function StudentPage() {
    const { publicKey } = useWallet();
    const router = useRouter();
    const [easeliteId, setEaseliteId] = useState('');
    const [loading, setLoading] = useState(false);
    const [verified, setVerified] = useState(false);

    const verifyStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const response = await fetch('https://api.easelite.com/general/easeId/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ easeliteId: easeliteId }),
            });

            const data: VerificationResponse = await response.json();
            
            if (data.data.success) {
                setVerified(true);
                // Pass both easeliteId and name in the URL
                router.push(`/student/request?id=${easeliteId}&name=${encodeURIComponent(data.data.studentDetails.name)}`);
            } else {
                alert('Invalid student ID. Please check and try again.');
            }
        } catch (error) {
            console.error('Verification failed:', error);
            alert('Student verification failed. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between h-16 items-center">
                        <h1 className="text-xl font-bold">Student Verification</h1>
                        <WalletButton />
                    </div>
                </div>
            </nav>

            <main className="max-w-md mx-auto mt-10 px-4">
                {publicKey ? (
                    <div className="bg-white shadow rounded-lg p-6">
                        <form onSubmit={verifyStudent} className="space-y-4">
                            <div>
                                <label htmlFor="easeliteId" className="block text-sm font-medium text-gray-700 mb-2">
                                    Easelite ID
                                </label>
                                <input
                                    id="easeliteId"
                                    type="text"
                                    value={easeliteId}
                                    onChange={(e) => setEaseliteId(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                                    placeholder="Enter your Easelite ID"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !easeliteId}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Verifying...
                                    </span>
                                ) : 'Verify Student Status'}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white shadow rounded-lg">
                        <h2 className="text-xl mb-4">Connect Your Wallet</h2>
                        <p className="text-gray-600 mb-4">
                            You need to connect your Solana wallet to continue
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
