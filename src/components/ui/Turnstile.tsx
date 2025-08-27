import React, { forwardRef } from 'react';
import { Turnstile as TurnstileComponent } from '@marsidev/react-turnstile';

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpired?: () => void;
  onError?: () => void;
  className?: string;
}

export const Turnstile = forwardRef<{ reset: () => void; getResponse: () => string }, TurnstileProps>(({
  siteKey,
  onVerify,
  onExpired,
  onError,
  className = ''
}, ref) => {
  const turnstileRef = React.useRef<any>(null);

  const reset = () => {
    if (turnstileRef.current) {
      turnstileRef.current.reset();
    }
  };

  const getResponse = (): string => {
    if (turnstileRef.current) {
      return turnstileRef.current.getResponse() || '';
    }
    return '';
  };

  // Expose methods to parent component
  React.useImperativeHandle(ref, () => ({
    reset,
    getResponse
  }));

  return (
    <div className={`turnstile-container ${className}`}>
      <TurnstileComponent
        ref={turnstileRef}
        siteKey={siteKey}
        onSuccess={onVerify}
        onExpire={onExpired}
        onError={onError}
        options={{
          theme: 'light',
          size: 'normal'
        }}
      />
    </div>
  );
});

Turnstile.displayName = 'Turnstile';
