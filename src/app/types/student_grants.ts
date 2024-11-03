export type StudentGrants = {
	address: 'HTdqKnFUFR85iRbWJxU4xEZHjWCMbpxFRbQcUuANdodB';
	metadata: {
		name: 'student_grants';
		version: '0.1.0';
		spec: '0.1.0';
		description: 'Created with Anchor';
	};
	instructions: [
		{
			name: 'initialize_program';
			discriminator: [176, 107, 205, 168, 24, 157, 175, 103];
			accounts: [
				{
					name: 'program_state';
					writable: true;
					signer: true;
				},
				{
					name: 'admin';
					writable: true;
					signer: true;
				},
				{
					name: 'system_program';
					address: '11111111111111111111111111111111';
				}
			];
			args: [];
		},
		{
			name: 'initialize_student_account';
			discriminator: [179, 206, 173, 28, 213, 243, 33, 85];
			accounts: [
				{
					name: 'student';
					writable: true;
					signer: true;
				},
				{
					name: 'student_token';
					writable: true;
				},
				{
					name: 'pyusd_mint';
				},
				{
					name: 'token_program';
					address: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
				},
				{
					name: 'payer';
					writable: true;
					signer: true;
				},
				{
					name: 'program_state';
				},
				{
					name: 'system_program';
					address: '11111111111111111111111111111111';
				}
			];
			args: [];
		},
		{
			name: 'send_grant';
			discriminator: [149, 121, 153, 2, 188, 104, 202, 21];
			accounts: [
				{
					name: 'donor_token';
					writable: true;
				},
				{
					name: 'student_token';
					writable: true;
				},
				{
					name: 'pyusd_mint';
				},
				{
					name: 'donor';
					writable: true;
					signer: true;
				},
				{
					name: 'program_state';
				},
				{
					name: 'token_program';
					address: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
				}
			];
			args: [
				{
					name: 'amount';
					type: 'u64';
				}
			];
		},
		{
			name: 'set_pause_state';
			discriminator: [130, 225, 63, 203, 229, 214, 138, 17];
			accounts: [
				{
					name: 'program_state';
					writable: true;
				},
				{
					name: 'admin';
					signer: true;
				}
			];
			args: [
				{
					name: 'pause';
					type: 'bool';
				}
			];
		},
		{
			name: 'view_balance';
			discriminator: [238, 91, 28, 156, 233, 125, 98, 222];
			accounts: [
				{
					name: 'token_account';
				}
			];
			args: [];
			returns: 'u64';
		}
	];
	accounts: [
		{
			name: 'ProgramState';
			discriminator: [77, 209, 137, 229, 149, 67, 167, 230];
		}
	];
	errors: [
		{
			code: 6000;
			name: 'InvalidAmount';
			msg: 'Transfer amount must be greater than 0';
		},
		{
			code: 6001;
			name: 'ProgramPaused';
			msg: 'Program is currently paused';
		},
		{
			code: 6002;
			name: 'InsufficientBalance';
			msg: 'Insufficient balance for transfer';
		},
		{
			code: 6003;
			name: 'NotAdmin';
			msg: 'Only admin can perform this action';
		}
	];
	types: [
		{
			name: 'ProgramState';
			type: {
				kind: 'struct';
				fields: [
					{
						name: 'admin';
						type: 'pubkey';
					},
					{
						name: 'paused';
						type: 'bool';
					}
				];
			};
		}
	];
};
