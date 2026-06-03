"""
NL2SQL 功能测试脚本
包含 20 个测试查询，用于验证 NL2SQL 的准确率
"""

import sys
import os

# 将 backend 目录加入 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))

from services.nl2sql_service import nl2sql

# 20 个测试查询
TEST_QUERIES = [
    "查询所有学生的平均成绩",
    "查询数学成绩前10名的学生",
    "查询出勤率低于80%的学生",
    "统计各科目的平均分",
    "查询G1到G3成绩持续下滑的学生",
    "查询高风险预警学生名单",
    "统计男女学生的平均成绩差异",
    "查询学习时长与成绩的关系",
    "查询家庭支持对学生成绩的影响",
    "查询缺勤次数最多的10个学生",
    "查询有额外辅导的学生成绩是否更好",
    "查询有网络接入和没有网络接入的学生成绩对比",
    "查询动机水平高的学生平均成绩",
    "查询年龄和成绩的关系",
    "查询学校支持对学生成绩的影响",
    "查询各班级的平均成绩排名",
    "查询成绩进步最大的10个学生",
    "查询家庭收入水平与学生成绩的关系",
    "查询睡眠时间与成绩的关系",
    "查询参加课外活动和不参加的学生成绩对比",
]


def run_tests():
    """运行所有测试查询并统计准确率"""
    correct_count = 0
    total_count = len(TEST_QUERIES)
    results = []

    print("=" * 80)
    print("NL2SQL 功能测试")
    print("=" * 80)

    for i, question in enumerate(TEST_QUERIES, 1):
        print(f"\n[{i}/{total_count}] 问题：{question}")
        result = nl2sql(question)

        is_correct = result['error'] is None and len(result['result']) > 0

        if is_correct:
            correct_count += 1
            status = "✓ 正确"
        else:
            status = "✗ 错误"

        print(f"  生成 SQL：{result['sql'][:100]}{'...' if len(result['sql']) > 100 else ''}")
        print(f"  结果状态：{status}")
        if result['error']:
            print(f"  错误信息：{result['error']}")
        else:
            print(f"  返回行数：{len(result['result'])}，耗时：{result['execution_time_ms']}ms")
            if result['result']:
                print(f"  首行数据：{result['result'][0]}")

        results.append({
            'index': i,
            'question': question,
            'sql': result['sql'],
            'is_correct': is_correct,
            'error': result['error'],
            'row_count': len(result['result']) if result['result'] else 0,
            'execution_time_ms': result['execution_time_ms']
        })

    # 统计结果
    accuracy = correct_count / total_count * 100
    print("\n" + "=" * 80)
    print(f"测试完成！准确率：{correct_count}/{total_count} = {accuracy:.1f}%")
    print(f"目标准确率：≥ 85%")
    print(f"{'达标 ✓' if accuracy >= 85 else '未达标 ✗，需要优化 Prompt'}")
    print("=" * 80)

    # 输出错误查询详情
    failed = [r for r in results if not r['is_correct']]
    if failed:
        print(f"\n失败的查询（{len(failed)}个）：")
        for r in failed:
            print(f"  [{r['index']}] {r['question']}")
            print(f"      SQL: {r['sql'][:150]}")
            print(f"      错误: {r['error']}")

    return accuracy, results


if __name__ == '__main__':
    run_tests()
