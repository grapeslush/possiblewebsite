interface VerifyEmailPageProps {
  searchParams: { token?: string };
}

async function verifyToken(token?: string) {
  if (!token) return { success: false, message: 'Verification token missing.' };

  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    cache: 'no-store'
  });

  if (response.ok) {
    return { success: true, message: 'Your email has been verified. You can now sign in.' };
  }

  const data = await response.json().catch(() => ({}));
  return { success: false, message: data.error ?? 'Unable to verify email.' };
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const result = await verifyToken(searchParams.token);

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-3xl font-semibold">Email verification</h1>
      <p className={`mt-4 ${result.success ? 'text-green-600' : 'text-red-600'}`}>{result.message}</p>
    </div>
  );
}
