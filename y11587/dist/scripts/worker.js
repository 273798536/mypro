"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const data_source_1 = require("../data-source");
const queue_worker_service_1 = require("../services/queue-worker.service");
async function startWorker() {
    console.log("=== 法务合同履约重试补偿队列 - Worker启动 ===");
    try {
        await data_source_1.AppDataSource.initialize();
        console.log("✓ 数据库连接成功");
        const worker = new queue_worker_service_1.QueueWorker(5000);
        worker.start();
        console.log("✓ 队列Worker已启动");
        console.log("  轮询间隔: 5000ms");
        console.log("  按 Ctrl+C 停止");
        process.on("SIGINT", () => {
            console.log("\n正在停止Worker...");
            worker.stop();
            data_source_1.AppDataSource.destroy().then(() => {
                console.log("Worker已停止");
                process.exit(0);
            });
        });
    }
    catch (error) {
        console.error("Worker启动失败:", error);
        process.exit(1);
    }
}
startWorker();
