// slices/studyApiSlice.js
import { apiSlice } from "./apiSlice.js";

const STUDY_URL = "/study";

export const studyApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /* ============================================
       MATERIALS
       ============================================ */

    // POST /study/materials  (multipart)
    // formData must contain: "document" file
    //               + text fields: "offeringId", "title", "description?", "type?"
    uploadMaterial: builder.mutation({
      query: (formData) => ({
        url: `${STUDY_URL}/materials`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: [{ type: "Material", id: "LIST" }],
    }),

    // GET /study/materials?offering=&level=&type=&search=&page=&limit=
    listMaterials: builder.query({
      query: (params = {}) => ({
        url: `${STUDY_URL}/materials`,
        method: "GET",
        params,
      }),
      providesTags: (result) =>
        result?.materials
          ? [
              ...result.materials.map((m) => ({
                type: "Material",
                id: m.id,
              })),
              { type: "Material", id: "LIST" },
            ]
          : [{ type: "Material", id: "LIST" }],
    }),

    getMaterial: builder.query({
      query: (id) => ({
        url: `${STUDY_URL}/materials/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Material", id }],
    }),

    deleteMaterial: builder.mutation({
      query: (id) => ({
        url: `${STUDY_URL}/materials/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Material", id },
        { type: "Material", id: "LIST" },
      ],
    }),

    /* ============================================
       QUIZZES — CRUD
       ============================================ */

    // POST /study/quizzes
    // body: { offeringId, title, description?, type?, durationMinutes?,
    //         startTime?, endTime?, questions[], aiGenerated? }
    createQuiz: builder.mutation({
      query: (data) => ({
        url: `${STUDY_URL}/quizzes`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Quiz", id: "LIST" }],
    }),

    // GET /study/quizzes?offering=&status=&page=&limit=
    listQuizzes: builder.query({
      query: (params = {}) => ({
        url: `${STUDY_URL}/quizzes`,
        method: "GET",
        params,
      }),
      providesTags: (result) =>
        result?.quizzes
          ? [
              ...result.quizzes.map((q) => ({ type: "Quiz", id: q.id })),
              { type: "Quiz", id: "LIST" },
            ]
          : [{ type: "Quiz", id: "LIST" }],
    }),

    // GET /study/quizzes/:id
    // - Students: answers hidden until they submit
    // - Staff:    answers included
    getQuiz: builder.query({
      query: (id) => ({
        url: `${STUDY_URL}/quizzes/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Quiz", id }],
    }),

    // PATCH /study/quizzes/:id — draft only
    updateQuiz: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${STUDY_URL}/quizzes/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Quiz", id },
        { type: "Quiz", id: "LIST" },
      ],
    }),

    // POST /study/quizzes/:id/publish
    publishQuiz: builder.mutation({
      query: (id) => ({
        url: `${STUDY_URL}/quizzes/${id}/publish`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Quiz", id },
        { type: "Quiz", id: "LIST" },
      ],
    }),

    // POST /study/quizzes/:id/close
    closeQuiz: builder.mutation({
      query: (id) => ({
        url: `${STUDY_URL}/quizzes/${id}/close`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Quiz", id },
        { type: "Quiz", id: "LIST" },
      ],
    }),

    deleteQuiz: builder.mutation({
      query: (id) => ({
        url: `${STUDY_URL}/quizzes/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Quiz", id },
        { type: "Quiz", id: "LIST" },
        { type: "QuizAttempt", id: "LIST" },
      ],
    }),

    /* ============================================
       QUIZ ATTEMPTS — STUDENT
       ============================================ */

    // POST /study/quizzes/:id/start
    // - creates a new attempt, or resumes an in_progress one
    startAttempt: builder.mutation({
      query: (quizId) => ({
        url: `${STUDY_URL}/quizzes/${quizId}/start`,
        method: "POST",
      }),
      invalidatesTags: (result, error, quizId) => [
        { type: "QuizAttempt", id: "ME" },
        { type: "Quiz", id: quizId },
      ],
    }),

    // POST /study/quizzes/:id/submit
    // body: { answers: [{ questionId, answer }] }
    submitAttempt: builder.mutation({
      query: ({ quizId, answers }) => ({
        url: `${STUDY_URL}/quizzes/${quizId}/submit`,
        method: "POST",
        body: { answers },
      }),
      invalidatesTags: (result, error, { quizId }) => [
        { type: "QuizAttempt", id: "ME" },
        { type: "Quiz", id: quizId },
      ],
    }),

    // GET /study/attempts/me
    listMyAttempts: builder.query({
      query: () => ({
        url: `${STUDY_URL}/attempts/me`,
        method: "GET",
      }),
      providesTags: (result) =>
        result?.attempts
          ? [
              ...result.attempts.map((a) => ({
                type: "QuizAttempt",
                id: a.id,
              })),
              { type: "QuizAttempt", id: "ME" },
            ]
          : [{ type: "QuizAttempt", id: "ME" }],
    }),

    // GET /study/attempts/:id
    // - student: own attempt with quiz answers
    // - staff:   any attempt for quizzes they can manage
    getAttempt: builder.query({
      query: (id) => ({
        url: `${STUDY_URL}/attempts/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "QuizAttempt", id }],
    }),

    /* ============================================
       QUIZ ATTEMPTS — STAFF
       ============================================ */

    // GET /study/quizzes/:id/attempts
    // (admin / assigned lecturer / HOD / course rep)
    listQuizAttempts: builder.query({
      query: (quizId) => ({
        url: `${STUDY_URL}/quizzes/${quizId}/attempts`,
        method: "GET",
      }),
      providesTags: (result, error, quizId) => [
        { type: "QuizAttempt", id: `QUIZ_${quizId}` },
      ],
    }),

    // PATCH /study/attempts/:id/grade
    // body: { grades: [{ questionId, awardedMarks, feedback? }] }
    gradeAttempt: builder.mutation({
      query: ({ id, grades }) => ({
        url: `${STUDY_URL}/attempts/${id}/grade`,
        method: "PATCH",
        body: { grades },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "QuizAttempt", id },
        { type: "QuizAttempt", id: "LIST" },
        { type: "QuizAttempt", id: "QUIZ_LIST" },
      ],
    }),
  }),
});

/* ============================================
   HOOKS
   ============================================ */
export const {
  // Materials
  useUploadMaterialMutation,
  useListMaterialsQuery,
  useLazyListMaterialsQuery,
  useGetMaterialQuery,
  useLazyGetMaterialQuery,
  useDeleteMaterialMutation,

  // Quizzes — CRUD
  useCreateQuizMutation,
  useListQuizzesQuery,
  useLazyListQuizzesQuery,
  useGetQuizQuery,
  useLazyGetQuizQuery,
  useUpdateQuizMutation,
  usePublishQuizMutation,
  useCloseQuizMutation,
  useDeleteQuizMutation,

  // Attempts — student
  useStartAttemptMutation,
  useSubmitAttemptMutation,
  useListMyAttemptsQuery,
  useLazyListMyAttemptsQuery,
  useGetAttemptQuery,
  useLazyGetAttemptQuery,

  // Attempts — staff
  useListQuizAttemptsQuery,
  useLazyListQuizAttemptsQuery,
  useGradeAttemptMutation,
} = studyApiSlice;