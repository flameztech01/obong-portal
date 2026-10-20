// slices/academicApiSlice.js
import { apiSlice } from "./apiSlice.js";

const ACADEMIC_URL = "/academic";

export const academicApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /* ============================================
       COURSES (catalog)
       ============================================ */

    // GET /academic/courses?department=&level=&search=&page=&limit=
    listCourses: builder.query({
      query: (params = {}) => ({
        url: `${ACADEMIC_URL}/courses`,
        method: "GET",
        params,
      }),
      providesTags: (result) =>
        result?.courses
          ? [
              ...result.courses.map((c) => ({ type: "Course", id: c.id })),
              { type: "Course", id: "LIST" },
            ]
          : [{ type: "Course", id: "LIST" }],
    }),

    getCourse: builder.query({
      query: (id) => ({
        url: `${ACADEMIC_URL}/courses/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Course", id }],
    }),

    // POST /academic/courses
    // body: { code, title, units, department, level, description? }
    createCourse: builder.mutation({
      query: (data) => ({
        url: `${ACADEMIC_URL}/courses`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Course", id: "LIST" }],
    }),

    // ✅ NEW: POST /academic/courses/bulk
    // body: { courses: [{ code, title, units, level }], departmentId? }
    bulkCreateCourses: builder.mutation({
      query: (data) => ({
        url: `${ACADEMIC_URL}/courses/bulk`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Course", id: "LIST" }],
    }),

    // PATCH /academic/courses/:id
    // body: { title?, units?, description? }
    updateCourse: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${ACADEMIC_URL}/courses/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Course", id },
        { type: "Course", id: "LIST" },
      ],
    }),

    deleteCourse: builder.mutation({
      query: (id) => ({
        url: `${ACADEMIC_URL}/courses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Course", id },
        { type: "Course", id: "LIST" },
      ],
    }),

    /* ============================================
       OFFERINGS
       ============================================ */

    // GET /academic/offerings?department=&level=&session=&semester=&lecturer=
    listOfferings: builder.query({
      query: (params = {}) => ({
        url: `${ACADEMIC_URL}/offerings`,
        method: "GET",
        params,
      }),
      providesTags: (result) =>
        result?.offerings
          ? [
              ...result.offerings.map((o) => ({ type: "Offering", id: o.id })),
              { type: "Offering", id: "LIST" },
            ]
          : [{ type: "Offering", id: "LIST" }],
    }),

    // POST /academic/offerings
    // body: { courseId, sessionId, semester, lecturer? }
    createOffering: builder.mutation({
      query: (data) => ({
        url: `${ACADEMIC_URL}/offerings`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Offering", id: "LIST" }],
    }),

    // PATCH /academic/offerings/:id
    // body: { lecturer?, semester? }
    updateOffering: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${ACADEMIC_URL}/offerings/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Offering", id },
        { type: "Offering", id: "LIST" },
      ],
    }),

    deleteOffering: builder.mutation({
      query: (id) => ({
        url: `${ACADEMIC_URL}/offerings/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Offering", id },
        { type: "Offering", id: "LIST" },
      ],
    }),

    // GET /academic/offerings/:id/roster
    getOfferingRoster: builder.query({
      query: (id) => ({
        url: `${ACADEMIC_URL}/offerings/${id}/roster`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Roster", id }],
    }),

    /* ============================================
       ENROLLMENTS
       ============================================ */

    // GET /academic/enrollments/me?sessionId=
    listMyEnrollments: builder.query({
      query: (params = {}) => ({
        url: `${ACADEMIC_URL}/enrollments/me`,
        method: "GET",
        params,
      }),
      providesTags: ["Enrollment"],
    }),

    // POST /academic/enrollments
    // body: { offeringId }
    enrollSelf: builder.mutation({
      query: (data) => ({
        url: `${ACADEMIC_URL}/enrollments`,
        method: "POST",
        body: data, // { offeringId }
      }),
      invalidatesTags: ["Enrollment", { type: "Offering", id: "LIST" }],
    }),

    // DELETE /academic/enrollments/:id
    unenrollSelf: builder.mutation({
      query: (id) => ({
        url: `${ACADEMIC_URL}/enrollments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Enrollment", { type: "Offering", id: "LIST" }],
    }),

    /* ============================================
       EXAM WINDOWS
       ============================================ */

    // GET /academic/exam-windows?offering=&department=&level=&session=&activeOnly=
    listExamWindows: builder.query({
      query: (params = {}) => ({
        url: `${ACADEMIC_URL}/exam-windows`,
        method: "GET",
        params,
      }),
      providesTags: (result) =>
        result?.examWindows
          ? [
              ...result.examWindows.map((w) => ({
                type: "ExamWindow",
                id: w.id,
              })),
              { type: "ExamWindow", id: "LIST" },
            ]
          : [{ type: "ExamWindow", id: "LIST" }],
    }),

    // POST /academic/exam-windows
    // body: { offeringId, startTime, endTime, type?, location? }
    createExamWindow: builder.mutation({
      query: (data) => ({
        url: `${ACADEMIC_URL}/exam-windows`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "ExamWindow", id: "LIST" }],
    }),

    // PATCH /academic/exam-windows/:id
    // body: { startTime?, endTime?, type?, location?, isActive? }
    updateExamWindow: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${ACADEMIC_URL}/exam-windows/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "ExamWindow", id },
        { type: "ExamWindow", id: "LIST" },
      ],
    }),

    deleteExamWindow: builder.mutation({
      query: (id) => ({
        url: `${ACADEMIC_URL}/exam-windows/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "ExamWindow", id },
        { type: "ExamWindow", id: "LIST" },
      ],
    }),

    /* ============================================
       CALENDARS
       ============================================ */

    // GET /academic/calendars/current
    getCurrentCalendar: builder.query({
      query: () => ({
        url: `${ACADEMIC_URL}/calendars/current`,
        method: "GET",
      }),
      providesTags: ["Calendar"],
    }),

    // GET /academic/calendars?sessionId=
    listCalendars: builder.query({
      query: (params = {}) => ({
        url: `${ACADEMIC_URL}/calendars`,
        method: "GET",
        params,
      }),
      providesTags: ["Calendar"],
    }),

    // POST /academic/calendars  (multipart, field name = "document")
    // formData should already include "document" file AND "sessionId" (optional)
    uploadCalendar: builder.mutation({
      query: (formData) => ({
        url: `${ACADEMIC_URL}/calendars`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Calendar"],
    }),

    deleteCalendar: builder.mutation({
      query: (id) => ({
        url: `${ACADEMIC_URL}/calendars/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Calendar"],
    }),
  }),
});

/* ============================================
   HOOKS
   ============================================ */
export const {
  // Courses
  useListCoursesQuery,
  useLazyListCoursesQuery,
  useGetCourseQuery,
  useLazyGetCourseQuery,
  useCreateCourseMutation,
  useBulkCreateCoursesMutation, // ✅ NEW EXPORT
  useUpdateCourseMutation,
  useDeleteCourseMutation,

  // Offerings
  useListOfferingsQuery,
  useLazyListOfferingsQuery,
  useCreateOfferingMutation,
  useUpdateOfferingMutation,
  useDeleteOfferingMutation,
  useGetOfferingRosterQuery,
  useLazyGetOfferingRosterQuery,

  // Enrollments
  useListMyEnrollmentsQuery,
  useLazyListMyEnrollmentsQuery,
  useEnrollSelfMutation,
  useUnenrollSelfMutation,

  // Exam windows
  useListExamWindowsQuery,
  useLazyListExamWindowsQuery,
  useCreateExamWindowMutation,
  useUpdateExamWindowMutation,
  useDeleteExamWindowMutation,

  // Calendars
  useGetCurrentCalendarQuery,
  useLazyGetCurrentCalendarQuery,
  useListCalendarsQuery,
  useLazyListCalendarsQuery,
  useUploadCalendarMutation,
  useDeleteCalendarMutation,
} = academicApiSlice;