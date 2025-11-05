'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

export interface HCaptchaFieldHandle {
  reset(): void;
}

interface HCaptchaFieldProps {
  onVerify(token: string | null): void;
}

export const HCaptchaField = forwardRef<HCaptchaFieldHandle, HCaptchaFieldProps>(
  function HCaptchaField({ onVerify }, ref) {
    const captchaRef = useRef<HCaptcha | null>(null);

    useImperativeHandle(ref, () => ({
      reset() {
        captchaRef.current?.resetCaptcha();
      },
    }));

    return (
      <div className="mt-4">
        <HCaptcha
          sitekey={
            process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? '10000000-ffff-ffff-ffff-000000000001'
          }
          onVerify={(token) => onVerify(token)}
          onExpire={() => onVerify(null)}
          ref={captchaRef}
        />
      </div>
    );
  },
);
