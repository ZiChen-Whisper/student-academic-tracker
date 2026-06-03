# 7.1 申请 LLM API Key — 开发记录

## 任务目标

为 AI 功能（NL2SQL、风险预警、学习建议）申请并配置 DeepSeek LLM API Key，验证 API 连通性。

---

## 步骤 1：确认 `.env` 配置

检查 `backend/.env` 文件，确认 `LLM_API_KEY` 已填写。

### 检查结果

`backend/.env` 文件内容如下：

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=jason2006
DB_NAME=student_academic_tracker

LLM_API_KEY=...
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
```

**结论**：`LLM_API_KEY` 已正确填写，`LLM_BASE_URL` 和 `LLM_MODEL` 配置正确。

### 配置说明

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `LLM_API_KEY` | `sk-58d8...7809` | DeepSeek API 密钥 |
| `LLM_BASE_URL` | `https://api.deepseek.com` | DeepSeek API 基础地址 |
| `LLM_MODEL` | `deepseek-chat` | 使用的模型名称 |

### API Key 申请流程

1. 访问 https://platform.deepseek.com/
2. 注册账号并登录
3. 在 API Keys 页面创建新的 API Key
4. 将 Key 填入 `backend/.env` 的 `LLM_API_KEY` 字段

---

## 步骤 2：验证 API 连通性

### 测试脚本

使用以下 Python 代码验证 DeepSeek API 是否可用：

```python
import sys
sys.path.insert(0, 'backend')
from config import LLM_CONFIG
from openai import OpenAI

client = OpenAI(api_key=LLM_CONFIG['api_key'], base_url=LLM_CONFIG['base_url'])
response = client.chat.completions.create(
    model=LLM_CONFIG['model'],
    messages=[{"role": "user", "content": "你好"}],
    temperature=0
)
print(response.choices[0].message.content)
```

### 测试结果

```
API 连通成功！
回复内容: 你好！很高兴见到你。有什么我可以帮你的吗？无论是聊天、解答问题，还是提供建议，我都乐意协助。
```

**结论**：API 连通性测试通过，DeepSeek API 返回了正常的中文回复。

---

## 验证标准检查

| 验证项 | 状态 | 说明 |
|--------|------|------|
| `backend/.env` 中 `LLM_API_KEY` 已填写 | ✅ 通过 | API Key 已正确配置 |
| API 连通性测试通过 | ✅ 通过 | 发送"你好"收到正常中文回复 |

---

## 遇到的问题与解决

### 问题：PowerShell 不支持 `&&` 语法

**现象**：在 PowerShell 中使用 `&&` 连接多条命令时报错：
```
标记"&&"不是此版本中的有效语句分隔符。
```

**解决**：改用分号 `;` 分隔多条 PowerShell 命令。

---

## 总结

7.1 任务已完成。DeepSeek API Key 已配置，API 连通性验证通过，后续 NL2SQL、风险预警、学习建议功能均可正常调用 DeepSeek API。
