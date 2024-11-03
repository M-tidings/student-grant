// src/lib/client.ts
import { AnchorProvider, Idl, Program } from '@project-serum/anchor';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import {
	TOKEN_2022_PROGRAM_ID,
	createAssociatedTokenAccountIdempotent,
	createTransferCheckedInstruction,
	getAssociatedTokenAddress,
} from '@solana/spl-token';

import { StudentGrants } from '../types/student_grants';

export class GrantsClient {
	private program: Program;
	private connection: Connection;
	private PROGRAM_ID = new PublicKey(
		'HTdqKnFUFR85iRbWJxU4xEZHjWCMbpxFRbQcUuANdodB'
	);
	private PYUSD_MINT = new PublicKey(
		'CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM'
	);

	constructor(
		connection: Connection,
		wallet: any // Will be either admin or student wallet
	) {
		this.connection = connection;

		// Create provider
		const provider = new AnchorProvider(connection, wallet, {
			commitment: 'confirmed',
		});

		// Initialize program
		this.program = new Program(this.getIDL2(), this.PROGRAM_ID, provider);
	}

private getIDL(): Idl {
    return {
        version: '0.1.0',
        name: 'student_grants',
        instructions: [
            {
                name: 'initialize_program',
                accounts: [
                    {
                        name: 'program_state',
                        isMut: true,
                        isSigner: true
                    },
                    {
                        name: 'admin',
                        isMut: true,
                        isSigner: true
                    },
                    {
                        name: 'system_program',
                        isMut: false,
                        isSigner: false
                    }
                ],
                args: []
            },
            {
                name: 'send_grant',
                accounts: [
                    {
                        name: 'donor_token',
                        isMut: true,
                        isSigner: false
                    },
                    {
                        name: 'student_token',
                        isMut: true,
                        isSigner: false
                    },
                    {
                        name: 'pyusd_mint',
                        isMut: false,
                        isSigner: false
                    },
                    {
                        name: 'donor',
                        isMut: true,
                        isSigner: true
                    },
                    {
                        name: 'program_state',
                        isMut: false,
                        isSigner: false
                    },
                    {
                        name: 'token_program',
                        isMut: false,
                        isSigner: false
                    }
                ],
                args: [
                    {
                        name: 'amount',
                        type: 'u64'
                    }
                ]
            }
        ],
        accounts: [
            {
                name: 'ProgramState',
                type: {
                    kind: 'struct',
                    fields: [
                        {
                            name: 'admin',
                            type: 'pubkey'
                        },
                        {
                            name: 'paused',
                            type: 'bool'
                        }
                    ]
                }
            }
        ],
        errors: [
            {
                code: 6000,
                name: 'InvalidAmount',
                msg: 'Transfer amount must be greater than 0'
            },
            {
                code: 6001,
                name: 'ProgramPaused',
                msg: 'Program is currently paused'
            },
            {
                code: 6002,
                name: 'InsufficientBalance',
                msg: 'Insufficient balance for transfer'
            },
            {
                code: 6003,
                name: 'NotAdmin',
                msg: 'Only admin can perform this action'
            }
        ]
    } as Idl;
}

	private getIDL2(): Idl {
		return {
			version: '0.1.0',
			name: 'student_grants',
			instructions: [
				{
					name: 'initialize_program',
					accounts: [
						{
							name: 'program_state',
							isMut: true,
							isSigner: true,
						},
						{
							name: 'admin',
							isMut: true,
							isSigner: true,
						},
						{
							name: 'system_program',
							isMut: false,
							isSigner: false,
						},
					],
					args: [],
				},
				{
					name: 'send_grant',
					accounts: [
						{
							name: 'donor_token',
							isMut: true,
							isSigner: false,
						},
						{
							name: 'student_token',
							isMut: true,
							isSigner: false,
						},
						{
							name: 'pyusd_mint',
							isMut: false,
							isSigner: false,
						},
						{
							name: 'donor',
							isMut: true,
							isSigner: true,
						},
						{
							name: 'program_state',
							isMut: false,
							isSigner: false,
						},
						{
							name: 'token_program',
							isMut: false,
							isSigner: false,
						},
					],
					args: [
						{
							name: 'amount',
							type: 'u64',
						},
					],
				},
			],
		} as Idl;
	}

	// Initialize or get student's PYUSD token account
	async getOrCreateStudentAccount(
		studentPubkey: PublicKey
	): Promise<PublicKey> {
		try {
			return await getAssociatedTokenAddress(
				this.PYUSD_MINT,
				studentPubkey,
				false,
				TOKEN_2022_PROGRAM_ID
			);
		} catch (error) {
			console.error('Error getting student account:', error);
			throw error;
		}
	}

	// Get PYUSD balance for any account
	// async getBalance(tokenAccount: PublicKey) {
	// 	try {
	// 		return await this.program.methods
	// 			.view_balance()
	// 			.accounts({
	// 				token_account: tokenAccount,
	// 			})
	// 			.view();
	// 	} catch (error) {
	// 		console.error('Error getting balance:', error);
	// 		throw error;
	// 	}
	// }

	async getBalance(tokenAccount: PublicKey) {
    try {
        const accountInfo = await this.connection.getTokenAccountBalance(tokenAccount);
        return BigInt(accountInfo.value.amount);
    } catch (error) {
        console.error('Error getting balance:', error);
        throw error;
    }
}

	// Admin function to send grant
	// async sendGrant(
	// 	adminTokenAccount: PublicKey,
	// 	studentTokenAccount: PublicKey,
	// 	amount: number
	// ): Promise<string> {
	// 	console.log("🚀 ~ GrantsClient ~ studentTokenAccount:", studentTokenAccount)
	// 	console.log("🚀 ~ GrantsClient ~ adminTokenAccount:", adminTokenAccount)
	// 	try {
	// 		// Get program state PDA
	// 		const [programState] = PublicKey.findProgramAddressSync(
	// 			[Buffer.from('state')],
	// 			this.PROGRAM_ID
	// 		);

	// 		const tx = await this.program.methods
	// 			.send_grant(amount)
	// 			.accounts({
	// 				donor_token: adminTokenAccount,
	// 				student_token: studentTokenAccount,
	// 				pyusd_mint: this.PYUSD_MINT,
	// 				donor: this.program.provider.publicKey,
	// 				program_state: programState,
	// 				token_program: TOKEN_2022_PROGRAM_ID,
	// 			})
	// 			.rpc();

	// 		// Wait for confirmation
	// 		await this.connection.confirmTransaction(tx, 'confirmed');
	// 		return tx;
	// 	} catch (error) {
	// 		console.error('Error sending grant:', error);
	// 		throw error;
	// 	}
	// }

async sendGrant(
    adminTokenAccount: PublicKey,
    studentTokenAccount: PublicKey,
    amount: number
): Promise<string> {
    try {
        if (!this.program.provider) {
            throw new Error('Provider not initialized');
        }

        const transferIx = createTransferCheckedInstruction(
            adminTokenAccount,           
            this.PYUSD_MINT,            
            studentTokenAccount,         
            this.program.provider.publicKey!, // Add non-null assertion
            amount,                      
            6,                          
            [],                         
            TOKEN_2022_PROGRAM_ID       
        );

        const transaction = new Transaction().add(transferIx);
        
        // Type assertion to AnchorProvider
        const provider = this.program.provider as AnchorProvider;
        const tx = await provider.sendAndConfirm(transaction);
        
        return tx;
    } catch (error) {
        console.error('Error sending grant:', error);
        throw error;
    }
}
	

	// Helper function to get admin's token account
	async getAdminTokenAccount(adminPubkey: PublicKey): Promise<PublicKey> {
		return await getAssociatedTokenAddress(
			this.PYUSD_MINT,
			adminPubkey,
			false,
			TOKEN_2022_PROGRAM_ID
		);
	}

	// Helper to check if an account exists
	async checkAccountExists(pubkey: PublicKey): Promise<boolean> {
		const accountInfo = await this.connection.getAccountInfo(pubkey);
		return accountInfo !== null;
	}
}
