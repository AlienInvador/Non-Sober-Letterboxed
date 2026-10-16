import { cookies } from 'next/headers'
import { isAtLeast21 } from '@/lib/age'
import { OnboardingForm } from './form'

export default async function Onboarding() {
  const dob = (await cookies()).get('dob')?.value ?? ''
  return <OnboardingForm dob={/^\d{4}-\d{2}-\d{2}$/.test(dob) && isAtLeast21(dob) ? dob : null} />
}
