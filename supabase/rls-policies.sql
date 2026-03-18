-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- USERS: users can read their own record
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid()::text = id);

-- CLASSES: teacher sees own classes, student sees enrolled classes
CREATE POLICY "classes_teacher_all" ON classes
  FOR ALL USING (auth.uid()::text = teacher_id);

CREATE POLICY "classes_student_select" ON classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_enrollments
      WHERE class_id = classes.id AND student_id = auth.uid()::text
    )
  );

-- CLASS ENROLLMENTS
CREATE POLICY "enrollments_teacher_select" ON class_enrollments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid()::text)
  );

CREATE POLICY "enrollments_student_own" ON class_enrollments
  FOR ALL USING (student_id = auth.uid()::text);

-- EXERCISES: teacher CRUD own, student select published in enrolled classes
CREATE POLICY "exercises_teacher_all" ON exercises
  FOR ALL USING (created_by_id = auth.uid()::text);

CREATE POLICY "exercises_student_select" ON exercises
  FOR SELECT USING (
    published = true AND
    EXISTS (
      SELECT 1 FROM class_enrollments
      WHERE class_id = exercises.class_id AND student_id = auth.uid()::text
    )
  );

-- SUBMISSIONS: student own, teacher reads submissions on their exercises
CREATE POLICY "submissions_student_own" ON submissions
  FOR ALL USING (student_id = auth.uid()::text);

CREATE POLICY "submissions_teacher_select" ON submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM exercises
      WHERE id = submissions.exercise_id AND created_by_id = auth.uid()::text
    )
  );

CREATE POLICY "submissions_teacher_update" ON submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM exercises
      WHERE id = submissions.exercise_id AND created_by_id = auth.uid()::text
    )
  );

-- NOTE: The Next.js app uses the SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
-- These policies protect direct database access (e.g. Supabase Studio, direct queries).
-- The app enforces its own role checks in every API route.
