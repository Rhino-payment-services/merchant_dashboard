"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from 'next-auth/react';
import { getBulkTransactionList } from '@/lib/api/bulk-payment.api';

export default function DebugBulkTransactions() {
  const { data: session } = useSession();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testBulkTransactions = async () => {
    if (!session?.user) {
      setDebugInfo({ error: 'No session found' });
      return;
    }

    setLoading(true);
    try {
      console.log('Testing bulk transactions API...');
      console.log('User ID:', (session.user as any).id);
      
      const response = await getBulkTransactionList({
        page: 1,
        limit: 10,
        userId: (session.user as any).id
      });
      
      console.log('API Response:', response);
      
      setDebugInfo({
        success: true,
        user: session.user,
        response: response,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('API Error:', error);
      setDebugInfo({
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Debug Bulk Transactions API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testBulkTransactions} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Testing...' : 'Test Bulk Transactions API'}
            </Button>
            
            {debugInfo && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Debug Information:</h3>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
