'use client';

import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

export function WalletButton() {
    const { publicKey } = useWallet();

    return (
        <div className="flex justify-end p-4">
            <WalletMultiButton className="btn" />
        </div>
    );
}
