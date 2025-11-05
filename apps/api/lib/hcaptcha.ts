interface VerifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

export async function verifyCaptcha(token?: string | null): Promise<boolean> {
  if (!token) {
    return false;
  }

  const secret = process.env.HCAPTCHA_SECRET;

  if (!secret) {
    // In development or tests we allow missing secrets to avoid blocking flows.
    return true;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token);

    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (!response.ok) {
      return false;
    }

    const json = (await response.json()) as VerifyResponse;
    return json.success;
  } catch (error) {
    console.warn('hCaptcha verification failed', error);
    return false;
  }
}
