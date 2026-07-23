import { api } from "./api";
import { ApiSingleResponse, AuthUser } from "../types";

export const authService = {
  async login(email: string, password: string) {
    const res = await api.post<ApiSingleResponse<{ token: string; user: AuthUser }>>("/auth/login", {
      email,
      password,
    });
    return res.data.data;
  },

  async me() {
    const res = await api.get<ApiSingleResponse<AuthUser>>("/auth/me");
    return res.data.data;
  },
};
