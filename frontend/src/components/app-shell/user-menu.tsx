import { useNavigate } from 'react-router-dom'
import { ChevronsUpDown, LogOut } from 'lucide-react'

import { useAuth } from '@/auth/auth-context'
import { HashText } from '@/components/hash-text'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const name = user?.full_name || user?.username || ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center gap-2.5 rounded-lg text-left outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
          compact ? 'p-1' : 'w-full p-2',
        )}
        aria-label="Account menu"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 font-mono text-xs font-semibold text-primary">
          {initials(name) || '?'}
        </span>
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{name}</span>
              <span className="block truncate font-mono text-xs text-muted-foreground">@{user?.username}</span>
            </span>
            <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden="true" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? 'end' : 'start'} side={compact ? 'bottom' : 'top'} className="w-60">
        <DropdownMenuLabel className="space-y-1">
          <span className="block truncate">{name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
          {user?.id && (
            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              ID <HashText value={user.id} truncate={6} label="user ID" />
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            logout()
            navigate('/login', { replace: true })
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
