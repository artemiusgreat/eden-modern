import ResetPasswordView from '@/components/ResetPasswordView';

export const metadata = {
  title: 'Reset Password',
  description: 'Choose a new password for your Indemos account.',
};

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return <ResetPasswordView token={searchParams.token ?? ''} />;
}
