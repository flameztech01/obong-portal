// features/authApiSlice.js
import { apiSlice } from "./apiSlice.js";

const AUTH_URL = "/auth";

export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /* ============================================
       PUBLIC
       ============================================ */

    signup: builder.mutation({
      query: (data) => ({
        url: `${AUTH_URL}/signup`,
        method: "POST",
        body: data,
      }),
    }),

    // Request OTP (login step 1)
    login: builder.mutation({
      query: (data) => ({
        url: `${AUTH_URL}/login`,
        method: "POST",
        body: data, // { identifier }
      }),
    }),

    resendOtp: builder.mutation({
      query: (data) => ({
        url: `${AUTH_URL}/resend-otp`,
        method: "POST",
        body: data, // { identifier }
      }),
    }),

    // Verify OTP (login step 2 — returns token, sets cookie)
    verifyOtp: builder.mutation({
      query: (data) => ({
        url: `${AUTH_URL}/verify-otp`,
        method: "POST",
        body: data, // { identifier, otp }
      }),
      invalidatesTags: ["User"],
    }),

    /* ============================================
       PROTECTED
       ============================================ */

    getMe: builder.query({
      query: () => ({
        url: `${AUTH_URL}/me`,
        method: "GET",
      }),
      providesTags: ["User"],
    }),

    logout: builder.mutation({
      query: () => ({
        url: `${AUTH_URL}/logout`,
        method: "POST",
      }),
      invalidatesTags: ["User"],
    }),

    /* ============================================
       PROFILE PICTURE
       ============================================ */

    // FormData with a single field: "profilePicture"
    updateProfilePicture: builder.mutation({
      query: (formData) => ({
        url: `${AUTH_URL}/profile-picture`,
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: ["User"],
    }),

    deleteProfilePicture: builder.mutation({
      query: () => ({
        url: `${AUTH_URL}/profile-picture`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),

    /* ============================================
       ACCOUNT
       ============================================ */

    deleteAccount: builder.mutation({
      query: () => ({
        url: `${AUTH_URL}/account`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

// ✅ All hooks exported
export const {
  // Public
  useSignupMutation,
  useLoginMutation,
  useResendOtpMutation,
  useVerifyOtpMutation,
  // Protected
  useGetMeQuery,
  useLazyGetMeQuery,
  useLogoutMutation,
  // Profile picture
  useUpdateProfilePictureMutation,
  useDeleteProfilePictureMutation,
  // Account
  useDeleteAccountMutation,
} = authApiSlice;