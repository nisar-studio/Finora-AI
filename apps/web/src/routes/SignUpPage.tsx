import { SignUp } from '@clerk/clerk-react';

export function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-md">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl="/app/dashboard"
          appearance={{
            elements: {
              rootBox: 'mx-auto w-full',
              card: 'bg-surface border border-ink/10 shadow-sm rounded-xl',
            },
          }}
        />
      </div>
    </div>
  );
}