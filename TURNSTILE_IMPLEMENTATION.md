# Cloudflare Turnstile CAPTCHA Implementation

This project has been updated to use Cloudflare Turnstile instead of Google reCAPTCHA for better user experience and privacy.

## Package Used
- **@marsidev/react-turnstile** (version 1.1.0)

## Site Key
- **Site Key**: `0x4AAAAAABkelv713e06-flZ`

## Implementation Details

### Components Updated

#### 1. Auth.tsx Component
- **Location**: `src/components/Auth.tsx`
- **Changes**:
  - Replaced `Recaptcha` component with `Turnstile` component
  - Updated state variables from `recaptcha*` to `turnstile*`
  - Updated function names to reflect Turnstile usage
  - Added Turnstile verification before form submission

#### 2. AcceptInvitation.tsx Page
- **Location**: `src/pages/AcceptInvitation.tsx`
- **Changes**:
  - Added Turnstile component to both signup and login forms
  - Added Turnstile verification state management
  - Added verification checks before form submission
  - Integrated Turnstile with existing invitation flow

### New Components Created

#### Turnstile.tsx
- **Location**: `src/components/ui/Turnstile.tsx`
- **Features**:
  - Wrapper around `@marsidev/react-turnstile`
  - Consistent API with previous Recaptcha component
  - Exposes `reset()` and `getResponse()` methods
  - Handles verification, expiration, and error callbacks

### Supabase Edge Functions

#### verify-turnstile
- **Location**: `supabase/functions/verify-turnstile/index.ts`
- **Purpose**: Server-side verification of Turnstile tokens
- **Endpoint**: `/functions/v1/verify-turnstile`
- **Method**: POST
- **Body**: `{ "token": "turnstile_token" }`

## Environment Variables

Add these to your `.env` file:

```bash
# Cloudflare Turnstile
VITE_TURNSTILE_SITE_KEY=0x4AAAAAABkelv713e06-flZ
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

## Usage

### Basic Implementation
```tsx
import { Turnstile } from '@/components/ui/Turnstile';

<Turnstile
  ref={turnstileRef}
  siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
  onVerify={handleTurnstileVerify}
  onExpired={handleTurnstileExpired}
  onError={handleTurnstileError}
  className="flex justify-center"
/>
```

### State Management
```tsx
const [turnstileToken, setTurnstileToken] = useState('');
const [turnstileVerified, setTurnstileVerified] = useState(false);
const turnstileRef = useRef<any>(null);
```

### Verification Handlers
```tsx
const handleTurnstileVerify = async (token: string) => {
  setTurnstileToken(token);
  setTurnstileVerified(true);
};

const handleTurnstileExpired = () => {
  setTurnstileVerified(false);
  setTurnstileToken('');
};

const handleTurnstileError = () => {
  setTurnstileVerified(false);
  setTurnstileToken('');
  // Show error toast
};
```

## Benefits of Turnstile over reCAPTCHA

1. **Better UX**: Less intrusive, no image selection challenges
2. **Privacy**: No tracking or personal data collection
3. **Performance**: Faster loading and verification
4. **Accessibility**: Better screen reader support
5. **Mobile Friendly**: Optimized for mobile devices

## Migration Notes

- The old `Recaptcha` component is still available in `src/components/ui/Recaptcha.tsx`
- All existing reCAPTCHA environment variables are preserved
- The `verify-recaptcha` Edge Function remains functional
- Both systems can coexist during transition period

## Testing

1. Ensure Turnstile site key is correctly configured
2. Test verification flow in both Auth and AcceptInvitation components
3. Verify server-side token validation works
4. Test error handling for expired/invalid tokens
5. Verify mobile responsiveness

## Troubleshooting

### Common Issues

1. **Token verification fails**: Check `TURNSTILE_SECRET_KEY` environment variable
2. **Component not rendering**: Verify `@marsidev/react-turnstile` package is installed
3. **CORS errors**: Ensure Supabase Edge Function CORS headers are correct
4. **Verification state not updating**: Check callback function implementations

### Debug Steps

1. Check browser console for JavaScript errors
2. Verify environment variables are loaded correctly
3. Test Edge Function endpoint directly
4. Check network tab for API call responses
