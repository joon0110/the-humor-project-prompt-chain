type UserMetadata = {
  full_name?: string | null;
  name?: string | null;
};

type UserLike = {
  email?: string | null;
  user_metadata?: UserMetadata | null;
} | null | undefined;

export function getDisplayName(user: UserLike): string {
  const email = user?.email ?? "";
  const metadata = user?.user_metadata ?? {};

  return (
    metadata.full_name?.trim() ||
    metadata.name?.trim() ||
    email.trim() ||
    "Account"
  );
}
