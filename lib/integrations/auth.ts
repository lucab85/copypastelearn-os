/** Identity boundary. Clerk is optional in development; CPL Core only consumes Identity. */
export type Identity = { id: string; email?: string; displayName?: string; authenticated: boolean };

export function clerkConfigured() {
  return Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

export async function getIdentity(): Promise<Identity> {
  if (!clerkConfigured()) return { id: "demo-user", displayName: "Operator", authenticated: false };
  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const session = await auth();
  if (!session.userId) return { id: "anonymous", authenticated: false };
  const user = await currentUser();
  return {
    id: session.userId,
    authenticated: true,
    email: user?.primaryEmailAddress?.emailAddress,
    displayName: user?.fullName || user?.firstName || "Operator",
  };
}
