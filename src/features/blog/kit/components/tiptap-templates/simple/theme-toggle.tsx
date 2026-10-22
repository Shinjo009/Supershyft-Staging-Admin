import { Button } from "../../tiptap-ui-primitive/button"

// --- Icons ---
import { MoonStarIcon } from "../../tiptap-icons/moon-star-icon"
import { SunIcon } from "../../tiptap-icons/sun-icon"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const root = document.querySelector(".story-rich-editor")
    if (!root) return
    root.classList.toggle("dark", isDarkMode)
    return () => root.classList.remove("dark")
  }, [isDarkMode])

  const toggleDarkMode = () => setIsDarkMode((isDark) => !isDark)

  return (
    <Button
      onClick={toggleDarkMode}
      aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      variant="ghost"
    >
      {isDarkMode ? (
        <MoonStarIcon className="tiptap-button-icon" />
      ) : (
        <SunIcon className="tiptap-button-icon" />
      )}
    </Button>
  )
}
