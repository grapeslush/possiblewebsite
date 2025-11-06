/* eslint-env es2021 */
/* global __ENV */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  iterations: 5,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

const target = __ENV.K6_TARGET_URL ?? 'http://localhost:4000/api/health';

export default function () {
  const response = http.get(target, { tags: { test: 'smoke' } });
  check(response, {
    'status is 200 or 503': (res) => res.status === 200 || res.status === 503,
    'response has status field': (res) => res.json('status') !== undefined,
  });
  sleep(1);
}
