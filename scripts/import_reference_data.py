import mysql.connector
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from config import DB_CONFIG


def import_reference_data():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    teachers = [
        ('T001', '张老师', 'M', '高级教师'),
        ('T002', '李老师', 'F', '一级教师'),
        ('T003', '王老师', 'M', '二级教师'),
    ]
    for t in teachers:
        cursor.execute(
            "INSERT IGNORE INTO teacher (teacher_id, teacher_name, teacher_gender, teacher_title) VALUES (%s, %s, %s, %s)",
            t
        )
    print(f"插入 {len(teachers)} 条教师数据")

    classes = [
        ('CLS001', '高一(1)班', '高一', 'T001'),
        ('CLS002', '高一(2)班', '高一', 'T002'),
        ('CLS003', '高二(1)班', '高二', 'T003'),
    ]
    for c in classes:
        cursor.execute(
            "INSERT IGNORE INTO class (class_id, class_name, class_grade, class_teacher_id) VALUES (%s, %s, %s, %s)",
            c
        )
    print(f"插入 {len(classes)} 条班级数据")

    cursor.execute("UPDATE student SET student_class_id = 'CLS001' WHERE student_id LIKE 'STU_M_%'")
    print(f"更新 {cursor.rowcount} 条UCI数学学生班级")
    cursor.execute("UPDATE student SET student_class_id = 'CLS002' WHERE student_id LIKE 'STU_P_%'")
    print(f"更新 {cursor.rowcount} 条UCI葡语学生班级")
    cursor.execute("UPDATE student SET student_class_id = 'CLS003' WHERE student_id LIKE 'STU_F_%'")
    print(f"更新 {cursor.rowcount} 条Performance Factors学生班级")

    schedules = [
        (1, '周一第1-2节', 'A101', 'SUBJ_MATH', 'T001', 'CLS001'),
        (2, '周一第3-4节', 'A102', 'SUBJ_PORTUGUESE', 'T002', 'CLS002'),
        (3, '周二第1-2节', 'B201', 'SUBJ_GENERAL', 'T003', 'CLS003'),
    ]
    for s in schedules:
        cursor.execute(
            "INSERT IGNORE INTO course_schedule (schedule_id, scheduled_period, scheduled_classroom, subject_id, teacher_id, class_id) VALUES (%s, %s, %s, %s, %s, %s)",
            s
        )
    print(f"插入 {len(schedules)} 条课程安排数据")

    conn.commit()
    cursor.close()
    conn.close()
    print("参考数据导入完成")


if __name__ == '__main__':
    import_reference_data()
