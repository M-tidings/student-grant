// src/lib/adminWallet.ts
import { Keypair } from '@solana/web3.js';

// Method 1: Using Environment Variables (for development)
export const getAdminKeypair = () => {
	if (!process.env.ADMIN_PRIVATE_KEY) {
		throw new Error('Admin private key not found in environment variables');
	}

	const privateKeyArray = JSON.parse(process.env.ADMIN_PRIVATE_KEY);
	return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
};

// Your admin wallet private key array
