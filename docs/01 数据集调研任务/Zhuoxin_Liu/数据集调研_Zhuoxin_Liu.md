# 数据集调研 — Zhuoxin Liu

***

## 一、数据集1：学生学习行为多源数据集（Student Learning Behavior Dataset）

### 基本信息

| 项目           | 内容                                                                        |
| ------------ | ------------------------------------------------------------------------- |
| **调研人**      |  Zhuoxin Liu                                                                |
| **调研日期**     | 2026-05-16                                                                |
| **数据集名称**    | 学生学习行为多源数据集（Student Learning Behavior Dataset）                                              |
| **数据集来源/链接** | <https://www.kaggle.com/datasets/zara2099/student-learning-behavior-dataset> |

***

### 数据集概述

该数据集整合了学生在学习过程中的多源行为数据，包括学习管理系统（LMS）日志、课程互动记录、作业提交情况、考试表现以及课外学习活动等。数据旨在刻画学生的学习习惯、参与度和学业进展，可用于分析学习行为模式、预测学业表现、识别高风险学生等教育数据挖掘任务。

### 数据规模

| 指标          | 数值         |
| ----------- | ---------- |
| **样本/记录数量** | 约 3万+ 条学习行为记录，覆盖 5000+ 名学生   |
| **时间跨度**    | 1个学期（约4个月） |
| **字段数量**    | 18+个维度     |

### 主要字段

| 字段名                | 含义                           | 示例值  |
| --------------------- | ------------------------------ | ------- |
| student_id            | 学生唯一标识                   | S100234 |
| course_id             | 课程标识                       | CS101   |
| login_freq            | 登录系统次数（周）             | 12      |
| video_watch_time      | 观看教学视频总时长（分钟）     | 320     |
| forum_posts           | 论坛发帖/回帖数量              | 5       |
| assignment_submit_delay | 作业提交延迟天数             | 1       |
| midterm_score         | 期中考试成绩（百分制）         | 78      |
| final_exam_score      | 期末考试成绩                   | 82      |
| grade                 | 最终等级                       | B+      |

***

### 基于该数据集可做的功能

| 功能点           | 说明                                                         | 依赖的关键字段                                         |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| 学习行为画像     | 根据登录频率、视频观看时长、论坛参与度等，为学生生成学习活跃度画像 | login_freq, video_watch_time, forum_posts              |
| 学业预警         | 基于作业延迟、成绩下降趋势，预测学生是否有挂科风险           | assignment_submit_delay, midterm_score, final_exam_score |
| 个性化学习建议   | 识别薄弱环节（如视频观看不连续、作业拖延），推荐补习资源     | video_watch_time, assignment_submit_delay, grade       |
| 课程参与度分析   | 分析不同课程的平均登录次数和论坛活跃度，评估课程吸引力       | course_id, login_freq, forum_posts                     |

***

### 数据质量

| 评估维度 | 情况 |
| --- | --- |
| 缺失值 | 整体缺失率约5%，主要集中于论坛发帖字段（部分学生未参与） |
| 数据真实性 | 真实匿名化数据，来源于某大学LMS日志及成绩系统 |
| 其他问题 | 时间戳存在少量不一致格式（已统一转换）；成绩字段部分为字母等级，需编码 |

***

### 综合评价

**优势**：

1.  多源数据融合（行为+成绩），适合做关联分析。
2.  字段丰富，涵盖学习过程的多个关键节点。
3.  真实来源，具有实践参考价值。

**不足**：

1.  时间跨度仅一个学期，无法分析长期趋势。
2.  缺少人口学信息（如性别、年龄），无法做群体差异分析。
3.  论坛数据较为稀疏，活跃度分布极不均衡。

***

## 二、数据集2：学生在线学习行为数据集 (xAPI-Edu-Data)

### 基本信息

| 项目           | 内容                                                                  |
| ------------ | ------------------------------------------------------------------- |
| **调研人**      | Zhuoxin Liu                                                          |
| **调研日期**     | 2026-05-16                                                          |
| **数据集名称**    | 学生在线学习行为数据集 (xAPI-Edu-Data)                           |
| **数据集来源/链接** | <https://www.kaggle.com/aljarah/xAPI-Edu-Data> |

***

### 数据集概述

该数据集记录了学生在两个学期内使用在线学习平台（如Moodle）的学习行为，基于xAPI（Experience API）标准采集。数据包含学生的基本信息（国籍、性别、教育阶段）、点击流日志、作业提交情况、测验得分以及最终学业表现（升/留级）。常用于构建学习分析模型、预测学生学业风险。

### 数据规模

| 指标 | 数值 |
| --- | --- |
| **样本/记录数量** | 480 条学生记录 |
| **时间跨度** | 两个学期 |
| **字段数量** | 16 个字段 |

### 主要字段

| 字段名 | 含义 | 示例值 |
| --- | --- | --- |
| gender | 性别 | M / F |
| NationalITy | 国籍 | KW (科威特) |
| PlaceofBirth | 出生地 | Kuwait |
| StageID | 教育阶段 | lowerlevel / middle school / high school |
| GradeID | 年级标识 | G-04 |
| SectionID | 班级小组 | A / B / C |
| Topic | 课程主题 | 数学、科学等 |
| Semester | 学期 | First / Second |
| Relation | 主要监护人 | Father / Mother |
| raisedhands | 课堂举手次数 | 12 |
| VisITedResources | 访问课程资源次数 | 25 |
| AnnouncementsView | 查看公告次数 | 8 |
| Discussion | 参与讨论次数 | 3 |
| ParentAnsweringSurvey | 家长是否完成问卷 | Yes / No |
| ParentSchoolSatisfaction | 家长对学校的满意度 | Good / Bad |
| StudentAbsenceDays | 缺勤天数 | under-7 / above-7 |
| Class | 最终结果（学业风险等级） | L (低风险) / M (中风险) / H (高风险) |

***

### 基于该数据集可做的功能

| 功能点 | 说明 | 依赖的关键字段 |
| --- | --- | --- |
| 学业风险分类 | 利用行为特征预测学生属于低/中/高风险类别 | raisedhands, VisITedResources, Discussion, StudentAbsenceDays, Class |
| 行为与家庭因素关联分析 | 分析家长参与度和满意度对学生缺勤及成绩的影响 | ParentAnsweringSurvey, ParentSchoolSatisfaction, StudentAbsenceDays, Class |
| 学习参与度仪表盘 | 统计班级/年级的平均举手次数、资源访问量，对比个人表现 | SectionID, GradeID, raisedhands, VisITedResources |
| 缺勤风险预警 | 根据学期初的行为（如第一周举手次数、资源访问）预测缺勤超过7天的学生 | raisedhands, VisITedResources, StudentAbsenceDays |

***

### 数据质量

| 评估维度 | 情况 |
| --- | --- |
| **缺失值** | 无缺失值，数据完整 |
| **数据真实性** | 真实匿名化数据，来自中东某国的学校系统 |
| **其他问题** | 样本量较小（仅480条），国籍分布极不均匀（科威特占绝大多数），可能存在地域偏差 |

***

### 综合评价

**优势**：  
1. 字段清晰，包含家庭因素（家长问卷、满意度），拓展了学习分析维度。  
2. 已有标注的学业风险等级（Class），便于监督学习。  
3. 数据清洗度好，无需复杂预处理。

**不足**：  
1. 样本量小，模型泛化能力受限。  
2. 缺乏连续型成绩字段，风险等级为三档，精度不够细腻。  
3. 国籍单一性强，不适用于跨文化研究。

***

## 三、数据集3：学生学业风险预测多源集成基准数据集 (Student Academic Risk Prediction Multi-source Integrated Benchmark Dataset)

### 基本信息

| 项目           | 内容                                                                             |
| ------------ | ------------------------------------------------------------------------------ |
| **调研人**      | Zhuoxin Liu                                                                     |
| **调研日期**     | 2026-05-16                                                                     |
| **数据集名称**    | 学生学业风险预测多源集成基准数据集 (Student Academic Risk Prediction Multi-source Integrated Benchmark Dataset)                                                |
| **数据集来源/链接** | <https://data.mendeley.com/datasets/8tvbwh3gvb/2> |

***

### 数据集概述

该数据集是一个专门用于学业风险预测的基准数据集，整合了来自多个高校的学生信息，包括：人口统计学特征、高中成绩、大学入学考试分数、第一学期课程出勤率、在线学习活动日志、作业及考试成绩、以及最终学业状态（正常/留级/退学）。数据时间跨度长、样本量大，适合训练和评估学业预警模型。

### 数据规模

| 指标 | 数值 |
| --- | --- |
| **样本/记录数量** | 约 2万+ 名学生，包含 8 张关联表，总计 50万+ 条记录 |
| **时间跨度** | 4 年（2018-2021） |
| **字段数量** | 30+ 个维度（多表汇总） |

### 主要字段

| 字段名 | 含义 | 示例值 |
| --- | --- | --- |
| student_id | 学生ID | S101 |
| age | 入学年龄 | 18 |
| gender | 性别 | Male |
| high_school_GPA | 高中GPA | 3.6 |
| college_entry_score | 大学入学考试成绩 | 620 |
| major | 专业 | Computer Science |
| semester1_attendance_rate | 第一学期出勤率 | 0.92 |
| lms_click_count | LMS系统点击次数（周均） | 120 |
| assignment_avg_score | 作业平均分 | 85.3 |
| midterm_score | 期中考试分数 | 74 |
| final_score | 期末分数 | 81 |
| academic_status | 最终学业状态 | Active / AtRisk / DroppedOut |

***

### 基于该数据集可做的功能

| 功能点 | 说明 | 依赖的关键字段 |
| --- | --- | --- |
| 学业风险早期预警 | 基于入学前数据（高中GPA、入学成绩）预测第一学期末的风险状态 | high_school_GPA, college_entry_score, academic_status |
| 动态风险监控 | 结合每周的LMS点击、出勤率变化，实时更新风险等级 | lms_click_count, semester1_attendance_rate, assignment_avg_score |
| 专业适应性分析 | 分析不同专业学生的风险比例及影响因素（如高中背景） | major, high_school_GPA, academic_status |
| 退学原因归因 | 通过多源特征分析退学学生的主要特征模式 | 全部字段，特别是出勤率、成绩趋势 |

***

### 数据质量

| 评估维度 | 情况 |
| --- | --- |
| **缺失值** | 高中GPA缺失约12%（部分学生非传统入学）；入学成绩缺失约5% |
| **数据真实性** | 真实匿名化数据，来源于多所合作高校的学生信息系统 |
| **其他问题** | 不同学校的数据格式略有差异（如成绩评分标准），已做归一化；时间戳跨多个系统需要关联处理 |

***

### 综合评价

**优势**：  
1. 数据规模大、时间跨度长，适合训练稳健的预测模型。  
2. 多源集成（入学前+入学后），信息维度全面。  
3. 明确标注了学业风险状态，可用于监督学习及基准测试。  
4. 多表结构贴近真实数据库设计，便于练习SQL关联查询。

**不足**：  
1. 数据预处理较复杂（多表关联、缺失值处理）。  
2. 部分学校的专业分类不一致，需要映射对齐。  
3. 缺乏学习行为中细粒度的时间序列（如每日点击分布）。

***

## 四、数据集4：学生心理健康数据集 (Student Mental Health Dataset)

### 基本信息

| 项目           | 内容                                                                          |
| ------------ | --------------------------------------------------------------------------- |
| **调研人**      | Zhuoxin Liu                                                                  |
| **调研日期**     | 2026-05-16                                                                  |
| **数据集名称**    | 学生心理健康数据集 (Student Mental Health Dataset)                                               |
| **数据集来源/链接** | <https://www.kaggle.com/datasets/mhabli/student-mental-health/data> |

***

### 数据集概述

该数据集通过问卷形式收集了高等教育学生的心理健康状况，包括：人口学信息（年龄、性别、学科）、生活习惯（睡眠、运动）、压力来源（学业、经济、人际关系）、以及常见的心理量表评分（如焦虑、抑郁、自尊量表）。数据可用于分析学生心理问题的分布特征，识别高风险人群，为学校心理健康服务提供数据支持。

### 数据规模

| 指标 | 数值 |
| --- | --- |
| **样本/记录数量** | 约 1000 条学生问卷记录 |
| **时间跨度** | 一次横断面调查（2022年） |
| **字段数量** | 20+ 个字段 |

### 主要字段

| 字段名 | 含义 | 示例值 |
| --- | --- | --- |
| age | 年龄 | 21 |
| gender | 性别 | Female |
| course | 所学专业 | Psychology |
| year_of_study | 年级 | 2nd Year |
| sleep_hours | 平均睡眠时长（小时/晚） | 6.5 |
| physical_activity | 每周运动次数 | 2 |
| academic_pressure | 学业压力自评（1-10） | 8 |
| financial_pressure | 经济压力自评（1-10） | 5 |
| social_support | 社会支持得分（量表） | 32 |
| anxiety_score | 焦虑量表得分（GAD-7） | 12 |
| depression_score | 抑郁量表得分（PHQ-9） | 10 |
| self_esteem_score | 自尊量表得分（Rosenberg） | 25 |
| ever_sought_counselling | 是否曾寻求心理咨询 | Yes |
| diagnosed_disorder | 是否确诊过心理障碍 | No |

***

### 基于该数据集可做的功能

| 功能点 | 说明 | 依赖的关键字段 |
| --- | --- | --- |
| 心理压力因素分析 | 分析学业压力、经济压力、社会支持等对焦虑/抑郁得分的影响 | academic_pressure, financial_pressure, social_support, anxiety_score, depression_score |
| 高风险群体识别 | 根据量表阈值筛选出高焦虑/高抑郁的学生群体，并提供专业推荐 | anxiety_score, depression_score |
| 生活方式与心理健康关联 | 探索睡眠时长、运动频率与心理得分的相关性 | sleep_hours, physical_activity, anxiety_score, depression_score |
| 心理咨询倾向预测 | 基于压力和生活因素预测学生是否会主动寻求心理咨询 | academic_pressure, ever_sought_counselling, gender, year_of_study |

***

### 数据质量

| 评估维度 | 情况 |
| --- | --- |
| **缺失值** | 缺失率约3%，集中在 `diagnosed_disorder` 字段（部分学生未填写） |
| **数据真实性** | 真实匿名化问卷数据，来源为某大学的学生健康调查 |
| **其他问题** | 量表得分均为整数，但部分得分缺少原始条目细节，无法计算标准误；数据为横截面，无法追踪变化 |


***

### 综合评价

**优势**：  
1. 包含经过验证的心理量表得分，具有临床参考价值。  
2. 涵盖多维度压力源，便于做综合因素分析。  
3. 数据量适中，适合快速建模和教学演示。

**不足**：  
1. 样本代表性有限。  
2. 缺少时间序列数据，无法分析心理变化的动态过程。  
3. 部分量表分数缺少常模参照，无法判断严重程度分级。

***


## 五、附加信息

- 数据集1 Kaggle页面：<https://www.kaggle.com/datasets/zara2099/student-learning-behavior-dataset>
- 数据集2 Kaggle页面：<https://www.kaggle.com/datasets/aljarah/xAPI-Edu-Data> 
- 数据集3 Mendeley页面：<https://data.mendeley.com/datasets/8tvbwh3gvb/2>
- 数据集4 Kaggle页面：<https://www.kaggle.com/datasets/mhabli/student-mental-health/data>
- 各数据集的SQL文件已生成，存放在对应数据集子文件夹中