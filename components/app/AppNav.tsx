"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/Brand";
import { AuthControls } from "@/components/auth/AuthBoundary";

const links = [["/dashboard","Command"],["/missions","Missions"],["/skills","Skills"],["/store","Library"]];
export function AppNav() {
  const pathname = usePathname();
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return <header className="app-nav">
    <Link href="/" className="app-nav-brand"><Brand /></Link>
    <nav>{links.map(([href,label])=><Link className={pathname.startsWith(href)?"active":""} key={href} href={href}>{label}</Link>)}</nav>
    <div className="app-user"><span><i/> engine online</span><AuthControls enabled={clerkEnabled}/></div>
  </header>;
}
