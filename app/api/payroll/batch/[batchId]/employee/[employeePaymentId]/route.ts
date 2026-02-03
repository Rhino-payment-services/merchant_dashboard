import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string; employeePaymentId: string }> }
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
    const { batchId, employeePaymentId } = await params;

    if (!batchId || !employeePaymentId) {
      return NextResponse.json(
        { error: 'Batch ID and Employee Payment ID are required' },
        { status: 400 }
      );
    }

    // Remove employee from payroll batch via backend
    const response = await axios.delete(
      `${API_URL}/payroll/batch/${batchId}/employee/${employeePaymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    );

    return NextResponse.json(response.data, { status: 200 });
  } catch (error: any) {
    console.error('Error removing employee from batch:', error.response?.data || error.message);
    
    // Return appropriate error response
    if (error.response) {
      return NextResponse.json(
        { error: error.response.data?.message || 'Failed to remove employee from batch' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
















