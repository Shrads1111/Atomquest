import { getFirebaseAuth } from "@/lib/firebase/config";

const BASE_URL = import.meta.env.VITE_API_URL as string;

export async function apiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: any,
  customHeaders: Record<string, string> = {}
): Promise<T> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders,
  };
  
  // Retrieve Firebase ID Token if user is logged in
  if (user) {
    try {
      const token = await user.getIdToken();
      headers["Authorization"] = `Bearer ${token}`;
    } catch (e) {
      console.warn("Failed to retrieve Firebase ID Token:", e);
    }
  }
  
  const config: RequestInit = {
    method,
    headers,
  };
  
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! Status: ${response.status}`);
  }
  
  // For files or binary downloads (like audit report exports)
  const contentType = response.headers.get("content-type");
  if (contentType && !contentType.includes("application/json")) {
    return (await response.blob()) as unknown as T;
  }
  
  return (await response.json()) as T;
}
