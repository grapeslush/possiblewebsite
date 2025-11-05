export interface VerificationEmailPayload {
  email: string;
  token: string;
  verificationUrl: string;
}

export const sendVerificationEmail = async ({ email, verificationUrl }: VerificationEmailPayload) => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.info(`Verification email to ${email}: ${verificationUrl}`);
  }

  // In production you would integrate with an email provider here.
  return true;
};
