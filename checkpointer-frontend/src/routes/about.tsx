import { createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send message')
      }

      setStatus('success')
      setName('')
      setEmail('')
      setMessage('')
      setTimeout(() => setStatus('idle'), 5000)
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong')
    }
  }

  return (
    <div className="min-h-screen bg-rose-50 dark:bg-background text-stone-900 selection:bg-green-300">
      <Navbar />

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl">
        {/* Hero Section */}
        <section className="mb-10 sm:mb-16">
          <div className="bg-amber-400/40 dark:bg-black border-4 border-border text-foreground shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] sm:shadow-[8px_8px_0px_0px_rgba(41,37,36,1)] p-5 sm:p-8 md:p-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6 font-alt">
             Checkpointer
            </h1>
            <div className="space-y-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              <p>
                Checkpointer is built by a small team that loves video games and wanted a simple way to track what we're playing. This project has grown to include community features where it welcomes discourse in a safe and respectful manner.
              </p>
              {/* <p>
                {"We appreciate any and all feedback and since we're in our initial user seeding phase, you can get our pro plan for free for life if you're one of our first 4000 users."}
              </p> */}
              <p>
                {"We'd love to hear from you. Please reach out to us with any questions/concerns or if you just wanna say hi! We promise that a real person will answer you back :-)"}
              </p>
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="mb-10 sm:mb-16">
          <div className="bg-amber-100 dark:bg-red-950 border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] sm:shadow-[8px_8px_0px_0px_rgba(41,37,36,1)] p-5 sm:p-8 md:p-10">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">
              Send us a message
            </h2>

            {status === 'success' && (
              <div className="mb-6 bg-green-100 dark:bg-green-900 border-4 border-border p-4 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)]">
                <p className="font-semibold text-foreground">
                  Thanks for your message! We'll get back to you soon.
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="mb-6 bg-rose-100 dark:bg-rose-900 border-4 border-border p-4 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)]">
                <p className="font-semibold text-foreground">
                  {errorMessage || 'Something went wrong. Please try again.'}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground font-semibold">
                  Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-semibold">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-foreground font-semibold">
                  Message
                </Label>
                <Textarea
                  id="message"
                  placeholder="Your feedback, feature request, or just say hi..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  className="min-h-32 border-border bg-input text-foreground"
                />
              </div>

              <Button
                type="submit"
                disabled={status === 'loading'}
                className="w-full sm:w-auto px-8 py-5 text-base bg-lime-400/40 hover:bg-lime-300 dark:bg-lime-900 dark:hover:bg-lime-700"
              >
                {status === 'loading' ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </div>
        </section>

        {/* Email Section */}
        <section>
          <div className="bg-red-300 dark:bg-red-700/20 border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] sm:shadow-[8px_8px_0px_0px_rgba(41,37,36,1)] p-5 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
              Or email us directly
            </h2>
            <a
              href="mailto:hello@checkpointer.io"
              className="text-lg sm:text-xl font-semibold text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors"
            >
              hello@checkpointer.io
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}
