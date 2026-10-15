import { Link } from 'react-router-dom'

interface SiteFooterProps {
  className?: string
}

export function SiteFooter({ className = '' }: SiteFooterProps) {
  return (
    <footer className={['px-2 py-6 text-sm muted-copy', className].join(' ')}>
      <div className="grid gap-3 text-center sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="hidden sm:block" />
        <div>
          Made with ❤️ by{' '}
          <a
            href="https://x.com/MBrock29"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-reef transition hover:underline"
          >
            MBrock29
          </a>
        </div>
        <div className="flex items-center justify-center gap-4 sm:justify-self-end">
          <Link
            to="/privacy"
            className="font-semibold text-reef transition hover:underline"
          >
            Privacy policy
          </Link>
          <Link
            to="/contact"
            className="font-semibold text-reef transition hover:underline"
          >
            Help & feedback
          </Link>
        </div>
      </div>
    </footer>
  )
}
