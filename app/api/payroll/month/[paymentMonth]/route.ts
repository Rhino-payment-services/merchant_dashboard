import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentMonth: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const accessToken = (session as any).accessToken;
    const { paymentMonth } = await params;

    if (!paymentMonth) {
      return NextResponse.json(
        { error: 'Payment month is required' },
        { status: 400 }
      );
    }

    // Fetch payroll batch by month from backend
    const response = await axios.get(`${API_URL}/payroll/month/${paymentMonth}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      validateStatus: (status) => status < 500 // Don't throw on 404
    });

    // Return null if 404 (no payroll found), otherwise return data
    if (response.status === 404 || !response.data) {
      return NextResponse.json(null, { status: 200 });
    }

    return NextResponse.json(response.data, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching payroll by month:', error);
    
    // Return null if no payroll found (404), otherwise return error
    if (error.response?.status === 404) {
      return NextResponse.json(null, { status: 200 });
    }
    
    // Return appropriate error response
    if (error.response) {
      return NextResponse.json(
        { error: error.response.data?.message || 'Failed to fetch payroll' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

