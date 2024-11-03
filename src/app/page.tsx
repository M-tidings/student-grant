'use client';

import Link from 'next/link';

export default function Home() {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="max-w-md w-full space-y-8 p-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">Student Grants Portal</h1>
                    <p className="mt-2 text-gray-600">Select your role to continue</p>
                </div>
                <div className="space-y-4">
                    <Link 
                        href="/student"
                        className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Access as Student
                    </Link>
                    <Link 
                        href="/admin"
                        className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                        Access as Grant Admin
                    </Link>
                </div>
            </div>
        </div>
    );
}
