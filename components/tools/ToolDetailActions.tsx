'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { MoreHorizontal, Pencil, Trash2, ClipboardList } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import CheckoutModal from '@/components/checkouts/CheckoutModal'
import ReturnButton from '@/components/checkouts/ReturnButton'

interface Props {
  tool: { id: string; name: string; type?: string; currentStock: number; totalStock: number }
  singleActiveCheckout?: { id: string; status: string } | null
}

export default function ToolDetailActions({ tool, singleActiveCheckout }: Props) {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const router = useRouter()
  const role = session?.user?.role || ''
  const isAdmin = role === 'ADMIN'
  const isManager = role === 'MANAGER'
  const isForeman = role === 'FOREMAN'
  const isMaterial = tool.type === 'MATERIAL'

  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) { setMenuOpen(false); setConfirmDelete(false) }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/tools/${tool.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) router.push('/tools')
  }

  return (
    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
      {(isAdmin || isManager) && (
        <div ref={menuRef} className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
              {confirmDelete ? (
                <button onClick={handleDelete} disabled={deleting} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
                  {deleting ? '…' : t('confirmQuestion')}
                </button>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  <Trash2 size={14} />{t('delete')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <Link href={`/tools/${tool.id}/edit`} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <Pencil size={14} />{t('edit')}
        </Link>
      )}

      {singleActiveCheckout ? (
        <ReturnButton checkoutId={singleActiveCheckout.id} status={singleActiveCheckout.status} />
      ) : isForeman ? (
        <Link href={`/requests/new?toolId=${tool.id}`} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
          <ClipboardList size={15} />{t(isMaterial ? 'requestMaterial' : 'requestTool')}
        </Link>
      ) : tool.currentStock > 0 ? (
        <button onClick={() => setCheckoutOpen(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
          <ClipboardList size={15} />{t(isMaterial ? 'useItem' : 'checkOut')}
        </button>
      ) : null}

      {checkoutOpen && (
        <CheckoutModal
          tool={tool}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={() => { setCheckoutOpen(false); router.refresh() }}
        />
      )}
    </div>
  )
}
