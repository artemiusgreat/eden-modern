import ResetPasswordView from '@/components/ResetPasswordView';

export const metadata = {
  title: 'Reset Password',
  description: 'Choose a new password for your Indemos account.',
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordView token={token ?? ''} />;
}
