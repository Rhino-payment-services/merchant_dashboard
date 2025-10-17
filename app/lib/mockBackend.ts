// app/lib/mockBackend.ts
import { users, DEFAULT_OTP } from './mockData';

// Mock login API
export async function loginApi({ phone, pin }: { phone: string; pin: string }) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  // Match both phoneNumber and pin
  const user = users.find(u => u.phoneNumber === phone && u.pin === pin);
  if (user) {
    // Store customerId in sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('customerId', user.userId);
    }
    return { success: true, token: 'mock-token', user };
  } else {
    throw new Error('Invalid credentials');
  }
}

// OTP verification
export async function verifyOtpApi({ otp }: { otp: string }) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (otp === DEFAULT_OTP) {
    return { success: true };
  } else {
    throw new Error('Invalid OTP');
  }
}

// Session helpers
export function getCustomerId() {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('customerId');
  }
  return null;
}

export function removeCustomerId() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('customerId');
  }
}

// Add more mock API functions here as needed for other endpoints 