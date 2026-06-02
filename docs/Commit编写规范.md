# Git Commit 编写规范

## 基本格式

```
类型: 简短描述 - 提交人姓名
```

- 使用**中文**编写
- 描述部分简明扼要，说明"做了什么"，不超过50字

## 类型说明

| 类型 | 用途 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 添加学生成绩查询接口 - Zichen Zou` |
| `fix` | 修复缺陷 | `fix: 修复成绩统计计算错误 - Zhiyan Chen` |
| `docs` | 文档相关 | `docs: 添加数据集调研文档 - Zhuoxin Liu` |
| `data` | 数据相关 | `data: 添加学生成绩数据集 - Xinyi Yu` |
| `style` | 代码格式（不影响逻辑） | `style: 统一缩进格式 - Zhen Chen` |
| `refactor` | 重构（非新功能、非修复） | `refactor: 重构数据库连接模块 - Zichen Zou` |
| `test` | 测试相关 | `test: 添加成绩预警模块单元测试 - Zhiyan Chen` |
| `chore` | 构建/工具/杂项 | `chore: 配置项目依赖 - Zhuoxin Liu` |

## 示例

```bash
# 好的写法
git commit -m "feat: 添加学生成绩查询接口 - Zichen Zou"
git commit -m "fix: 修复成绩统计计算错误 - Zhiyan Chen"
git commit -m "docs: 添加数据集调研文档 - Zhuoxin Liu"

# 不好的写法
git commit -m "update"
git commit -m "修改了一些东西"
git commit -m "fix bug"
```

## 注意事项

- 一次提交只做一件事，避免混合多种类型的改动
- 描述用陈述句，不要用句号结尾
- 如果改动较大，可在描述后换行补充详细说明
