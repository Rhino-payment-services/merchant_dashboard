import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const accessToken = (session as any).accessToken;
    const body = await request.json();
    const { cycleId, paymentMonth } = body;

    if (!paymentMonth) {
      return NextResponse.json(
        { error: 'Payment month is required' },
        { status: 400 }
      );
    }

    // Initiate payroll batch via backend
    // If cycleId is not provided or is 'default-cycle-id', don't send it (backend will create/use default)
    const payload: any = {
      paymentMonth
    };
    
    if (cycleId && cycleId !== 'default-cycle-id') {
      payload.cycleId = cycleId;
    }

    const response = await axios.post(
      `${API_URL}/payroll/initiate`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return NextResponse.json(response.data, { status: 200 });
  } catch (error: any) {
    console.error('Error initiating payroll:', error);
    
    // Return appropriate error response
    if (error.response) {
      return NextResponse.json(
        { error: error.response.data?.message || 'Failed to initiate payroll' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

