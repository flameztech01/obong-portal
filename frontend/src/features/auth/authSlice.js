// features/auth/authSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  userInfo: localStorage.getItem("userInfo")
    ? JSON.parse(localStorage.getItem("userInfo"))
    : null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.userInfo = action.payload;
      localStorage.setItem("userInfo", JSON.stringify(action.payload));
    },

    // Renamed from `logout` to avoid collision with useLogoutMutation's trigger
    clearCredentials: (state) => {
      state.userInfo = null;
      try {
        localStorage.removeItem("userInfo");
        localStorage.removeItem("token");
        // sessionStorage may throw in private mode; wrap defensively
        sessionStorage.clear();
        // NOTE: httpOnly `jwt` cookie is cleared by the backend logout endpoint.
      } catch {
        /* storage unavailable — ignore */
      }
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;