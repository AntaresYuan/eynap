#!/usr/bin/env bash
# 把 shared/ 同步到每个技能目录下的 _shared/。
#
# 为什么需要这一步：
# skills CLI（npx skills add）只复制 SKILL.md 所在的那个目录，
# 仓库根部的 shared/ 不会跟过去，装完 ../../shared/ 全是死链。
# 所以每个技能目录里放一份副本，让技能自洽。
#
# 单一真源仍是根部的 shared/，改完跑一次这个脚本。
set -euo pipefail
cd "$(dirname "$0")/.."

[ -d shared ] || { echo "找不到 shared/，请在仓库根目录运行" >&2; exit 1; }

n=0
for d in skills/*/; do
  [ -f "$d/SKILL.md" ] || continue
  rm -rf "$d/_shared"
  cp -R shared "$d/_shared"
  n=$((n+1))
done

echo "已同步到 $n 个技能目录"

# 校验：技能里不该再有指向仓库外的 ../../shared/
# （_migrated 是历史归档，不参与分发，跳过）
leftover=$(grep -rn '\.\./\.\./shared/' skills/ 2>/dev/null \
           | grep -v '_migrated' || true)
if [ -n "$leftover" ]; then
  echo "" >&2
  echo "警告：仍有指向 ../../shared/ 的引用，装到宿主后会断链：" >&2
  echo "$leftover" | head -5 >&2
  exit 1
fi

# 逐条验证 _shared 引用能否真正解析——层级写错时不会被上面的检查发现
bad=0
while IFS= read -r f; do
  case "$f" in *_migrated*|*_shared*) continue;; esac
  d=$(dirname "$f")
  for ref in $(grep -o '[.\/]*_shared/[a-z.-]*\.md' "$f" 2>/dev/null | sort -u); do
    [ -f "$d/$ref" ] || { echo "  断链 $f → $ref" >&2; bad=$((bad+1)); }
  done
done < <(find skills -name '*.md')
if [ "$bad" -gt 0 ]; then
  echo "共 $bad 处断链，请修正层级" >&2
  exit 1
fi

echo "引用检查通过：$(find skills -name '*.md' -not -path '*_shared*' -not -path '*_migrated*' | wc -l | tr -d ' ') 个文件，零断链"
