import { redirect } from 'next/navigation';
import LoginPage from '@/screens/LoginPage';
import { currentUser } from '@/lib/auth';
import { homeFor } from '@/config/roles';
import { otpAvailable } from '@/lib/flows';

export const dynamic = 'force-dynamic';
export default async function Login() {
  // v5.1 (G8): a temporary administrator whose setup is pending STAYS here — the login screen shows "Set up your admin account"
  // (LoginPage reads `useAuth().user.mustChangeEmail`, from the layout's Providers); every other page sends them back here.
  // Anyone else signed in goes to their home (a custom role's '/' is resolved by the page gate to a page they may open).
  const user = await currentUser({ setup: true }).catch(() => null);
  if (user && !user.mustChangeEmail) redirect(homeFor(user.role));
  return <LoginPage otpAvailable={otpAvailable()} />;   // the code option is offered only when a workflow can deliver it (S6)
}
