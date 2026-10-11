import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from '@/server/lib/prisma';
import { env } from '@/server/lib/env';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID ?? 'placeholder-google-client-id',
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? 'placeholder-google-client-secret',
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const identifier = parsed.data.email.toLowerCase().trim();
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: identifier, mode: 'insensitive' } },
              { name: { equals: identifier, mode: 'insensitive' } },
            ],
          },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }
      if (trigger === 'update' && session?.name) {
        token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: env.AUTH_SECRET,
});
