import { useEffect, useState } from 'react';
import { business } from '../data/business';
import type { OpenStatus } from '../data/types';
import { computeStatus } from './hours';

export function useOpenStatus(): OpenStatus {
  const [status, setStatus] = useState<OpenStatus>(() =>
    computeStatus(business.hours, business.timeZone, new Date()),
  );

  useEffect(() => {
    const tick = () => setStatus(computeStatus(business.hours, business.timeZone, new Date()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return status;
}
