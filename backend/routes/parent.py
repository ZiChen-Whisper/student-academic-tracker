from flask import Blueprint, request, jsonify
from db import query_all, query_one

parent_bp = Blueprint('parent', __name__)

# 科目满分映射
SUBJECT_FULL_SCORE = {
    'SUBJ_MATH': 20,
    'SUBJ_PORTUGUESE': 20,
    'SUBJ_GENERAL': 100,
}

# 家长行动建议规则模板
PARENT_ACTION_RULES = {
    '出勤率低': {
        'action': '关注孩子每日出勤情况，与班主任保持沟通，了解缺勤原因并协助解决',
        'priority': 'high',
    },
    '学习时长不足': {
        'action': '为孩子营造安静的学习环境，制定每日学习计划，监督学习时间',
        'priority': 'high',
    },
    '睡眠不足': {
        'action': '确保孩子有充足的睡眠时间，建议每天睡眠不少于8小时，避免睡前使用电子设备',
        'priority': 'high',
    },
    '缺乏辅导': {
        'action': '考虑为孩子安排课外辅导或学习小组，也可与老师沟通获取额外学习资源',
        'priority': 'medium',
    },
    '缺乏运动': {
        'action': '鼓励孩子参加体育活动，每天至少运动30分钟，有助于提高学习效率和身心健康',
        'priority': 'medium',
    },
    '学习动力不足': {
        'action': '与孩子沟通了解学习困难，设定合理目标并给予积极鼓励，关注孩子的兴趣和进步',
        'priority': 'high',
    },
    '成绩下降': {
        'action': '与孩子一起分析成绩下降的原因，与老师沟通制定改善计划，关注孩子的学习状态',
        'priority': 'high',
    },
    '家庭支持不足': {
        'action': '增加与孩子讨论学习的时间，每周至少2-3次，关注孩子的学习进展和情绪变化',
        'priority': 'high',
    },
    '家庭关系紧张': {
        'action': '营造和谐的家庭氛围，减少家庭冲突，为孩子提供稳定的学习环境',
        'priority': 'high',
    },
    '家长参与度低': {
        'action': '积极参与家长会和学校活动，定期与老师沟通了解孩子在校表现',
        'priority': 'medium',
    },
}

# 家庭因素影响分析模板
FAMILY_IMPACT_MAP = {
    'family_support_level': {
        'name': '家庭支持程度',
        'levels': {
            '低': {'impact': 'negative', 'desc': '家庭支持程度较低，可能影响孩子的学习积极性和成绩表现', 'suggestion': '增加与孩子讨论学习的时间，每周至少2-3次'},
            '中': {'impact': 'neutral', 'desc': '家庭支持程度处于中等水平，建议进一步提升', 'suggestion': '增加与孩子讨论学习的时间，每周至少2-3次'},
            '高': {'impact': 'positive', 'desc': '家庭支持程度较高，对孩子的学业有积极影响', 'suggestion': None},
        },
    },
    'parent_education_level': {
        'name': '父母教育水平',
        'levels': {
            '初等教育': {'impact': 'negative', 'desc': '父母教育水平较低，可能影响对孩子学习的辅导能力', 'suggestion': '考虑为孩子安排课外辅导，或利用在线学习资源'},
            '中等教育': {'impact': 'neutral', 'desc': '父母教育水平处于中等，可以关注孩子学习中的困难科目', 'suggestion': '关注孩子学习中的困难科目，考虑安排针对性辅导'},
            '高等教育': {'impact': 'positive', 'desc': '父母教育水平较高，对孩子的学业有积极影响', 'suggestion': None},
        },
    },
    'family_income_level': {
        'name': '家庭收入水平',
        'levels': {
            '低': {'impact': 'negative', 'desc': '家庭收入水平较低，可能限制孩子的学习资源和辅导机会', 'suggestion': '了解学校和社会提供的学习资源和支持项目'},
            '中': {'impact': 'neutral', 'desc': '家庭收入水平处于中等，可以为孩子提供基本的学习支持', 'suggestion': None},
            '高': {'impact': 'positive', 'desc': '家庭收入水平较高，可以为孩子提供丰富的学习资源', 'suggestion': None},
        },
    },
    'family_relationship': {
        'name': '家庭关系',
        'levels': {
            '差': {'impact': 'negative', 'desc': '家庭关系紧张，可能影响孩子的心理健康和学习状态', 'suggestion': '营造和谐的家庭氛围，减少家庭冲突'},
            '一般': {'impact': 'neutral', 'desc': '家庭关系处于一般水平，建议进一步改善', 'suggestion': '增加家庭互动时间，改善沟通方式'},
            '良好': {'impact': 'positive', 'desc': '良好的家庭关系为孩子提供了稳定的学习环境', 'suggestion': None},
        },
    },
    'parent_involvement_level': {
        'name': '家长参与度',
        'levels': {
            '低': {'impact': 'negative', 'desc': '家长参与度较低，可能无法及时发现和解决孩子的学习问题', 'suggestion': '积极参与家长会和学校活动，定期与老师沟通'},
            '中': {'impact': 'neutral', 'desc': '家长参与度处于中等水平，建议进一步提升', 'suggestion': '定期与老师沟通了解孩子在校表现'},
            '高': {'impact': 'positive', 'desc': '家长参与度较高，能够及时了解和支持孩子的学习', 'suggestion': None},
        },
    },
}


@parent_bp.route('/summary/<student_id>', methods=['GET'])
def get_parent_summary(student_id):
    """家长专属汇总数据：聚合学生信息、成绩、预警、建议、班级对比、家长行动建议"""
    # 1. 查询学生信息（含行为和家庭背景）
    student = query_one(
        "SELECT s.*, "
        "lb.attendance_rate, lb.study_hours, lb.sleep_hours, lb.tutoring_sessions, "
        "lb.physical_activity, lb.motivation_level, lb.internet_usage, lb.extracurricular_activities, "
        "fb.mother_education, fb.father_education, fb.mother_occupation, fb.father_occupation, "
        "fb.family_income_level, fb.family_support_level, fb.parent_involvement_level, fb.family_relationship "
        "FROM student s "
        "LEFT JOIN learning_behavior lb ON s.student_id = lb.student_id "
        "LEFT JOIN family_background fb ON s.student_id = fb.student_id "
        "WHERE s.student_id = %s",
        (student_id,)
    )
    if not student:
        return jsonify({'error': '学生不存在'}), 404

    # 2. 查询最新成绩（G3 > G2 > G1）
    scores = query_all(
        "SELECT subject_id, exam_stage, score FROM exam_score "
        "WHERE student_id = %s ORDER BY subject_id, exam_stage",
        (student_id,)
    )

    # 计算各科目最新得分率
    latest_scores = {}
    for s in scores:
        subj = s['subject_id']
        full = SUBJECT_FULL_SCORE.get(subj, 100)
        stage_order = {'G3': 3, 'G2': 2, 'G1': 1}
        if subj not in latest_scores or stage_order.get(s['exam_stage'], 0) > stage_order.get(latest_scores[subj]['exam_stage'], 0):
            latest_scores[subj] = s

    latest_scores_list = []
    for subj, data in latest_scores.items():
        full = SUBJECT_FULL_SCORE.get(subj, 100)
        score_rate = round(data['score'] / full * 100, 1) if full > 0 else 0
        latest_scores_list.append({
            'subject_id': subj,
            'score': data['score'],
            'full_score': full,
            'score_rate': score_rate,
            'exam_stage': data['exam_stage'],
        })

    # 3. 查询班级统计（班级均值）
    class_id = student.get('student_class_id')
    class_stats = []
    class_avg_rates = {}
    if class_id:
        class_stats = query_all(
            "SELECT subject_id, ROUND(AVG(score), 2) AS avg_score "
            "FROM exam_score es "
            "JOIN student s ON es.student_id = s.student_id "
            "WHERE s.student_class_id = %s AND es.exam_stage = 'G3' "
            "GROUP BY subject_id",
            (class_id,)
        )
        for cs in class_stats:
            full = SUBJECT_FULL_SCORE.get(cs['subject_id'], 100)
            class_avg_rates[cs['subject_id']] = round(cs['avg_score'] / full * 100, 1) if full > 0 else 0

    # 为最新成绩添加班级均值
    for item in latest_scores_list:
        item['class_avg_rate'] = class_avg_rates.get(item['subject_id'], 0)

    # 4. 查询预警数据
    alerts = query_all(
        "SELECT * FROM risk_alert WHERE student_id = %s ORDER BY alert_time DESC",
        (student_id,)
    )
    risk_summary = {'high': 0, 'medium': 0, 'low': 0, 'worst_level': None, 'risk_score': 0, 'alert_count': len(alerts)}
    for a in alerts:
        level = a.get('risk_level', 'low')
        if level in risk_summary:
            risk_summary[level] += 1
        score = a.get('risk_score', 0) or 0
        if score > risk_summary['risk_score']:
            risk_summary['risk_score'] = score

    level_order = {'high': 3, 'medium': 2, 'low': 1}
    if alerts:
        risk_summary['worst_level'] = max(
            (a.get('risk_level', 'low') for a in alerts),
            key=lambda x: level_order.get(x, 0)
        )

    # 5. 查询建议数据
    suggestions = query_all(
        "SELECT * FROM learning_suggestion WHERE student_id = %s ORDER BY generate_time DESC",
        (student_id,)
    )
    suggestion_summary = {
        'total': len(suggestions),
        'feedbacked': sum(1 for s in suggestions if s.get('feedback')),
        'satisfaction_rate': 0,
    }
    satisfied = sum(1 for s in suggestions if s.get('feedback') == 'satisfied')
    if suggestion_summary['feedbacked'] > 0:
        suggestion_summary['satisfaction_rate'] = round(satisfied / suggestion_summary['feedbacked'], 2)

    # 6. 班级行为对比数据
    class_comparison = {}
    if class_id:
        # 班级平均出勤率
        avg_attendance = query_one(
            "SELECT ROUND(AVG(attendance_rate), 2) AS avg_attendance "
            "FROM learning_behavior lb "
            "JOIN student s ON lb.student_id = s.student_id "
            "WHERE s.student_class_id = %s",
            (class_id,)
        )
        class_comparison['class_avg_attendance'] = avg_attendance['avg_attendance'] if avg_attendance else 0

        # 班级行为雷达图数据（归一化到0-100）
        avg_behavior = query_one(
            "SELECT "
            "ROUND(AVG(attendance_rate), 2) AS avg_attendance, "
            "ROUND(AVG(study_hours) / 10 * 100, 2) AS avg_study_rate, "
            "ROUND(AVG(sleep_hours) / 10 * 100, 2) AS avg_sleep_rate, "
            "ROUND(AVG(physical_activity) / 5 * 100, 2) AS avg_sport_rate, "
            "ROUND(AVG(tutoring_sessions) / 5 * 100, 2) AS avg_tutoring_rate "
            "FROM learning_behavior lb "
            "JOIN student s ON lb.student_id = s.student_id "
            "WHERE s.student_class_id = %s",
            (class_id,)
        )
        if avg_behavior:
            class_comparison['behavior_radar'] = {
                'attendance': avg_behavior.get('avg_attendance', 0),
                'study': avg_behavior.get('avg_study_rate', 0),
                'sleep': avg_behavior.get('avg_sleep_rate', 0),
                'sport': avg_behavior.get('avg_sport_rate', 0),
                'tutoring': avg_behavior.get('avg_tutoring_rate', 0),
            }

    # 7. 生成家长行动建议（基于风险因素和低分科目）
    parent_actions = []

    # 基于风险因素
    for alert in alerts[:3]:  # 最多取3条预警
        factors = alert.get('risk_factors', '')
        if factors:
            try:
                import json
                factor_list = json.loads(factors) if isinstance(factors, str) else factors
                if not isinstance(factor_list, list):
                    factor_list = [str(factor_list)]
            except Exception:
                factor_list = [str(factors)]

            for factor in factor_list:
                for rule_key, rule_val in PARENT_ACTION_RULES.items():
                    if rule_key in str(factor):
                        # 避免重复
                        if not any(a['factor'] == factor for a in parent_actions):
                            parent_actions.append({
                                'factor': str(factor),
                                'action': rule_val['action'],
                                'priority': rule_val['priority'],
                            })
                        break

    # 基于低分科目
    for item in latest_scores_list:
        if item['score_rate'] < 60:
            subj_name = {'SUBJ_MATH': '数学', 'SUBJ_PORTUGUESE': '葡萄牙语', 'SUBJ_GENERAL': '综合'}.get(item['subject_id'], item['subject_id'])
            if not any(a['factor'] == f'{subj_name}成绩偏低' for a in parent_actions):
                parent_actions.append({
                    'factor': f'{subj_name}成绩偏低',
                    'action': f'关注孩子的{subj_name}学习情况，与老师沟通制定针对性的提升计划，考虑安排课外辅导',
                    'priority': 'high',
                })

    # 基于行为数据
    behavior = {
        'attendance_rate': student.get('attendance_rate'),
        'study_hours': student.get('study_hours'),
        'sleep_hours': student.get('sleep_hours'),
        'physical_activity': student.get('physical_activity'),
        'tutoring_sessions': student.get('tutoring_sessions'),
    }
    if behavior['attendance_rate'] is not None and behavior['attendance_rate'] < 80:
        if not any('出勤' in a['factor'] for a in parent_actions):
            parent_actions.append({
                'factor': '出勤率偏低',
                'action': PARENT_ACTION_RULES['出勤率低']['action'],
                'priority': 'high',
            })
    if behavior['sleep_hours'] is not None and behavior['sleep_hours'] < 6:
        if not any('睡眠' in a['factor'] for a in parent_actions):
            parent_actions.append({
                'factor': '睡眠时间不足',
                'action': PARENT_ACTION_RULES['睡眠不足']['action'],
                'priority': 'high',
            })

    # 按优先级排序
    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    parent_actions.sort(key=lambda x: priority_order.get(x['priority'], 2))

    return jsonify({
        'student': {k: v for k, v in student.items() if k not in [
            'attendance_rate', 'study_hours', 'sleep_hours', 'tutoring_sessions',
            'physical_activity', 'motivation_level', 'internet_usage', 'extracurricular_activities',
            'mother_education', 'father_education', 'mother_occupation', 'father_occupation',
            'family_income_level', 'family_support_level', 'parent_involvement_level', 'family_relationship',
        ]},
        'behavior': behavior,
        'family': {
            'mother_education': student.get('mother_education'),
            'father_education': student.get('father_education'),
            'mother_occupation': student.get('mother_occupation'),
            'father_occupation': student.get('father_occupation'),
            'family_income_level': student.get('family_income_level'),
            'family_support_level': student.get('family_support_level'),
            'parent_involvement_level': student.get('parent_involvement_level'),
            'family_relationship': student.get('family_relationship'),
        },
        'latest_scores': latest_scores_list,
        'risk_summary': risk_summary,
        'suggestion_summary': suggestion_summary,
        'class_comparison': class_comparison,
        'parent_actions': parent_actions[:5],  # 最多5条
    })


@parent_bp.route('/family-impact/<student_id>', methods=['GET'])
def get_family_impact(student_id):
    """家庭影响分析：分析家庭背景因素与学生成绩的关联"""
    student = query_one(
        "SELECT s.student_class_id, s.student_name, "
        "fb.mother_education, fb.father_education, fb.mother_occupation, fb.father_occupation, "
        "fb.family_income_level, fb.family_support_level, fb.parent_involvement_level, fb.family_relationship "
        "FROM student s "
        "LEFT JOIN family_background fb ON s.student_id = fb.student_id "
        "WHERE s.student_id = %s",
        (student_id,)
    )
    if not student:
        return jsonify({'error': '学生不存在'}), 404

    factors = []
    improvement_areas = []

    for field, config in FAMILY_IMPACT_MAP.items():
        value = student.get(field)
        if not value:
            continue

        level_config = config['levels'].get(value, None)
        if not level_config:
            # 尝试模糊匹配
            for key, val in config['levels'].items():
                if key in str(value) or str(value) in key:
                    level_config = val
                    break

        if level_config:
            factor_data = {
                'name': config['name'],
                'value': value,
                'impact': level_config['impact'],
                'description': level_config['desc'],
            }
            if level_config.get('suggestion'):
                factor_data['suggestion'] = level_config['suggestion']
                if level_config['impact'] in ('negative', 'neutral'):
                    improvement_areas.append(config['name'])
            factors.append(factor_data)

    # 计算综合得分（基于各因素影响方向）
    positive_count = sum(1 for f in factors if f['impact'] == 'positive')
    total_count = len(factors) if factors else 1
    overall_score = round(positive_count / total_count * 100, 0) if total_count > 0 else 50

    # 班级平均家庭影响得分
    class_id = student.get('student_class_id')
    class_avg_score = 50  # 默认值
    if class_id:
        # 简化计算：统计班级中家庭支持水平为"高"的比例
        class_family = query_all(
            "SELECT family_support_level FROM family_background fb "
            "JOIN student s ON fb.student_id = s.student_id "
            "WHERE s.student_class_id = %s",
            (class_id,)
        )
        if class_family:
            high_count = sum(1 for cf in class_family if cf.get('family_support_level') == '高')
            class_avg_score = round(high_count / len(class_family) * 100, 0)

    return jsonify({
        'factors': factors,
        'overall_score': overall_score,
        'class_avg_score': class_avg_score,
        'improvement_areas': improvement_areas,
    })
