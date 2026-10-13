import { REGEXP_ONLY_DIGITS } from 'input-otp'

import { OTP_LENGTH } from '@/auth/rules'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'

/** Stays enabled while a code is being checked: disabling it would drop focus and swallow the retry. */
type OtpFieldProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  align?: 'center' | 'start'
}

export function OtpField({ id, value, onChange, onComplete, disabled, invalid, describedBy, align = 'center' }: OtpFieldProps) {
  const half = OTP_LENGTH / 2
  return (
    <InputOTP
      id={id}
      maxLength={OTP_LENGTH}
      pattern={REGEXP_ONLY_DIGITS}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      disabled={disabled}
      autoFocus
      inputMode="numeric"
      autoComplete="one-time-code"
      // A visible <Label htmlFor={id}> names the field; only fall back to aria-label without one.
      aria-label={id ? undefined : `${OTP_LENGTH}-digit verification code`}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      containerClassName={align === 'center' ? 'justify-center' : 'justify-start'}
    >
      <InputOTPGroup>
        {Array.from({ length: half }, (_, i) => (
          <InputOTPSlot key={i} index={i} aria-invalid={invalid || undefined} />
        ))}
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        {Array.from({ length: half }, (_, i) => (
          <InputOTPSlot key={i + half} index={i + half} aria-invalid={invalid || undefined} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}
