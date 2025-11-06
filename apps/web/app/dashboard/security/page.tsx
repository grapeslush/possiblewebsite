import { redirect } from 'next/navigation';
import { getServerAuthSession } from '@/lib/auth';
import SecurityForm from './security-form';

export default async function SecurityPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  return (
    <div className="mx-auto max-w-2xl py-12">
      <h1 className="text-3xl font-semibold">Security</h1>
      <p className="mt-2 text-muted-foreground">
        Configure multi-factor authentication to protect your account.
      </p>
      <div className="mt-8 rounded border p-6">
        <SecurityForm />
      </div>
    </div>
  );
}
