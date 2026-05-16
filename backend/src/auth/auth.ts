import {verifyToken} from "@clerk/backend";
import {HTTPException} from "hono/http-exception";
import type {Context} from "hono";
import {env} from "../env.js";

export type AuthenticatedUser = {
  userId: string;
};

export type Authenticator = (context: Context) => Promise<AuthenticatedUser>;

const getBearerToken = (authorizationHeader: string | undefined) => {
  if (!authorizationHeader) {
    return undefined;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return undefined;
  }

  return token;
};

export const createAuthenticator = (): Authenticator => {
  const secretKey = env.CLERK_SECRET_KEY;

  return async (context) => {
    const token = getBearerToken(context.req.header("Authorization"));

    if (!token) {
      throw new HTTPException(401, {
        message: "Authentication required",
      });
    }

    const payload = await verifyToken(token, {
      secretKey,
    }).catch(() => undefined);

    if (!payload?.sub) {
      throw new HTTPException(401, {
        message: "Invalid authentication token",
      });
    }

    return {
      userId: payload.sub,
    };
  };
};
