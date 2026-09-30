import { cookies } from 'next/headers';
import AccountView from '@/components/AccountView';
import AccountDashboard from '@/components/AccountDashboard';

export const metadata = {
  title: 'Account',
  description: 'Sign in to your Indemos account to track orders and manage your details.',
};

/** Username is the first segment of the WP auth cookie: user|expiry|token|hmac. */
function usernameFromCookie(value: string): string {
  return decodeURIComponent(value.split('|')[0] || 'friend');
}

export default function AccountPage() {
  const loginCookie = cookies()
    .getAll()
    .find((c) => c.name.startsWith('wordpress_logged_in_'));

  if (loginCookie) {
    return <AccountDashboard username={usernameFromCookie(loginCookie.value)} />;
  }
  return <AccountView />;
}
