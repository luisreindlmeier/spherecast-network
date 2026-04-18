'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'
import { COMPANY_SCOPE_COOKIE } from '@/lib/company-scope-server'

const scopeInputSchema = z.union([
  z.literal('all'),
  z
    .string()
    .regex(/^\d+$/)
    .transform((s) => Number(s))
    .pipe(z.number().int().positive()),
])

export async function setCompanyScopeAction(value: string): Promise<void> {
  const parsed = scopeInputSchema.safeParse(value)
  if (!parsed.success) return

  const store = await cookies()
  const v = parsed.data
  if (v === 'all') {
    store.delete(COMPANY_SCOPE_COOKIE)
  } else {
    store.set(COMPANY_SCOPE_COOKIE, String(v), {
      path: '/',
      maxAge: 60 * 60 * 24 * 400,
      sameSite: 'lax',
      httpOnly: false,
    })
  }
}
