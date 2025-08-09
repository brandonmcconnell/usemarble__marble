import { db } from "@marble/db";
import {
  checkout,
  polar,
  portal,
  usage,
  webhooks,
} from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, organization } from "better-auth/plugins";
import {
  sendInviteEmailAction,
  sendVerificationEmailAction,
} from "@/lib/actions/email";
import { handleSubscriptionCanceled } from "@/lib/polar/subscription.canceled";
import { handleSubscriptionCreated } from "@/lib/polar/subscription.created";
import { handleSubscriptionRevoked } from "@/lib/polar/subscription.revoked";
import { handleSubscriptionUpdated } from "@/lib/polar/subscription.updated";
import { getActiveOrganization } from "../queries/workspace";

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
});

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    // requireEmailVerification: true,
    // autoSignIn: true
    // ideally that would prevent a session being created on signup
    // problem is after otp verification user has to login again and
    // I don't really like the experience so we'll allow session creation
    // but block unverified users via the middleware
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
    github: {
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    },
  },
  advanced: {
    database: {
      generateId: false,
    },
  },
  organization: {
    modelName: "workspace",
  },
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      authenticatedUsersOnly: true,
      // getCustomerCreateParams: async ({ user }, request) => {
      //   console.log(user);
      //   metadata: {
      //     myCustomProperty: 123,
      //   }
      // },
      use: [
        portal(),
        usage(),
        checkout({
          products: [
            {
              productId: process.env.POLAR_HOBBY_PRODUCT_ID || "",
              slug: "hobby",
            },
            {
              productId: process.env.POLAR_PRO_PRODUCT_ID || "",
              slug: "pro",
            },
            {
              productId: process.env.POLAR_TEAM_PRODUCT_ID || "",
              slug: "team",
            },
          ],
          successUrl: process.env.POLAR_SUCCESS_URL || "",
        }),
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET || "",
          onCustomerCreated: (payload) => {
            console.log("Customer Created", payload);
            // TODO: handle customer created
          },
          onSubscriptionCreated: async (payload) => {
            await handleSubscriptionCreated(payload);
          },
          onSubscriptionUpdated: async (payload) => {
            await handleSubscriptionUpdated(payload);
          },
          onSubscriptionCanceled: async (payload) => {
            await handleSubscriptionCanceled(payload);
          },
          onSubscriptionRevoked: async (payload) => {
            await handleSubscriptionRevoked(payload);
          },
        }),
      ],
    }),
    organization({
      async sendInvitationEmail(data) {
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/join/${data.id}`;
        await sendInviteEmailAction({
          inviteeEmail: data.email,
          inviterName: data.inviter.user.name,
          inviterEmail: data.inviter.user.email,
          workspaceName: data.organization.name,
          teamLogo: data.organization.logo,
          inviteLink,
        });
      },
    }),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        await sendVerificationEmailAction({
          userEmail: email,
          otp,
          type,
        });
      },
    }),
    nextCookies(),
  ],
  databaseHooks: {
    // To set active organization when a session is created
    // This works but only when user isnt a new user i.e they already have an organization
    // for new users the middleware redirects them to create a workspace (organization)
    session: {
      create: {
        before: async (session) => {
          try {
            const activeOrganization = await getActiveOrganization(
              session.userId
            );
            return {
              data: {
                ...session,
                activeOrganizationId: activeOrganization?.id || null,
              },
            };
          } catch (_error) {
            // If there's an error, create the session without an active org
            return { data: session };
          }
        },
      },
    },
  },
});
