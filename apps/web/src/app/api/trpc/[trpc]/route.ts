import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createTRPCContext } from "@centraxis/api";
import { auth } from "@centraxis/auth";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const session = await auth();
      return createTRPCContext({
        headers: req.headers,
        session,
      });
    },
    onError: ({ path, error }) => {
      console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
    },
  });

export { handler as GET, handler as POST };
