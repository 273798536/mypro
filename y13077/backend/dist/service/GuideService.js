"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuideService = void 0;
class GuideService {
    getGuideItems() {
        return [
            {
                title: "样例位置",
                content: "入口：左侧菜单 → 预审列表 → 找到标题含「样例」标签的记录，点击进入详情页查看完整预审流程演示",
                type: "example",
                order: 1
            },
            {
                title: "异常定位",
                content: "步骤：详情页 → 「异常检测」标签 → 红色高优先级项需确认，点击「定位」按钮自动跳转对应位置。筛选：支持按类型、严重程度筛选，未确认项置顶显示。",
                type: "exception",
                order: 2
            },
            {
                title: "结果导出",
                content: "操作：详情页右上角 → 「导出」按钮 → 选择格式（PDF/Excel/CSV）→ 勾选包含内容 → 确定。导出文件自动下载。历史：导出记录可在「历史变更」中查看。",
                type: "export",
                order: 3
            }
        ];
    }
    getQuickStart() {
        return "林姐您好：\n1. 样例 → 点「样例」标签预审\n2. 异常 → 「异常检测」看红色项\n3. 导出 → 右上角按钮选格式";
    }
    getFAQ() {
        return [
            {
                question: "样例在哪？",
                answer: "预审列表中标有「样例」标签的就是，点进去看完整流程。"
            },
            {
                question: "异常在哪？",
                answer: "详情页「异常检测」标签，红色是高优先级要先处理。"
            },
            {
                question: "结果怎么导出？",
                answer: "详情页右上角「导出」按钮，选PDF或Excel都行。"
            },
            {
                question: "备注改了导出会变吗？",
                answer: "会！改完备注重新导出，新备注会同步到导出文件里。"
            },
            {
                question: "怎么保存当前视角？",
                answer: "调好视角后点「保存视图」，输入名称就存好了，下次直接用。"
            }
        ];
    }
}
exports.GuideService = GuideService;
