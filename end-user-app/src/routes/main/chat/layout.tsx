export default function ChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <main className="overflow-y-hidden p-0">{children}</main>
}
