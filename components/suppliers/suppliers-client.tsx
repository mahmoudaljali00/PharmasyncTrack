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
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { toast } from 'sonner'
import {
  Truck,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Building2,
  Mail,
  Phone,
} from 'lucide-react'
import { SupplierFormDialog } from './supplier-form-dialog'

export type SupplierRow = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  company_name: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export function SuppliersClient() {
  const { t, locale } = useLocale()
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SupplierRow | null>(null)
  const [toDelete, setToDelete] = useState<SupplierRow | null>(null)

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/suppliers')
      if (res.ok) {
        const data = await res.json()
        setSuppliers(data.suppliers)
      }
    } catch (err) {
      console.error('[v0] Fetch suppliers error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const filtered = suppliers.filter((s) => {
    if (statusFilter === 'active' && !s.is_active) return false
    if (statusFilter === 'inactive' && s.is_active) return false
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      s.name.toLowerCase().includes(q) ||
      (s.email?.toLowerCase().includes(q) ?? false) ||
      (s.phone?.toLowerCase().includes(q) ?? false) ||
      (s.company_name?.toLowerCase().includes(q) ?? false)
    )
  })

  const handleToggleStatus = async (s: SupplierRow) => {
    try {
      const res = await fetch(`/api/suppliers/${s.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !s.is_active }),
      })
      if (res.ok) {
        toast.success(t('supplierUpdated'))
        fetchSuppliers()
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
      const res = await fetch(`/api/suppliers/${toDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(t('supplierDeleted'))
        fetchSuppliers()
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

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      dateStyle: 'medium',
    })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-balance flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            {t('suppliersManagement')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {suppliers.length} {t('suppliers').toLowerCase()}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4 me-2" />
          {t('addSupplier')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('suppliers')}</CardTitle>
          <CardDescription>{t('suppliersManagement')}</CardDescription>
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
                <Truck className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>{t('noSuppliers')}</EmptyTitle>
              <EmptyDescription>{t('addSupplier')}</EmptyDescription>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('name')}</TableHead>
                    <TableHead>{t('companyName')}</TableHead>
                    <TableHead>{t('phone')}</TableHead>
                    <TableHead>{t('email')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('createdAt')}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-sm">
                        {s.company_name ? (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5" />
                            {s.company_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.phone ? (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span dir="ltr">{s.phone}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.email ? (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[180px]">{s.email}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.is_active ? (
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
                        {formatDate(s.created_at)}
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
                                setEditing(s)
                                setFormOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4 me-2" />
                              {t('edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(s)}>
                              {s.is_active ? (
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
                              onClick={() => setToDelete(s)}
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

      <SupplierFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        supplier={editing}
        onSaved={fetchSuppliers}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteSupplier')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDeleteSupplier')}</AlertDialogDescription>
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
