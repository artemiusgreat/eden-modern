import ResetPasswordView from '@/components/ResetPasswordView';

export const metadata = {
  title: 'Reset Password',
  description: 'Choose a new password for your Indemos account.',
};

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { key?: string; login?: string };
}) {
  return <ResetPasswordView resetKey={searchParams.key ?? ''} login={searchParams.login ?? ''} />;
}
