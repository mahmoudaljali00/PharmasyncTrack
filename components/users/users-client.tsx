'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { toast } from 'sonner'
import {
  Users as UsersIcon,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Key,
  Activity,
  Receipt,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { UserFormDialog } from './user-form-dialog'
import { ResetPasswordDialog } from './reset-password-dialog'
import { ActivityLogDialog } from './activity-log-dialog'
import { UserSalesDialog } from './user-sales-dialog'

export type UserRow = {
  id: string
  email: string
  name: string
  role: 'admin' | 'pharmacist' | 'cashier'
  is_active: boolean
  last_login_at: string | null
  created_at: string
  sales_count: number
  total_sales: number
}

export function UsersClient({ currentUserId }: { currentUserId: string }) {
  const { t, locale } = useLocale()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetUser, setResetUser] = useState<UserRow | null>(null)
  const [activityOpen, setActivityOpen] = useState(false)
  const [activityUser, setActivityUser] = useState<UserRow | null>(null)
  const [salesOpen, setSalesOpen] = useState(false)
  const [salesUser, setSalesUser] = useState<UserRow | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('[pharmasync-track] Fetch users error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    )
  })

  const handleToggleActive = async (user: UserRow) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      })
      if (res.ok) {
        toast.success(t('userUpdated'))
        fetchUsers()
      } else {
        const data = await res.json()
        toast.error(data.error || t('error'))
      }
    } catch {
      toast.error(t('error'))
    }
  }

  const handleDelete = async () => {
    if (!deleteUser) return
    try {
      const res = await fetch(`/api/users/${deleteUser.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(t('userDeleted'))
        fetchUsers()
      } else {
        const data = await res.json()
        toast.error(data.error || t('error'))
      }
    } catch {
      toast.error(t('error'))
    } finally {
      setDeleteUser(null)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return t('never')
    return new Date(date).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const formatCurrency = (amount: number | string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value || 0)
  }

  const roleBadgeVariant = (role: string) => {
    if (role === 'admin') return 'default'
    if (role === 'pharmacist') return 'secondary'
    return 'outline'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-balance flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-primary" />
            {t('userManagement')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} {t('users').toLowerCase()}
          </p>
        </div>
        <Button onClick={() => { setEditingUser(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4 me-2" />
          {t('addUser')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('users')}</CardTitle>
          <CardDescription>{t('userManagement')}</CardDescription>
          <div className="relative mt-4">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
          ) : filteredUsers.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <UsersIcon className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>{t('noUsers')}</EmptyTitle>
              <EmptyDescription>{t('addUser')}</EmptyDescription>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('name')}</TableHead>
                    <TableHead>{t('email')}</TableHead>
                    <TableHead>{t('role')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('lastLogin')}</TableHead>
                    <TableHead className="text-end">{t('totalSales')}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{user.name}</div>
                            {user.id === currentUserId && (
                              <div className="text-xs text-muted-foreground">{t('welcomeBack')}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant(user.role)}>{t(user.role)}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-success">
                            <CheckCircle2 className="h-4 w-4" />
                            {t('active')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <XCircle className="h-4 w-4" />
                            {t('inactive')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.last_login_at)}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="font-medium">{formatCurrency(user.total_sales)}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.sales_count} {t('salesCount').toLowerCase()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">{t('actions')}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingUser(user); setFormOpen(true) }}>
                              <Edit className="h-4 w-4 me-2" />
                              {t('edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setResetUser(user); setResetOpen(true) }}>
                              <Key className="h-4 w-4 me-2" />
                              {t('resetPassword')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setActivityUser(user); setActivityOpen(true) }}>
                              <Activity className="h-4 w-4 me-2" />
                              {t('viewActivity')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSalesUser(user); setSalesOpen(true) }}>
                              <Receipt className="h-4 w-4 me-2" />
                              {t('viewSales')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.id !== currentUserId && (
                              <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                                {user.is_active ? (
                                  <>
                                    <XCircle className="h-4 w-4 me-2" />
                                    {t('deactivate')}
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 me-2" />
                                    {t('activate')}
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            {user.id !== currentUserId && (
                              <DropdownMenuItem
                                onClick={() => setDeleteUser(user)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 me-2" />
                                {t('delete')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser}
        onSaved={fetchUsers}
      />

      <ResetPasswordDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        user={resetUser}
      />

      <ActivityLogDialog
        open={activityOpen}
        onOpenChange={setActivityOpen}
        user={activityUser}
      />

      <UserSalesDialog
        open={salesOpen}
        onOpenChange={setSalesOpen}
        user={salesUser}
      />

      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteUser')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDeleteUser')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
