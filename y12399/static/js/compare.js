// 对比页面JavaScript - 力度曲线对比图
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('velocityComparisonChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const originalCurve = window.ORIGINAL_CURVE || {};
    const modifiedCurve = window.MODIFIED_CURVE || {};
    const corrections = window.CORRECTIONS || [];

    const originalVelocities = originalCurve.velocities || [];
    const modifiedVelocities = modifiedCurve.velocities || [];

    if (originalVelocities.length === 0) {
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无力度曲线数据', canvas.width / 2, canvas.height / 2);
        return;
    }

    const padding = { top: 40, right: 40, bottom: 60, left: 60 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;

    const maxVelocity = 127;
    const minVelocity = 0;
    const maxPoints = Math.max(originalVelocities.length, modifiedVelocities.length);
    const xStep = chartWidth / (maxPoints - 1 || 1);

    const yScale = (velocity) => {
        return padding.top + chartHeight - ((velocity - minVelocity) / (maxVelocity - minVelocity)) * chartHeight;
    };

    const xScale = (index) => {
        return padding.left + index * xStep;
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 1;

    for (let v = 0; v <= 127; v += 32) {
        const y = yScale(v);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvas.width - padding.right, y);
        ctx.stroke();

        ctx.fillStyle = '#7f8c8d';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(v.toString(), padding.left - 10, y + 4);
    }

    for (let i = 0; i < maxPoints; i += Math.max(1, Math.floor(maxPoints / 10))) {
        const x = xScale(i);
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(i.toString(), x, canvas.height - padding.bottom + 20);
    }

    ctx.fillStyle = '#2c3e50';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('音符序号', canvas.width / 2, canvas.height - 10);

    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('力度值', 0, 0);
    ctx.restore();

    if (originalVelocities.length > 0) {
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        originalVelocities.forEach((v, i) => {
            const x = xScale(i);
            const y = yScale(v);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        ctx.fillStyle = '#95a5a6';
        originalVelocities.forEach((v, i) => {
            const x = xScale(i);
            const y = yScale(v);
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    if (modifiedVelocities.length > 0) {
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 2;
        ctx.beginPath();
        modifiedVelocities.forEach((v, i) => {
            const x = xScale(i);
            const y = yScale(v);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        ctx.fillStyle = '#f39c12';
        modifiedVelocities.forEach((v, i) => {
            const x = xScale(i);
            const y = yScale(v);
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    corrections.forEach(corr => {
        const noteIndex = corr.note_id - 1;
        if (noteIndex >= 0 && noteIndex < modifiedVelocities.length) {
            const x = xScale(noteIndex);
            const y = yScale(modifiedVelocities[noteIndex]);

            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    const legendX = canvas.width - padding.right - 200;
    const legendY = padding.top + 10;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(legendX - 10, legendY - 10, 200, 80);
    ctx.strokeStyle = '#e1e8ed';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX - 10, legendY - 10, 200, 80);

    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legendX, legendY + 15);
    ctx.lineTo(legendX + 30, legendY + 15);
    ctx.stroke();
    ctx.fillStyle = '#2c3e50';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('原始曲线', legendX + 40, legendY + 19);

    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legendX, legendY + 40);
    ctx.lineTo(legendX + 30, legendY + 40);
    ctx.stroke();
    ctx.fillStyle = '#2c3e50';
    ctx.fillText('修正后曲线', legendX + 40, legendY + 44);

    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(legendX + 15, legendY + 65, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(legendX + 15, legendY + 65, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c3e50';
    ctx.fillText('修正点', legendX + 40, legendY + 69);

    console.log('力度曲线对比图绘制完成');
});
