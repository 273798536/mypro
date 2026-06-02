// 手动修正页面JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const velocitySlider = document.getElementById('velocitySlider');
    const newVelocityInput = document.getElementById('newVelocity');
    const applyCorrectionBtn = document.getElementById('applyCorrection');
    const resetNoteBtn = document.getElementById('resetNote');
    const correctionResult = document.getElementById('correctionResult');
    const noteSearch = document.getElementById('noteSearch');
    const notesTableBody = document.getElementById('notesTableBody');

    if (velocitySlider && newVelocityInput) {
        velocitySlider.addEventListener('input', function() {
            newVelocityInput.value = this.value;
        });

        newVelocityInput.addEventListener('input', function() {
            let value = parseInt(this.value);
            if (value < 1) value = 1;
            if (value > 127) value = 127;
            velocitySlider.value = value;
        });
    }

    if (noteSearch && notesTableBody) {
        noteSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = notesTableBody.querySelectorAll('.note-row');

            rows.forEach(row => {
                const noteId = row.getAttribute('data-note-id');
                const cells = row.querySelectorAll('td');
                let found = false;

                cells.forEach(cell => {
                    if (cell.textContent.toLowerCase().includes(searchTerm)) {
                        found = true;
                    }
                });

                if (noteId && noteId.includes(searchTerm)) {
                    found = true;
                }

                row.style.display = found ? '' : 'none';
            });
        });
    }

    const noteRows = document.querySelectorAll('.note-row');
    noteRows.forEach(row => {
        row.addEventListener('click', function() {
            const noteId = this.getAttribute('data-note-id');
            if (noteId) {
                window.location.href = `/session/${window.SESSION_ID}/correct?note_id=${noteId}`;
            }
        });
    });

    if (applyCorrectionBtn && window.SELECTED_NOTE_ID !== undefined) {
        applyCorrectionBtn.addEventListener('click', async function() {
            const newVelocity = parseInt(newVelocityInput.value);
            const reason = document.getElementById('correctionReason').value;
            const correctedBy = document.getElementById('correctedBy').value;

            if (!newVelocity || newVelocity < 1 || newVelocity > 127) {
                showResult('力度值必须在1-127之间', true);
                return;
            }

            if (!reason.trim()) {
                showResult('请输入修正原因', true);
                return;
            }

            applyCorrectionBtn.disabled = true;
            applyCorrectionBtn.textContent = '提交中...';

            try {
                const response = await fetch(`/session/${window.SESSION_ID}/correct`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        note_id: window.SELECTED_NOTE_ID,
                        new_velocity: newVelocity,
                        reason: reason,
                        corrected_by: correctedBy,
                        anomaly_id: window.SELECTED_ANOMALY_ID || null
                    })
                });

                const result = await response.json();

                if (result.success) {
                    showResult(`修正成功！力度从 ${result.correction.old_velocity} 改为 ${result.correction.new_velocity} (变化: ${result.correction.velocity_change})`, false);

                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showResult(result.error || '修正失败', true);
                }
            } catch (error) {
                showResult('网络错误，请稍后重试', true);
            } finally {
                applyCorrectionBtn.disabled = false;
                applyCorrectionBtn.textContent = '应用修正';
            }
        });
    }

    if (resetNoteBtn && window.SELECTED_NOTE_ID !== undefined) {
        resetNoteBtn.addEventListener('click', async function() {
            if (!confirm('确定要重置此音符的所有修正吗？')) {
                return;
            }

            resetNoteBtn.disabled = true;
            resetNoteBtn.textContent = '重置中...';

            try {
                const response = await fetch(`/session/${window.SESSION_ID}/corrections`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        reset_note_id: window.SELECTED_NOTE_ID,
                        corrected_by: document.getElementById('correctedBy').value
                    })
                });

                const result = await response.json();

                if (result.success) {
                    showResult('重置成功！', false);
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    showResult(result.error || '重置失败', true);
                }
            } catch (error) {
                showResult('网络错误，请稍后重试', true);
            } finally {
                resetNoteBtn.disabled = false;
                resetNoteBtn.textContent = '重置此音符';
            }
        });
    }

    function showResult(message, isError) {
        if (!correctionResult) return;

        correctionResult.textContent = message;
        correctionResult.className = `result-area ${isError ? 'error' : ''}`;
        correctionResult.classList.remove('hidden');

        if (!isError) {
            setTimeout(() => {
                correctionResult.classList.add('hidden');
            }, 3000);
        }
    }
});
