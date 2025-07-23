"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="flex items-center space-x-2">
      <Sun className="h-5 w-5" />
      <Switch
        id="theme-switch"
        checked={theme === 'dark'}
        onCheckedChange={toggleTheme}
      />
      <Moon className="h-5 w-5" />
      <Label htmlFor="theme-switch" className="sr-only">
        Toggle theme
      </Label>
    </div>
  )
}
