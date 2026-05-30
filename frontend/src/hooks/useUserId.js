import { useEffect, useState } from "react";

// 인증 기능이 프로젝트 스코프에 없어서, localStorage에 UUID 하나를 만들어 user_id로 쓴다.
// 백엔드는 user_id 문자열만 받고 검증하지 않으므로 임시로 충분하다.

const STORAGE_KEY = "ticketing.userId";

function generateUserId() {
  const uuid =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `user-${uuid.slice(0, 8)}`;
}

export function useUserId() {
  const [userId, setUserId] = useState(() => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    const fresh = generateUserId();
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  });

  useEffect(() => {
    if (userId && !window.localStorage.getItem(STORAGE_KEY)) {
      window.localStorage.setItem(STORAGE_KEY, userId);
    }
  }, [userId]);

  return userId;
}
