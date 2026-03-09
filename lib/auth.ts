import type { NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth'
import Google from 'next-auth/providers/google'

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('Missing Google OAuth credentials. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env.local file')
}

if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  console.warn('Missing AUTH_SECRET. Please set AUTH_SECRET or NEXTAUTH_SECRET in your .env.local file')
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}

export async function auth() {
  return getServerSession(authOptions)
}
