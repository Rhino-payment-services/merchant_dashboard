import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const accessToken = (session as any).accessToken;
    
    // Get merchantId from business wallet first
    let merchantId = null;
    
    try {
      // Fetch business wallet to get merchantId
      const walletResponse = await axios.get(`${API_URL}/wallet/me/business`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });
      
      merchantId = walletResponse.data?.merchantId || walletResponse.data?.merchant?.id;
      
      console.log('📊 Payroll API - Got merchantId from wallet:', merchantId);
    } catch (walletError: any) {
      console.error('Error fetching business wallet:', walletError.response?.data);
      return NextResponse.json(
        { error: 'Unable to access business wallet. Please ensure you have a business wallet.' },
        { status: 400 }
      );
    }

    if (!merchantId) {
      return NextResponse.json(
        { error: 'Merchant ID not found in business wallet' },
        { status: 400 }
      );
    }

    // Fetch approved payrolls from backend
    const response = await axios.get(`${API_URL}/payroll/payments/approved`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      params: {
        merchantId
      }
    });

    return NextResponse.json(response.data, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching approved payrolls:', error.response?.data || error.message);
    
    // Return appropriate error response
    if (error.response) {
      return NextResponse.json(
        { error: error.response.data?.message || 'Failed to fetch approved payrolls' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

