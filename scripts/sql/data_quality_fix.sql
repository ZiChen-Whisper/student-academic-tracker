-- ============================================
-- 数据质量修正SQL
-- 根据AI辅助数据质量校验结果，修正发现的问题
-- ============================================

USE student_academic_tracker;

-- 修正1：将超过100的成绩截断为100
-- 问题：SUBJ_GENERAL(G3) 最高分为101，超出0-100合理范围
UPDATE exam_score
SET score = 100
WHERE subject_id = 'SUBJ_GENERAL' AND score > 100;

-- 验证修正结果
SELECT '修正后SUBJ_GENERAL成绩范围' AS check_name;
SELECT MIN(score) AS min_score, MAX(score) AS max_score, AVG(score) AS avg_score
FROM exam_score
WHERE subject_id = 'SUBJ_GENERAL';

-- 修正2：将student_address的U/R转为中文
-- U=Urban(城市), R=Rural(农村)
UPDATE student SET student_address = '城市' WHERE student_address = 'U';
UPDATE student SET student_address = '农村' WHERE student_address = 'R';

-- 验证修正结果
SELECT '修正后address值分布' AS check_name;
SELECT student_address, COUNT(*) AS cnt FROM student
WHERE student_address IS NOT NULL AND student_address != ''
GROUP BY student_address;
