"use client"

import { useState } from "react"
import { Moon, Sun, Monitor, Bell, Download, Upload, Database } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export function Settings() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light")
  const [notifications, setNotifications] = useState({
    lowStock: true,
    email: false,
    browser: true,
  })

  const applyTheme = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme)
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark")
    } else if (newTheme === "light") {
      document.documentElement.classList.remove("dark")
    } else {
      // System preference
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }
  }

  const themes = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ] as const

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your application preferences</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appearance</CardTitle>
          <CardDescription>Customize how the app looks on your device</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTheme(t.id)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                  theme === t.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
                )}
              >
                <t.icon className={cn("h-5 w-5", theme === t.id ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium", theme === t.id ? "text-primary" : "text-muted-foreground")}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure how you want to be notified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="lowStock" className="text-sm font-medium">
                Low Stock Alerts
              </Label>
              <p className="text-sm text-muted-foreground">Get notified when items are running low</p>
            </div>
            <Switch
              id="lowStock"
              checked={notifications.lowStock}
              onCheckedChange={(checked) => setNotifications({ ...notifications, lowStock: checked })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">Receive alerts via email</p>
            </div>
            <Switch
              id="email"
              checked={notifications.email}
              onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="browser" className="text-sm font-medium">
                Browser Notifications
              </Label>
              <p className="text-sm text-muted-foreground">Show browser push notifications</p>
            </div>
            <Switch
              id="browser"
              checked={notifications.browser}
              onCheckedChange={(checked) => setNotifications({ ...notifications, browser: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>Export or import your inventory data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" className="flex-1 bg-transparent">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
            <Button variant="outline" className="flex-1 bg-transparent">
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Export your inventory as a CSV file or import data from an existing spreadsheet.
          </p>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium text-foreground">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="font-medium text-foreground">January 2026</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
