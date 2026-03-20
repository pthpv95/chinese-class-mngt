import type { Metadata } from "next"
import Script from "next/script";
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "next-auth/react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "汉语学习 · Chinese Learning",
    template: "%s · 汉语学习",
  },
  description:
    "Practice Chinese with your teacher — listen, speak, and master exercises assigned just for you.",
  openGraph: {
    title: "汉语学习 · Chinese Learning",
    description:
      "Practice Chinese with your teacher — listen, speak, and master exercises assigned just for you.",
    type: "website",
    locale: "en_US",
    siteName: "汉语学习 Chinese Learning",
  },
  twitter: {
    card: "summary_large_image",
    title: "汉语学习 · Chinese Learning",
    description:
      "Practice Chinese with your teacher — listen, speak, and master exercises assigned just for you.",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
