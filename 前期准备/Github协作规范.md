# GitHub 协作规范与操作手册

为保证代码安全、避免合并冲突、顺利推进开发，**请全员严格遵守以下 Git/GitHub 协作流程**。本文档为开发必读指南。

***

## 一、加入项目前的准备（首次配置）

1. **接受仓库邀请**：检查邮箱或 GitHub 通知，点击 `Accept invitation`。
2. **安装 Git**：Windows 下载 [Git Bash](https://git-scm.com/)，macOS 运行 `brew install git`。（Windows 可以用`git --version`检查是否下载，mac我不清楚，可以自己去查一下）
3. **配置身份信息**（终端执行一次）：
   ```bash
   git config --global user.name "你的姓名拼音"
   git config --global user.email "你的注册邮箱"
   ```
4. **克隆仓库到本地**：
   ```bash
   git clone <仓库SSH或HTTPS链接>
   cd 仓库名
   ```

> 仓库SSH链接：`git@github.com:ZiChen-Whisper/student-academic-tracker.git`
>
> `项目仓库配置相关.md`里面也有写。

***

## 二、协作规范（违反将导致代码覆盖/冲突）

| 规则                                     | 说明                                                                                                                                                                                  |
| :------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **绝对禁止直接** **`push`** **到** **`main`** | `main` 已开启保护，如果用`main`分支push会报错                                                                                                                                                     |
| **所有开发必须在独立分支**                        | 命名格式：`feature/姓名-功能` 或 `fix/姓名-问题`（如 `feature/Zichen_Zou-用户登录`）（应该所有的IDE都是左下角有个按钮调整分支，默认应该是`main`分支，可以点击它，选择“创建新分支依据”，在对应的`feature`或`docs`或`fix`下创建自己的分支【当然也可以去搜命令调整，这是可视化界面的操作方法】） |
| **每日开工前必同步** **`main`**                | 执行 `git pull origin main`，确保基于最新代码开发                                                                                                                                                |
| **提交信息必须规范**                           | 格式：`类型: 简短描述 - 提交人姓名`（例：`feat: 添加学生表建表语句 - Zichen Zou`）                                                                                                                             |

***

## 三、标准开发流程（每次开始开发前做）

```bash
# 1. 切换回主分支，拉取最新代码（每天开始工作前必做）
git checkout main
git pull origin main

# 2. 创建并切换至你的功能分支
git checkout -b feature/Zichen_Zou-用户登录模块

# 3. 编写代码后，查看状态并提交
git status  # 检查改动了哪些文件
git add .  # 添加所有改动到暂存区
git commit -m "feat: 完成用户登录接口与SQL查询 - Zichen Zou"  # 提交说明要清晰（具体规范见Commit编写规范.md）

# 4. 将你的分支推送到远程
git push origin feature/Zichen_Zou-用户登录模块
```

> 执行完以上步骤后，**你的代码已安全备份到 GitHub**。
>
> 下一步需在网页创建 PR 申请合并。（注意要去网页端发起PR-pull request申请，组长这边才能看到合并申请，具体操作见下第四点）【其他组员不要同意合并申请，由组长统一审核（虽然已经设置了规则只有组长能同意，但还不太确定能不能生效）】

***

## 四、如何提交 Pull Request（PR）

【此部分由AI生成，并不一定和实际操作界面一致，但大概的流程差不多，不难找到】

1. 浏览器打开仓库页面，顶部通常会出现黄色提示条：`<分支名> had recent pushes. Compare & pull request`。点击它。
2. 填写 PR 信息：
   - **标题**：与 commit 信息一致（例：`feat: 完成用户登录模块 - Zichen Zou`）
   - **描述**（可选）：写了什么、如何测试、是否影响其他模块
3. 右侧 `Reviewers` 栏会自动标记 `@组长` 为 `Required`。
4. 点击 **`Create pull request`**。
5. ⏳ **等待组长 Code Review**。组长审核通过并点击 `Merge` 后，你的代码才会合入 `main`。

***

## 五、常见问题与自救指南

| 现象                                   | 原因                 | 解决方法                                                                                    |
| :----------------------------------- | :----------------- | :-------------------------------------------------------------------------------------- |
| `rejected ... fetch first`           | 远程 `main` 有更新，你没拉取 | 切回 `main` 执行 `git pull origin main`，再切回分支 `git merge main`                              |
| `CONFLICT (content): Merge conflict` | 多人修改了同一文件同一行       | 打开冲突文件，找到 `<<<<<<<` `=======` `>>>>>>>` 标记，手动保留正确代码 → 删除标记 → `git add .` → `git commit` |
| 提交错分支/写错 message                     | 手滑或忘记检查            | 未 push：`git commit --amend` 改信息已 push：保留历史，提 PR 时说明即可，**不要强推**                          |
| 不想提交某文件（如临时测试）                       | 误 `git add .`      | `git restore --staged <文件名>` 取消暂存                                                       |

***

## 六、数据库项目专属规范

1. **📦 只提交** **`.sql`** **脚本，不提交数据库文件**\
   ❌ 禁止上传 `*.db`, `*.sqlite`, `data/`, `backup/` 等二进制文件（体积大、必冲突）。\
   ✅ 统一提交 `sql/init.sql`（建表）、`sql/seed.sql`（测试数据）、`sql/queries/`（查询案例）。
2. **🔑 敏感信息绝不入库**\
   数据库密码、API Key 等放在 `.env` 文件中，并确保 `.gitignore` 已忽略该文件。在 `README` 提供 `.env.example` 模板。
3. **🗃️ 分支职责划分建议**
   - `feature/xxx`：功能开发
   - `fix/xxx`：Bug 修复
   - `docs/xxx`：ER图、设计文档、实验报告更新

***

## 📎 附录：速查命令表

```bash
# 查看状态 & 历史
git status                # 查看当前改动
git log --oneline --graph -5  # 查看最近5条提交历史

# 分支操作
git branch -a             # 查看所有分支
git checkout -b <分支名>  # 创建并切换
git checkout main         # 切回主分支
git branch -d <分支名>    # 删除本地已合并分支

# 同步 & 暂存
git pull origin main      # 拉取并合并 main 最新代码
git stash                 # 临时保存当前改动（切分支时用）
git stash pop             # 恢复暂存的改动
```

***

💡 **最后提醒**：Git 报错是常态，**不要盲目搜索乱敲命令**。遇到冲突或报错，直接截图发群/私聊我，我会提供精确的修复命令。保持沟通、勤同步、勤提交，我们的期末大作业一定能高效拿下！🚀
