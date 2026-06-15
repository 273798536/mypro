const PhotoModule = {
    pendingPhotos: [],
    currentRecordId: null,

    init() {
    },

    setupPhotoUpload(recordId, container) {
        this.currentRecordId = recordId;
        this.pendingPhotos = [];

        const uploadSection = document.createElement('div');
        uploadSection.className = 'photo-upload-section';
        uploadSection.innerHTML = `
            <h4>补录现场照片</h4>
            <p style="font-size: 13px; color: #718096; margin-bottom: 10px;">
                上传照片后，地图点位和变更说明将记录此次补录修改的内容
            </p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn btn-sm btn-primary" id="btn-select-photos">选择照片</button>
                <input type="file" id="photo-input" accept="image/*" multiple hidden>
            </div>
            <div class="map-point">
                <span>📍</span>
                <input type="text" id="photo-location" placeholder="地图点位（如：学校东门北侧50米）">
            </div>
            <div style="margin-top: 12px;">
                <textarea id="photo-change-note" rows="2" placeholder="说明此次补录修改了什么内容..."></textarea>
            </div>
            <div class="photo-preview" id="photo-preview"></div>
            <div style="margin-top: 12px; display: flex; gap: 8px;">
                <button class="btn btn-sm btn-success" id="btn-save-photos">保存补录</button>
                <button class="btn btn-sm btn-secondary" id="btn-clear-photos">清空</button>
            </div>
        `;

        container.appendChild(uploadSection);

        document.getElementById('btn-select-photos').addEventListener('click', () => {
            document.getElementById('photo-input').click();
        });

        document.getElementById('photo-input').addEventListener('change', (e) => {
            this.handlePhotoSelect(e.target.files);
        });

        document.getElementById('btn-save-photos').addEventListener('click', () => {
            this.savePhotos();
        });

        document.getElementById('btn-clear-photos').addEventListener('click', () => {
            this.clearPending();
        });
    },

    handlePhotoSelect(files) {
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) {
                UI.showToast('请选择图片文件', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                this.pendingPhotos.push({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    dataUrl: e.target.result
                });
                this.renderPreview();
            };
            reader.readAsDataURL(file);
        });
    },

    renderPreview() {
        const container = document.getElementById('photo-preview');
        if (!container) return;

        container.innerHTML = '';

        this.pendingPhotos.forEach((photo, index) => {
            const item = document.createElement('div');
            item.className = 'photo-item';
            item.innerHTML = `
                <img src="${photo.dataUrl}" alt="${photo.name}">
                <button class="remove-photo" data-index="${index}">&times;</button>
            `;
            container.appendChild(item);
        });

        container.querySelectorAll('.remove-photo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.pendingPhotos.splice(index, 1);
                this.renderPreview();
            });
        });
    },

    savePhotos() {
        if (!this.currentRecordId) return;

        if (this.pendingPhotos.length === 0) {
            UI.showToast('请先选择照片', 'warning');
            return;
        }

        const location = document.getElementById('photo-location').value.trim();
        const changeNote = document.getElementById('photo-change-note').value.trim();

        if (!changeNote) {
            UI.showToast('请说明此次补录修改了什么内容', 'warning');
            return;
        }

        const record = DataStore.getRecord(this.currentRecordId);
        if (!record) return;

        const oldMorning = record.morningCapacity;
        const oldEvening = record.eveningCapacity;

        this.pendingPhotos.forEach(photo => {
            DataStore.addPhoto(this.currentRecordId, {
                ...photo,
                location: location,
                changeNote: changeNote
            });
        });

        DataStore.addChange(this.currentRecordId, {
            type: ChangeType.PHOTO,
            source: '现场照片补录',
            field: '现场照片',
            oldValue: `早${oldMorning || '-'}人 / 晚${oldEvening || '-'}人`,
            newValue: `早${record.morningCapacity || '-'}人 / 晚${record.eveningCapacity || '-'}人`,
            description: `补录${this.pendingPhotos.length}张现场照片，${changeNote}`,
            location: location,
            changeNote: changeNote,
            photoCount: this.pendingPhotos.length
        });

        if (record.status === RecordStatus.PENDING) {
            DataStore.updateRecord(this.currentRecordId, {
                status: RecordStatus.DONE
            });
        }

        this.clearPending();
        UI.showToast(`已保存${this.pendingPhotos.length}张照片`, 'success');

        const event = new CustomEvent('photosSaved', { detail: { recordId: this.currentRecordId } });
        document.dispatchEvent(event);
    },

    clearPending() {
        this.pendingPhotos = [];
        const locationInput = document.getElementById('photo-location');
        const noteInput = document.getElementById('photo-change-note');
        const preview = document.getElementById('photo-preview');
        const fileInput = document.getElementById('photo-input');

        if (locationInput) locationInput.value = '';
        if (noteInput) noteInput.value = '';
        if (preview) preview.innerHTML = '';
        if (fileInput) fileInput.value = '';
    },

    getPhotoChanges(record) {
        if (!record.photos || record.photos.length === 0) return [];

        return record.photos.map(photo => ({
            id: photo.id,
            dataUrl: photo.dataUrl,
            location: photo.location,
            changeNote: photo.changeNote,
            uploadedAt: photo.uploadedAt
        }));
    }
};
