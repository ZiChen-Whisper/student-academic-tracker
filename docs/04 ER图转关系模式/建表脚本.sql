-- ============================================
-- 中小学学生学业发展动态跟踪与预警系统
-- 数据库建表脚本（DDL）
-- 组长：邹子晨
-- 日期：2026年6月1日
-- ============================================
-- 修改记录：
--   1. 统一命名风格为 snake_case（MySQL惯例）
--   2. learning_behavior 表补充 record_date 字段
--   3. 外键添加 ON DELETE / ON UPDATE 子句
-- ============================================

CREATE DATABASE IF NOT EXISTS student_academic_tracker
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE student_academic_tracker;

-- 1. 教师表（先创建被引用的表）
CREATE TABLE teacher (
    teacher_id        VARCHAR(20) PRIMARY KEY,
    teacher_name      VARCHAR(50) NOT NULL,
    teacher_gender    ENUM('M','F'),
    teacher_title     VARCHAR(30)
);

-- 2. 科目表
CREATE TABLE subject (
    subject_id       VARCHAR(20) PRIMARY KEY,
    subject_name     VARCHAR(50) NOT NULL,
    subject_credit   INT,
    subject_type     VARCHAR(20)
);

-- 3. 班级表
CREATE TABLE class (
    class_id          VARCHAR(20) PRIMARY KEY,
    class_name        VARCHAR(50) NOT NULL,
    class_grade       VARCHAR(10),
    class_teacher_id  VARCHAR(20),
    FOREIGN KEY (class_teacher_id) REFERENCES teacher(teacher_id)
        ON DELETE SET NULL ON UPDATE CASCADE
);

-- 4. 学生表
CREATE TABLE student (
    student_id       VARCHAR(20) PRIMARY KEY,
    student_name     VARCHAR(50) NOT NULL,
    student_gender   ENUM('M','F'),
    student_age      INT,
    student_class_id VARCHAR(20),
    student_address  VARCHAR(100),
    FOREIGN KEY (student_class_id) REFERENCES class(class_id)
        ON DELETE SET NULL ON UPDATE CASCADE
);

-- 5. 考试成绩表
CREATE TABLE exam_score (
    score_id        INT AUTO_INCREMENT PRIMARY KEY,
    student_id      VARCHAR(20) NOT NULL,
    subject_id      VARCHAR(20) NOT NULL,
    score           INT NOT NULL,
    score_date      DATE,
    exam_stage      VARCHAR(10),
    FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subject(subject_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 6. 学习行为表
CREATE TABLE learning_behavior (
    behavior_id         INT AUTO_INCREMENT PRIMARY KEY,
    student_id          VARCHAR(20) NOT NULL,
    attendance_rate     INT,
    study_hours         INT,
    sleep_hours         INT,
    motivation_level    VARCHAR(10),
    previous_scores     INT,
    tutoring_sessions   INT,
    internet_access     VARCHAR(5),
    extracurricular     VARCHAR(5),
    physical_activity   INT,
    record_date         DATE,
    FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 7. 家庭背景表
CREATE TABLE family_background (
    family_id            INT AUTO_INCREMENT PRIMARY KEY,
    student_id           VARCHAR(20) NOT NULL UNIQUE,
    father_edu           VARCHAR(20),
    mother_edu           VARCHAR(20),
    father_job           VARCHAR(30),
    mother_job           VARCHAR(30),
    family_income        VARCHAR(20),
    family_support       VARCHAR(10),
    parental_involvement VARCHAR(10),
    fam_rel              INT,
    FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 8. 风险预警表
CREATE TABLE risk_alert (
    alert_id              INT AUTO_INCREMENT PRIMARY KEY,
    student_id            VARCHAR(20) NOT NULL,
    risk_level            ENUM('low','medium','high') NOT NULL,
    alert_time            DATETIME NOT NULL,
    risk_factors          TEXT,
    intervention_status   ENUM('pending','in_progress','completed') DEFAULT 'pending',
    intervention_measure  TEXT,
    intervention_result   TEXT,
    FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 9. 学习建议表
CREATE TABLE learning_suggestion (
    suggestion_id        INT AUTO_INCREMENT PRIMARY KEY,
    student_id           VARCHAR(20) NOT NULL,
    suggestion_content   TEXT NOT NULL,
    generate_time        DATETIME NOT NULL,
    student_feedback     ENUM('satisfied','neutral','unsatisfied'),
    suggest_relate_score INT,
    FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 10. 课程安排表
CREATE TABLE course_schedule (
    schedule_id          INT AUTO_INCREMENT PRIMARY KEY,
    scheduled_period     VARCHAR(50),
    scheduled_classroom  VARCHAR(50),
    subject_id           VARCHAR(20) NOT NULL,
    teacher_id           VARCHAR(20) NOT NULL,
    class_id             VARCHAR(20) NOT NULL,
    FOREIGN KEY (subject_id) REFERENCES subject(subject_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teacher(teacher_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (class_id) REFERENCES class(class_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 11. 学生科目选修表（M:N中间表）
CREATE TABLE student_subject (
    student_id   VARCHAR(20) NOT NULL,
    subject_id   VARCHAR(20) NOT NULL,
    enroll_time  DATETIME,
    PRIMARY KEY (student_id, subject_id),
    FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subject(subject_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 12. NL2SQL查询日志表
CREATE TABLE nl2sql_log (
    query_id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id                VARCHAR(20),
    natural_language_input TEXT NOT NULL,
    generated_sql          TEXT NOT NULL,
    execution_time_ms      INT,
    is_correct             BOOLEAN,
    query_time             DATETIME NOT NULL
);
