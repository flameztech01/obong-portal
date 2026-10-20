// slices/aiApiSlice.js
import { apiSlice } from "./apiSlice.js";

const AI_URL = "/ai";

export const aiApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /* ============================================
       PARSE CALENDAR (admin)
       ============================================ */

    // POST /ai/parse/calendar
    // body: { calendarId }
    // Returns: { calendar } with parsedData populated
    parseCalendar: builder.mutation({
      query: (data) => ({
        url: `${AI_URL}/parse/calendar`,
        method: "POST",
        body: data, // { calendarId }
      }),
      invalidatesTags: (result, error, { calendarId }) => [
        "Calendar",
        { type: "Calendar", id: calendarId },
      ],
    }),

    /* ============================================
       PARSE RESULT DOCUMENT (lecturer / HOD / admin / self-uploader)
       ============================================ */

    // POST /ai/parse/result
    // body: { uploadId }
    // Returns: { upload: { id, parsingStatus, rowCount, matchedCount,
    //                     needsReviewCount, rows }, aiWarnings }
    parseResult: builder.mutation({
      query: (data) => ({
        url: `${AI_URL}/parse/result`,
        method: "POST",
        body: data, // { uploadId }
      }),
      // The upload row gets mutated (parsedRows, parsingStatus)
      invalidatesTags: (result, error, { uploadId }) => [
        { type: "ResultUpload", id: uploadId },
        { type: "ResultUpload", id: "LIST" },
      ],
    }),

    /* ============================================
       PARSE COURSE ALLOCATION (admin / student admin)
       ============================================ */

    // POST /ai/parse/courses
    // body: FormData (document, session, semester)
    // Returns: { courses: [{ level, code, title, units }] }
    parseCourseDocument: builder.mutation({
      query: (formData) => ({
        url: `${AI_URL}/parse/courses`,
        method: "POST",
        body: formData,
      }),
      // No specific tags to invalidate yet, as we only parse and return data.
      // The actual insertion happens via bulkCreateCourses.
    }),

    /* ============================================
       SUMMARIZE MATERIAL
       ============================================ */

    // POST /ai/summarize
    // body: { materialId }
    // Returns: { material, summary: { summary, keyPoints[], definitions[], questionsToConsider[] } }
    summarizeMaterial: builder.mutation({
      query: (data) => ({
        url: `${AI_URL}/summarize`,
        method: "POST",
        body: data, // { materialId }
      }),
      // Summaries are ephemeral per-request — no cache to invalidate
    }),

    /* ============================================
       STUDY CHAT
       ============================================ */

    // POST /ai/chat
    // body: { materialId, message, history: [{ role, content }] }
    // Returns: { reply, material }
    chatWithMaterial: builder.mutation({
      query: (data) => ({
        url: `${AI_URL}/chat`,
        method: "POST",
        body: data, // { materialId, message, history }
      }),
      // Conversational — no cache
    }),

    /* ============================================
       GENERATE QUIZ
       ============================================ */

    // POST /ai/generate-quiz
    // body: { materialId, count?, types?, marksPerQuestion?, title? }
    // Returns: { quiz: { id, title, type, totalMarks, status, aiGenerated, questions[] } }
    generateQuiz: builder.mutation({
      query: (data) => ({
        url: `${AI_URL}/generate-quiz`,
        method: "POST",
        body: data,
      }),
      // A new draft Quiz is created — invalidate quiz lists
      invalidatesTags: [{ type: "Quiz", id: "LIST" }],
    }),
  }),
});

/* ============================================
   HOOKS
   ============================================ */
export const {
  useParseCalendarMutation,
  useParseResultMutation,
  useParseCourseDocumentMutation, // 👈 ADDED EXPORT
  useSummarizeMaterialMutation,
  useChatWithMaterialMutation,
  useGenerateQuizMutation,
} = aiApiSlice;