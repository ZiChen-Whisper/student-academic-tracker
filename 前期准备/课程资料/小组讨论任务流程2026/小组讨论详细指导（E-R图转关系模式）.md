# 小组讨论详细指导（E-R图转关系模式）

> 本指导针对"中小学学生学业发展动态跟踪与预警系统"项目，按照数据库设计标准流程（参考第7章课件7.4节逻辑结构设计）编写，专门指导**步骤5：集中讨论E-R图转关系模式**和**步骤6：组长记录最终关系模式**。

---

## 目录

- [一、E-R图转关系模式的基本理论](#一e-r图转关系模式的基本理论)
- [二、本项目的E-R图回顾](#二本项目的e-r图回顾)
- [三、转换规则详解](#三转换规则详解)
- [四、本项目E-R图转关系模式完整过程](#四本项目e-r图转关系模式完整过程)
- [五、规范化检查（3NF）](#五规范化检查3nf)
- [六、组长记录最终关系模式的格式要求](#六组长记录最终关系模式的格式要求)
- [七、讨论流程建议](#七讨论流程建议)
- [八、上交文档要求](#八上交文档要求)
- [九、常见问题解答](#九常见问题解答)

---

## 一、E-R图转关系模式的基本理论

### 1.1 什么是关系模式？

根据第7章PPT（下）7.4节：

**关系模式**是关系模型的逻辑结构，简单说就是数据库中的"表结构"。它包含：
- **关系名**：表的名字（如 `student`）
- **属性**：表中的列（如 `student_id`, `name`, `gender`）
- **码（主键）**：唯一标识每条记录的属性（如 `student_id`）
- **外键**：引用其他表主键的属性（如 `exam_score` 表中的 `student_id`）

### 1.2 转换的目的

将概念结构设计阶段画出的E-R图（抽象的、独立于具体数据库的蓝图）转换为**具体的数据库表结构**，以便在MySQL等关系数据库管理系统中创建表。

### 1.3 转换的基本原则（第7章PPT 7.4.1节）

| E-R图元素 | 转换规则 |
|-----------|---------|
| **实体** | 每个实体转换为一个关系模式（表） |
| **属性** | 实体的属性转换为表的列 |
| **主键** | 实体的码转换为表的主键 |
| **1:1联系** | 可以独立成表，也可以与任意一端合并（推荐合并） |
| **1:N联系** | 可以独立成表，也可以与N端合并（推荐合并，减少表数量） |
| **M:N联系** | **必须**独立成一个新表，主键是两个实体主键的组合 |

### 1.4 为什么联系转换有不同规则？

这是考试和作业的**重点考核内容**，需要理解原理：

**1:1联系**（如学生—家庭背景）：
- 因为两端都是"1"，所以联系的信息可以放到任何一端
- 例如把 `student_id` 放到 `family_background` 表中作为外键，就能表示"这个家庭属于哪个学生"

**1:N联系**（如学生—考试成绩）：
- N端（考试成绩）有多个记录，每个记录只需要加一个外键就能知道"这个成绩属于哪个学生"
- 所以外键加在N端，不需要新建表

**M:N联系**（如学生—科目选修）：
- 因为两边都是"多"，无法通过在某一端加外键来表示
- 必须新建一个中间表（如 `student_subject`），包含两个外键：`student_id` 和 `subject_id`
- 中间表的主键是两个外键的组合（联合主键）

---

## 二、本项目的E-R图回顾

### 2.1 实体清单（10个实体）

根据最终合并的E-R图（`合并ER图.drawio`），本项目包含以下10个实体：

| 编号 | 实体名 | 实体含义 | 主键 | 核心属性 |
|------|--------|---------|------|---------|
| 1 | **STUDENT（学生）** | 学生基本信息 | student_id | StudentName, StudentGender, StudentClassID, StudentAddress |
| 2 | **EXAM_SCORE（考试成绩）** | 学生各阶段考试成绩 | score_id | score, scoreDate, ExamStage |
| 3 | **LEARNING_BEHAVIOR（学习行为）** | 出勤、学习时长等行为数据 | behavior_id | AttendanceRate, StudyHours, SleepHours, MotivationLevel |
| 4 | **FAMILY_BACKGROUND（家庭背景）** | 家庭教育和经济情况 | FamilyID | FatherEdu, MotherEdu, FatherJob, MotherJob, FamilyIncome |
| 5 | **RISK_ALERT（风险预警）** | AI生成的风险预警记录 | AlertID | RiskLevel, AlertTime, InterventionStatus |
| 6 | **LEARNING_SUGGESTION（学习建议）** | AI生成的学习建议 | SuggestionID | SuggestionContent, GenerateTime, StudentFeedback |
| 7 | **CLASS（班级）** | 行政班级信息 | ClassID | ClassName, ClassGrade, ClassTeacherID |
| 8 | **SUBJECT（科目）** | 考试科目信息 | SubjectID | SubjectName, SubjectCredit, SubjectType |
| 9 | **TEACHER（教师）** | 任课教师信息 | TeacherID | TeacherName, TeacherGender, TeacherTitle |
| 10 | **COURSE_SCHEDULE（课程安排）** | 教师授课安排 | ScheduleID | ScheduledPeriod, ScheduledClassroom |

> **注意**：NL2SQL日志表在最终E-R图中未体现，可作为独立的系统日志表，不与任何实体关联。

### 2.2 实体间的联系清单

根据最终E-R图，实体间的联系如下：

| 联系名 | 涉及实体 | 联系类型 | 说明 |
|--------|---------|---------|------|
| **StudentTakeExamScore** | 学生 — 考试成绩 | 1:N | 一个学生有多条成绩记录 |
| **StudentTakeLearningBehavior** | 学生 — 学习行为 | 1:N | 一个学生有多条行为记录 |
| **StudentTakeFamilyBackground** | 学生 — 家庭背景 | 1:1 | 一个学生对应一条家庭信息 |
| **StudentReceiveAlert** | 学生 — 风险预警 | 1:N | 一个学生可被多次预警 |
| **StudentReceiveSuggestion** | 学生 — 学习建议 | 1:N | 一个学生可收到多条建议 |
| **StudentPlaceInClass** | 学生 — 班级 | N:1 | 多个学生属于同一个班级 |
| **StudentTakeSubject** | 学生 — 科目 | M:N | 学生选修多门科目，科目有多个学生 |
| **ClassHasSchedule** | 班级 — 课程安排 | 1:N | 一个班级有多个课程安排 |
| **TeacherTeachesSchedule** | 教师 — 课程安排 | 1:N | 一位教师有多个授课安排 |
| **SubjectHasSchedule** | 科目 — 课程安排 | 1:N | 一个科目有多个课程安排 |

### 2.3 E-R图结构说明

根据 `合并ER图.drawio` 的实际结构：

```
                          ┌─────────────────┐
                          │  COURSE_SCHEDULE │
                          │  (课程安排)      │
                          └────────┬────────
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
              ClassHasSchedule TeacherTeaches  SubjectHasSchedule
                    │           Schedule         │
                    ▼              ▼              ▼
          ┌─────────────┐  ┌──────────┐  ┌──────────────┐
          │    CLASS    │  │ TEACHER  │  │   SUBJECT    │
          │   (班级)    │  │  (教师)  │  │   (科目)     │
          └──────┬──────┘  └──────────┘  └──────┬───────┘
                 │                               │
           StudentPlaceInClass            StudentTakeSubject (M:N)
                 │                               │
                 ▼                               ▼
          ──────────────────────────────────────────────┐
          │                    STUDENT                    │
          │                    (学生)                     │
          └──┬──────┬──────┬──────┬──────┬───────────────┘
             │      │      │      │      │
       TakeExam TakeLearn TakeFamily Receive Receive
         Score    Behavior Background  Alert Suggestion
             │      │      │      │      │
             ▼      ▼      ▼      ▼      ▼
          ┌──────┐┌──────┐┌──────┐┌──────┐┌──────────┐
          │EXAM  ││LEARN ││FAMILY││RISK  ││LEARNING  │
          │SCORE ││BEHAV ││BACK  ││ALERT ││SUGGESTION│
          └──────┘└──────┘└──────┘└──────┘└──────────┘
```

**联系类型总结**：
- **1:1联系**（1个）：StudentTakeFamilyBackground（学生—家庭背景）
- **1:N联系**（8个）：StudentTakeExamScore、StudentTakeLearningBehavior、StudentReceiveAlert、StudentReceiveSuggestion、StudentPlaceInClass、ClassHasSchedule、TeacherTeachesSchedule、SubjectHasSchedule
- **M:N联系**（1个）：StudentTakeSubject（学生—科目），**需要通过中间表实现**

---

## 三、转换规则详解

### 3.1 实体转换规则

**规则**：每个实体直接转换为一个关系模式（表）

**示例**（学生实体）：

```
E-R图中的实体：
┌─────────────────────┐
│      STUDENT        │  ← 矩形 = 实体
├─────────────────────┤
│  student_id (主键)  │
│  StudentName        │
│  StudentGender      │
│  StudentClassID     │
│  StudentAddress     │
└─────────────────────┘

转换后的关系模式：
Student(student_id, StudentName, StudentGender, StudentClassID, StudentAddress)
       ↑
     主键（带下划线）

对应SQL：
CREATE TABLE student (
    student_id     VARCHAR(20) PRIMARY KEY,
    StudentName    VARCHAR(50) NOT NULL,
    StudentGender  ENUM('M','F'),
    StudentClassID VARCHAR(20),
    StudentAddress VARCHAR(100)
);
```

### 3.2 1:1联系转换规则

**规则**：可以转换为独立表，也可以与任意一端合并（推荐与 mandatory端 合并）

**两种转换方式对比**（以学生—家庭背景为例）：

#### 方式A：独立成表（不推荐）

```
FamilyRelation(student_id, family_id)
                        ↑
                    联合主键

问题：需要额外的表，增加JOIN操作
```

#### 方式B：与一端合并（推荐）

```
把学生主键作为外键放到家庭背景表中：
FamilyBackground(FamilyID, student_id, FatherEdu, MotherEdu, ...)
                          ↑
                   外键 + UNIQUE约束

优势：
- 减少表数量（10个实体→11个表，而不是12个表）
- 查询家庭信息时只需要查一张表
- student_id加UNIQUE约束保证1:1关系
```

**为什么选择方式B**：
- 根据第7章PPT，"合并后可以减少系统中的关系个数"
- 家庭背景依赖于学生存在（没有学生就没有家庭记录），所以外键放在家庭端更合理

### 3.3 1:N联系转换规则

**规则**：可以转换为独立表，也可以与**N端**合并（推荐合并）

**示例**（学生—考试成绩）：

```
E-R图：
学生 ─| |──<StudentTakeExamScore>──→ 0── 考试成绩
       1端                                  N端

方式A：独立成表（不推荐）
ScoreRelation(student_id, score_id)
                          ↑
                      联合主键

方式B：与N端合并（推荐）
在考试成绩表中加student_id外键：
ExamScore(score_id, student_id, score, scoreDate, ExamStage)
                     ↑
                  外键

优势：
- 成绩记录天然属于某个学生，student_id是成绩的属性之一
- 查询某个学生的成绩只需要WHERE student_id=xxx
- 不需要额外JOIN
```

**为什么外键加在N端**：
- N端有多个记录，每个记录只需要一个外键就能标识归属
- 1端只有1个记录，如果加外键到1端，无法表示"多个"的情况

### 3.4 M:N联系转换规则（本项目涉及：学生—科目）

**规则**：**必须**独立成一个新表，主键是两个实体主键的组合

**示例**（StudentTakeSubject：学生—科目）：

```
E-R图：
学生 ──→ 0──<StudentTakeSubject>──→ 0── 科目
       M端                                N端

必须独立成表：
StudentSubject(student_id, subject_id, enroll_time, grade)
              ↑              ↑
           外键1          外键2
        联合主键（student_id + subject_id）

说明：
- student_id和subject_id的组合才能唯一标识一条选课记录
- 一个学生可以选多门科目（student_id可重复）
- 一门科目可以有多个学生（subject_id可重复）
- 但同一个学生选同一门科目只能有一条记录（组合唯一）

对应SQL：
CREATE TABLE student_subject (
    student_id   VARCHAR(20) NOT NULL,
    subject_id   VARCHAR(20) NOT NULL,
    enroll_time  DATETIME,
    grade        INT,
    PRIMARY KEY (student_id, subject_id),
    FOREIGN KEY (student_id) REFERENCES student(student_id),
    FOREIGN KEY (subject_id) REFERENCES subject(subject_id)
);
```

---

## 四、本项目E-R图转关系模式完整过程

### 4.1 步骤1：实体转换（10个实体→10个关系模式）

#### 关系模式1：学生（STUDENT）

**来源**：UCI Student Performance数据集

```
Student(student_id, StudentName, StudentGender, StudentAge, StudentClassID, StudentAddress)
        ↑
      主键

说明：
- student_id：学号，格式如 STU_M_0001（UCI数学）、STU_P_0001（UCI葡语）、STU_F_0001（Performance Factors）
- StudentClassID：外键，关联班级表
- 其他字段来自UCI数据集和Performance Factors数据集
```

**对应SQL**：

```sql
CREATE TABLE student (
    student_id       VARCHAR(20) PRIMARY KEY,
    StudentName      VARCHAR(50) NOT NULL,
    StudentGender    ENUM('M','F'),
    StudentAge       INT,
    StudentClassID   VARCHAR(20),
    StudentAddress   VARCHAR(100),
    FOREIGN KEY (StudentClassID) REFERENCES class(ClassID)
);
```

**转换过程说明**：
- 原E-R图：学生（N端）——StudentPlaceInClass——班级（1端）
- 根据1:N联系转换规则，外键加在N端（学生）
- 因此 `StudentClassID` 作为外键添加到 `student` 表中

---

#### 关系模式2：考试成绩（EXAM_SCORE）

**来源**：UCI数据集的G1/G2/G3

```
ExamScore(score_id, student_id, subject_id, score, scoreDate, ExamStage)
          ↑          ↑          ↑
        主键      外键1      外键2
```

**对应SQL**：

```sql
CREATE TABLE exam_score (
    score_id        INT AUTO_INCREMENT PRIMARY KEY,
    student_id      VARCHAR(20) NOT NULL,
    subject_id      VARCHAR(20) NOT NULL,
    score           INT NOT NULL,
    scoreDate       DATE,
    ExamStage       VARCHAR(10),
    FOREIGN KEY (student_id) REFERENCES student(student_id),
    FOREIGN KEY (subject_id) REFERENCES subject(SubjectID)
);
```

**转换过程说明**：
- 原E-R图：学生（1端）——StudentTakeExamScore——考试成绩（N端）
- 根据1:N联系转换规则，外键加在N端（考试成绩）
- 因此 `student_id` 作为外键添加到 `exam_score` 表中
- 注意：根据E-R图，考试成绩还与科目有关联（通过StudentTakeSubject的M:N联系），所以也加 `subject_id` 外键

---

#### 关系模式3：学习行为（LEARNING_BEHAVIOR）

**来源**：Student Performance Factors数据集

```
LearningBehavior(behavior_id, student_id, AttendanceRate, StudyHours,
                 SleepHours, MotivationLevel, PreviousScores,
                 TutoringSessions, InternetAccess, Extracurricular,
                 PhysicalActivity)
                 ↑          ↑
               主键       外键（引用Student.student_id）
```

**对应SQL**：

```sql
CREATE TABLE learning_behavior (
    behavior_id         INT AUTO_INCREMENT PRIMARY KEY,
    student_id          VARCHAR(20) NOT NULL,
    AttendanceRate      INT,
    StudyHours          INT,
    SleepHours          INT,
    MotivationLevel     VARCHAR(10),
    PreviousScores      INT,
    TutoringSessions    INT,
    InternetAccess      VARCHAR(5),
    Extracurricular     VARCHAR(5),
    PhysicalActivity    INT,
    FOREIGN KEY (student_id) REFERENCES student(student_id)
);
```

**转换过程说明**：
- 原E-R图：学生（1端）——StudentTakeLearningBehavior——学习行为（N端）
- 外键加在N端（学习行为）

---

#### 关系模式4：家庭背景（FAMILY_BACKGROUND）

**来源**：UCI数据集 + Performance Factors

```
FamilyBackground(FamilyID, student_id, FatherEdu, MotherEdu,
                 FatherJob, MotherJob, FamilyIncome,
                 FamilySupport, ParentalInvolvement, FamRel)
                 ↑          ↑
               主键    外键+UNIQUE（引用Student.student_id）

注意：student_id有UNIQUE约束，保证1:1关系
```

**对应SQL**：

```sql
CREATE TABLE family_background (
    FamilyID             INT AUTO_INCREMENT PRIMARY KEY,
    student_id           VARCHAR(20) NOT NULL UNIQUE,
    FatherEdu            VARCHAR(20),
    MotherEdu            VARCHAR(20),
    FatherJob            VARCHAR(30),
    MotherJob            VARCHAR(30),
    FamilyIncome         VARCHAR(20),
    FamilySupport        VARCHAR(10),
    ParentalInvolvement  VARCHAR(10),
    FamRel               INT,
    FOREIGN KEY (student_id) REFERENCES student(student_id)
);
```

**转换过程说明**：
- 原E-R图：学生（1端）——StudentTakeFamilyBackground——家庭背景（1端）
- 这是1:1联系，选择与家庭背景端合并
- `student_id` 作为外键加到 `family_background` 表
- 加 `UNIQUE` 约束确保一个学生只有一条家庭记录

---

#### 关系模式5：风险预警（RISK_ALERT）

**来源**：AI功能生成后存储

```
RiskAlert(AlertID, student_id, RiskLevel, AlertTime,
          RiskFactors, InterventionStatus,
          InterventionMeasure, InterventionResult)
          ↑          ↑
        主键       外键（引用Student.student_id）
```

**对应SQL**：

```sql
CREATE TABLE risk_alert (
    AlertID              INT AUTO_INCREMENT PRIMARY KEY,
    student_id           VARCHAR(20) NOT NULL,
    RiskLevel            ENUM('low','medium','high') NOT NULL,
    AlertTime            DATETIME NOT NULL,
    RiskFactors          TEXT,
    InterventionStatus   ENUM('pending','in_progress','completed') DEFAULT 'pending',
    InterventionMeasure  TEXT,
    InterventionResult   TEXT,
    FOREIGN KEY (student_id) REFERENCES student(student_id)
);
```

**转换过程说明**：
- 原E-R图：学生（1端）——StudentReceiveAlert——风险预警（N端）
- 外键加在N端（风险预警）

---

#### 关系模式6：学习建议（LEARNING_SUGGESTION）

**来源**：AI功能生成后存储

```
LearningSuggestion(SuggestionID, student_id, SuggestionContent, GenerateTime,
                   StudentFeedback, SuggestRelateScore)
                   ↑          ↑
                 主键       外键（引用Student.student_id）
```

**对应SQL**：

```sql
CREATE TABLE learning_suggestion (
    SuggestionID        INT AUTO_INCREMENT PRIMARY KEY,
    student_id          VARCHAR(20) NOT NULL,
    SuggestionContent   TEXT NOT NULL,
    GenerateTime        DATETIME NOT NULL,
    StudentFeedback     ENUM('satisfied','neutral','unsatisfied'),
    SuggestRelateScore  INT,
    FOREIGN KEY (student_id) REFERENCES student(student_id)
);
```

**转换过程说明**：
- 原E-R图：学生（1端）——StudentReceiveSuggestion——学习建议（N端）
- 外键加在N端（学习建议）

---

#### 关系模式7：班级（CLASS）

**来源**：项目扩展实体

```
Class(ClassID, ClassName, ClassGrade, ClassTeacherID)
      ↑
    主键

注意：ClassTeacherID是班主任，引用教师表
```

**对应SQL**：

```sql
CREATE TABLE class (
    ClassID          VARCHAR(20) PRIMARY KEY,
    ClassName        VARCHAR(50) NOT NULL,
    ClassGrade       VARCHAR(10),
    ClassTeacherID   VARCHAR(20),
    FOREIGN KEY (ClassTeacherID) REFERENCES teacher(TeacherID)
);
```

**转换过程说明**：
- 原E-R图：班级（N端）——StudentPlaceInClass——学生（1端）
- 班级是1端，学生是N端
- 外键加在学生表的 `StudentClassID` 字段，班级表本身不需要加外键（除了班主任字段）

---

#### 关系模式8：科目（SUBJECT）

**来源**：项目扩展实体

```
Subject(SubjectID, SubjectName, SubjectCredit, SubjectType)
        ↑
      主键
```

**对应SQL**：

```sql
CREATE TABLE subject (
    SubjectID       VARCHAR(20) PRIMARY KEY,
    SubjectName     VARCHAR(50) NOT NULL,
    SubjectCredit   INT,
    SubjectType     VARCHAR(20)
);
```

**转换过程说明**：
- 科目实体本身是独立的
- 与学生的M:N联系通过中间表 `student_subject` 实现

---

#### 关系模式9：教师（TEACHER）

**来源**：项目扩展实体

```
Teacher(TeacherID, TeacherName, TeacherGender, TeacherTitle)
        ↑
      主键
```

**对应SQL**：

```sql
CREATE TABLE teacher (
    TeacherID        VARCHAR(20) PRIMARY KEY,
    TeacherName      VARCHAR(50) NOT NULL,
    TeacherGender    ENUM('M','F'),
    TeacherTitle     VARCHAR(30)
);
```

**转换过程说明**：
- 教师实体本身是独立的
- 与课程安排的1:N联系通过课程安排表的外键实现

---

#### 关系模式10：课程安排（COURSE_SCHEDULE）

**来源**：项目扩展实体

```
CourseSchedule(ScheduleID, ScheduledPeriod, ScheduledClassroom,
               SubjectID, TeacherID, ClassID)
               ↑
             主键
```

**对应SQL**：

```sql
CREATE TABLE course_schedule (
    ScheduleID          INT AUTO_INCREMENT PRIMARY KEY,
    ScheduledPeriod     VARCHAR(50),
    ScheduledClassroom  VARCHAR(50),
    SubjectID           VARCHAR(20) NOT NULL,
    TeacherID           VARCHAR(20) NOT NULL,
    ClassID             VARCHAR(20) NOT NULL,
    FOREIGN KEY (SubjectID) REFERENCES subject(SubjectID),
    FOREIGN KEY (TeacherID) REFERENCES teacher(TeacherID),
    FOREIGN KEY (ClassID) REFERENCES class(ClassID)
);
```

**转换过程说明**：
- 原E-R图：课程安排（N端）分别与班级（1端）、教师（1端）、科目（1端）关联
- 根据1:N联系转换规则，外键加在N端（课程安排）
- 因此课程安排表包含3个外键：`SubjectID`、`TeacherID`、`ClassID`

---

#### 关系模式11：学生科目选修（STUDENT_SUBJECT）——M:N联系的中间表

**来源**：StudentTakeSubject（学生—科目）M:N联系

```
StudentSubject(student_id, subject_id, enroll_time)
              ↑              ↑
           外键1          外键2
        联合主键
```

**对应SQL**：

```sql
CREATE TABLE student_subject (
    student_id   VARCHAR(20) NOT NULL,
    subject_id   VARCHAR(20) NOT NULL,
    enroll_time  DATETIME,
    PRIMARY KEY (student_id, subject_id),
    FOREIGN KEY (student_id) REFERENCES student(student_id),
    FOREIGN KEY (subject_id) REFERENCES subject(SubjectID)
);
```

**转换过程说明**：
- 原E-R图：学生（M端）——StudentTakeSubject——科目（N端）
- 这是M:N联系，**必须**独立成一个新表
- 主键是两个外键的组合（联合主键）
- 这是本项目**唯一的M:N联系**

---

#### 关系模式12：NL2SQL日志（NL2SQL_LOG）——独立系统日志表

**来源**：系统自动记录（不在E-R图中，但需求分析需要）

```
NL2SQLLog(query_id, user_id, natural_language_input, generated_sql,
          execution_time_ms, is_correct, query_time)
          ↑
        主键

注意：此表不与任何实体关联，是独立的系统日志表
```

**对应SQL**：

```sql
CREATE TABLE nl2sql_log (
    query_id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id             VARCHAR(20),
    natural_language_input TEXT NOT NULL,
    generated_sql       TEXT NOT NULL,
    execution_time_ms   INT,
    is_correct          BOOLEAN,
    query_time          DATETIME NOT NULL
);
```

---

### 4.2 步骤2：联系转换总结

| 联系名 | 涉及实体 | 联系类型 | 转换方式 | 结果 |
|--------|---------|---------|---------|------|
| StudentTakeExamScore | 学生 — 考试成绩 | 1:N | 与N端合并 | `exam_score` 表加 `student_id` 外键 |
| StudentTakeLearningBehavior | 学生 — 学习行为 | 1:N | 与N端合并 | `learning_behavior` 表加 `student_id` 外键 |
| StudentTakeFamilyBackground | 学生 — 家庭背景 | 1:1 | 与家庭端合并 | `family_background` 表加 `student_id` 外键+UNIQUE |
| StudentReceiveAlert | 学生 — 风险预警 | 1:N | 与N端合并 | `risk_alert` 表加 `student_id` 外键 |
| StudentReceiveSuggestion | 学生 — 学习建议 | 1:N | 与N端合并 | `learning_suggestion` 表加 `student_id` 外键 |
| StudentPlaceInClass | 学生 — 班级 | N:1 | 与N端合并 | `student` 表加 `StudentClassID` 外键 |
| ClassHasSchedule | 班级 — 课程安排 | 1:N | 与N端合并 | `course_schedule` 表加 `ClassID` 外键 |
| TeacherTeachesSchedule | 教师 — 课程安排 | 1:N | 与N端合并 | `course_schedule` 表加 `TeacherID` 外键 |
| SubjectHasSchedule | 科目 — 课程安排 | 1:N | 与N端合并 | `course_schedule` 表加 `SubjectID` 外键 |
| **StudentTakeSubject** | 学生 — 科目 | **M:N** | **独立成表** | **新建 `student_subject` 中间表** |

**最终表数量**：12个表（10个实体表 + 1个M:N中间表 + 1个系统日志表）

---

### 4.3 步骤3：关系模式汇总（关系代数表示）

以下是转换后的**完整关系模式清单**（主键用下划线表示）：

1. Student(<u>student_id</u>, StudentName, StudentGender, StudentAge, StudentClassID, StudentAddress)
           外键: StudentClassID → Class.ClassID

2. ExamScore(<u>score_id</u>, student_id, subject_id, score, scoreDate, ExamStage)
              外键: student_id → Student.student_id
              外键: subject_id → Subject.SubjectID

3. LearningBehavior(<u>behavior_id</u>, student_id, AttendanceRate, StudyHours,
                    SleepHours, MotivationLevel, PreviousScores,
                    TutoringSessions, InternetAccess, Extracurricular, PhysicalActivity)
                   外键: student_id → Student.student_id

4. FamilyBackground(<u>FamilyID</u>, student_id, FatherEdu, MotherEdu,
                    FatherJob, MotherJob, FamilyIncome,
                    FamilySupport, ParentalInvolvement, FamRel)
                   外键: student_id → Student.student_id (UNIQUE)

5. RiskAlert(<u>AlertID</u>, student_id, RiskLevel, AlertTime,
             RiskFactors, InterventionStatus,
             InterventionMeasure, InterventionResult)
            外键: student_id → Student.student_id

6. LearningSuggestion(<u>SuggestionID</u>, student_id, SuggestionContent, GenerateTime,
                      StudentFeedback, SuggestRelateScore)
                     外键: student_id → Student.student_id

7. Class(<u>ClassID</u>, ClassName, ClassGrade, ClassTeacherID)
         外键: ClassTeacherID → Teacher.TeacherID

8. Subject(<u>SubjectID</u>, SubjectName, SubjectCredit, SubjectType)

9. Teacher(<u>TeacherID</u>, TeacherName, TeacherGender, TeacherTitle)

10. CourseSchedule(<u>ScheduleID</u>, ScheduledPeriod, ScheduledClassroom,
                   SubjectID, TeacherID, ClassID)
                  外键: SubjectID → Subject.SubjectID
                  外键: TeacherID → Teacher.TeacherID
                  外键: ClassID → Class.ClassID

11. StudentSubject(<u>student_id, subject_id</u>, enroll_time)
                  外键: student_id → Student.student_id
                  外键: subject_id → Subject.SubjectID
                  联合主键

12. NL2SQLLog(<u>query_id</u>, user_id, natural_language_input, generated_sql,
              execution_time_ms, is_correct, query_time)

---

## 五、规范化检查（3NF）

### 5.1 什么是规范化？

根据第7章PPT（下）7.4.2节，规范化是**以规范化理论为指导，检查关系模式是否存在数据冗余和更新异常**。

**规范化的三个级别**：

| 范式 | 要求 | 检查方法 | 本项目情况 |
|------|------|---------|-----------|
| **1NF** | 每个字段不可再分（原子性） | 检查是否有字段存储多个值 | ✅ 满足 |
| **2NF** | 非主键字段完全依赖主键（不能部分依赖） | 检查是否有字段依赖主键的一部分 | ✅ 满足 |
| **3NF** | 非主键字段不传递依赖主键 | 检查是否有字段依赖其他非主键字段 | ✅ 满足 |

### 5.2 逐表检查

#### 表1：Student

**主键**：student_id

**1NF检查**：
- ✅ 每个字段都是单一值，没有字段存储多个值

**2NF检查**：
- ✅ 主键是单一属性（不是联合主键），所以不存在部分依赖
- 所有非主键字段（StudentName, StudentGender, StudentClassID...）都完全依赖于 student_id

**3NF检查**：
- ✅ 没有传递依赖
- `StudentClassID` 是外键，引用班级表，不传递依赖于 student_id
- 所有字段都直接依赖于 student_id

**结论**：Student 表满足 3NF

---

#### 表2：ExamScore

**主键**：score_id

**1NF检查**：

- ✅ 每个字段都是单一值

**2NF检查**：
- ✅ 主键是单一属性，所有字段完全依赖 score_id

**3NF检查**：
- ✅ 没有传递依赖
- `student_id` 和 `subject_id` 是外键，直接依赖于 score_id

**结论**：ExamScore 表满足 3NF

---

#### 表3：LearningBehavior

**主键**：behavior_id

**1NF检查**：
- ✅ 每个字段都是单一值

**2NF检查**：
- ✅ 主键是单一属性，所有字段完全依赖 behavior_id

**3NF检查**：
- ✅ 没有传递依赖
- 所有字段（AttendanceRate, StudyHours...）都直接依赖于 behavior_id

**结论**：LearningBehavior 表满足 3NF

---

#### 表4：FamilyBackground

**主键**：FamilyID

**1NF检查**：
- ✅ 每个字段都是单一值

**2NF检查**：
- ✅ 主键是单一属性

**3NF检查**：
- ✅ 没有传递依赖
- `student_id` 有 UNIQUE 约束，保证一个学生只有一条家庭记录
- 所有字段都直接依赖于 FamilyID

**结论**：FamilyBackground 表满足 3NF

---

#### 表5：RiskAlert

**主键**：AlertID

**1NF检查**：
- ✅ 每个字段都是单一值
- `RiskFactors` 是 TEXT 类型，存储 JSON 格式的字符串，作为一个整体值

**2NF检查**：
- ✅ 主键是单一属性

**3NF检查**：
- ✅ 没有传递依赖
- 所有字段都直接依赖于 AlertID

**结论**：RiskAlert 表满足 3NF

---

#### 表6：LearningSuggestion

**主键**：SuggestionID

**1NF检查**：
- ✅ 每个字段都是单一值
- `SuggestionContent` 是 TEXT 类型，存储建议内容，作为一个整体值

**2NF检查**：
- ✅ 主键是单一属性

**3NF检查**：
- ✅ 没有传递依赖
- 所有字段都直接依赖于 SuggestionID

**结论**：LearningSuggestion 表满足 3NF

---

#### 表7：Class

**主键**：ClassID

**1NF检查**：
- ✅ 每个字段都是单一值

**2NF检查**：
- ✅ 主键是单一属性

**3NF检查**：
- ✅ 没有传递依赖
- `ClassTeacherID` 是外键，引用教师表，直接依赖于 ClassID

**结论**：Class 表满足 3NF

---

#### 表8：Subject

**主键**：SubjectID

**1NF检查**：
- ✅ 每个字段都是单一值

**2NF检查**：
- ✅ 主键是单一属性

**3NF检查**：
- ✅ 没有传递依赖
- 所有字段都直接依赖于 SubjectID

**结论**：Subject 表满足 3NF

---

#### 表9：Teacher

**主键**：TeacherID

**1NF检查**：
- ✅ 每个字段都是单一值

**2NF检查**：
- ✅ 主键是单一属性

**3NF检查**：
- ✅ 没有传递依赖
- 所有字段都直接依赖于 TeacherID

**结论**：Teacher 表满足 3NF

---

#### 表10：CourseSchedule

**主键**：ScheduleID

**1NF检查**：
- ✅ 每个字段都是单一值

**2NF检查**：
- ✅ 主键是单一属性

**3NF检查**：
- ✅ 没有传递依赖
- `SubjectID`、`TeacherID`、`ClassID` 都是外键，直接依赖于 ScheduleID

**结论**：CourseSchedule 表满足 3NF

---

#### 表11：StudentSubject（M:N中间表）

**主键**：(student_id, subject_id) 联合主键

**1NF检查**：
- ✅ 每个字段都是单一值

**2NF检查**：
- ✅ `enroll_time` 完全依赖于联合主键 (student_id, subject_id)
- 不会出现只依赖 student_id 或只依赖 subject_id 的情况

**3NF检查**：
- ✅ 没有传递依赖
- `enroll_time` 直接依赖于联合主键

**结论**：StudentSubject 表满足 3NF

---

#### 表12：NL2SQLLog

**主键**：query_id

**1NF检查**：
- ✅ 每个字段都是单一值

**2NF检查**：
- ✅ 主键是单一属性

**3NF检查**：
- ✅ 没有传递依赖
- 此表是独立日志表，不与任何实体关联

**结论**：NL2SQLLog 表满足 3NF

---

### 5.3 规范化检查总结

| 表名 | 1NF | 2NF | 3NF | 备注 |
|------|-----|-----|-----|------|
| Student | ✅ | ✅ | ✅ | 外键StudentClassID引用班级 |
| ExamScore | ✅ | ✅ | ✅ | 双外键：student_id + subject_id |
| LearningBehavior | ✅ | ✅ | ✅ | 无传递依赖 |
| FamilyBackground | ✅ | ✅ | ✅ | UNIQUE约束保证1:1 |
| RiskAlert | ✅ | ✅ | ✅ | TEXT字段作为整体值 |
| LearningSuggestion | ✅ | ✅ | ✅ | 无传递依赖 |
| Class | ✅ | ✅ | ✅ | 外键ClassTeacherID引用教师 |
| Subject | ✅ | ✅ | ✅ | 独立实体，无外键 |
| Teacher | ✅ | ✅ | ✅ | 独立实体，无外键 |
| CourseSchedule | ✅ | ✅ | ✅ | 三外键：SubjectID + TeacherID + ClassID |
| StudentSubject | ✅ | ✅ | ✅ | M:N中间表，联合主键 |
| NL2SQLLog | ✅ | ✅ | ✅ | 独立日志表 |

**结论**：本项目所有12个表均满足第三范式（3NF），设计合理。

---

## 六、组长记录最终关系模式的格式要求

### 6.1 记录格式

组长（邹子晨）需要按照以下格式记录最终关系模式，这份文档将作为**上交作业**的一部分：

---

#### 格式示例

```markdown
# 最终关系模式文档

项目名称：中小学学生学业发展动态跟踪与预警系统
组长：邹子晨
日期：2026年X月X日

---

## 一、关系模式清单

### 1. Student（学生表）

**关系模式**：Student(<u>student_id</u>, StudentName, StudentGender, StudentAge, StudentClassID, StudentAddress)

**主键**：student_id

**外键**：StudentClassID → Class.ClassID

**说明**：存储学生基本信息，数据来源于UCI Student Performance数据集和Student Performance Factors数据集。

**字段详细说明**：

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|---------|------|------|
| student_id | VARCHAR(20) | PRIMARY KEY | 学号，格式：STU_M_0001/STU_P_0001/STU_F_0001 |
| StudentName | VARCHAR(50) | NOT NULL | 学生姓名 |
| StudentGender | ENUM('M','F') | | 性别 |
| StudentAge | INT | | 年龄 |
| StudentClassID | VARCHAR(20) | FOREIGN KEY | 班级ID，引用Class表 |
| StudentAddress | VARCHAR(100) | | 地址 |

---

### 2. ExamScore（考试成绩表）

**关系模式**：ExamScore(<u>score_id</u>, student_id, subject_id, score, scoreDate, ExamStage)

**主键**：score_id

**外键**：student_id → Student.student_id, subject_id → Subject.SubjectID

**说明**：存储学生各阶段考试成绩，G1/G2/G3存为3条记录，ExamStage字段区分阶段。

**字段详细说明**：

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|---------|------|------|
| score_id | INT | PRIMARY KEY, AUTO_INCREMENT | 成绩记录ID |
| student_id | VARCHAR(20) | NOT NULL, FOREIGN KEY | 学号，引用Student表 |
| subject_id | VARCHAR(20) | NOT NULL, FOREIGN KEY | 科目ID，引用Subject表 |
| score | INT | NOT NULL | 分数（0-20分制） |
| scoreDate | DATE | | 考试日期 |
| ExamStage | VARCHAR(10) | | 考试阶段（G1/G2/G3） |

...（其他表同理）
```

---

### 6.2 必须包含的内容

组长记录最终关系模式时，**必须包含**以下内容：

1. **关系模式名称**（如 Student、ExamScore）
2. **关系模式的属性列表**（用关系代数表示，主键带下划线）
3. **主键说明**
4. **外键说明**（如果有）
5. **每个字段的数据类型和约束**
6. **表的说明**（数据来源、用途）
7. **规范化检查结果**（是否满足3NF）
8. **E-R图转换过程说明**（每个联系是如何转换的）

---

### 6.3 完整DDL脚本

除了关系模式文档，组长还需要提供**完整的SQL建表脚本**：

```sql
-- ============================================
-- 中小学学生学业发展动态跟踪与预警系统
-- 数据库建表脚本（DDL）
-- 组长：邹子晨
-- 日期：2026年X月X日
-- ============================================

CREATE DATABASE IF NOT EXISTS student_academic_tracker
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE student_academic_tracker;

-- 1. 教师表（先创建被引用的表）
CREATE TABLE teacher (
    TeacherID        VARCHAR(20) PRIMARY KEY,
    TeacherName      VARCHAR(50) NOT NULL,
    TeacherGender    ENUM('M','F'),
    TeacherTitle     VARCHAR(30)
);

-- 2. 科目表
CREATE TABLE subject (
    SubjectID       VARCHAR(20) PRIMARY KEY,
    SubjectName     VARCHAR(50) NOT NULL,
    SubjectCredit   INT,
    SubjectType     VARCHAR(20)
);

-- 3. 班级表
CREATE TABLE class (
    ClassID          VARCHAR(20) PRIMARY KEY,
    ClassName        VARCHAR(50) NOT NULL,
    ClassGrade       VARCHAR(10),
    ClassTeacherID   VARCHAR(20),
    FOREIGN KEY (ClassTeacherID) REFERENCES teacher(TeacherID)
);

-- 4. 学生表
CREATE TABLE student (
    student_id       VARCHAR(20) PRIMARY KEY,
    StudentName      VARCHAR(50) NOT NULL,
    StudentGender    ENUM('M','F'),
    StudentAge       INT,
    StudentClassID   VARCHAR(20),
    StudentAddress   VARCHAR(100),
    FOREIGN KEY (StudentClassID) REFERENCES class(ClassID)
);

-- 5. 考试成绩表
CREATE TABLE exam_score (
    score_id        INT AUTO_INCREMENT PRIMARY KEY,
    student_id      VARCHAR(20) NOT NULL,
    subject_id      VARCHAR(20) NOT NULL,
    score           INT NOT NULL,
    scoreDate       DATE,
    ExamStage       VARCHAR(10),
    FOREIGN KEY (student_id) REFERENCES student(student_id),
    FOREIGN KEY (subject_id) REFERENCES subject(SubjectID)
);

-- 6. 学习行为表
CREATE TABLE learning_behavior (
    behavior_id         INT AUTO_INCREMENT PRIMARY KEY,
    student_id          VARCHAR(20) NOT NULL,
    AttendanceRate      INT,
    StudyHours          INT,
    SleepHours          INT,
    MotivationLevel     VARCHAR(10),
    PreviousScores      INT,
    TutoringSessions    INT,
    InternetAccess      VARCHAR(5),
    Extracurricular     VARCHAR(5),
    PhysicalActivity    INT,
    FOREIGN KEY (student_id) REFERENCES student(student_id)
);

-- 7. 家庭背景表
CREATE TABLE family_background (
    FamilyID             INT AUTO_INCREMENT PRIMARY KEY,
    student_id           VARCHAR(20) NOT NULL UNIQUE,
    FatherEdu            VARCHAR(20),
    MotherEdu            VARCHAR(20),
    FatherJob            VARCHAR(30),
    MotherJob            VARCHAR(30),
    FamilyIncome         VARCHAR(20),
    FamilySupport        VARCHAR(10),
    ParentalInvolvement  VARCHAR(10),
    FamRel               INT,
    FOREIGN KEY (student_id) REFERENCES student(student_id)
);

-- 8. 风险预警表
CREATE TABLE risk_alert (
    AlertID              INT AUTO_INCREMENT PRIMARY KEY,
    student_id           VARCHAR(20) NOT NULL,
    RiskLevel            ENUM('low','medium','high') NOT NULL,
    AlertTime            DATETIME NOT NULL,
    RiskFactors          TEXT,
    InterventionStatus   ENUM('pending','in_progress','completed') DEFAULT 'pending',
    InterventionMeasure  TEXT,
    InterventionResult   TEXT,
    FOREIGN KEY (student_id) REFERENCES student(student_id)
);

-- 9. 学习建议表
CREATE TABLE learning_suggestion (
    SuggestionID        INT AUTO_INCREMENT PRIMARY KEY,
    student_id          VARCHAR(20) NOT NULL,
    SuggestionContent   TEXT NOT NULL,
    GenerateTime        DATETIME NOT NULL,
    StudentFeedback     ENUM('satisfied','neutral','unsatisfied'),
    SuggestRelateScore  INT,
    FOREIGN KEY (student_id) REFERENCES student(student_id)
);

-- 10. 课程安排表
CREATE TABLE course_schedule (
    ScheduleID          INT AUTO_INCREMENT PRIMARY KEY,
    ScheduledPeriod     VARCHAR(50),
    ScheduledClassroom  VARCHAR(50),
    SubjectID           VARCHAR(20) NOT NULL,
    TeacherID           VARCHAR(20) NOT NULL,
    ClassID             VARCHAR(20) NOT NULL,
    FOREIGN KEY (SubjectID) REFERENCES subject(SubjectID),
    FOREIGN KEY (TeacherID) REFERENCES teacher(TeacherID),
    FOREIGN KEY (ClassID) REFERENCES class(ClassID)
);

-- 11. 学生科目选修表（M:N中间表）
CREATE TABLE student_subject (
    student_id   VARCHAR(20) NOT NULL,
    subject_id   VARCHAR(20) NOT NULL,
    enroll_time  DATETIME,
    PRIMARY KEY (student_id, subject_id),
    FOREIGN KEY (student_id) REFERENCES student(student_id),
    FOREIGN KEY (subject_id) REFERENCES subject(SubjectID)
);

-- 12. NL2SQL查询日志表
CREATE TABLE nl2sql_log (
    query_id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id             VARCHAR(20),
    natural_language_input TEXT NOT NULL,
    generated_sql       TEXT NOT NULL,
    execution_time_ms   INT,
    is_correct          BOOLEAN,
    query_time          DATETIME NOT NULL
);
```

> **注意**：建表顺序很重要！必须先创建被引用的表（teacher、subject、class），再创建引用它们的表（student、course_schedule等），最后创建中间表（student_subject）。

---

## 七、讨论流程建议

### 7.1 讨论前准备

**每个人必须提前完成**：
1. 阅读第7章PPT（下）7.4节"E-R图向关系模型的转换"
2. 理解1:1、1:N、M:N三种联系的转换规则
3. 回顾步骤4中组长画的最终E-R图（`合并ER图.drawio`）
4. 预习本指导文档的转换规则和示例

### 7.2 腾讯会议讨论流程

| 阶段 | 时间 | 内容 | 负责人 |
|------|------|------|--------|
| **开场** | 5分钟 | 明确讨论目标，展示最终E-R图（`合并ER图.png`） | 邹子晨 |
| **实体转换** | 20分钟 | 逐个讨论10个实体的转换，确认属性和主键 | 全员 |
| **联系转换** | 25分钟 | 逐个讨论10个联系的转换方式，确认外键位置，**重点讨论StudentTakeSubject（M:N）** | 全员 |
| **规范化检查** | 15分钟 | 逐表检查是否满足3NF | 全员 |
| **DDL确认** | 10分钟 | 确认SQL建表脚本是否正确，注意建表顺序 | 邹子晨 |
| **汇总记录** | 15分钟 | 组长整理最终关系模式文档 | 邹子晨 |
| **录屏总结** | 5分钟 | 总结讨论结果，确认上交文档 | 全员 |

**总时长**：约95分钟

### 7.3 讨论要点

#### 讨论实体转换时，重点确认：
- [ ] 每个实体的属性是否完整？有遗漏吗？（对照`合并ER图.drawio`）
- [ ] 主键选择是否合理？能唯一标识吗？
- [ ] 字段数据类型是否合适？（INT vs VARCHAR vs ENUM）
- [ ] 字段约束是否正确？（NOT NULL, UNIQUE等）

#### 讨论联系转换时，重点确认：
- [ ] 联系类型判断正确吗？（1:1、1:N还是M:N）
- [ ] 外键加在哪一端？为什么？
- [ ] 需要UNIQUE约束吗？（1:1联系需要）
- [ ] M:N联系（StudentTakeSubject）是否正确转换为中间表？
- [ ] 外键的 REFERENCES 语句正确吗？

#### 讨论规范化时，重点确认：
- [ ] 有字段可以再分吗？（违反1NF）
- [ ] 有字段只依赖主键的一部分吗？（违反2NF）
- [ ] 有字段依赖其他非主键字段吗？（违反3NF）

---

## 八、上交文档要求

根据作业要求，步骤5和步骤6完成后，需要上交以下文档：

### 8.1 文档清单

1. **最终E-R图**
   - `合并ER图.png`（图片格式）
   - `合并ER图.drawio`（源文件）

2. **局部E-R图**（步骤2产出）
   - 每人1张，共5张

3. **最终关系模式文档**（Markdown格式）
   - 12个关系模式的详细说明
   - 每个表的主键、外键、字段说明
   - E-R图转换过程说明
   - 规范化检查结果

4. **完整DDL SQL脚本**（.sql文件）
   - 12个表的CREATE TABLE语句
   - 外键约束正确
   - 建表顺序正确（先被引用表，后引用表）

### 8.2 文档提交格式

```
小组讨论上交文档/
├── 最终E-R图.png                    （步骤4产出）
├── 最终E-R图.drawio                 （步骤4源文件）
├── 最终关系模式文档.md              （步骤5-6产出）
├── 建表脚本.sql                     （步骤5-6产出）
└── 局部E-R图/                       （步骤2产出）
    ├── 邹子晨_学生基础信息模块.png
    ├── 陈震_学业成绩模块.png
    ├── 陈芷琰_学习行为与预警模块.png
    ├── 刘卓欣_教学与课程模块.png
    └── 余心怡_AI服务与学习建议模块.png
```

---

## 九、常见问题解答

### Q1：StudentTakeSubject是M:N联系，为什么要独立成表？

**答**：根据第7章PPT 7.4.1节，M:N联系**必须**独立成一个新表。原因是：
- M:N联系两端都是"多"，无法通过在某一端加外键来表示
- 例如：一个学生可以选多门科目，一门科目可以有多个学生
- 如果只在学生表加subject_id外键，一个学生只能选一门科目
- 如果只在科目表加student_id外键，一门科目只能有一个学生
- 所以必须新建中间表，包含两个外键，联合主键

---

### Q2：建表顺序为什么很重要？

**答**：因为外键约束的存在，必须先创建被引用的表，再创建引用它们的表。

**正确顺序**：
1. 先创建独立表（teacher、subject）
2. 再创建被引用但自身也有外键的表（class引用teacher）
3. 再创建核心表（student引用class）
4. 再创建N端表（exam_score、learning_behavior等引用student）
5. 最后创建M:N中间表（student_subject引用student和subject）

**如果顺序错了**：MySQL会报错 "Cannot add foreign key constraint"

---

### Q3：1:1联系为什么要与家庭背景端合并，而不是与学生端合并？

**答**：两种合并方式都可以，但选择与家庭背景端合并的理由：
- **语义更清晰**：家庭背景"属于"学生，而不是学生"属于"家庭背景
- **数据导入更方便**：UCI数据集原始数据中，家庭字段是学生的附加信息，导入时先插入学生记录，再插入家庭记录
- **外键约束**：student_id 在 family_background 表中有 UNIQUE 约束，保证一个学生只有一条家庭记录

---

### Q4：ExamScore表为什么用 score_id 做主键，而不是用 (student_id, subject_id, ExamStage) 做联合主键？

**答**：两种方式都可以，但选择 score_id 做主键的理由：
- **简化外键引用**：如果其他表需要引用某条成绩记录，只需要一个 INT 类型的 score_id，而不是三个字段
- **扩展性更好**：未来如果成绩表需要添加更多字段（如教师评语、考试备注），score_id 作为主键更方便
- **性能更好**：INT 类型的主键比 VARCHAR 联合主键的索引效率更高
- **符合SQL规范**：AUTO_INCREMENT 主键是常见的数据库设计实践

---

### Q5：student表字段太多了，要不要拆分？

**答**：根据第7章PPT 7.3.5节"实体与属性的划分原则"：
- **可以不拆**：UCI数据集原始就是一张宽表，直接映射导入最简单。这些字段都直接依赖于 student_id，满足3NF。
- **如果要拆**：可以把学习相关字段拆到 learning_behavior 表，但我们已经有一个 learning_behavior 表了，再拆会增加JOIN操作。
- **建议**：不拆，保持与原始数据集一致，减少导入复杂度。

---

### Q6：G1/G2/G3为什么存为3条记录而不是3个列？

**答**：这是**1NF**的要求：
- **存为3条记录**（ExamStage='G1'/'G2'/'G3'）：符合1NF，每个字段不可再分。趋势分析的SQL简单：`WHERE ExamStage IN ('G1','G2','G3') ORDER BY ExamStage`
- **存为3个列**（G1, G2, G3）：违反1NF，因为"成绩"这个属性被分成了3个子属性。趋势分析的SQL复杂：需要 CASE WHEN 或 UNPIVOT。

**推荐**：存为3条记录，符合规范化理论。

---

### Q7：外键一定要加吗？不加会怎样？

**答**：**一定要加**，这是数据库课程的考核重点。

**外键的作用**：
- **保证数据完整性**：防止插入一条成绩记录，但对应的学生不存在
- **防止误删除**：删除学生时，数据库会检查是否有关联的成绩/行为/预警记录，防止孤儿数据
- **作业考核**：老师会检查DDL脚本中的 FOREIGN KEY 语句

**不加的后果**：
- 可能出现"成绩记录对应的学生不存在"的数据不一致问题
- 作业会扣分

---

### Q8：TEXT类型的字段（如 RiskFactors, SuggestionContent）会不会影响性能？

**答**：对于本项目：
- **数据量小**：UCI数据集只有约1000条学生记录，Performance Factors有6607条，TEXT字段不会成为瓶颈
- **查询模式**：RiskFactors 和 SuggestionContent 主要用于展示，不用于 WHERE 条件或 JOIN，所以不会影响查询性能
- **如果数据量大**：可以考虑把 TEXT 字段拆到单独的表，但本项目不需要

---

### Q9：ENUM类型（如 StudentGender, RiskLevel）和VARCHAR有什么区别？

**答**：

| 类型 | 优势 | 劣势 | 适用场景 |
|------|------|------|---------|
| **ENUM** | 限制取值范围，保证数据一致性 | 修改取值范围需要ALTER TABLE | 性别、风险等级、干预状态等固定枚举值 |
| **VARCHAR** | 灵活，可以存任意字符串 | 可能出现拼写错误（如 'low' 写成 'LoW'） | 姓名、地址、科目名等自由文本 |

**本项目使用 ENUM 的字段**：
- `StudentGender`：ENUM('M','F')
- `TeacherGender`：ENUM('M','F')
- `RiskLevel`：ENUM('low','medium','high')
- `InterventionStatus`：ENUM('pending','in_progress','completed')
- `StudentFeedback`：ENUM('satisfied','neutral','unsatisfied')

---

### Q10：course_schedule表为什么有3个外键？

**答**：根据E-R图，课程安排实体与班级、教师、科目三个实体都有1:N联系：
- ClassHasSchedule：班级 — 课程安排（1:N）
- TeacherTeachesSchedule：教师 — 课程安排（1:N）
- SubjectHasSchedule：科目 — 课程安排（1:N）

根据1:N联系转换规则，外键都加在N端（课程安排），所以 course_schedule 表有3个外键：
- `SubjectID` → subject.SubjectID
- `TeacherID` → teacher.TeacherID
- `ClassID` → class.ClassID

---

## 十、附录

### 10.1 术语对照表

| 中文术语 | 英文术语 | 说明 |
|---------|---------|------|
| 实体 | Entity | E-R图中的矩形 |
| 属性 | Attribute | E-R图中的椭圆 |
| 联系 | Relationship | E-R图中的菱形 |
| 主键 | Primary Key | 唯一标识实体的属性 |
| 外键 | Foreign Key | 引用其他表主键的属性 |
| 关系模式 | Relation Schema | 表的结构定义 |
| 规范化 | Normalization | 检查数据冗余的过程 |
| 1NF | 第一范式 | 字段原子性 |
| 2NF | 第二范式 | 完全函数依赖 |
| 3NF | 第三范式 | 无传递依赖 |
| 联合主键 | Composite Primary Key | 由多个字段组成的主键 |

### 10.2 参考资源

1. **第7章数据库设计PPT（上）**：7.3节概念结构设计，E-R图基本元素
2. **第7章数据库设计PPT（下）**：7.4节逻辑结构设计，E-R图转关系模式规则
3. **数据库设计自学材料**：第2章ER建模，第3章关系模型
4. **项目完整流程指南**：阶段四逻辑结构设计，表结构设计
5. **最终E-R图**：`合并ER图.drawio` 和 `合并ER图.png`

---

> 本指导由AI辅助生成，请小组讨论后根据实际情况调整。
> 组长（邹子晨）负责汇总讨论结果，记录最终关系模式文档。
> 本项目最终E-R图包含10个实体、10个联系（1个1:1、8个1:N、1个M:N），转换为12个关系模式。
