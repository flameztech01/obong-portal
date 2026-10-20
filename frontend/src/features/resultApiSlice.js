// slices/resultApiSlice.js
import { apiSlice } from "./apiSlice.js";

const RESULT_URL = "/results";

export const resultApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /* ============================================
       HISTORICAL COURSES (For Dropdowns / Transfer)
       ============================================ */

    // GET /results/historical-courses
    // Returns grouped courses (100L, 200L, etc.) and transfer student status
    getHistoricalCourses: builder.query({
      query: () => ({
        url: `${RESULT_URL}/historical-courses`,
        method: "GET",
      }),
      providesTags: ["Course"],
    }),

    /* ============================================
       UPLOADS — CREATE
       ============================================ */

    // POST /results/uploads/lecturer  (multipart)
    // formData must contain: "offeringId" AND "document" file
    createLecturerUpload: builder.mutation({
      query: (formData) => ({
        url: `${RESULT_URL}/uploads/lecturer`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: [{ type: "ResultUpload", id: "LIST" }],
    }),

    // POST /results/uploads/self  (multipart OR JSON)
    // - document mode: formData with "document" file
    // - manual mode:   JSON body { rows: [...], transferCgpa?: number, transferCredits?: number }
    createSelfUpload: builder.mutation({
      query: (payload) => ({
        url: `${RESULT_URL}/uploads/self`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [
        { type: "ResultUpload", id: "LIST" },
        "User", // hasUploadedHistoricalResults may flip on publish
      ],
    }),

    /* ============================================
       UPLOADS — READ
       ============================================ */

    // GET /results/uploads?offering=&session=&type=&publishStatus=&mine=&page=&limit=
    listUploads: builder.query({
      query: (params = {}) => ({
        url: `${RESULT_URL}/uploads`,
        method: "GET",
        params,
      }),
      providesTags: (result) =>
        result?.uploads
          ? [
              ...result.uploads.map((u) => ({
                type: "ResultUpload",
                id: u.id,
              })),
              { type: "ResultUpload", id: "LIST" },
            ]
          : [{ type: "ResultUpload", id: "LIST" }],
    }),

    // GET /results/uploads/:id — includes parsedRows + populated student
    getUpload: builder.query({
      query: (id) => ({
        url: `${RESULT_URL}/uploads/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "ResultUpload", id }],
    }),

    /* ============================================
       UPLOADS — EDIT / PUBLISH / DELETE
       ============================================ */

    // PATCH /results/uploads/:id/rows
    // body: { rows: [...] }  (full replacement, must match server schema)
    editUploadRows: builder.mutation({
      query: ({ id, rows }) => ({
        url: `${RESULT_URL}/uploads/${id}/rows`,
        method: "PATCH",
        body: { rows },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "ResultUpload", id },
        { type: "ResultUpload", id: "LIST" },
      ],
    }),

    // POST /results/uploads/:id/publish
    // -> creates live Result records; response includes { published, skipped }
    publishUpload: builder.mutation({
      query: (id) => ({
        url: `${RESULT_URL}/uploads/${id}/publish`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "ResultUpload", id },
        { type: "ResultUpload", id: "LIST" },
        "Result",
        "GPA",
        "User", // hasUploadedHistoricalResults may flip
      ],
    }),

    // DELETE /results/uploads/:id  (draft only)
    deleteUpload: builder.mutation({
      query: (id) => ({
        url: `${RESULT_URL}/uploads/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "ResultUpload", id },
        { type: "ResultUpload", id: "LIST" },
      ],
    }),

    /* ============================================
       RESULTS — STUDENT VIEWS
       ============================================ */

    // GET /results/me?session=&semester=
    getMyResults: builder.query({
      query: (params = {}) => ({
        url: `${RESULT_URL}/me`,
        method: "GET",
        params,
      }),
      providesTags: (result) =>
        result?.results
          ? [
              ...result.results.map((r) => ({
                type: "Result",
                id: r.id,
              })),
              { type: "Result", id: "ME" },
            ]
          : [{ type: "Result", id: "ME" }],
    }),

    // GET /results/me/gpa
    // returns { sessionBreakdown, cumulative, carryovers, totalCourses, transferData }
    getMyGpa: builder.query({
      query: () => ({
        url: `${RESULT_URL}/me/gpa`,
        method: "GET",
      }),
      providesTags: ["GPA"],
    }),

    /* ============================================
       RESULTS — STAFF VIEWS
       ============================================ */

    // GET /results/student/:studentId  (admin / HOD / assigned lecturer)
    getStudentResults: builder.query({
      query: (studentId) => ({
        url: `${RESULT_URL}/student/${studentId}`,
        method: "GET",
      }),
      providesTags: (result, error, studentId) => [
        { type: "Result", id: `STUDENT_${studentId}` },
      ],
    }),

    // GET /results/offering/:offeringId
    // (admin / assigned lecturer / HOD / active course rep)
    getOfferingResults: builder.query({
      query: (offeringId) => ({
        url: `${RESULT_URL}/offering/${offeringId}`,
        method: "GET",
      }),
      providesTags: (result, error, offeringId) => [
        { type: "Result", id: `OFFERING_${offeringId}` },
      ],
    }),
  }),
});

/* ============================================
   HOOKS
   ============================================ */
export const {
  // Historical Courses
  useGetHistoricalCoursesQuery,
  useLazyGetHistoricalCoursesQuery,

  // Uploads — create
  useCreateLecturerUploadMutation,
  useCreateSelfUploadMutation,

  // Uploads — read
  useListUploadsQuery,
  useLazyListUploadsQuery,
  useGetUploadQuery,
  useLazyGetUploadQuery,

  // Uploads — edit/publish/delete
  useEditUploadRowsMutation,
  usePublishUploadMutation,
  useDeleteUploadMutation,

  // Results — student
  useGetMyResultsQuery,
  useLazyGetMyResultsQuery,
  useGetMyGpaQuery,
  useLazyGetMyGpaQuery,

  // Results — staff
  useGetStudentResultsQuery,
  useLazyGetStudentResultsQuery,
  useGetOfferingResultsQuery,
  useLazyGetOfferingResultsQuery,
} = resultApiSlice;