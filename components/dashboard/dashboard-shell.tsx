'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/contexts/locale-context'
import { useAuth } from '@/contexts/auth-context'
import { useSettings } from '@/contexts/settings-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  BarChart3,
  Boxes,
  Settings,
  Menu,
  LogOut,
  Globe,
  Pill,
  ChevronRight,
  Wifi,
  WifiOff,
  Users,
  Truck,
  UserRound,
} from 'lucide-react'
import { useOnlineStatus } from '@/hooks/use-online-status'

type User = {
  id: string
  email: string
  name: string
  role: 'admin' | 'pharmacist' | 'cashier'
}

type NavItem = {
  href: string
  icon: typeof LayoutDashboard
  labelKey:
    | 'dashboard'
    | 'products'
    | 'pos'
    | 'sales'
    | 'inventory'
    | 'reports'
    | 'users'
    | 'suppliers'
    | 'customers'
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { href: '/dashboard/products', icon: Package, labelKey: 'products' },
  { href: '/dashboard/pos', icon: ShoppingCart, labelKey: 'pos' },
  { href: '/dashboard/sales', icon: Receipt, labelKey: 'sales' },
  { href: '/dashboard/inventory', icon: Boxes, labelKey: 'inventory' },
  { href: '/dashboard/reports', icon: BarChart3, labelKey: 'reports' },
  { href: '/dashboard/suppliers', icon: Truck, labelKey: 'suppliers', adminOnly: true },
  { href: '/dashboard/customers', icon: UserRound, labelKey: 'customers', adminOnly: true },
  { href: '/dashboard/users', icon: Users, labelKey: 'users', adminOnly: true },
]

export function DashboardShell({ 
  children, 
  user 
}: { 
  children: React.ReactNode
  user: User 
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { t, locale, setLocale, isRTL } = useLocale()
  const { logout } = useAuth()
  const settings = useSettings()
  const isOnline = useOnlineStatus()

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'ar' : 'en')
  }

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || user.role === 'admin')

  const NavLinks = ({ onItemClick }: { onItemClick?: () => void }) => (
    <nav className="flex flex-col gap-1 px-3">
      {visibleNavItems.map((item) => {
        const isActive = pathname === item.href || 
          (item.href !== '/dashboard' && pathname.startsWith(item.href))
        const Icon = item.icon
        
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span>{t(item.labelKey)}</span>
            {isActive && (
              <ChevronRight className={cn(
                "h-4 w-4 ms-auto",
                isRTL && "rotate-180"
              )} />
            )}
          </Link>
        )
      })}
    </nav>
  )

  const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center overflow-hidden">
          {settings.pharmacy_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.pharmacy_logo_url}
              alt=""
              className="w-full h-full object-contain"
            />
          ) : (
            <Pill className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-lg text-sidebar-foreground truncate">
            {settings.pharmacy_name}
          </h1>
          <p className="text-xs text-muted-foreground">{t(user.role)}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 overflow-y-auto">
        <NavLinks onItemClick={onItemClick} />
      </div>

      {/* Settings */}
      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/dashboard/settings"
          onClick={onItemClick}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            pathname === '/dashboard/settings'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          <span>{t('settings')}</span>
        </Link>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-e lg:border-sidebar-border lg:bg-sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side={isRTL ? 'right' : 'left'} className="w-64 p-0 bg-sidebar">
          <SidebarContent onItemClick={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
          {/* Mobile Menu Button */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
          </Sheet>

          {/* Online Status */}
          <div className={cn(
            "flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium",
            isOnline 
              ? "bg-success/10 text-success" 
              : "bg-warning/10 text-warning"
          )}>
            {isOnline ? (
              <>
                <Wifi className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('online')}</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('offline')}</span>
              </>
            )}
          </div>

          <div className="flex-1" />

          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLocale}
            className="gap-2"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">
              {locale === 'en' ? 'العربية' : 'English'}
            </span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm font-medium">
                  {user.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user.name}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="h-4 w-4 me-2" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
