import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else {
      setTheme('light')
    }
  }

  // const getIcon = () => {
  //   if (theme === 'light') {
  //     return <Sun className="h-4 w-4" />
  //   } else if (theme === 'dark') {
  //     return <Moon className="h-4 w-4" />
  //   } else {
  //     return <Monitor className="h-4 w-4" />
  //   }
  // }

  const getLabel = () => {
    if (theme === 'light') {
      return 'Light'
    } else {
      return 'Dark'
    }
  }

  return (
    <Button
      variant="toggle"
      size="sm"
      onClick={cycleTheme}
      className={cn(className)}
      aria-label={`Toggle theme. Current: ${getLabel()}`}
      title={`Current theme: ${getLabel()}. Click to cycle app theme.`}
    >
      <div className={` flex items-center gap-2`}>
        <div
          className={` ${theme === 'light' && 'bg-white rounded-full h-5 w-5 text-black flex items-center justify-center gap-2'}`}
        >
          <Sun className={` h-4 w-4`} />
        </div>

        <div
          className={` ${theme === 'dark' && 'bg-white rounded-full h-5 w-5 text-black flex items-center justify-center gap-2'}`}
        >
          <Moon className={`  h-4 w-4`} />
        </div>
        {/* <Monitor className="h-4 w-4" /> */}
      </div>
      {/* {getIcon()} */}
    </Button>
  )
}
