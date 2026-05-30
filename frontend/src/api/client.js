// 공통 fetch 래퍼. /api 프록시(vite.config.js)로 백엔드(:8000)에 전달된다.
// 백엔드 응답 형식이 { success, message, data } 또는 { detail }(에러) 두 가지라서
// 둘 다 일관되게 throw/return 으로 처리한다.

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (networkError) {
    const err = new Error("네트워크 오류로 서버에 연결할 수 없습니다.");
    err.code = "NETWORK";
    throw err;
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // JSON이 아닌 응답 (e.g. 502 HTML)
  }

  // FastAPI HTTPException 형식
  if (!response.ok) {
    const err = new Error(body?.detail || body?.message || `서버 오류 (${response.status})`);
    err.status = response.status;
    err.body = body;
    throw err;
  }

  // ApiResponse 형식: { success, message, data }
  if (body && typeof body === "object" && "success" in body) {
    if (!body.success) {
      const err = new Error(body.message || "요청이 실패했습니다.");
      err.body = body;
      throw err;
    }
    return body;
  }

  return body;
}

export const api = {
  get: (path) => request(path, { method: "GET" }),
  post: (path, data) => request(path, { method: "POST", body: JSON.stringify(data) }),
};
