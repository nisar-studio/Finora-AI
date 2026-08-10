import { SignIn } from '@clerk/clerk-react';

export function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-md">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl="/app"
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