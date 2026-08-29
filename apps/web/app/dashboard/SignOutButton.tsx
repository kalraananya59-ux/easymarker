"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button type="button" className="btn btnGhost btnSm" onClick={() => signOut({ callbackUrl: "/signin" })}>
      Sign out
    </button>
  );
}
