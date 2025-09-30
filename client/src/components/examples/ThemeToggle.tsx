import { ThemeToggle } from '../theme-toggle'

export default function ThemeToggleExample() {
  return (
    <div className="flex items-center gap-4 p-6">
      <span className="text-sm text-muted-foreground">Toggle theme:</span>
      <ThemeToggle />
    </div>
  )
}
