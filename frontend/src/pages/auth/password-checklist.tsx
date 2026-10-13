import { Check } from 'lucide-react'

import { PASSWORD_RULES, passwordTooLong } from '@/auth/rules'
import { cn } from '@/lib/utils'

export function PasswordChecklist({ password, id }: { password: string; id?: string }) {
  return (
    <ul id={id} className="grid grid-cols-1 gap-1.5 sm:grid-cols-3" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password)
        return (
          <li
            key={rule.id}
            className={cn('flex items-center gap-1.5 text-xs transition-colors', met ? 'text-success' : 'text-muted-foreground')}
          >
            <span
              className={cn(
                'flex size-4 items-center justify-center rounded-full border transition-colors',
                met ? 'border-success/50 bg-success/15' : 'border-border',
              )}
              aria-hidden="true"
            >
              {met && <Check className="size-2.5" />}
            </span>
            {rule.label}
            <span className="sr-only">{met ? '(met)' : '(not met)'}</span>
          </li>
        )
      })}
      {passwordTooLong(password) && (
        <li className="text-xs text-destructive sm:col-span-3">Too long: passwords are limited to 72 bytes.</li>
      )}
    </ul>
  )
}
