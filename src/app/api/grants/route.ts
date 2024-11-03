import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	try {
		const data = await req.json();
		// We'll add grant functionality here later
		return NextResponse.json({ success: true });
	} catch (error) {
		console.log('🚀 ~ POST ~ error:', error);
		return NextResponse.json(
			{ error: 'Internal Server Error' },
			{ status: 500 }
		);
	}
}
