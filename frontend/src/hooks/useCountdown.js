import { useEffect, useState } from "react";

// 1초 간격 카운트다운. 0이 되면 onExpire 콜백 호출.
export function useCountdown(seconds, onExpire) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    setLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (left <= 0) {
      if (onExpire) onExpire();
      return;
    }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
    // onExpire를 의존성에 두면 매 렌더 갱신될 수 있어서 의도적으로 제외.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return { left, mm, ss, urgent: left < 60 };
}
