import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('responde status ok', () => {
    expect(new HealthController().check()).toEqual({ status: 'ok' });
  });
});
