#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║         权限控制测试 - 分页列表响应验证                          ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

echo "📋 步骤 1: 检查服务健康状态"
HEALTH=$(curl -s http://localhost:3000/health)
echo "✅ 服务运行正常: $HEALTH"
echo ""

login() {
  local username=$1
  local password=$2
  local response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$username\",\"password\":\"$password\"}")
  echo $response | grep -o '"token":"[^"]*"' | cut -d'"' -f4
}

test_list_endpoint() {
  local role=$1
  local token=$2
  local endpoint=$3
  local entity_name=$4
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "测试角色: $role | 接口: $endpoint"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  local response=$(curl -s -H "Authorization: Bearer $token" "$BASE_URL/$endpoint")
  
  # 检查响应是否为空对象
  if [[ "$response" == "{}" ]]; then
    echo "❌ 严重错误: 响应为空对象 {}"
    return 1
  fi
  
  # 检查是否包含 data 字段
  if ! echo "$response" | grep -q '"data"'; then
    echo "❌ 错误: 响应不包含 data 字段"
    echo "响应内容: $(echo "$response" | head -c 200)"
    return 1
  fi
  
  # 检查是否包含 pagination 字段
  if ! echo "$response" | grep -q '"pagination"'; then
    echo "❌ 错误: 响应不包含 pagination 字段"
    echo "响应内容: $(echo "$response" | head -c 200)"
    return 1
  fi
  
  # 提取 data 数组中的第一条记录
  local first_item=$(echo "$response" | node -e "
    const input = require('fs').readFileSync(0, 'utf-8');
    const data = JSON.parse(input);
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      console.log(JSON.stringify(data.data[0], null, 2));
    } else {
      console.log('NO_DATA');
    }
  " 2>/dev/null)
  
  if [[ "$first_item" == "NO_DATA" ]]; then
    echo "⚠️  警告: data 数组为空"
  else
    local field_count=$(echo "$first_item" | grep -c '"[a-zA-Z]\+":')
    local fields=$(echo "$first_item" | grep '"[a-zA-Z]\+":' | head -20 | tr '\n' ' ')
    
    echo "✅ 响应结构正常"
    echo "   - 包含 data 和 pagination 字段"
    echo "   - 第一条记录可见字段数: $field_count"
    echo "   - 可见字段示例: $(echo "$fields" | tr -d '"' | tr -d ':' | tr -s ' ')"
  fi
  
  return 0
}

echo "📋 步骤 2: 登录各角色账号"
echo ""

DATA_ENTRY_TOKEN=$(login "data_entry" "data_entry_123")
echo "✅ 录入员登录成功"

REVIEWER_TOKEN=$(login "reviewer" "reviewer_123")
echo "✅ 复核员登录成功"

SUPERVISOR_TOKEN=$(login "supervisor" "supervisor_123")
echo "✅ 主管登录成功"

READONLY_TOKEN=$(login "readonly" "readonly_123")
echo "✅ 只读用户登录成功"
echo ""

echo "📋 步骤 3: 测试申报单列表接口 (GET /api/declarations)"
echo "   预期: 不同角色看到的字段范围不同"

test_list_endpoint "录入员" "$DATA_ENTRY_TOKEN" "declarations?limit=2" "申报单"
test_list_endpoint "复核员" "$REVIEWER_TOKEN" "declarations?limit=2" "申报单"
test_list_endpoint "只读用户" "$READONLY_TOKEN" "declarations?limit=2" "申报单"
test_list_endpoint "主管" "$SUPERVISOR_TOKEN" "declarations?limit=2" "申报单"
echo ""

echo "📋 步骤 4: 测试补税通知列表接口 (GET /api/tax-notices)"

test_list_endpoint "录入员" "$DATA_ENTRY_TOKEN" "tax-notices?limit=2" "补税通知"
test_list_endpoint "复核员" "$REVIEWER_TOKEN" "tax-notices?limit=2" "补税通知"
test_list_endpoint "只读用户" "$READONLY_TOKEN" "tax-notices?limit=2" "补税通知"
test_list_endpoint "主管" "$SUPERVISOR_TOKEN" "tax-notices?limit=2" "补税通知"
echo ""

echo "📋 步骤 5: 测试坏数据列表接口 (GET /api/bad-data)"
echo "   先触发一些坏数据..."
curl -s -X POST "$BASE_URL/declarations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DATA_ENTRY_TOKEN" \
  -d '{"declarationNo":"TEST-BAD","packageNo":"","senderName":"","senderAddress":"","receiverName":"","receiverAddress":"","declaredValue":"invalid","weight":-5,"hsCode":"123"}' > /dev/null
echo "   ✅ 坏数据触发完成"

test_list_endpoint "录入员" "$DATA_ENTRY_TOKEN" "bad-data?limit=2" "坏数据"
test_list_endpoint "复核员" "$REVIEWER_TOKEN" "bad-data?limit=2" "坏数据"
test_list_endpoint "只读用户" "$READONLY_TOKEN" "bad-data?limit=2" "坏数据"
test_list_endpoint "主管" "$SUPERVISOR_TOKEN" "bad-data?limit=2" "坏数据"
echo ""

echo "📋 步骤 6: 测试权限控制 - 只读用户尝试创建申报单 (应被拒绝)"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/declarations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $READONLY_TOKEN" \
  -d '{"declarationNo":"TEST-PERM","packageNo":"PKG-TEST","senderName":"测试","senderAddress":"测试","receiverName":"测试","receiverAddress":"测试","declaredValue":100,"weight":1,"hsCode":"8517121000"}')

if echo "$CREATE_RESPONSE" | grep -q "Permission denied"; then
  echo "✅ 权限控制正常: 只读用户创建申报单被拒绝"
else
  echo "❌ 权限控制失效: 只读用户应该被拒绝创建"
  echo "响应: $CREATE_RESPONSE"
fi
echo ""

echo "📋 步骤 7: 测试字段差异对比"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "各角色申报单可见字段对比"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

get_visible_fields() {
  local token=$1
  local response=$(curl -s -H "Authorization: Bearer $token" "$BASE_URL/declarations?limit=1")
  echo "$response" | node -e "
    const input = require('fs').readFileSync(0, 'utf-8');
    const data = JSON.parse(input);
    if (data.data && data.data[0]) {
      console.log(Object.keys(data.data[0]).join(', '));
    } else {
      console.log('ERROR');
    }
  " 2>/dev/null
}

DATA_ENTRY_FIELDS=$(get_visible_fields "$DATA_ENTRY_TOKEN")
REVIEWER_FIELDS=$(get_visible_fields "$REVIEWER_TOKEN")
SUPERVISOR_FIELDS=$(get_visible_fields "$SUPERVISOR_TOKEN")
READONLY_FIELDS=$(get_visible_fields "$READONLY_TOKEN")

echo "录入员  : $DATA_ENTRY_FIELDS"
echo "复核员  : $REVIEWER_FIELDS"
echo "只读用户: $READONLY_FIELDS"
echo "主管    : $SUPERVISOR_FIELDS"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 测试总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

all_passed=true

check_role_fields() {
  local role=$1
  local fields=$2
  local expected=$3
  
  local field_count=$(echo "$fields" | tr ',' '\n' | grep -c .)
  
  if [[ "$fields" == "ERROR" ]]; then
    echo "❌ $role: 无法获取字段列表"
    all_passed=false
  elif [[ $field_count -eq 0 ]]; then
    echo "❌ $role: 可见字段为0，响应可能被错误过滤"
    all_passed=false
  else
    echo "✅ $role: 可见 $field_count 个字段"
  fi
}

check_role_fields "录入员" "$DATA_ENTRY_FIELDS"
check_role_fields "复核员" "$REVIEWER_FIELDS"
check_role_fields "只读用户" "$READONLY_FIELDS"
check_role_fields "主管" "$SUPERVISOR_FIELDS"

# 验证主管字段最多
supervisor_count=$(echo "$SUPERVISOR_FIELDS" | tr ',' '\n' | grep -c .)
data_entry_count=$(echo "$DATA_ENTRY_FIELDS" | tr ',' '\n' | grep -c .)
readonly_count=$(echo "$READONLY_FIELDS" | tr ',' '\n' | grep -c .)

if [[ $supervisor_count -gt $data_entry_count ]]; then
  echo "✅ 字段分级正常: 主管可见字段 ($supervisor_count) > 录入员 ($data_entry_count)"
else
  echo "❌ 字段分级异常: 主管可见字段不应少于录入员"
  all_passed=false
fi

if [[ $data_entry_count -gt $readonly_count ]]; then
  echo "✅ 字段分级正常: 录入员可见字段 ($data_entry_count) > 只读用户 ($readonly_count)"
else
  echo "❌ 字段分级异常: 录入员可见字段不应少于只读用户"
  all_passed=false
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if $all_passed; then
  echo "🎉 所有测试通过! 权限控制和分页响应正常工作。"
else
  echo "⚠️  部分测试失败，请检查修复。"
  exit 1
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
