import type { StaticImageData } from "next/image";

import merchantPaymentsImage from "@/public/images/login-1.png";
import checkoutImage from "@/public/images/login-2.png";
import teamImage from "@/public/images/login-3.png";

export type AuthSlide = {
  image: StaticImageData;
  alt: string;
  label: string;
  title: string;
};

export const authSlides: AuthSlide[] = [
  {
    image: merchantPaymentsImage,
    alt: "A café owner confirming a customer payment on her phone at the counter",
    label: "For Merchants",
    title: "Accept payments and track every sale in real time.",
  },
  {
    image: checkoutImage,
    alt: "A customer paying at a boutique counter by scanning a RukaPay QR code",
    label: "Fast Checkout",
    title: "QR and mobile money payments your customers trust.",
  },
  {
    image: teamImage,
    alt: "A business team reviewing sales performance together on a laptop",
    label: "For Teams",
    title: "Give your team secure access to run the business.",
  },
];
