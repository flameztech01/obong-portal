// slices/adminApiSlice.js
import { apiSlice } from "./apiSlice.js";

const ADMIN_URL = "/admin";

export const adminApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /* ============================================
       USERS
       ============================================ */

    // GET /admin/users?role=&department=&level=&isActive=&extraRole=&search=&page=&limit=
    listUsers: builder.query({
      query: (params = {}) => ({
        url: `${ADMIN_URL}/users`,
        method: "GET",
        params,
      }),
      providesTags: (result) =>
        result?.users
          ? [
              ...result.users.map((u) => ({ type: "User", id: u.id })),
              { type: "User", id: "LIST" },
            ]
          : [{ type: "User", id: "LIST" }],
    }),

    getUser: builder.query({
      query: (id) => ({
        url: `${ADMIN_URL}/users/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "User", id }],
    }),

    // POST /admin/users/lecturer
    // body: { name, email, staffId, department, phone? }
    createLecturer: builder.mutation({
      query: (data) => ({
        url: `${ADMIN_URL}/users/lecturer`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),

    // PATCH /admin/users/:id
    // body: { name?, phone?, department?, level? }
    updateUser: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${ADMIN_URL}/users/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),

    // PATCH /admin/users/:id/status
    // body: { isActive: boolean }
    setUserStatus: builder.mutation({
      query: ({ id, isActive }) => ({
        url: `${ADMIN_URL}/users/${id}/status`,
        method: "PATCH",
        body: { isActive },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),

    deleteUser: builder.mutation({
      query: (id) => ({
        url: `${ADMIN_URL}/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),

    /* ============================================
       DEPARTMENTS
       ============================================ */

    listDepartments: builder.query({
      query: () => ({
        url: `${ADMIN_URL}/departments`,
        method: "GET",
      }),
      providesTags: (result) =>
        result?.departments
          ? [
              ...result.departments.map((d) => ({
                type: "Department",
                id: d._id,
              })),
              { type: "Department", id: "LIST" },
            ]
          : [{ type: "Department", id: "LIST" }],
    }),

    // body: { name, code }
    createDepartment: builder.mutation({
      query: (data) => ({
        url: `${ADMIN_URL}/departments`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Department", id: "LIST" }],
    }),

    // body: { name?, code? }
    updateDepartment: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${ADMIN_URL}/departments/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Department", id },
        { type: "Department", id: "LIST" },
      ],
    }),

    deleteDepartment: builder.mutation({
      query: (id) => ({
        url: `${ADMIN_URL}/departments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Department", id },
        { type: "Department", id: "LIST" },
      ],
    }),

    /* ============================================
       APPOINTMENTS
       ============================================ */

    // POST /admin/appointments/course-rep
    // body: { userId, courseOfferingId }
    appointCourseRep: builder.mutation({
      query: (data) => ({
        url: `${ADMIN_URL}/appointments/course-rep`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["CourseRep", { type: "User", id: "LIST" }],
    }),

    // DELETE /admin/appointments/course-rep/:appointmentId
    revokeCourseRep: builder.mutation({
      query: (appointmentId) => ({
        url: `${ADMIN_URL}/appointments/course-rep/${appointmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CourseRep", { type: "User", id: "LIST" }],
    }),

    // POST /admin/appointments/student-admin
    // body: { userId, departmentId, levels: [200, 300] }
    appointStudentAdmin: builder.mutation({
      query: (data) => ({
        url: `${ADMIN_URL}/appointments/student-admin`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["StudentAdmin", { type: "User", id: "LIST" }],
    }),

    // DELETE /admin/appointments/student-admin/:userId
    revokeStudentAdmin: builder.mutation({
      query: (userId) => ({
        url: `${ADMIN_URL}/appointments/student-admin/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["StudentAdmin", { type: "User", id: "LIST" }],
    }),

    // POST /admin/appointments/hod
    // body: { userId, departmentId }
    appointHod: builder.mutation({
      query: (data) => ({
        url: `${ADMIN_URL}/appointments/hod`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["HOD", { type: "User", id: "LIST" }],
    }),

    // DELETE /admin/appointments/hod/:userId
    revokeHod: builder.mutation({
      query: (userId) => ({
        url: `${ADMIN_URL}/appointments/hod/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["HOD", { type: "User", id: "LIST" }],
    }),

    /* ============================================
       TEAMS
       ============================================ */

    listTeams: builder.query({
      query: () => ({
        url: `${ADMIN_URL}/teams`,
        method: "GET",
      }),
      providesTags: (result) =>
        result?.teams
          ? [
              ...result.teams.map((t) => ({ type: "Team", id: t._id })),
              { type: "Team", id: "LIST" },
            ]
          : [{ type: "Team", id: "LIST" }],
    }),

    // body: { name, description?, permissions?: [] }
    createTeam: builder.mutation({
      query: (data) => ({
        url: `${ADMIN_URL}/teams`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Team", id: "LIST" }],
    }),

    // POST /admin/teams/:id/members
    // body: { userId }
    addTeamMember: builder.mutation({
      query: ({ teamId, userId }) => ({
        url: `${ADMIN_URL}/teams/${teamId}/members`,
        method: "POST",
        body: { userId },
      }),
      invalidatesTags: (result, error, { teamId }) => [
        { type: "Team", id: teamId },
        { type: "Team", id: "LIST" },
        { type: "User", id: "LIST" },
      ],
    }),

    // DELETE /admin/teams/:id/members/:userId
    removeTeamMember: builder.mutation({
      query: ({ teamId, userId }) => ({
        url: `${ADMIN_URL}/teams/${teamId}/members/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { teamId }) => [
        { type: "Team", id: teamId },
        { type: "Team", id: "LIST" },
        { type: "User", id: "LIST" },
      ],
    }),

    deleteTeam: builder.mutation({
      query: (id) => ({
        url: `${ADMIN_URL}/teams/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Team", id },
        { type: "Team", id: "LIST" },
      ],
    }),

    /* ============================================
       SETTINGS
       ============================================ */

    getSettings: builder.query({
      query: () => ({
        url: `${ADMIN_URL}/settings`,
        method: "GET",
      }),
      providesTags: ["Settings"],
    }),

    // PATCH /admin/settings
    // body: any subset of:
    //   { allowStudentResultUpload, onlyHodOrLecturerUploads,
    //     allowCourseRepMaterialUpload, allowStudentQuizGeneration,
    //     currentSession, currentSemester }
    updateSettings: builder.mutation({
      query: (data) => ({
        url: `${ADMIN_URL}/settings`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Settings"],
    }),

    /* ============================================
       ACADEMIC SESSIONS
       ============================================ */

    listSessions: builder.query({
      query: () => ({
        url: `${ADMIN_URL}/sessions`,
        method: "GET",
      }),
      providesTags: (result) =>
        result?.sessions
          ? [
              ...result.sessions.map((s) => ({
                type: "AcademicSession",
                id: s._id,
              })),
              { type: "AcademicSession", id: "LIST" },
            ]
          : [{ type: "AcademicSession", id: "LIST" }],
    }),

    // body: { name, startDate, endDate, isCurrent? }
    createSession: builder.mutation({
      query: (data) => ({
        url: `${ADMIN_URL}/sessions`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "AcademicSession", id: "LIST" },
        "Settings",
      ],
    }),

    // PATCH /admin/sessions/:id/current
    setCurrentSession: builder.mutation({
      query: (id) => ({
        url: `${ADMIN_URL}/sessions/${id}/current`,
        method: "PATCH",
      }),
      invalidatesTags: [
        { type: "AcademicSession", id: "LIST" },
        "Settings",
      ],
    }),

    /* ============================================
       PROMOTIONS
       ============================================ */

    // POST /admin/promotions
    // body: { departmentId?, fromLevel, toLevel }
    promoteStudents: builder.mutation({
      query: (data) => ({
        url: `${ADMIN_URL}/promotions`,
        method: "POST",
        body: data,
      }),
      // mass user change → invalidate all user caches
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),

    /* ============================================
       AUDIT LOGS
       ============================================ */

    // GET /admin/audit-logs?actor=&action=&resource=&page=&limit=
    listAuditLogs: builder.query({
      query: (params = {}) => ({
        url: `${ADMIN_URL}/audit-logs`,
        method: "GET",
        params,
      }),
      providesTags: ["AuditLog"],
    }),
  }),
});

/* ============================================
   HOOKS
   ============================================ */
export const {
  // Users
  useListUsersQuery,
  useLazyListUsersQuery,
  useGetUserQuery,
  useLazyGetUserQuery,
  useCreateLecturerMutation,
  useUpdateUserMutation,
  useSetUserStatusMutation,
  useDeleteUserMutation,

  // Departments
  useListDepartmentsQuery,
  useLazyListDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,

  // Appointments
  useAppointCourseRepMutation,
  useRevokeCourseRepMutation,
  useAppointStudentAdminMutation,
  useRevokeStudentAdminMutation,
  useAppointHodMutation,
  useRevokeHodMutation,

  // Teams
  useListTeamsQuery,
  useLazyListTeamsQuery,
  useCreateTeamMutation,
  useAddTeamMemberMutation,
  useRemoveTeamMemberMutation,
  useDeleteTeamMutation,

  // Settings
  useGetSettingsQuery,
  useLazyGetSettingsQuery,
  useUpdateSettingsMutation,

  // Sessions
  useListSessionsQuery,
  useLazyListSessionsQuery,
  useCreateSessionMutation,
  useSetCurrentSessionMutation,

  // Promotions
  usePromoteStudentsMutation,

  // Audit
  useListAuditLogsQuery,
  useLazyListAuditLogsQuery,
} = adminApiSlice;