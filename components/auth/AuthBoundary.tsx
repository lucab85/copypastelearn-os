"use client";

import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export function AuthBoundary({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  if (!enabled) return <>{children}</>;
  return <ClerkProvider>{children}</ClerkProvider>;
}

export function AuthControls({ enabled }: { enabled: boolean }) {
  if (!enabled) return <span className="demo-auth-chip">DEMO IDENTITY</span>;
  return <div className="auth-controls">
    <Show when="signed-out"><SignInButton mode="modal"><button>Sign in</button></SignInButton><SignUpButton mode="modal"><button className="primary">Create account</button></SignUpButton></Show>
    <Show when="signed-in"><UserButton /></Show>
  </div>;
}
