import pandas as pd
import mysql.connector
import numpy as np
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from config import DB_CONFIG


def safe_int(val, default=0):
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def safe_str(val, default=''):
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return default
    return str(val)


def import_performance_factors(tmp_table='tmp_perf_factors'):
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    df = pd.read_sql(f"SELECT * FROM {tmp_table}", conn)
    print(f"从 {tmp_table} 读取到 {len(df)} 条记录，列名: {df.columns.tolist()}")

    subject_id = "SUBJ_GENERAL"
    cursor.execute(
        "INSERT IGNORE INTO subject (subject_id, subject_name, subject_type) VALUES (%s, %s, %s)",
        (subject_id, "综合", "必修")
    )

    success_count = 0
    for idx, row in df.iterrows():
        try:
            student_id = f"STU_F_{idx+1:04d}"

            gender_raw = safe_str(row.get('Gender', 'Male'))
            gender = 'M' if gender_raw == 'Male' else 'F'

            cursor.execute("""
                INSERT INTO student (student_id, student_name, student_gender, student_age)
                VALUES (%s, %s, %s, %s)
            """, (
                student_id,
                f"Student_F_{idx+1}",
                gender,
                None
            ))

            cursor.execute("""
                INSERT INTO learning_behavior (student_id, attendance_rate, study_hours,
                    sleep_hours, motivation_level, previous_scores, tutoring_sessions,
                    internet_access, extracurricular, physical_activity)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                student_id,
                safe_int(row.get('Attendance', 0)),
                safe_int(row.get('Hours_Studied', 0)),
                safe_int(row.get('Sleep_Hours', 0)),
                safe_str(row.get('Motivation_Level', '')),
                safe_int(row.get('Previous_Scores', 0)),
                safe_int(row.get('Tutoring_Sessions', 0)),
                safe_str(row.get('Internet_Access', '')),
                safe_str(row.get('Extracurricular_Activities', '')),
                safe_int(row.get('Physical_Activity', 0))
            ))

            cursor.execute("""
                INSERT INTO family_background (student_id, father_edu, mother_edu,
                    family_income, parental_involvement, family_support)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                student_id,
                safe_str(row.get('Parental_Education_Level', '')),
                safe_str(row.get('Parental_Education_Level', '')),
                safe_str(row.get('Family_Income', '')),
                safe_str(row.get('Parental_Involvement', '')),
                safe_str(row.get('Access_to_Resources', ''))
            ))

            cursor.execute("""
                INSERT INTO exam_score (student_id, subject_id, score, exam_stage)
                VALUES (%s, %s, %s, %s)
            """, (student_id, subject_id, safe_int(row.get('Exam_Score', 0)), 'G3'))

            cursor.execute("""
                INSERT IGNORE INTO student_subject (student_id, subject_id, enroll_time)
                VALUES (%s, %s, NOW())
            """, (student_id, subject_id))

            success_count += 1
        except Exception as e:
            print(f"  第{idx+1}条记录导入失败: {e}")

    conn.commit()
    cursor.close()
    conn.close()
    print(f"导入完成: {tmp_table}, 成功{success_count}条, 共{len(df)}条")


if __name__ == '__main__':
    import_performance_factors()
