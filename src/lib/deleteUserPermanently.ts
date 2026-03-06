import { supabase } from "@/integrations/supabase/client";

export const deleteUserPermanently = async (targetUserId: string) => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const session = data.session;
  if (!session) {
    throw new Error("Session expired. Please sign in again.");
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user-permanently`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ target_user_id: targetUserId }),
      },
    );

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        payload && typeof payload.error === "string"
          ? payload.error
          : "Unable to delete the account right now.";
      throw new Error(message);
    }

    return payload;
  } catch (fetchError) {
    const { error: rpcError } = await supabase.rpc("delete_user_permanently", {
      target_user_id: targetUserId,
    });

    if (!rpcError) {
      return { success: true };
    }

    const rpcMessage = rpcError.message.toLowerCase();
    if (
      rpcMessage.includes("could not find the function") ||
      rpcMessage.includes("schema cache")
    ) {
      throw new Error(
        "Account deletion is not available on this Supabase project yet. Deploy the Edge Function or apply the latest Supabase migrations.",
      );
    }

    if (fetchError instanceof Error && fetchError.message === "Failed to fetch") {
      throw new Error(
        "Could not reach the account deletion service. Deploy the Edge Function and verify CORS/service-role configuration.",
      );
    }

    throw rpcError;
  }
};
