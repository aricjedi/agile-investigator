"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Result type returned to the client component
// ---------------------------------------------------------------------------
export type CreateOrgResult =
  | {
      success:     true;
      orgSlug:     string;
      orgName:     string;
      /** Generated login credentials to display to the admin */
      credentials: { contactName: string; email: string; password: string };
    }
  | { success: false; error: string };

// Temporary password assigned to every new client account.
// The client must change this on first login.
// TODO: replace with a signed invite-link flow once the email sprint ships.
const TEMP_PASSWORD = "TrustQ2026!";

// ---------------------------------------------------------------------------
// createOrganization
//
// Called from CreateOrgForm. Performs three atomic-ish steps:
//   1. Insert organization row
//   2. Create a Supabase auth user (no email sent)
//   3. Insert profile row linking user → org with role = "client"
//
// On partial failure each step rolls back the previous ones so the database
// is never left in an inconsistent state.
//
// TODO: wrap in a Postgres function/transaction once the volume warrants it.
// TODO: trigger a password-reset / invite email once the email sprint begins.
// ---------------------------------------------------------------------------
export async function createOrganization(
  _prevState: CreateOrgResult | null,
  formData: FormData
): Promise<CreateOrgResult> {
  const name         = (formData.get("name")         as string | null)?.trim() ?? "";
  const contactName  = (formData.get("contactName")  as string | null)?.trim() ?? "";
  const contactEmail = (formData.get("contactEmail") as string | null)?.trim().toLowerCase() ?? "";

  // ---- Validate inputs ----
  if (!name || !contactName || !contactEmail) {
    return { success: false, error: "All fields are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  // ---- Build slug ----
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 63); // Postgres slug column limit

  const supabase = createAdminClient();

  // ---- Step 1: Create organization ----
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name, slug, status: "active" })
    .select()
    .single();

  if (orgError) {
    if (orgError.code === "23505") {
      return {
        success: false,
        error: `An organization named "${name}" already exists. Try a more specific name.`,
      };
    }
    return { success: false, error: `Could not create organization: ${orgError.message}` };
  }

  // ---- Step 2: Resolve auth user (create or reuse) ----
  // First check whether a Supabase auth user already exists for this email.
  // This prevents a hard error when re-provisioning or fixing an org that was
  // partially created, and gives a cleaner error than the raw Supabase message.
  const { data: existingUserId, error: lookupError } = await supabase
    .rpc("get_auth_user_id_by_email", { email_address: contactEmail });

  if (lookupError) {
    await supabase.from("organizations").delete().eq("id", org.id);
    return { success: false, error: `User lookup failed: ${lookupError.message}` };
  }

  let authUserId: string;
  let createdNewAuthUser = false;

  if (existingUserId) {
    // Reuse the existing auth user — do NOT reset their password.
    // The admin will need to communicate credentials separately if this is a
    // re-provision; the credential card will still show TEMP_PASSWORD as a
    // reminder of the original password set at account creation.
    authUserId = existingUserId as string;
  } else {
    // email_confirm: true skips the confirmation email.
    // Password is the shared temporary value defined above — displayed to the
    // admin after creation so they can share it with the client.
    // TODO: replace TEMP_PASSWORD with a signed invite-link flow once email sprint ships.
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email:         contactEmail,
        password:      TEMP_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: contactName },
      });

    if (authError) {
      await supabase.from("organizations").delete().eq("id", org.id);
      return { success: false, error: `Could not create user account: ${authError.message}` };
    }

    authUserId = authData.user.id;
    createdNewAuthUser = true;
  }

  // ---- Step 3: Create profile ----
  const { error: profileError } = await supabase.from("profiles").insert({
    user_id:         authUserId,
    organization_id: org.id,
    role:            "client",
    full_name:       contactName,
  });

  if (profileError) {
    // Only delete the auth user if we just created it — never delete a
    // pre-existing user who may belong to another org.
    if (createdNewAuthUser) {
      await supabase.auth.admin.deleteUser(authUserId);
    }
    await supabase.from("organizations").delete().eq("id", org.id);

    if (profileError.code === "23505") {
      return {
        success: false,
        error: `This user already has a profile in the system. They may already be linked to another organization.`,
      };
    }
    return { success: false, error: `Could not assign profile: ${profileError.message}` };
  }

  revalidatePath("/admin");
  return {
    success:     true,
    orgSlug:     org.slug,
    orgName:     org.name,
    credentials: { contactName, email: contactEmail, password: TEMP_PASSWORD },
  };
}
