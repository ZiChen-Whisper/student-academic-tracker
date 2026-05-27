# 数据集调研 — Zichen Zou

***

## 一、数据集1：Student Performance Factors

### 基本信息

| 项目           | 内容                                                                        |
| ------------ | ------------------------------------------------------------------------- |
| **调研人**      | Zichen Zou                                                                |
| **调研日期**     | 2026-05-15                                                                |
| **数据集名称**    | Student Performance Factors                                               |
| **数据集来源/链接** | <https://www.kaggle.com/datasets/lainguyn123/student-performance-factors> |

***

### 数据集概述

该数据集包含影响学生学业表现的多维度因素数据，涵盖学习习惯、家庭背景、学校资源、个人动机等方面。每条记录代表一个学生的综合信息，包括学习时长、出勤率、家长参与度、辅导次数、睡眠时长等20个字段，最终以考试分数（Exam\_Score）作为学业表现指标。适用于分析各类因素对学生成绩的影响程度，构建学业风险预警模型。

### 数据规模

| 指标          | 数值         |
| ----------- | ---------- |
| **样本/记录数量** | 6607 条记录   |
| **时间跨度**    | 单次考试，无时间序列 |
| **字段数量**    | 20 个维度     |

### 主要字段

| 字段名                         | 含义         | 示例值                              |
| --------------------------- | ---------- | -------------------------------- |
| Hours\_Studied              | 每周学习时长     | 23                               |
| Attendance                  | 出勤率（%）     | 84                               |
| Parental\_Involvement       | 家长参与度      | Low/Medium/High                  |
| Access\_to\_Resources       | 学习资源获取     | Low/Medium/High                  |
| Extracurricular\_Activities | 课外活动参与     | Yes/No                           |
| Sleep\_Hours                | 每日睡眠时长     | 7                                |
| Previous\_Scores            | 以往考试成绩     | 73                               |
| Motivation\_Level           | 学习动机水平     | Low/Medium/High                  |
| Internet\_Access            | 是否有网络      | Yes/No                           |
| Tutoring\_Sessions          | 辅导次数       | 0                                |
| Family\_Income              | 家庭收入       | Low/Medium/High                  |
| Teacher\_Quality            | 教师质量       | Low/Medium/High                  |
| School\_Type                | 学校类型       | Public/Private                   |
| Peer\_Influence             | 同伴影响       | Positive/Neutral/Negative        |
| Physical\_Activity          | 每周体育活动时长   | 3                                |
| Learning\_Disabilities      | 是否有学习障碍    | Yes/No                           |
| Parental\_Education\_Level  | 家长教育水平     | High School/College/Postgraduate |
| Distance\_from\_Home        | 家到学校距离     | Near/Moderate/Far                |
| Gender                      | 性别         | Male/Female                      |
| Exam\_Score                 | 考试分数（目标变量） | 67                               |

***

### 基于该数据集可做的功能

| 功能点                         | 说明                                   | 依赖的关键字段                                                              |
| --------------------------- | ------------------------------------ | -------------------------------------------------------------------- |
| 学业风险预警                      | 基于出勤率、学习时长、以往成绩等多因素，预测学生是否存在学业风险     | Attendance, Hours\_Studied, Previous\_Scores, Exam\_Score            |
| 影响因素分析                      | 分析各类因素（家庭、学校、个人）对成绩的影响权重，识别关键风险因素    | 全部字段                                                                 |
| 家长参与度与成绩关联分析                | 分析家长参与度和教育水平对学生成绩的影响                 | Parental\_Involvement, Parental\_Education\_Level, Exam\_Score       |
| 学习资源公平性分析                   | 分析学习资源获取、网络访问、家庭收入对成绩的影响，识别教育不公平现象   | Access\_to\_Resources, Internet\_Access, Family\_Income, Exam\_Score |
| 学习障碍学生识别与帮扶                 | 识别有学习障碍的学生群体，分析其成绩特征和所需支持            | Learning\_Disabilities, Exam\_Score, Tutoring\_Sessions              |
| 个性化学习建议生成                   | 根据学生的薄弱因素（如出勤低、动机不足等）生成针对性学习建议       | 全部字段                                                                 |
| NL2SQL自然语言查询（**AI for DB**） | 支持教师用自然语言查询如"出勤率低于80%且学习时长少于10小时的学生" | 全部字段                                                                 |
| 学校类型对比分析                    | 对比公立与私立学校学生的成绩差异及影响因素                | School\_Type, Exam\_Score, 其他因素字段                                    |

***

### 数据质量

| 评估维度      | 情况                                                  |
| --------- | --------------------------------------------------- |
| **缺失值**   | 少量缺失（Teacher\_Quality、Distance\_from\_Home等字段有少量空值） |
| **数据真实性** | 基于真实调查数据整理，部分字段可能经过编码处理                             |
| **其他问题**  | 无时间序列数据，无法做成绩趋势分析；缺少作业完成情况、课堂表现等过程性数据               |

***

### 综合评价

**优势**：

1. 字段维度丰富（20个），涵盖家庭、学校、个人多层面因素，适合做多因素关联分析
2. 样本量较大（6607条），在四个数据集中最多，有利于模型训练
3. 包含出勤率、以往成绩等关键学业指标，直接支撑学业风险预警功能

**不足**：

1. 无时间序列数据（只有单次考试分数），无法做学业趋势分析和动态跟踪
2. 缺少作业完成情况、课堂表现等过程性评价数据
3. 缺少学生ID，无法跟踪个体学生的长期变化

***

## 二、数据集2：Student Performance (UCI)

### 基本信息

| 项目           | 内容                                                                  |
| ------------ | ------------------------------------------------------------------- |
| **调研人**      | Zichen Zou                                                          |
| **调研日期**     | 2026-05-15                                                          |
| **数据集名称**    | Student Performance (Portuguese Students)                           |
| **数据集来源/链接** | <https://www.kaggle.com/datasets/whenamancodes/student-performance> |

***

### 数据集概述

该数据集来自UCI机器学习库，记录了葡萄牙两所中学学生的学业表现及社会人口统计学信息。包含数学和葡萄牙语两个学科的数据，每个学科分别有G1（第一周期成绩）、G2（第二周期成绩）、G3（最终成绩）三个阶段成绩，是四个数据集中唯一具有多阶段成绩的，可支持学业趋势分析。此外还包含缺勤次数、学习时间、课外辅导、家庭支持等33个维度。

### 数据规模

| 指标          | 数值                         |
| ----------- | -------------------------- |
| **样本/记录数量** | 数学397条 + 葡萄牙语651条，共1048条记录 |
| **时间跨度**    | 一学年内的3个成绩周期（G1、G2、G3）      |
| **字段数量**    | 33 个维度                     |

### 主要字段

| 字段名        | 含义           | 示例值                                            |
| ---------- | ------------ | ---------------------------------------------- |
| school     | 学校名称         | GP / MS                                        |
| sex        | 性别           | F / M                                          |
| age        | 年龄           | 18                                             |
| address    | 住址类型（城市/农村）  | U / R                                          |
| famsize    | 家庭规模         | GT3 / LE3                                      |
| Pstatus    | 父母同居状态       | A / T                                          |
| Medu       | 母亲教育水平（0-4）  | 4                                              |
| Fedu       | 父亲教育水平（0-4）  | 4                                              |
| Mjob       | 母亲职业         | at\_home / teacher / health / services / other |
| Fjob       | 父亲职业         | teacher / other / services                     |
| reason     | 选择该校原因       | course / home / reputation / other             |
| guardian   | 监护人          | mother / father / other                        |
| traveltime | 上学通勤时间（1-4）  | 2                                              |
| studytime  | 每周学习时间（1-4）  | 2                                              |
| failures   | 过去挂科次数       | 0                                              |
| schoolsup  | 学校额外教育支持     | yes / no                                       |
| famsup     | 家庭教育支持       | yes / no                                       |
| paid       | 额外付费课程       | yes / no                                       |
| activities | 课外活动         | yes / no                                       |
| internet   | 家中是否有网络      | yes / no                                       |
| romantic   | 是否在恋爱        | yes / no                                       |
| freetime   | 放学后自由时间（1-5） | 3                                              |
| goout      | 与朋友外出频率（1-5） | 4                                              |
| Dalc       | 工作日饮酒量（1-5）  | 1                                              |
| Walc       | 周末饮酒量（1-5）   | 1                                              |
| health     | 健康状况（1-5）    | 3                                              |
| absences   | 缺勤次数         | 6                                              |
| G1         | 第一周期成绩       | 5                                              |
| G2         | 第二周期成绩       | 6                                              |
| G3         | 最终成绩         | 6                                              |

***

### 基于该数据集可做的功能

| 功能点                         | 说明                                   | 依赖的关键字段                                   |
| --------------------------- | ------------------------------------ | ----------------------------------------- |
| 学业趋势分析                      | 利用G1→G2→G3三阶段成绩，分析学生成绩变化趋势（进步/退步/波动） | G1, G2, G3                                |
| 学业风险预警                      | 基于G1、G2成绩预测G3，识别成绩下滑风险学生             | G1, G2, G3, absences, studytime, failures |
| 薄弱知识点/学科识别                  | 对比数学和葡萄牙语成绩，识别学生偏科情况                 | 数学G1-G3, 葡语G1-G3                          |
| 缺勤与成绩关联分析                   | 分析缺勤次数对成绩的影响程度                       | absences, G1, G2, G3                      |
| 家庭背景对学业影响分析                 | 分析父母教育水平、职业、家庭支持等对成绩的影响              | Medu, Fedu, Mjob, Fjob, famsup, G1-G3     |
| 学习时间与成绩关系分析                 | 分析每周学习时间与成绩的关联                       | studytime, G1, G2, G3                     |
| 生活习惯影响分析                    | 分析饮酒、外出频率、恋爱状态等生活习惯对成绩的影响            | Dalc, Walc, goout, romantic, G1-G3        |
| 成绩预测模型                      | 基于社会人口统计和前期成绩，构建最终成绩预测模型             | 全部字段                                      |
| NL2SQL自然语言查询（**AI for DB**） | 支持查询如"缺勤超过10次且G2成绩低于10的学生"           | 全部字段                                      |

***

### 数据质量

| 评估维度      | 情况                                                |
| --------- | ------------------------------------------------- |
| **缺失值**   | 基本无缺失值，数据完整度高                                     |
| **数据真实性** | 真实数据，来自葡萄牙中学学生调查，UCI经典数据集                         |
| **其他问题**  | 样本量偏小（数学397+葡语651）；成绩为0-20分制，非百分制；缺少作业完成情况、课堂表现数据 |

***

### 综合评价

**优势**：

1. **唯一具有多阶段成绩（G1、G2、G3）的数据集**，可做学业趋势分析和动态跟踪，这是作业要求的核心功能
2. 字段维度最多（33个），包含丰富的社会人口统计和生活习惯信息
3. 两个学科数据可做跨学科对比分析
4. UCI经典数据集，学术认可度高，有大量相关研究可参考

**不足**：

1. 样本量较小，尤其是数学学科仅397条
2. 成绩为0-20分制，需要转换为百分制或做说明
3. 缺少作业完成情况、课堂表现等过程性评价数据
4. 缺少学生ID，数学和葡语数据无法直接关联到同一学生

***

## 三、数据集3：Student Performance Predictions

### 基本信息

| 项目           | 内容                                                                             |
| ------------ | ------------------------------------------------------------------------------ |
| **调研人**      | Zichen Zou                                                                     |
| **调研日期**     | 2026-05-15                                                                     |
| **数据集名称**    | Student Performance Predictions                                                |
| **数据集来源/链接** | <https://www.kaggle.com/datasets/haseebindata/student-performance-predictions> |

***

### 数据集概述

该数据集包含学生个人信息及学业相关指标，用于预测学生最终成绩。包含学生ID、姓名、性别、出勤率、每周学习时长、以往成绩、课外活动参与、家长支持程度、最终成绩等字段。该数据集的特点是包含学生ID和姓名，便于构建学生档案系统。

### 数据规模

| 指标          | 数值         |
| ----------- | ---------- |
| **样本/记录数量** | 1000 条记录   |
| **时间跨度**    | 单次记录，无时间序列 |
| **字段数量**    | 12 个维度     |

### 主要字段

| 字段名                       | 含义       | 示例值   |
| ------------------------- | -------- | ----- |
| StudentID                 | 学生ID     | 1.0   |
| Name                      | 学生姓名     | John  |
| Gender                    | 性别       | Male  |
| AttendanceRate            | 出勤率（%）   | 85.0  |
| StudyHoursPerWeek         | 每周学习时长   | 15.0  |
| PreviousGrade             | 以往成绩     | 78.0  |
| ExtracurricularActivities | 课外活动参与次数 | 1.0   |
| ParentalSupport           | 家长支持程度   | High  |
| FinalGrade                | 最终成绩     | 80.0  |
| Study Hours               | 每日学习时长   | 4.8   |
| Attendance (%)            | 出勤率（另一列） | 59.0  |
| Online Classes Taken      | 是否上过网课   | False |

***

### 基于该数据集可做的功能

| 功能点        | 说明                           | 依赖的关键字段                                                      |
| ---------- | ---------------------------- | ------------------------------------------------------------ |
| 学生档案管理     | 利用StudentID和Name构建学生基本信息档案   | StudentID, Name, Gender                                      |
| 学业风险预警     | 基于出勤率、学习时长、以往成绩预测最终成绩，识别风险学生 | AttendanceRate, StudyHoursPerWeek, PreviousGrade, FinalGrade |
| 出勤率与成绩关联分析 | 分析出勤率对最终成绩的影响                | AttendanceRate, FinalGrade                                   |
| 家长支持程度影响分析 | 分析不同家长支持程度下学生成绩的差异           | ParentalSupport, FinalGrade                                  |
| 网课效果分析     | 对比上过网课和未上网课学生的成绩差异           | Online Classes Taken, FinalGrade                             |
| 成绩预测模型     | 基于多因素构建最终成绩预测模型              | 全部字段                                                         |

***

### 数据质量

| 评估维度      | 情况                                                                                   |
| --------- | ------------------------------------------------------------------------------------ |
| **缺失值**   | 基本无缺失值                                                                               |
| **数据真实性** | 模拟/合成数据，非真实调查数据                                                                      |
| **其他问题**  | 存在重复/冗余字段（AttendanceRate与Attendance %、StudyHoursPerWeek与Study Hours含义重叠）；字段较少，维度不够丰富 |

***

### 综合评价

**优势**：

1. 包含学生ID和姓名，便于构建学生档案系统
2. 字段简洁清晰，易于理解和使用
3. 出勤率为连续数值，便于做精细化分析

**不足**：

1. 数据为模拟/合成数据，非真实数据
2. 存在冗余字段（出勤率和学习时长各出现两次，含义略有不同但容易混淆）
3. 字段维度较少（仅12个），分析维度有限
4. 无时间序列数据，无法做趋势分析
5. 缺少作业完成情况、课堂表现等过程性评价数据

***

## 四、数据集4：Students Performance in Exams

### 基本信息

| 项目           | 内容                                                                          |
| ------------ | --------------------------------------------------------------------------- |
| **调研人**      | Zichen Zou                                                                  |
| **调研日期**     | 2026-05-15                                                                  |
| **数据集名称**    | Students Performance in Exams                                               |
| **数据集来源/链接** | <https://www.kaggle.com/datasets/spscientist/students-performance-in-exams> |

***

### 数据集概述

该数据集记录了学生在数学、阅读、写作三个科目的考试成绩，以及性别、种族/民族、父母教育水平、午餐类型、备考课程完成情况等人口统计学信息。其独特价值在于包含多学科成绩，可做跨学科对比分析和偏科识别。

### 数据规模

| 指标          | 数值         |
| ----------- | ---------- |
| **样本/记录数量** | 1000 条记录   |
| **时间跨度**    | 单次考试，无时间序列 |
| **字段数量**    | 8 个维度      |

### 主要字段

| 字段名                         | 含义           | 示例值                                                                                   |
| --------------------------- | ------------ | ------------------------------------------------------------------------------------- |
| gender                      | 性别           | female / male                                                                         |
| race/ethnicity              | 种族/民族        | group A - E                                                                           |
| parental level of education | 父母教育水平       | bachelor's degree / some college / master's degree / associate's degree / high school |
| lunch                       | 午餐类型（反映经济状况） | standard / free/reduced                                                               |
| test preparation course     | 备考课程完成情况     | completed / none                                                                      |
| math score                  | 数学成绩         | 72                                                                                    |
| reading score               | 阅读成绩         | 72                                                                                    |
| writing score               | 写作成绩         | 74                                                                                    |

***

### 基于该数据集可做的功能

| 功能点           | 说明                             | 依赖的关键字段                                             |
| ------------- | ------------------------------ | --------------------------------------------------- |
| 多学科成绩对比分析     | 对比数学、阅读、写作三科成绩，识别学生偏科情况        | math score, reading score, writing score            |
| 备考课程效果评估      | 分析完成备考课程对学生各科成绩的提升效果           | test preparation course, math/reading/writing score |
| 社会经济地位与成绩关联分析 | 通过午餐类型（免费/标准）分析经济状况对成绩的影响      | lunch, math/reading/writing score                   |
| 教育公平性分析       | 分析不同种族/民族群体的成绩差异               | race/ethnicity, 各科成绩                                |
| 父母教育水平影响分析    | 分析父母教育水平与学生成绩的关系               | parental level of education, 各科成绩                   |
| 学业风险预警        | 识别多科成绩均偏低的学生，标记为学业风险学生         | math score, reading score, writing score            |
| 个性化学习建议       | 根据偏科情况生成针对性学习建议（如数学弱则建议加强数学练习） | 各科成绩                                                |

***

### 数据质量

| 评估维度      | 情况                                  |
| --------- | ----------------------------------- |
| **缺失值**   | 无缺失值，数据完整                           |
| **数据真实性** | 真实数据，来自美国学生考试记录                     |
| **其他问题**  | 字段较少（仅8个）；无时间序列数据；缺少出勤率、学习时长等关键学业指标 |

***

### 综合评价

**优势**：

1. 包含多学科成绩（数学、阅读、写作），可做跨学科对比和偏科分析
2. 数据质量高，无缺失值
3. 包含社会经济指标（午餐类型），可做教育公平性分析
4. 备考课程完成情况字段独特，可做干预效果评估

**不足**：

1. 字段维度太少（仅8个），分析维度有限
2. 无时间序列数据，无法做趋势分析
3. 缺少出勤率、学习时长、作业完成等关键学业过程数据
4. 缺少学生ID，无法跟踪个体学生

***

## 五、四数据集综合对比

| 对比维度    | 数据集1（Performance Factors） | 数据集2（UCI Portuguese） | 数据集3（Predictions） | 数据集4（Exams） |
| ------- | ------------------------- | -------------------- | ----------------- | ----------- |
| 样本量     | 6607                      | 397+651=1048         | 1000              | 1000        |
| 字段数     | 20                        | 33                   | 12                | 8           |
| 多阶段成绩   | ❌                         | ✅ G1/G2/G3           | ❌                 | ❌           |
| 多学科成绩   | ❌                         | ✅ 数学+葡语              | ❌                 | ✅ 数学+阅读+写作  |
| 出勤率     | ✅                         | ✅（缺勤次数）              | ✅                 | ❌           |
| 学习时长    | ✅                         | ✅                    | ✅                 | ❌           |
| 家庭背景    | ✅                         | ✅                    | ✅                 | ✅           |
| 学生ID/姓名 | ❌                         | ❌                    | ✅                 | ❌           |
| 作业/课堂表现 | ❌                         | ❌                    | ❌                 | ❌           |
| 数据真实性   | 真实数据                      | 真实数据（UCI经典）          | 模拟数据              | 真实数据        |

***

## 六、数据集结合方案

### 核心问题：只用一个数据集是否太单薄？

**是的，只用一个数据集确实太单薄。** 原因如下：

1. **作业要求的核心功能需要多维度数据支撑**：学业趋势分析需要多阶段成绩（仅数据集2有），偏科识别需要多学科成绩（数据集2和4有），学业风险预警需要丰富的因素字段（数据集1最强）
2. **任何单一数据集都无法覆盖所有需求**：没有一个数据集同时具备多阶段成绩、多学科成绩、出勤率、作业完成情况等全部字段
3. **数据量考虑**：除数据集1外，其他数据集样本量均偏小

### 推荐结合方案：统一数据库设计 + 多数据集映射

**核心思路**：设计一个统一的数据库模式（schema），将四个数据集的字段映射到统一表中，各数据集各取所长、互补不足。

#### 1. 统一数据库表设计

```
学生表（student）
├── student_id（主键，统一编号）
├── name
├── gender
├── age
├── school
├── address_type（城市/农村）
├── data_source（标记来自哪个数据集）

成绩表（exam_score）
├── score_id（主键）
├── student_id（外键）
├── subject（数学/阅读/写作/葡语）
├── period（G1/G2/G3 或 final）
├── score
├── max_score（满分，统一为100）
├── exam_date

出勤表（attendance）
├── attendance_id（主键）
├── student_id（外键）
├── attendance_rate
├── absences

学习因素表（learning_factors）
├── factor_id（主键）
├── student_id（外键）
├── study_hours_per_week
├── sleep_hours
├── motivation_level
├── tutoring_sessions
├── internet_access
├── extracurricular_activities
├── learning_disabilities

家庭背景表（family_background）
├── family_id（主键）
├── student_id（外键）
├── parental_education_level
├── parental_involvement
├── parental_support
├── family_income
├── father_job
├── mother_job
├── lunch_type

预警结果表（risk_alert）
├── alert_id（主键）
├── student_id（外键）
├── risk_level
├── risk_type
├── alert_time
├── risk_features
├── intervention_status

学习建议表（learning_suggestion）
├── suggestion_id（主键）
├── student_id（外键）
├── suggestion_content
├── generated_time
├── student_feedback
├── effectiveness_rating
```

#### 2. 各数据集映射策略

| 统一表                | 数据集1映射                                           | 数据集2映射                            | 数据集3映射                                 | 数据集4映射                               |
| ------------------ | ------------------------------------------------ | --------------------------------- | -------------------------------------- | ------------------------------------ |
| student            | Gender → gender                                  | sex, age, school, address → 对应字段  | StudentID, Name, Gender → 对应字段         | gender → gender                      |
| exam\_score        | Exam\_Score → 数学final                            | G1/G2/G3 → 数学/葡语三阶段               | PreviousGrade, FinalGrade → 数学G1/final | math/reading/writing score → 三科final |
| attendance         | Attendance → attendance\_rate                    | absences → absences               | AttendanceRate → attendance\_rate      | 无（标记为NULL）                           |
| learning\_factors  | Hours\_Studied, Sleep\_Hours, Motivation\_Level等 | studytime, schoolsup, activities等 | StudyHoursPerWeek, Online Classes等     | test preparation course              |
| family\_background | Parental\_Involvement, Family\_Income等           | Medu, Fedu, Mjob, Fjob等           | ParentalSupport                        | parental level of education, lunch   |

#### 3. 缺失数据的解决方法

作业要求中提到需要"作业完成情况、课堂表现、考勤"等多源数据，但四个数据集均缺少作业完成情况和课堂表现数据。解决方法如下：

| 缺失数据   | 解决方法                                                                              |
| ------ | --------------------------------------------------------------------------------- |
| 作业完成情况 | 基于现有数据（出勤率、学习时长、以往成绩）用算法生成模拟数据：出勤率高+学习时长长的学生作业完成率高，反之低。生成时加入随机扰动使数据分布更真实          |
| 课堂表现   | 同上，基于学习动机、家长参与度、以往成绩等字段生成课堂表现评分（1-5分），并加入随机扰动                                     |
| 时间序列不足 | 数据集2已有G1/G2/G3三阶段成绩；对其他数据集，可基于Previous\_Scores/PreviousGrade和最终成绩，用插值法生成中间阶段的模拟成绩 |
| 学生ID缺失 | 为数据集1、2、4的数据自动生成唯一学生ID，确保可跟踪个体学生                                                  |

#### 4. 最终推荐使用的数据集组合

**推荐组合：数据集1 + 数据集2 + 数据集4**（数据集3因是模拟数据且字段冗余，建议作为辅助参考）

- **数据集1（主数据集）**：样本量最大（6607条），因素最丰富，作为学业风险预警和因素分析的主要数据来源
- **数据集2（趋势分析核心）**：唯一具有多阶段成绩，是学业趋势分析和动态跟踪功能的关键数据来源
- **数据集4（多学科分析）**：多学科成绩支持偏科分析和跨学科对比
- **数据集3（辅助）**：提供学生ID/姓名的参考格式，其数据可选择性补充

***

## 七、附加信息

- 数据集1 Kaggle页面：<https://www.kaggle.com/datasets/lainguyn123/student-performance-factors>
- 数据集2 UCI原始页面：<https://archive.ics.uci.edu/ml/datasets/Student+Performance> （含详细数据字典和相关论文）
- 数据集2 相关论文：P. Cortez and A. Silva, "Using Data Mining to Predict Secondary School Student Performance"
- 数据集4 Kaggle页面：<https://www.kaggle.com/datasets/spscientist/students-performance-in-exams>
- 各数据集的SQL文件已生成，存放在对应数据集子文件夹中

