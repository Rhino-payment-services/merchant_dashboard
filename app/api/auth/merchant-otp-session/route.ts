import { NextResponse } from 'next/server'
import { getApiUrl } from '@/lib/config'
import { normalizeMerchantPortalPhone } from '@/lib/auth/merchantOtpPhone'
import type { MerchantVerifyOtpResponse } from '@/lib/auth/merchantOtpUser'
import {
  createMerchantSessionToken,
  getNextAuthSessionCookieName,
  MERCHANT_SESSION_MAX_AGE,
} from '@/lib/auth/merchantSession'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const phoneNumber = normalizeMerchantPortalPhone(body?.phoneNumber || '')
    const otp = String(body?.otp || '').replace(/\D/g, '').trim()

    if (!phoneNumber || otp.length !== 6) {
      return NextResponse.json(
        { success: false, message: 'Phone number and 6-digit OTP are required' },
        { status: 400 },
      )
    }

    const verifyResponse = await fetch(`${getApiUrl()}/auth/merchant/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, otp }),
    })

    const rawText = await verifyResponse.text()
    let verifyData: MerchantVerifyOtpResponse = {}
    if (rawText.trim()) {
      try {
        verifyData = JSON.parse(rawText) as MerchantVerifyOtpResponse
      } catch {
        return NextResponse.json(
          {
            success: false,
            message: verifyResponse.ok
              ? 'Invalid response from server'
              : `Server error ${verifyResponse.status}`,
          },
          { status: 502 },
        )
      }
    }

    if (!verifyResponse.ok || !verifyData.success) {
      const message =
        (typeof verifyData.message === 'string' && verifyData.message) ||
        'Invalid OTP. Please try again.'
      return NextResponse.json({ success: false, message }, { status: 401 })
    }

    const sessionToken = await createMerchantSessionToken(verifyData)
    const response = NextResponse.json({ success: true })
    response.cookies.set(getNextAuthSessionCookieName(), sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: MERCHANT_SESSION_MAX_AGE,
    })

    return response
  } catch (error) {
    console.error('[merchant-otp-session]', error)
    const message = error instanceof Error ? error.message : 'OTP verification failed'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
