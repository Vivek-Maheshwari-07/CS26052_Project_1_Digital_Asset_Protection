import { Brand } from '@/components/brand'

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-2">
          <Brand />
          <p className="max-w-sm text-sm text-muted-foreground">
            Fingerprint your images, record them in a tamper-evident registry and check suspected copies.
          </p>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          CS26052 · Digital Asset Protection
        </p>
      </div>
    </footer>
  )
}
