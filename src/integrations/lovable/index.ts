import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "../supabase/client";
// The OAuth broker is hosted by Lovable, not by the Vercel application.
// Keep the original project broker so existing Google identities are preserved.
const lovableAuth = createLovableAuth({
  oauthBrokerUrl: "https://syna-stratosphere.lovable.app/~oauth/initiate",
});

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft" | "lovable",
      opts?: SignInOptions,
    ) => {
      const result = await lovableAuth.signInWithOAuth(provider, {
        ...opts,
        extraParams: {
          ...opts?.extraParams,
        },
      });

      if (result.redirected) {
        return result;
      }

      if (result.error) {
        return result;
      }

      try {
        const { error } = await supabase.auth.setSession(result.tokens);
        if (error) return { error };
      } catch (e) {
        return { error: e instanceof Error ? e : new Error(String(e)) };
      }
      return result;
    },
  },
};
