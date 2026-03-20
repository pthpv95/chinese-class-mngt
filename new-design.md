Read design-system.md and coding-rules.md first.

Then update the entire app theme to a cute pink color palette that students will love. The aesthetic should feel friendly, warm, and modern — think soft pinks with white cards, not hot pink.

Replace every color token across the codebase with this new palette:

PRIMARY PALETTE:
- Primary action: pink-500 / hover: pink-600
- Primary ring/focus: pink-500
- Accent: rose-400
- Highlight: fuchsia-500 (use sparingly, CTAs only)

BACKGROUNDS:
- Page bg: rose-50 dark:gray-950
- Card surface: white dark:gray-900
- Sidebar bg: white dark:gray-900
- Sidebar active item: pink-50 dark:pink-950
- Input bg: white dark:gray-800

BORDERS:
- Default border: pink-100 dark:gray-800
- Input border: pink-200 dark:gray-700
- Input focus border: pink-400
- Card border: pink-100 dark:gray-800

TEXT:
- Primary: gray-900 dark:white (unchanged)
- Secondary: gray-500 dark:gray-400 (unchanged)
- Link / interactive: pink-600 dark:pink-400
- Success: emerald-600 (unchanged)
- Error: rose-600 (unchanged)

BADGE COLORS (replace the ExerciseBadge component):
- MCQ / Quiz: bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300
- FILL_BLANK: bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300
- SHORT_ANSWER: bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300
- AUDIO_RECORDING: bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300
- PENDING: bg-amber-100 text-amber-800
- SUBMITTED: bg-pink-100 text-pink-800
- GRADED: bg-emerald-100 text-emerald-800

COMPONENT RECIPES (replace these exactly):

Primary button:
px-4 py-2.5 bg-pink-500 hover:bg-pink-600 active:scale-95 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed

Secondary button:
px-4 py-2.5 border border-pink-200 dark:border-gray-700 text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-gray-800 text-sm font-medium rounded-lg transition-colors

Text input:
w-full rounded-lg border border-pink-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-pink-300 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent

Card:
bg-white dark:bg-gray-900 rounded-xl border border-pink-100 dark:border-gray-800 p-5

Sidebar active link:
bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 font-medium

SIDEBAR & NAVIGATION:
- App name "EduFlow": text-pink-600 dark:text-pink-400 font-bold
- Sidebar border: border-pink-100 dark:border-gray-800
- Nav link hover: hover:bg-pink-50 dark:hover:bg-gray-800 hover:text-pink-700 dark:hover:text-pink-300

TAILWIND CONFIG:
Update tailwind.config.ts to set pink as the primary color so ring, focus, and accent utilities default to pink:
  theme: { extend: { colors: { primary: colors.pink } } }

SPECIFIC TOUCHES to make it feel cute and student-friendly:
1. Add a small ✦ or 🎀 emoji next to the app name in the sidebar (use text, not an image)
2. On the student dashboard empty state, use this copy: "No exercises yet ✨ — ask your teacher for the class code to get started"
3. On the login page, change the subtitle to: "Welcome back! Ready to learn today? 🌸"
4. Make the submit button on exercises say "Submit ✓" instead of just "Submit"
5. On the graded badge, show a small star: "★ Graded"

SCOPE:
- Update app/layout.tsx (body background)
- Update app/(auth)/login/page.tsx
- Update app/(dashboard)/layout.tsx (sidebar)
- Update components/ui/ExerciseBadge.tsx
- Update all button and input className strings in:
  - components/teacher/ExerciseBuilder.tsx
  - components/teacher/SubmissionReviewer.tsx
  - components/exercise-types/*.tsx
- Update design-system.md to reflect the new palette

DO NOT change:
- Any TypeScript logic
- API routes
- Database schema
- Test files
- Any file in /lib (except design-system.md)

After all changes run:
  npx tsc --noEmit
  npm run lint
and fix any errors before reporting done.