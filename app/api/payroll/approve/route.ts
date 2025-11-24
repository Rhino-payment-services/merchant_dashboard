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
    const { payrollBatchId, notes } = body;

    if (!payrollBatchId) {
      return NextResponse.json(
        { error: 'Payroll batch ID is required' },
        { status: 400 }
      );
    }

    // Approve payroll batch via backend
    const response = await axios.post(
      `${API_URL}/payroll/approve`,
      { 
        payrollBatchId,
        notes 
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return NextResponse.json(response.data, { status: 200 });
  } catch (error: any) {
    console.error('Error approving payroll:', error);
    
    // Return appropriate error response
    if (error.response) {
      return NextResponse.json(
        { error: error.response.data?.message || 'Failed to approve payroll' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

