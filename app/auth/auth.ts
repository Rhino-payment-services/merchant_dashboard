import { getServerSession } from 'next-auth';
import { AuthOptions } from 'next-auth';

export async function getAuthSession() {
  return await getServerSession(AuthOptions);
} 