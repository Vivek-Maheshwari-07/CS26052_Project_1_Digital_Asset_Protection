import { LayoutGrid, ScanSearch, UploadCloud } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean }

export const APP_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/works/new', label: 'Protect an asset', icon: UploadCloud },
  { to: '/check', label: 'Check a copy', icon: ScanSearch },
]
