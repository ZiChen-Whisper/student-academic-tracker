import pandas as pd
import mysql.connector
import numpy as np
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from config import DB_CONFIG


EDU_MAP = {0: '无', 1: '小学', 2: '初中', 3: '高中', 4: '大学'}


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


def import_uci_data(tmp_table, subject_name, subject_id, id_prefix):
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    df = pd.read_sql(f"SELECT * FROM {tmp_table}", conn)
    print(f"从 {tmp_table} 读取到 {len(df)} 条记录，列名: {df.columns.tolist()}")

    cursor.execute(
        "INSERT IGNORE INTO subject (subject_id, subject_name, subject_type) VALUES (%s, %s, %s)",
        (subject_id, subject_name, "必修")
    )

    success_count = 0
    for idx, row in df.iterrows():
        try:
            student_id = f"{id_prefix}_{idx+1:04d}"

            cursor.execute("""
                INSERT INTO student (student_id, student_name, student_gender, student_age, student_address)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                student_id,
                f"Student_{id_prefix}_{idx+1}",
                safe_str(row.get('sex', 'M')),
                safe_int(row.get('age', 15)),
                safe_str(row.get('address', ''))
            ))

            for stage, col in [('G1', 'G1'), ('G2', 'G2'), ('G3', 'G3')]:
                score_val = safe_int(row.get(col, 0))
                cursor.execute("""
                    INSERT INTO exam_score (student_id, subject_id, score, exam_stage)
                    VALUES (%s, %s, %s, %s)
                """, (student_id, subject_id, score_val, stage))

            fedu_val = safe_int(row.get('Fedu', 0))
            medu_val = safe_int(row.get('Medu', 0))
            cursor.execute("""
                INSERT INTO family_background (student_id, father_edu, mother_edu,
                    father_job, mother_job, family_support, fam_rel)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                student_id,
                EDU_MAP.get(fedu_val, str(fedu_val)),
                EDU_MAP.get(medu_val, str(medu_val)),
                safe_str(row.get('Fjob', '')),
                safe_str(row.get('Mjob', '')),
                safe_str(row.get('famsup', '')),
                safe_int(row.get('famrel', 0))
            ))

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
    print(f"导入完成: {tmp_table} -> {subject_name}, 成功{success_count}条, 共{len(df)}条")


if __name__ == '__main__':
    import_uci_data('tmp_uci_math', '数学', 'SUBJ_MATH', 'STU_M')
    import_uci_data('tmp_uci_por', '葡萄牙语', 'SUBJ_PORTUGUESE', 'STU_P')
