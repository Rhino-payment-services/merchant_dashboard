import { Outfit } from 'next/font/google'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export default function ReceivePaymentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`${outfit.className} min-h-screen bg-white antialiased [&_button]:font-[inherit] [&_input]:font-[inherit] [&_label]:font-[inherit]`}
    >
      {children}
    </div>
  )
}
