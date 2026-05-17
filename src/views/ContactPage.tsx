import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

const contactEmail = 'mbrock19@gmail.com'

function buildMailtoUrl(input: { name: string; email: string; message: string }) {
  const subject = input.name
    ? `Better Focus contact from ${input.name}`
    : 'Better Focus contact'

  const body = [
    input.name ? `Name: ${input.name}` : null,
    input.email ? `Email: ${input.email}` : null,
    '',
    input.message,
  ]
    .filter(Boolean)
    .join('\n')

  return `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    window.location.href = buildMailtoUrl({ name, email, message })
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <section className="panel px-6 py-8 sm:px-10">
          <p className="section-kicker">Contact</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink dark:text-white sm:text-4xl">
            Get in touch
          </h1>
          <p className="muted-copy mt-4 text-sm leading-6 sm:text-base">
            Send a question, bug report, or launch enquiry. This form opens your email app
            with a message addressed to {contactEmail}.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Name
              </span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                className="app-input"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="app-input"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Message
              </span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="How can I help?"
                className="app-input min-h-[180px] resize-y"
                required
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button type="submit" className="action-button">
                Open email draft
              </button>
              <Link to="/" className="ghost-button">
                Back to home
              </Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
