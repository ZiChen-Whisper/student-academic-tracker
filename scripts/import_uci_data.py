import pandas as pd
import mysql.connector
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from config import DB_CONFIG


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
                row['sex'],
                int(row['age']),
                row['address']
            ))

            for stage, col in [('G1', 'G1'), ('G2', 'G2'), ('G3', 'G3')]:
                cursor.execute("""
                    INSERT INTO exam_score (student_id, subject_id, score, exam_stage)
                    VALUES (%s, %s, %s, %s)
                """, (student_id, subject_id, int(row[col]), stage))

            cursor.execute("""
                INSERT INTO family_background (student_id, father_edu, mother_edu,
                    father_job, mother_job, family_support, fam_rel)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                student_id,
                str(row['Fedu']),
                str(row['Medu']),
                row['Fjob'],
                row['Mjob'],
                row['famsup'],
                int(row['famrel'])
            ))

            cursor.execute("""
                INSERT IGNORE INTO student_subject (student_id, subject_id, enroll_time)
                VALUES (%s, %s, NOW())
            """, (student_id, subject_id))

            success_count += 1
        except Exception as e:
            print(f"  第{idx+1}条记录导入失败: {e}")
            conn.rollback()

    conn.commit()
    cursor.close()
    conn.close()
    print(f"导入完成: {tmp_table} -> {subject_name}, 成功{success_count}条, 共{len(df)}条")


if __name__ == '__main__':
    import_uci_data('tmp_uci_math', '数学', 'SUBJ_MATH', 'STU_M')
    import_uci_data('tmp_uci_por', '葡萄牙语', 'SUBJ_PORTUGUESE', 'STU_P')
