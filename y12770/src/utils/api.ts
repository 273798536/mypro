import type { ApiResponse } from "@/types";
import { useAppStore } from "@/store/appStore";

const BASE_URL = "/api";

interface RequestOptions extends RequestInit {
  showErrorNotification?: boolean;
  showSuccessNotification?: boolean;
  successMessage?: string;
}

class ApiError extends Error {
  code: string;
  suggestion?: string;
  actionHref?: string;
  actionLabel?: string;

  constructor(
    message: string,
    code: string = "UNKNOWN_ERROR",
    suggestion?: string,
    actionHref?: string,
    actionLabel?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.suggestion = suggestion;
    this.actionHref = actionHref;
    this.actionLabel = actionLabel;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    showErrorNotification = true,
    showSuccessNotification = false,
    successMessage,
    ...fetchOptions
  } = options;

  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (fetchOptions.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    const data = (await response.json()) as ApiResponse<T>;

    if (!response.ok || !data.success) {
      const error = data.error || {
        code: `HTTP_${response.status}`,
        message: response.statusText || "请求失败",
      };

      const apiError = new ApiError(
        error.message,
        error.code,
        error.suggestion,
        error.actionHref,
        error.actionLabel
      );

      if (showErrorNotification) {
        useAppStore.getState().addNotification({
          type: "error",
          title: "操作失败",
          message: error.message,
          actionLabel: error.actionLabel,
          actionHref: error.actionHref,
        });
      }

      throw apiError;
    }

    if (showSuccessNotification) {
      useAppStore.getState().addNotification({
        type: "success",
        title: "操作成功",
        message: successMessage || "操作已完成",
      });
    }

    return data.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const networkError = new ApiError(
      "网络连接异常，请检查网络设置",
      "NETWORK_ERROR",
      "请检查网络连接后重试，或联系系统管理员"
    );

    if (showErrorNotification) {
      useAppStore.getState().addNotification({
        type: "error",
        title: "网络错误",
        message: networkError.message,
        actionLabel: "去检查",
      });
    }

    throw networkError;
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};

export { ApiError };
