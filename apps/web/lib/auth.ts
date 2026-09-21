import type { AuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { db, users, workspaces, eq } from "@easymarker/db";
import { slugFromName } from "@easymarker/shared";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      workspaceId: string | null;
    };
  }
  interface User {
    workspaceId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    workspaceId: string | null;
  }
}

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 60 * 60,
  },
  pages: {
    signIn: "/signin",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<User | null> {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await db.query.users.findFirst({ where: eq(users.email, email) });
        // No passwordHash means this account only ever signed in with Google.
        if (!user || !user.passwordHash) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          workspaceId: user.workspaceId,
        };
      },
    }),
    ...(process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_SECRET"]
      ? [
          GoogleProvider({
            clientId: process.env["GOOGLE_CLIENT_ID"],
            clientSecret: process.env["GOOGLE_CLIENT_SECRET"],
          }),
        ]
      : []),
  ],
  callbacks: {
    // There's no NextAuth adapter wired up here — users live in our own
    // table, managed directly by the signup route. For Google sign-in we
    // have to do that find-or-create ourselves, since NextAuth only knows
    // about the OAuth profile, not our schema. Mutating `user` here is safe
    // and intentional: the same object reference is what the jwt callback
    // receives next for this sign-in.
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      const email = user.email.toLowerCase();
      let dbUser = await db.query.users.findFirst({ where: eq(users.email, email) });

      if (!dbUser) {
        const name = user.name?.trim() || email.split("@")[0] || "there";
        const [created] = await db
          .insert(users)
          .values({
            email,
            name,
            passwordHash: null,
            // Google has already verified this address — no need to make
            // someone click a link to confirm what Google just confirmed.
            emailVerifiedAt: new Date(),
          })
          .returning();
        if (!created) return false;

        const [workspace] = await db
          .insert(workspaces)
          .values({ ownerId: created.id, name: `${name}'s Workspace`, slug: slugFromName(name) })
          .returning();
        if (!workspace) return false;

        await db.update(users).set({ workspaceId: workspace.id }).where(eq(users.id, created.id));
        dbUser = { ...created, workspaceId: workspace.id };
      } else if (!dbUser.emailVerifiedAt) {
        // An existing credentials account signing in with Google for the
        // first time — Google verifying this email is just as good as our
        // own verification link.
        await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, dbUser.id));
      }

      user.id = dbUser.id;
      user.workspaceId = dbUser.workspaceId;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id as string;
        token.workspaceId = user.workspaceId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.workspaceId = token.workspaceId;
      return session;
    },
  },
};
