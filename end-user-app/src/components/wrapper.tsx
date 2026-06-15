export function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className={`pt-6 px-8 max-w-7xl mx-auto `}>
      <div className="max-w-3xl mx-auto">{children}</div>
    </div>
  )
}
