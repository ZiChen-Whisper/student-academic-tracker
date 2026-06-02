-- ============================================
-- 数据质量诊断SQL
-- 在DataGrip中全部选中执行，把结果贴给AI分析
-- ============================================

USE student_academic_tracker;

-- 1. 各表记录数
SELECT '1.各表记录数' AS diagnostic;
SELECT 'teacher' AS tbl, COUNT(*) AS cnt FROM teacher
UNION ALL SELECT 'subject', COUNT(*) FROM subject
UNION ALL SELECT 'class', COUNT(*) FROM class
UNION ALL SELECT 'student', COUNT(*) FROM student
UNION ALL SELECT 'exam_score', COUNT(*) FROM exam_score
UNION ALL SELECT 'learning_behavior', COUNT(*) FROM learning_behavior
UNION ALL SELECT 'family_background', COUNT(*) FROM family_background
UNION ALL SELECT 'risk_alert', COUNT(*) FROM risk_alert
UNION ALL SELECT 'learning_suggestion', COUNT(*) FROM learning_suggestion
UNION ALL SELECT 'course_schedule', COUNT(*) FROM course_schedule
UNION ALL SELECT 'student_subject', COUNT(*) FROM student_subject
UNION ALL SELECT 'nl2sql_log', COUNT(*) FROM nl2sql_log;

-- 2. student表：缺失值检查
SELECT '2.student缺失值' AS diagnostic;
SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN student_name IS NULL OR student_name = '' THEN 1 ELSE 0 END) AS null_name,
    SUM(CASE WHEN student_gender IS NULL THEN 1 ELSE 0 END) AS null_gender,
    SUM(CASE WHEN student_age IS NULL THEN 1 ELSE 0 END) AS null_age,
    SUM(CASE WHEN student_class_id IS NULL THEN 1 ELSE 0 END) AS null_class,
    SUM(CASE WHEN student_address IS NULL THEN 1 ELSE 0 END) AS null_address
FROM student;

-- 3. exam_score表：成绩范围检查
SELECT '3.exam_score成绩范围' AS diagnostic;
SELECT
    subject_id,
    exam_stage,
    MIN(score) AS min_score,
    MAX(score) AS max_score,
    ROUND(AVG(score), 2) AS avg_score,
    COUNT(*) AS cnt
FROM exam_score
GROUP BY subject_id, exam_stage
ORDER BY subject_id, exam_stage;

-- 4. exam_score表：外键完整性
SELECT '4.exam_score外键完整性' AS diagnostic;
SELECT 'orphan_exam_score' AS issue, COUNT(*) AS cnt
FROM exam_score e
LEFT JOIN student s ON e.student_id = s.student_id
WHERE s.student_id IS NULL
UNION ALL
SELECT 'orphan_exam_score_subject', COUNT(*)
FROM exam_score e
LEFT JOIN subject sub ON e.subject_id = sub.subject_id
WHERE sub.subject_id IS NULL;

-- 5. learning_behavior表：缺失值和范围检查
SELECT '5.learning_behavior检查' AS diagnostic;
SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN attendance_rate IS NULL THEN 1 ELSE 0 END) AS null_attendance,
    SUM(CASE WHEN study_hours IS NULL THEN 1 ELSE 0 END) AS null_study_hours,
    SUM(CASE WHEN sleep_hours IS NULL THEN 1 ELSE 0 END) AS null_sleep_hours,
    SUM(CASE WHEN motivation_level IS NULL OR motivation_level = '' THEN 1 ELSE 0 END) AS null_motivation,
    SUM(CASE WHEN previous_scores IS NULL THEN 1 ELSE 0 END) AS null_prev_scores,
    SUM(CASE WHEN internet_access IS NULL OR internet_access = '' THEN 1 ELSE 0 END) AS null_internet,
    SUM(CASE WHEN extracurricular IS NULL OR extracurricular = '' THEN 1 ELSE 0 END) AS null_extracurr,
    MIN(attendance_rate) AS min_attendance, MAX(attendance_rate) AS max_attendance,
    MIN(study_hours) AS min_study, MAX(study_hours) AS max_study,
    MIN(sleep_hours) AS min_sleep, MAX(sleep_hours) AS max_sleep
FROM learning_behavior;

-- 6. family_background表：缺失值检查
SELECT '6.family_background检查' AS diagnostic;
SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN father_edu IS NULL OR father_edu = '' THEN 1 ELSE 0 END) AS null_father_edu,
    SUM(CASE WHEN mother_edu IS NULL OR mother_edu = '' THEN 1 ELSE 0 END) AS null_mother_edu,
    SUM(CASE WHEN father_job IS NULL OR father_job = '' THEN 1 ELSE 0 END) AS null_father_job,
    SUM(CASE WHEN mother_job IS NULL OR mother_job = '' THEN 1 ELSE 0 END) AS null_mother_job,
    SUM(CASE WHEN family_income IS NULL OR family_income = '' THEN 1 ELSE 0 END) AS null_income,
    SUM(CASE WHEN family_support IS NULL OR family_support = '' THEN 1 ELSE 0 END) AS null_support,
    SUM(CASE WHEN fam_rel IS NULL THEN 1 ELSE 0 END) AS null_fam_rel
FROM family_background;

-- 7. student表：重复检查
SELECT '7.student重复检查' AS diagnostic;
SELECT student_id, COUNT(*) AS cnt
FROM student
GROUP BY student_id
HAVING cnt > 1;

-- 8. family_background表：student_id唯一性（应该1对1）
SELECT '8.family_background唯一性' AS diagnostic;
SELECT student_id, COUNT(*) AS cnt
FROM family_background
GROUP BY student_id
HAVING cnt > 1;

-- 9. student_subject表：重复选课检查
SELECT '9.student_subject重复' AS diagnostic;
SELECT student_id, subject_id, COUNT(*) AS cnt
FROM student_subject
GROUP BY student_id, subject_id
HAVING cnt > 1;

-- 10. student表：性别分布
SELECT '10.性别分布' AS diagnostic;
SELECT student_gender, COUNT(*) AS cnt FROM student GROUP BY student_gender;

-- 11. student表：年龄分布
SELECT '11.年龄分布' AS diagnostic;
SELECT student_age, COUNT(*) AS cnt FROM student WHERE student_age IS NOT NULL GROUP BY student_age ORDER BY student_age;

-- 12. 抽样数据：student
SELECT '12.student抽样' AS diagnostic;
SELECT * FROM student LIMIT 5;

-- 13. 抽样数据：exam_score
SELECT '13.exam_score抽样' AS diagnostic;
SELECT * FROM exam_score LIMIT 10;

-- 14. 抽样数据：learning_behavior
SELECT '14.learning_behavior抽样' AS diagnostic;
SELECT * FROM learning_behavior LIMIT 5;

-- 15. 抽样数据：family_background
SELECT '15.family_background抽样' AS diagnostic;
SELECT * FROM family_background LIMIT 5;

-- 16. motivation_level 枚举值检查
SELECT '16.motivation_level值' AS diagnostic;
SELECT motivation_level, COUNT(*) AS cnt FROM learning_behavior GROUP BY motivation_level;

-- 17. internet_access 枚举值检查
SELECT '17.internet_access值' AS diagnostic;
SELECT internet_access, COUNT(*) AS cnt FROM learning_behavior GROUP BY internet_access;

-- 18. extracurricular 枚举值检查
SELECT '18.extracurricular值' AS diagnostic;
SELECT extracurricular, COUNT(*) AS cnt FROM learning_behavior GROUP BY extracurricular;

-- 19. student_address 枚举值检查
SELECT '19.student_address值' AS diagnostic;
SELECT student_address, COUNT(*) AS cnt FROM student WHERE student_address IS NOT NULL AND student_address != '' GROUP BY student_address;

-- 20. fam_rel 范围检查
SELECT '20.fam_rel范围' AS diagnostic;
SELECT MIN(fam_rel) AS min_val, MAX(fam_rel) AS max_val, AVG(fam_rel) AS avg_val FROM family_background WHERE fam_rel IS NOT NULL;
