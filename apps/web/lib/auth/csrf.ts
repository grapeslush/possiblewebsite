const CSRF_HEADER_NAME = 'x-csrf-token';

export const getCsrfHeaderName = () => CSRF_HEADER_NAME;
export const getCsrfHeaderValue = (token: string) => ({ [CSRF_HEADER_NAME]: token });
export type CsrfHeaderName = typeof CSRF_HEADER_NAME;
