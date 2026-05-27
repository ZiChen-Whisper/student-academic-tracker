import pandas as pd
import os

files = [
    (r'D:\课程作业\数据库大作业\data.csv', 'data'),
    (r'D:\课程作业\数据库大作业\students_scores.csv', 'students_scores'),
    (r'D:\课程作业\数据库大作业\教育数据.csv', 'education_data')
]

os.makedirs('前期准备/数据集/Zhen_Chen', exist_ok=True)

for file_path, table_name in files:
    try:
        df = pd.read_csv(file_path, encoding='utf-8')
        print(f'读取成功: {os.path.basename(file_path)} ({len(df)} 行)')
        
        base_name = os.path.splitext(os.path.basename(file_path))[0]
        output_file = f'前期准备/数据集/Zhen_Chen/Zhen_Chen_{base_name}.sql'
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f'CREATE TABLE IF NOT EXISTS {table_name} (\n')
            for i, col in enumerate(df.columns):
                comma = ',' if i < len(df.columns) - 1 else ''
                clean_col = col.strip().replace(' ', '_').replace('(', '').replace(')', '')
                f.write(f'    "{clean_col}" TEXT{comma}\n')
            f.write(');\n\n')
            
            for _, row in df.iterrows():
                cols = ', '.join([f'"{col.strip().replace(" ", "_").replace("(", "").replace(")", "")}"' for col in df.columns])
                vals = []
                for v in row:
                    if pd.isna(v):
                        vals.append('NULL')
                    else:
                        escaped = str(v).replace("'", "''")
                        vals.append(f"'{escaped}'")
                f.write(f'INSERT INTO {table_name} ({cols}) VALUES ({", ".join(vals)});\n')
        
        print(f'SQL 生成: {output_file}')
    except Exception as e:
        print(f'处理 {file_path} 时出错: {e}')

print('\n全部完成！')