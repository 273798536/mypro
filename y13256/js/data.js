const STORAGE_KEY = 'school_transport_review';

const RecordStatus = {
    PENDING: 'pending',
    MANUAL: 'manual',
    DONE: 'done',
    CONFLICT: 'conflict'
};

const ChangeType = {
    LEDGER: 'ledger',
    NORMAL: 'normal',
    VERBAL: 'verbal',
    MODIFIED: 'modified',
    CONFLICT: 'conflict',
    PHOTO: 'photo',
    MANUAL: 'manual'
};

const DataStore = {
    records: [],
    sourceFiles: {
        ledger: null,
        normal: null,
        verbal: ''
    },

    init() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.records = data.records || [];
                this.sourceFiles = data.sourceFiles || { ledger: null, normal: null, verbal: '' };
            } catch (e) {
                console.error('Failed to load data:', e);
            }
        }
    },

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            records: this.records,
            sourceFiles: this.sourceFiles
        }));
    },

    addRecord(record) {
        record.id = record.id || 'REC_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        record.createdAt = record.createdAt || new Date().toISOString();
        record.updatedAt = new Date().toISOString();
        record.status = record.status || RecordStatus.PENDING;
        record.changes = record.changes || [];
        record.photos = record.photos || [];
        record.notes = record.notes || [];
        this.records.unshift(record);
        this.save();
        return record;
    },

    updateRecord(id, updates) {
        const index = this.records.findIndex(r => r.id === id);
        if (index !== -1) {
            this.records[index] = {
                ...this.records[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.save();
            return this.records[index];
        }
        return null;
    },

    getRecord(id) {
        return this.records.find(r => r.id === id);
    },

    deleteRecord(id) {
        this.records = this.records.filter(r => r.id !== id);
        this.save();
    },

    addChange(recordId, change) {
        const record = this.getRecord(recordId);
        if (record) {
            change.id = change.id || 'CHG_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            change.timestamp = change.timestamp || new Date().toISOString();
            record.changes.push(change);
            record.updatedAt = new Date().toISOString();
            this.save();
            return change;
        }
        return null;
    },

    addPhoto(recordId, photo) {
        const record = this.getRecord(recordId);
        if (record) {
            photo.id = photo.id || 'PHO_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            photo.uploadedAt = photo.uploadedAt || new Date().toISOString();
            record.photos.push(photo);
            record.updatedAt = new Date().toISOString();
            this.save();
            return photo;
        }
        return null;
    },

    removePhoto(recordId, photoId) {
        const record = this.getRecord(recordId);
        if (record) {
            record.photos = record.photos.filter(p => p.id !== photoId);
            record.updatedAt = new Date().toISOString();
            this.save();
        }
    },

    addNote(recordId, note) {
        const record = this.getRecord(recordId);
        if (record) {
            note.id = note.id || 'NOTE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            note.timestamp = note.timestamp || new Date().toISOString();
            record.notes.push(note);
            record.updatedAt = new Date().toISOString();
            this.save();
            return note;
        }
        return null;
    },

    getRecordsByStatus(status) {
        if (status === 'all') return this.records;
        if (status === 'pending') {
            return this.records.filter(r =>
                r.status === RecordStatus.PENDING || r.status === RecordStatus.CONFLICT
            );
        }
        return this.records.filter(r => r.status === status);
    },

    getCounts() {
        return {
            pending: this.records.filter(r => r.status === RecordStatus.PENDING).length,
            manual: this.records.filter(r => r.status === RecordStatus.MANUAL).length,
            done: this.records.filter(r => r.status === RecordStatus.DONE).length,
            conflict: this.records.filter(r => r.status === RecordStatus.CONFLICT).length
        };
    },

    clearAll() {
        this.records = [];
        this.sourceFiles = { ledger: null, normal: null, verbal: '' };
        this.save();
    },

    setSourceFile(type, fileInfo) {
        this.sourceFiles[type] = fileInfo;
        this.save();
    }
};
