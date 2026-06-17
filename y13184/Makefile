# 冷却塔水滴报告导出工具 —— Makefile 快捷入口
#
# 为什么要有这个 Makefile？
# 因为 `python3 -m cooling_tower_report.cli generate --operator 小林` 太长了，
# 小林每天敲 `make generate OPERATOR=小林` 就行。
# 而且不用管系统里的 Python 叫 python 还是 python3，这里自动检测。

PYTHON := $(shell command -v python3 2>/dev/null || command -v python 2>/dev/null)
MODULE := cooling_tower_report.cli
RUN := $(PYTHON) -m $(MODULE)

OPERATOR ?= $(USER)


.PHONY: help
help: ## 显示全部命令说明
	@echo "冷却塔水滴报告导出工具 —— 可用命令："
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ { \
		printf "  \033[36mmake %-18s\033[0m %s\n", $$1, $$2 \
	}' $(MAKEFILE_LIST)
	@echo ""
	@echo "变量："
	@echo "  OPERATOR=小林   指定操作人（默认当前用户名）"
	@echo "  REPORT_ID=xxx   指定报告ID（check / export / jump 用）"
	@echo "  OLD_ID=xxx      jump 时的旧报告ID"
	@echo "  NEW_ID=xxx      jump 时的新报告ID"
	@echo ""
	@echo "当前检测到 Python：$(PYTHON)"


.PHONY: demo
demo: ## 生成演示数据，一键体验全流程
	$(RUN) demo


.PHONY: list
list: ## 列出所有历史报告
	$(RUN) list


.PHONY: generate
generate: ## 生成新报告（可加 OPERATOR=小林）
	$(RUN) generate --operator $(OPERATOR)


.PHONY: check
check: ## 校验报告一致性（默认最新，可加 REPORT_ID=xxx）
	@if [ -n "$(REPORT_ID)" ]; then \
		$(RUN) check $(REPORT_ID); \
	else \
		$(RUN) check; \
	fi


.PHONY: export
export: ## 导出报告CSV（默认最新，可加 REPORT_ID=xxx）
	@if [ -n "$(REPORT_ID)" ]; then \
		$(RUN) export $(REPORT_ID); \
	else \
		$(RUN) export; \
	fi


.PHONY: jump
jump: ## 跳变分析，对比两份报告（需 OLD_ID=xxx NEW_ID=xxx）
	@if [ -z "$(OLD_ID)" ] || [ -z "$(NEW_ID)" ]; then \
		echo "用法：make jump OLD_ID=<旧报告ID> NEW_ID=<新报告ID>"; \
		exit 1; \
	fi
	$(RUN) jump $(OLD_ID) $(NEW_ID)


.PHONY: notes
notes: ## 查看铭牌备注和版本历史
	$(RUN) note list


.PHONY: threshold
threshold: ## 查看当前安全阈值
	$(RUN) threshold show
