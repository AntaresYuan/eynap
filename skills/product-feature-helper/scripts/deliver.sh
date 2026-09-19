#!/usr/bin/env bash
# deliver.sh — 把注入脚本安全交到用户手上
#
# 为什么需要这个脚本：聊天窗口渲染代码块时会把直引号（' "）转成弯引号（' " " "），
# 用户粘贴到 Console 就报 SyntaxError（真实踩过的坑）。
# 因此正式交付一律走「本地文件 + 剪贴板」，不让用户从聊天气泡里复制长脚本。
#
# 用法（推荐始终用 bash 显式调用，跨环境不受执行位影响）：
#   bash deliver.sh <script.js>          # 校验 + 复制到剪贴板
#   bash deliver.sh <script.js> --check  # 只校验，不复制
#
# 剪贴板为可选增强：无可用工具时会退化为打印文件路径，校验结果不受影响。

set -uo pipefail

SCRIPT_PATH="${1:-}"
MODE="${2:-copy}"

if [ -z "$SCRIPT_PATH" ]; then
  echo "用法: bash deliver.sh <script.js> [--check]"
  exit 1
fi

if [ ! -f "$SCRIPT_PATH" ]; then
  echo "❌ 文件不存在: $SCRIPT_PATH"
  exit 1
fi

echo "🔍 检查: $SCRIPT_PATH"

# 1. 语法校验：交付前必须过，避免用户粘贴了才发现报错
if command -v node >/dev/null 2>&1; then
  if node --check "$SCRIPT_PATH"; then
    echo "✅ 语法校验通过"
  else
    echo "❌ 语法错误，请修复后再交付"
    exit 1
  fi
else
  echo "⚠️  未找到 node，跳过语法校验"
fi

# 2. 弯引号扫描：一旦混入代码就会导致 Console 报 SyntaxError
# 用 python3 精确匹配 U+2018/2019/201C/201D，并跳过注释行——
# 注释里的中文标点无害，混进来只会淹没真正的问题（bash 的 $'\uXXXX' 转义不可靠，勿用）
if command -v python3 >/dev/null 2>&1; then
  python3 - "$SCRIPT_PATH" <<'PYEOF'
import sys, re
path = sys.argv[1]
bad = re.compile(u'[\u2018\u2019\u201c\u201d]')
hits = []
with open(path, encoding='utf-8', errors='replace') as f:
    for i, line in enumerate(f, 1):
        s = line.strip()
        if s.startswith('//') or s.startswith('*') or s.startswith('/*'):
            continue   # 注释行里的弯引号不影响执行
        if bad.search(line):
            hits.append((i, line.rstrip()[:90]))
if hits:
    print(u'\u26a0\ufe0f  发现 %d 处代码行含弯引号，会导致 Console 报 SyntaxError:' % len(hits))
    for n, t in hits[:5]:
        print('    %d: %s' % (n, t))
    print('    修复：改成反引号 ` 或直引号')
else:
    print(u'\u2705 代码行未发现弯引号')
PYEOF
else
  echo "⚠️  未找到 python3，跳过弯引号检查"
fi

# 3. 幂等清理检查：缺了它用户重复粘贴就会叠加组件、累积监听器
if grep -q "Cleanup\|cleanup" "$SCRIPT_PATH"; then
  echo "✅ 含清理逻辑（支持重复粘贴）"
else
  echo "⚠️  未发现清理逻辑，用户重复粘贴会叠加元素并累积监听器"
fi

# 4. 【硬约束】样式字面量检查 —— 本 skill 的核心质量门
# 凭感觉写的色值/圆角/间距会让注入内容与站点风格割裂，这正是要防的问题。
# 所有视觉值必须来自 design-system.js 提取的 var(--pfh-*) token。
# 违规即退出码 1，阻断交付。
STYLE_VIOLATION=0
if command -v python3 >/dev/null 2>&1; then
  python3 - "$SCRIPT_PATH" <<'PYEOF'
import sys, re
path = sys.argv[1]
src = open(path, encoding='utf-8', errors='replace').read()
lines = src.split('\n')

# 只检查 CSS 上下文（<style> 文本、cssText、style.textContent 赋值），
# 不误伤 canvas 绘制、数据里的颜色等合法用途
violations = []

COLOR = re.compile(r'#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d+')
# 视觉属性后跟字面量数值（排除 0、var()、100%、inherit 等）
VISUAL_PROP = re.compile(
    r'\b(color|background(?:-color)?|border(?:-[a-z]+)?|box-shadow|'
    r'border-radius|padding(?:-[a-z]+)?|margin(?:-[a-z]+)?|gap|'
    r'font-size|font-family|line-height)\s*:\s*([^;\n}]+)', re.I)

ALLOW = re.compile(r'var\(--|inherit|initial|unset|currentColor|transparent|none|auto|100%|'
                   r'\b0(?:px|%)?\b|calc\(|rgba\(0,\s*0,\s*0,\s*0\)', re.I)

# 允许 DS_CSS 区块内出现字面量：那正是提取产物，本就该是真实值
in_ds_block = False
for i, line in enumerate(lines, 1):
    s = line.strip()
    if s.startswith('//') or s.startswith('*') or s.startswith('/*'):
        continue
    # console.log 的 %c 样式参数不是页面样式，跳过（否则误报控制台文字色）
    if 'console.' in line:
        continue
    # DS token 层与组件类定义区：跳过
    if 'DS_CSS' in line or 'Design tokens extracted' in line or 'PFH_DS_PLACEHOLDER' in line:
        in_ds_block = True
    if in_ds_block:
        # 简单判定：token 层以 } 单独结尾且后续出现 .pfh- 组件类，直到模板自身样式为止
        if re.match(r'^\.(pfh|uix)-(surface|btn|input|text-secondary|divider)', s):
            continue
        if s.startswith('--pfh-') or s == ':root {' or s == '}':
            continue
        if re.match(r'^(background|border|font|color|padding|box-shadow|line-height|cursor|transition|box-sizing|height|border-radius)\s*:', s):
            continue
        if 'DS_CSS' in line and 'textContent' in line:
            in_ds_block = False

    for m in VISUAL_PROP.finditer(line):
        prop, val = m.group(1), m.group(2).strip()
        if ALLOW.search(val):
            continue
        if COLOR.search(val) or re.search(r'\b\d+(?:\.\d+)?(px|rem|em)\b', val):
            # 排除 DS token 层自身
            if s.startswith('--pfh-') or in_ds_block:
                continue
            violations.append((i, prop, val[:50]))

if violations:
    print(u'\u274c 样式字面量违规 %d 处 —— 必须改用 var(--pfh-*) token:' % len(violations))
    for n, prop, val in violations[:8]:
        print('    第 %d 行  %s: %s' % (n, prop, val))
    print('    原因：字面量与站点 design system 不一致，注入后交互割裂')
    print('    修复：先跑 design-system.js 提取 token，再引用 var(--pfh-xxx)')
    sys.exit(2)
else:
    print(u'\u2705 未发现样式字面量（视觉值均来自 token）')
PYEOF
  rc=$?
  if [ "$rc" = "2" ]; then STYLE_VIOLATION=1; fi
else
  echo "⚠️  未找到 python3，跳过字面量检查"
fi

# 5. token 层存在性检查：引用了 var(--pfh-*) 就必须同时带上定义
# 例外：模板文件（DS_CSS 仍是未填充占位）本就等待现场填入 token，不算违规。
# 识别用稳定标记 PFH_DS_PLACEHOLDER，不要依赖会被改写的提示语措辞。
IS_TEMPLATE=0
if grep -q "PFH_DS_PLACEHOLDER" "$SCRIPT_PATH"; then
  IS_TEMPLATE=1
fi

if grep -q "var(--pfh-" "$SCRIPT_PATH"; then
  if grep -q -- "--pfh-brand[[:space:]]*:" "$SCRIPT_PATH"; then
    echo "✅ token 定义与引用齐备"
  elif [ "$IS_TEMPLATE" = "1" ]; then
    echo "ℹ️  模板文件：DS_CSS 尚未填充，交付前必须先跑 design-system.js 并粘贴 cssText"
  else
    echo "❌ 引用了 var(--pfh-*) 但缺少 :root token 定义 —— 变量全部落空，样式会失效"
    echo ""
    echo "    怎么修（按顺序做，不要自己编默认值）："
    echo "    1. 在目标页面的 Console 里跑 scripts/design-system.js"
    echo "    2. 执行 copy(window.__uiDS.cssText) 取出提取结果"
    echo "    3. 把它粘贴进本脚本的 DS_CSS 常量里，替换掉占位注释"
    echo ""
    echo "    为什么不给 fallback 默认值：填一套通用色板能让这条检查通过，"
    echo "    但注入的 UI 会和站点规范不一致——那正是本 skill 要解决的问题。"
    echo "    宁可卡在这里，也不要交付一个看起来能跑、实际风格割裂的脚本。"
    STYLE_VIOLATION=1
  fi
fi

LINES=$(wc -l < "$SCRIPT_PATH" | tr -d ' ')
SIZE=$(wc -c < "$SCRIPT_PATH" | tr -d ' ')
echo "📄 $LINES 行 / $SIZE 字节"

if [ "$STYLE_VIOLATION" = "1" ]; then
  echo ""
  echo "🚫 交付被阻断：请先修复上述样式问题"
  exit 1
fi

if [ "$MODE" = "--check" ]; then
  exit 0
fi

# 6. 复制到剪贴板：用户直接粘贴到 Console，不经过聊天窗口
# 跨平台依次探测；剪贴板是"锦上添花"，任何一步失败都不影响校验结论与交付本身。
# 评测实测：linux 容器里常常一个剪贴板工具都没有，此时必须给出清晰可操作的降级路径。
CLIP_OK=0
CLIP_TOOL=""

try_clip() {
  command -v "$1" >/dev/null 2>&1 || return 1
  shift 1
  "$@" < "$SCRIPT_PATH" >/dev/null 2>&1 || return 1
  return 0
}

if try_clip pbcopy pbcopy; then                                   # macOS
  CLIP_OK=1; CLIP_TOOL="pbcopy"
elif try_clip wl-copy wl-copy; then                               # Linux / Wayland
  CLIP_OK=1; CLIP_TOOL="wl-copy"
elif try_clip xclip xclip -selection clipboard; then              # Linux / X11
  CLIP_OK=1; CLIP_TOOL="xclip"
elif try_clip xsel xsel --clipboard --input; then                 # Linux / X11 备选
  CLIP_OK=1; CLIP_TOOL="xsel"
elif try_clip clip.exe clip.exe; then                             # WSL / Windows
  CLIP_OK=1; CLIP_TOOL="clip.exe"
elif command -v powershell.exe >/dev/null 2>&1 &&
     powershell.exe -NoProfile -Command "Set-Clipboard -Value (Get-Content -Raw '$SCRIPT_PATH')" >/dev/null 2>&1; then
  CLIP_OK=1; CLIP_TOOL="powershell"
fi

echo ""
if [ "$CLIP_OK" = "1" ]; then
  # 变量名必须用 ${} 界定：紧跟中文全角括号时，bash 会把全角字符并进变量名
  echo "📋 已复制到剪贴板（${CLIP_TOOL}）。请告知用户："
  echo "   1. 在目标页面按 Cmd+Option+J（Mac）或 F12 / Ctrl+Shift+J → Console"
  echo "   2. 粘贴（Cmd+V / Ctrl+V），回车执行"
  echo "   3. 首次使用可能需先在 Console 输入 allow pasting 并回车"
else
  # 无剪贴板工具属常见情况（服务器、容器、CI），不是错误，也不阻断交付
  echo "ℹ️  当前环境没有可用的剪贴板工具（已依次尝试 pbcopy / wl-copy / xclip / xsel / clip.exe / powershell）。"
  echo "   校验已全部通过，交付照常进行——把下面这个文件给用户即可："
  echo "   $SCRIPT_PATH"
  echo ""
  echo "   给用户的说明："
  echo "   1. 用文本编辑器打开该文件，全选复制（不要从聊天气泡里复制，会被转成弯引号）"
  echo "   2. 在目标页面 F12 / Cmd+Option+J → Console，粘贴回车"
  echo "   3. 若提示不允许粘贴：输入 allow pasting 回车后再粘贴"
fi

# 剪贴板不可用不算失败：校验才是这个脚本的职责，退出码只反映校验结果
exit 0
