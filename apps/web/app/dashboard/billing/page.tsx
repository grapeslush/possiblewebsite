import { redirect } from 'next/navigation';
import { getServerAuthSession } from '@/lib/auth';
import ConnectOnboardingButton from './connect-onboarding-button';

export default async function BillingPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  return (
    <div className="mx-auto max-w-2xl py-12">
      <h1 className="text-3xl font-semibold">Payouts</h1>
      <p className="mt-2 text-muted-foreground">
        Connect your Stripe account to receive payouts for marketplace sales.
      </p>
      <div className="mt-8 rounded border p-6">
        <ConnectOnboardingButton />
      </div>
    </div>
  );
}
