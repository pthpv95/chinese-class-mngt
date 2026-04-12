import type { Metadata } from "next"
import Script from "next/script";
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "next-auth/react"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, getLocale } from "next-intl/server"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "EduFlow · Learning Platform",
    template: "%s · EduFlow",
  },
  description:
    "Practice with your teacher — listen, speak, and master exercises assigned just for you.",
  openGraph: {
    title: "EduFlow · Learning Platform",
    description:
      "Practice with your teacher — listen, speak, and master exercises assigned just for you.",
    type: "website",
    locale: "vi_VN",
    siteName: "EduFlow",
  },
  twitter: {
    card: "summary_large_image",
    title: "EduFlow · Learning Platform",
    description:
      "Practice with your teacher — listen, speak, and master exercises assigned just for you.",
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Theme init — must run before body paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');var p=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(!t&&p))document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/@react-grab/mcp/dist/client.global.js"
            strategy="lazyOnload"
          />
        )}
      </head>
      <body className={`${inter.className} bg-rose-50 dark:bg-gray-950`}>
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>{children}</SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
