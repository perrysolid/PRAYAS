import { useEffect, useState } from "react";

/** Seconds remaining; restart by calling start(seconds). Used for OTP resend. */
export function useCountdown() {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);
  return { remaining, start: setRemaining };
}
