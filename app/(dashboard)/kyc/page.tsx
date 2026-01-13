"use client"

import React, { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ShieldCheck, 
  Upload, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle,
  Loader2,
  Eye,
  Trash2,
  RefreshCw,
  CreditCard,
  Building2,
  User,
  FileCheck
} from 'lucide-react'
import { toast } from 'sonner'
import { useUserProfile } from '../UserProfileProvider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/client'

interface KycDocument {
  id: string
  documentType: string
  documentNumber?: string
  documentUrl?: string
  originalName?: string
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED'
  uploadedAt: string
  verifiedAt?: string
  rejectionReason?: string
}

interface KycStatus {
  overallStatus: 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'PARTIALLY_VERIFIED'
  documents: KycDocument[]
  financialInfo?: {
    bankName?: string
    bankAccountNumber?: string
    mobileMoneyProvider?: string
    mobileMoneyNumber?: string
    status: 'PENDING' | 'VERIFIED' | 'REJECTED'
  }
}

const DOCUMENT_TYPES = [
  { 
    id: 'NATIONAL_ID', 
    name: 'National ID', 
    description: 'Front and back of your National ID card',
    required: true,
    icon: User
  },
  { 
    id: 'UTILITY_BILL', 
    name: 'Utility Bill', 
    description: 'Recent utility bill (water, electricity) for address verification',
    required: true,
    icon: Building2
  },
  { 
    id: 'BANK_STATEMENT', 
    name: 'Bank Statement', 
    description: 'Recent bank statement (last 3 months)',
    required: true,
    icon: CreditCard
  },
  { 
    id: 'BUSINESS_LICENSE', 
    name: 'Business License', 
    description: 'Valid business registration or trading license',
    required: false,
    icon: FileCheck
  },
  { 
    id: 'TAX_CERTIFICATE', 
    name: 'Tax Certificate', 
    description: 'TIN certificate or tax clearance document',
    required: false,
    icon: FileText
  }
]

export default function KycPage() {
  const { profile, loading: profileLoading } = useUserProfile()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('documents')
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Fetch KYC status from merchant-kyc/status endpoint
  const { data: kycStatus, isLoading: kycLoading, refetch: refetchKyc } = useQuery<KycStatus>({
    queryKey: ['kyc-status', profile?.merchantId],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/merchant-kyc/status')
        return response.data
      } catch (error: any) {
        // Return default status if not found or unauthorized
        if (error.response?.status === 404 || error.response?.status === 401) {
          return {
            overallStatus: 'NOT_STARTED',
            documents: []
          }
        }
        throw error
      }
    },
    enabled: !!profile?.merchantId,
    retry: false,
    staleTime: 30000 // 30 seconds
  })

  // Financial info state
  const [financialInfo, setFinancialInfo] = useState({
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    mobileMoneyProvider: '',
    mobileMoneyNumber: ''
  })

  // Upload document mutation - uses /documents/upload endpoint
  const uploadMutation = useMutation({
    mutationFn: async ({ documentType, file, documentNumber }: { documentType: string, file: File, documentNumber?: string }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType)
      if (documentNumber) {
        formData.append('documentNumber', documentNumber)
      }
      
      const response = await apiClient.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('Document uploaded successfully!')
      refetchKyc()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload document')
    }
  })

  // Update financial info mutation
  const updateFinancialMutation = useMutation({
    mutationFn: async (data: typeof financialInfo) => {
      const response = await apiClient.patch('/merchant-kyc/financial-info', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Financial information updated successfully!')
      refetchKyc()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update financial information')
    }
  })

  // Delete document mutation - uses /documents/:id endpoint
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiClient.delete(`/documents/${documentId}`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Document deleted successfully!')
      refetchKyc()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete document')
    }
  })

  const handleFileSelect = useCallback(async (documentType: string, file: File) => {
    if (!file) return
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed')
      return
    }

    setUploadingDocument(documentType)
    try {
      await uploadMutation.mutateAsync({ documentType, file })
    } finally {
      setUploadingDocument(null)
    }
  }, [uploadMutation])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending Review</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>
      case 'EXPIRED':
        return <Badge className="bg-gray-100 text-gray-800"><AlertCircle className="w-3 h-3 mr-1" /> Expired</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-600"><FileText className="w-3 h-3 mr-1" /> Not Uploaded</Badge>
    }
  }

  const getDocumentForType = (type: string) => {
    return kycStatus?.documents?.find(doc => doc.documentType === type)
  }

  const getOverallStatusColor = () => {
    switch (kycStatus?.overallStatus) {
      case 'VERIFIED':
        return 'bg-green-50 border-green-200'
      case 'PENDING':
      case 'PARTIALLY_VERIFIED':
        return 'bg-yellow-50 border-yellow-200'
      case 'REJECTED':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getOverallStatusMessage = () => {
    switch (kycStatus?.overallStatus) {
      case 'VERIFIED':
        return { message: 'Your KYC verification is complete', icon: CheckCircle, color: 'text-green-600' }
      case 'PENDING':
        return { message: 'Your documents are being reviewed', icon: Clock, color: 'text-yellow-600' }
      case 'PARTIALLY_VERIFIED':
        return { message: 'Some documents are verified, others pending', icon: AlertCircle, color: 'text-yellow-600' }
      case 'REJECTED':
        return { message: 'Some documents were rejected. Please re-upload', icon: XCircle, color: 'text-red-600' }
      default:
        return { message: 'Please upload your documents to complete verification', icon: Upload, color: 'text-gray-600' }
    }
  }

  const statusInfo = getOverallStatusMessage()
  const StatusIcon = statusInfo.icon

  if (profileLoading || kycLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-main-600" />
      </div>
    )
  }

  const requiredDocuments = DOCUMENT_TYPES.filter(d => d.required)
  const uploadedRequired = requiredDocuments.filter(d => {
    const doc = getDocumentForType(d.id)
    return doc && doc.status !== 'REJECTED'
  }).length
  const verificationProgress = Math.round((uploadedRequired / requiredDocuments.length) * 100)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">KYC Verification</h1>
        <p className="text-gray-600 mt-2">Complete your Know Your Customer verification to unlock all features</p>
      </div>

      {/* Status Overview */}
      <Card className={`mb-6 ${getOverallStatusColor()}`}>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${kycStatus?.overallStatus === 'VERIFIED' ? 'bg-green-100' : 'bg-gray-100'}`}>
                <StatusIcon className={`w-8 h-8 ${statusInfo.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{statusInfo.message}</h3>
                <p className="text-sm text-gray-500">
                  {uploadedRequired} of {requiredDocuments.length} required documents uploaded
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-main-600">{verificationProgress}%</div>
              <p className="text-sm text-gray-500">Complete</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-main-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${verificationProgress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Financial Info
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <div className="grid gap-4">
            {DOCUMENT_TYPES.map((docType) => {
              const uploadedDoc = getDocumentForType(docType.id)
              const DocIcon = docType.icon
              const isUploading = uploadingDocument === docType.id

              return (
                <Card key={docType.id} className={uploadedDoc?.status === 'REJECTED' ? 'border-red-200' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${uploadedDoc?.status === 'VERIFIED' ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <DocIcon className={`w-6 h-6 ${uploadedDoc?.status === 'VERIFIED' ? 'text-green-600' : 'text-gray-600'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{docType.name}</h4>
                            {docType.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                          </div>
                          <p className="text-sm text-gray-500">{docType.description}</p>
                          {uploadedDoc?.rejectionReason && (
                            <p className="text-sm text-red-600 mt-1">
                              <AlertCircle className="w-3 h-3 inline mr-1" />
                              Rejection reason: {uploadedDoc.rejectionReason}
                            </p>
                          )}
                          {uploadedDoc?.uploadedAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              Uploaded: {new Date(uploadedDoc.uploadedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {getStatusBadge(uploadedDoc?.status || 'NOT_UPLOADED')}
                        
                        {uploadedDoc?.documentUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(uploadedDoc.documentUrl, '_blank')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {uploadedDoc && uploadedDoc.status !== 'VERIFIED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteMutation.mutate(uploadedDoc.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                        
                        {(!uploadedDoc || uploadedDoc.status === 'REJECTED') && (
                          <>
                            <input
                              ref={el => { fileInputRefs.current[docType.id] = el }}
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleFileSelect(docType.id, file)
                                e.target.value = '' // Reset input
                              }}
                            />
                            <Button
                              onClick={() => fileInputRefs.current[docType.id]?.click()}
                              disabled={isUploading}
                              size="sm"
                            >
                              {isUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Upload className="w-4 h-4 mr-2" />
                              )}
                              {uploadedDoc ? 'Re-upload' : 'Upload'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Financial Info Tab */}
        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
              <CardDescription>
                Provide your bank and mobile money details for payouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault()
                updateFinancialMutation.mutate(financialInfo)
              }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={financialInfo.bankName}
                      onChange={(e) => setFinancialInfo(prev => ({ ...prev, bankName: e.target.value }))}
                      placeholder="e.g., Stanbic Bank"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountName">Account Name</Label>
                    <Input
                      id="bankAccountName"
                      value={financialInfo.bankAccountName}
                      onChange={(e) => setFinancialInfo(prev => ({ ...prev, bankAccountName: e.target.value }))}
                      placeholder="Account holder name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountNumber">Account Number</Label>
                    <Input
                      id="bankAccountNumber"
                      value={financialInfo.bankAccountNumber}
                      onChange={(e) => setFinancialInfo(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                      placeholder="Enter account number"
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">Mobile Money Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mobileMoneyProvider">Provider</Label>
                      <Input
                        id="mobileMoneyProvider"
                        value={financialInfo.mobileMoneyProvider}
                        onChange={(e) => setFinancialInfo(prev => ({ ...prev, mobileMoneyProvider: e.target.value }))}
                        placeholder="e.g., MTN, Airtel"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="mobileMoneyNumber">Mobile Money Number</Label>
                      <Input
                        id="mobileMoneyNumber"
                        value={financialInfo.mobileMoneyNumber}
                        onChange={(e) => setFinancialInfo(prev => ({ ...prev, mobileMoneyNumber: e.target.value }))}
                        placeholder="+256700000000"
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={updateFinancialMutation.isPending}>
                  {updateFinancialMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Save Financial Information
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refresh Button */}
      <div className="mt-6 flex justify-center">
        <Button variant="outline" onClick={() => refetchKyc()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Status
        </Button>
      </div>
    </div>
  )
}
