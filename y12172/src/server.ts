import app from './app';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
🚀 排练室预约冲突检测API已启动
📍 服务地址: http://localhost:${PORT}
📡 API根路径: http://localhost:${PORT}/api/v1
🔧 健康检查: http://localhost:${PORT}/api/v1/health

📚 API文档:
  预约管理:
    POST    /api/v1/bookings              - 创建预约
    GET     /api/v1/bookings              - 查询预约列表
    GET     /api/v1/bookings/:id          - 获取预约详情(含冲突)
    PUT     /api/v1/bookings/:id          - 更新预约
    POST    /api/v1/bookings/:id/cancel   - 取消预约
    POST    /api/v1/bookings/check-conflicts - 冲突预检
    POST    /api/v1/bookings/:id/transition/:action - 状态流转

  资源管理:
    GET     /api/v1/rooms                 - 获取排练室列表
    GET     /api/v1/rooms/:id/availability - 排练室可用时间
    GET     /api/v1/teachers              - 获取老师列表
    GET     /api/v1/teachers/:id/schedule - 老师日程
    POST    /api/v1/teacher-leaves        - 创建老师请假
    GET     /api/v1/equipment             - 获取设备列表
    GET     /api/v1/equipment-loans       - 设备借出记录
    POST    /api/v1/equipment-loans/:loanId/return - 归还设备
    GET     /api/v1/waitlist              - 候补队列

  统计与导出:
    GET     /api/v1/stats/daily/:date     - 每日统计
    GET     /api/v1/stats/monthly/:year/:month - 月度报告
    GET     /api/v1/export/bookings/excel - 导出预约Excel
    GET     /api/v1/export/monthly/:year/:month/excel - 导出月报Excel
    GET     /api/v1/export/bookings/:id/pdf - 导出预约详情PDF

  系统:
    GET     /api/v1/status-flow           - 状态流转图
    GET     /api/v1/conflict-types        - 冲突类型说明
  `);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default server;
