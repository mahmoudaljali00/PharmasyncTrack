'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  UserRound,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Receipt,
  Mail,
  Phone,
} from 'lucide-react'
import { CustomerFormDialog } from './customer-form-dialog'
import { CustomerPurchasesDialog } from './customer-purchases-dialog'

export type CustomerRow = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  date_of_birth: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  purchase_count: number
  total_spent: number | string
}

export function CustomersClient() {
  const { t, locale } = useLocale()
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerRow | null>(null)
  const [toDelete, setToDelete] = useState<CustomerRow | null>(null)
  const [purchasesOpen, setPurchasesOpen] = useState(false)
  const [purchasesCustomer, setPurchasesCustomer] = useState<CustomerRow | null>(null)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/customers')
      if (res.ok) {
        const data = await res.json()
        setCustomers(data.customers)
      }
    } catch (err) {
      console.error('[v0] Fetch customers error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const filtered = customers.filter((c) => {
    if (statusFilter === 'active' && !c.is_active) return false
    if (statusFilter === 'inactive' && c.is_active) return false
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.phone?.toLowerCase().includes(q) ?? false)
    )
  })

  const handleToggleStatus = async (c: CustomerRow) => {
    try {
      const res = await fetch(`/api/customers/${c.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !c.is_active }),
      })
      if (res.ok) {
        toast.success(t('customerUpdated'))
        fetchCustomers()
      } else {
        const data = await res.json()
        toast.error(data.error || t('error'))
      }
    } catch {
      toast.error(t('error'))
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      const res = await fetch(`/api/customers/${toDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(t('customerDeleted'))
        fetchCustomers()
      } else {
        const data = await res.json()
        toast.error(data.error || t('error'))
      }
    } catch {
      toast.error(t('error'))
    } finally {
      setToDelete(null)
    }
  }

  const formatCurrency = (amount: number | string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value || 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-balance flex items-center gap-2">
            <UserRound className="h-6 w-6 text-primary" />
            {t('customersManagement')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {customers.length} {t('customers').toLowerCase()}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4 me-2" />
          {t('addCustomer')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('customers')}</CardTitle>
          <CardDescription>{t('customersManagement')}</CardDescription>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="active">{t('activeOnly')}</SelectItem>
                <SelectItem value="inactive">{t('inactiveOnly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
          ) : filtered.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <UserRound className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>{t('noCustomers')}</EmptyTitle>
              <EmptyDescription>{t('addCustomer')}</EmptyDescription>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('name')}</TableHead>
                    <TableHead>{t('phone')}</TableHead>
                    <TableHead>{t('email')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-end">{t('totalSpent')}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                              {c.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{c.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.phone ? (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span dir="ltr">{c.phone}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.email ? (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[180px]">{c.email}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.is_active ? (
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
                      <TableCell className="text-end">
                        <div className="font-medium">{formatCurrency(c.total_spent)}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.purchase_count} {t('purchaseCount').toLowerCase()}
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
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(c)
                                setFormOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4 me-2" />
                              {t('edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setPurchasesCustomer(c)
                                setPurchasesOpen(true)
                              }}
                            >
                              <Receipt className="h-4 w-4 me-2" />
                              {t('viewPurchases')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(c)}>
                              {c.is_active ? (
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setToDelete(c)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 me-2" />
                              {t('delete')}
                            </DropdownMenuItem>
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

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
        onSaved={fetchCustomers}
      />

      <CustomerPurchasesDialog
        open={purchasesOpen}
        onOpenChange={setPurchasesOpen}
        customer={purchasesCustomer}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteCustomer')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDeleteCustomer')}</AlertDialogDescription>
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
