import { LoginForm } from "@/app/login/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    reason?: string;
    next?: string;
  }>;
}) {
  const { reason, next } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 items-center px-5 py-20">
      <LoginForm reason={reason} next={next} />
    </main>
  );
}
