// slices/postApiSlice.js
import { apiSlice } from "./apiSlice.js";

const POST_URL = "/posts";

export const postApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /* ============================================
       PUBLIC  (no auth required)
       ============================================ */

    // GET /posts/link/:token
    // Returns: { owner: { name, profilePicture }, acceptsImages, maxImages }
    // Public → no tags, no cache invalidation needed. The drop page uses
    // this on mount to show "Send a message to <owner>".
    getPublicLinkInfo: builder.query({
      query: (token) => `${POST_URL}/link/${token}`,
      // No providesTags — public page, cheap call, no cross-cache to sync
    }),

    // POST /posts/link/:token
    // body: FormData { content, images? (up to 2 files) }
    // Returns: { message, postId }
    // Sender can be anonymous (guest, tracked by IP) or logged in.
    submitPost: builder.mutation({
      query: ({ token, formData }) => ({
        url: `${POST_URL}/link/${token}`,
        method: "POST",
        body: formData,
      }),
      // The post lands on the OWNER's list — nudge any open lists
      invalidatesTags: [
        { type: "Post", id: "LIST" },
        { type: "Post", id: "MY_LIST" },
      ],
    }),

    /* ============================================
       LINK OWNER  (authenticated)
       ============================================ */

    // GET /posts/my-link
    // Returns: { token, url, isActive, postCount, regeneratedAt, createdAt }
    // Creates the link lazily on first call.
    getMyLink: builder.query({
      query: () => `${POST_URL}/my-link`,
      providesTags: ["PostLink"],
    }),

    // POST /posts/my-link/regenerate
    // Returns: { message, token, url }
    // Old token becomes invalid immediately.
    regenerateMyLink: builder.mutation({
      query: () => ({
        url: `${POST_URL}/my-link/regenerate`,
        method: "POST",
      }),
      invalidatesTags: ["PostLink"],
    }),

    // GET /posts/my-posts?page=&limit=&status=active|deleted|all
    // Returns: { posts: [...], pagination: { page, limit, total, totalPages } }
    // Posts are serialized anonymously (senderType only — no IP / sender).
    getMyPosts: builder.query({
      query: ({ page = 1, limit = 20, status = "active" } = {}) => ({
        url: `${POST_URL}/my-posts`,
        params: { page, limit, status },
      }),
      providesTags: (result) =>
        result?.posts
          ? [
              ...result.posts.map((p) => ({ type: "Post", id: p.id })),
              { type: "Post", id: "MY_LIST" },
            ]
          : [{ type: "Post", id: "MY_LIST" }],
    }),

    // DELETE /posts/my-posts/:postId
    // Soft delete (isDeleted: true). Only the link owner can call this.
    deleteMyPost: builder.mutation({
      query: (postId) => ({
        url: `${POST_URL}/my-posts/${postId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, postId) => [
        { type: "Post", id: postId },
        { type: "Post", id: "MY_LIST" },
        { type: "PostLink" }, // postCount on /my-link changes
      ],
    }),

    /* ============================================
       ADMIN
       ============================================ */

    // GET /posts/admin/posts
    //   ?page&limit&status=active|deleted|all&ownerId&search
    // Returns: { posts: [...], pagination }
    // Admin serializer exposes sender + senderIp for abuse handling.
    adminGetAllPosts: builder.query({
      query: ({ page, limit, status, ownerId, search } = {}) => ({
        url: `${POST_URL}/admin/posts`,
        params: {
          ...(page != null && { page }),
          ...(limit != null && { limit }),
          ...(status && { status }),
          ...(ownerId && { ownerId }),
          ...(search && { search }),
        },
      }),
      providesTags: (result) =>
        result?.posts
          ? [
              ...result.posts.map((p) => ({ type: "Post", id: p.id })),
              { type: "Post", id: "ADMIN_LIST" },
            ]
          : [{ type: "Post", id: "ADMIN_LIST" }],
    }),

    // GET /posts/admin/post-links
    //   ?page&limit&search&onlyWithLinks=true
    // Returns: { users: [{ user, hasLink, linkToken, linkActive, postCount }], pagination }
    adminGetUsersWithPostStats: builder.query({
      query: ({ page, limit, search, onlyWithLinks } = {}) => ({
        url: `${POST_URL}/admin/post-links`,
        params: {
          ...(page != null && { page }),
          ...(limit != null && { limit }),
          ...(search && { search }),
          ...(onlyWithLinks != null && { onlyWithLinks }),
        },
      }),
      providesTags: [{ type: "PostLink", id: "ADMIN_LIST" }],
    }),

    // DELETE /posts/admin/posts/:postId
    // Soft delete by admin. Doesn't require ownership.
    adminDeletePost: builder.mutation({
      query: (postId) => ({
        url: `${POST_URL}/admin/posts/${postId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, postId) => [
        { type: "Post", id: postId },
        { type: "Post", id: "ADMIN_LIST" },
        { type: "Post", id: "MY_LIST" },
        { type: "PostLink", id: "ADMIN_LIST" },
        { type: "PostLink" },
      ],
    }),
  }),
});

/* ============================================
   HOOKS
   ============================================ */
export const {
  // Public
  useGetPublicLinkInfoQuery,
  useSubmitPostMutation,

  // Owner
  useGetMyLinkQuery,
  useRegenerateMyLinkMutation,
  useGetMyPostsQuery,
  useDeleteMyPostMutation,

  // Admin
  useAdminGetAllPostsQuery,
  useAdminGetUsersWithPostStatsQuery,
  useAdminDeletePostMutation,
} = postApiSlice;