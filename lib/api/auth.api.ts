import { useMutation, useQuery } from "@tanstack/react-query"
import axios from "axios"

const merchantUrl = process.env.NEXT_PUBLIC_MERCHANT_URL

interface validate {
    phoneNumber: string
}
const verifyPhoneNumber = async (data: validate)=>{
    try {
        const response = await axios.post(`${merchantUrl}/merchant/verify-phone-number`, data)
        console.log("response=====>", response)
        return response.data
        
    } catch (error) {
        console.log(error)
        throw error
        
    }
}

export const useVerifyPhoneNumber =()=>{
    return useMutation({
        mutationKey: ['verify-phone-number'],
        mutationFn:  verifyPhoneNumber
    })
}

const verifyOtp = async()=>{
    const response = await  axios.post(`${merchantUrl}/merchant/verify-otp-and-phonenumber`)
    return response.data
}

export const useVerifyOtp = ()=>{
    useMutation({
        mutationKey: ['verify-otp'],
        mutationFn: verifyOtp
    })
}


export const useGetProfile = (id:string)=>{
    useQuery({
        queryKey: ['get-profile',id],
        queryFn: async()=>{
            const response = await axios.post(`${merchantUrl}/merchant-profile`, {
                merchantId: id,
              });
              return response.data
        }
    })
}

