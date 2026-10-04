import { cookies } from 'next/headers';
import AccountView from '@/components/AccountView';
import AccountDashboard from '@/components/AccountDashboard';

export const metadata = {
  title: 'Account',
  description: 'Sign in to your Indemos account to track orders and manage your details.',
};

export default async function AccountPage() {
  const jwt = (await cookies()).get('eden_jwt');

  if (jwt?.value) {
    return <AccountDashboard />;
  }
  return <AccountView />;
}
