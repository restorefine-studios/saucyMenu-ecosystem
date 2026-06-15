export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // const pathname = usePathname();
  return <main className="pt-16 pb-4 h-screen">{children}</main>
}
