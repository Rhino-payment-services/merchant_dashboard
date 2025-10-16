import { useMutation, useQuery } from "@tanstack/react-query"
import axios from "axios"
import { API_URL } from '../config'

interface MerchantLoginRequest {
    phoneNumber: string
}

interface MerchantOTPRequest {
    phoneNumber: string
    otp: string
}

// Merchant login (send OTP)
const merchantLogin = async (data: MerchantLoginRequest) => {
    const response = await axios.post(`${API_URL}/auth/merchant/login`, data)
    return response.data
}

// Merchant OTP verification
const merchantVerifyOtp = async (data: MerchantOTPRequest) => {
    const response = await axios.post(`${API_URL}/auth/merchant/verify-otp`, data)
    return response.data
}

export const useMerchantLogin = () => useMutation({
    mutationKey: ['merchant-login'],
    mutationFn: merchantLogin
})

export const useMerchantVerifyOtp = () => useMutation({
    mutationKey: ['merchant-verify-otp'],
    mutationFn: merchantVerifyOtp
})

// Legacy functions for backward compatibility
interface validate {
    phoneNumber: string
}

const verifyPhoneNumber = async (data: validate) => {
    try {
        const response = await axios.post(`${API_URL}/merchant/verify-phone-number`, data)
        console.log("response=====>", response)
        return response.data
    } catch (error) {
        console.log("error=====>", error)
        throw error
    }
}

const verifyOtp = async (data: any) => {
    try {
        const response = await axios.post(`${API_URL}/merchant/verify-otp-and-phonenumber`, data)
        return response.data
    } catch (error) {
        console.log("error=====>", error)
        throw error
    }
}

export const useVerifyPhoneNumber = () => useMutation({
    mutationKey: ['verify-phone-number'],
    mutationFn: verifyPhoneNumber
})

export const useVerifyOtp = () => useMutation({
    mutationKey: ['verify-otp'],
    mutationFn: verifyOtp
})

export const useGetProfile = (id: string) => {
    return useQuery({
        queryKey: ['get-profile', id],
        queryFn: async () => {
            const response = await axios.post(`${API_URL}/merchant-profile`, {
                merchantId: id,
            });
            return response.data
        }
    })
}