import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
import { Toaster } from 'sonner'
import appCss from '../styles.css?url'
import '../i18n'
import { useEffect } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import {
  getContext,
  Provider,
} from '@/integrations/tanstack-query/root-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { initPostHog } from '@/lib/posthog'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content:
          'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
      },
      {
        title: 'Saucy Menu',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  component: RootDocument,
})

function RootDocument() {
  useEffect(() => {
    initPostHog()
  }, [])

  return (
    <html lang="en" style={{ colorScheme: 'light' }}>
      <head>
        <HeadContent />
        <link
          rel="icon"
          type="image/png"
          href="/favicon/favicon-96x96.png"
          sizes="96x96"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
        <link rel="shortcut icon" href="/favicon/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/favicon/apple-touch-icon.png"
        />
        <meta name="apple-mobile-web-app-title" content="Saucy Menu" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <ThemeProvider>
          <Toaster richColors position="top-center" />

          {/* <TanStackDevtools
          config={{
            position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
                },
                TanStackQueryDevtools,
                ]}
                /> */}
          <Provider queryClient={getContext().queryClient as QueryClient}>
            <NuqsAdapter>
              <Outlet />
            </NuqsAdapter>
          </Provider>
          <Scripts />
        </ThemeProvider>
      </body>
    </html>
  )
}
