from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


STATUS_NORMAL = 'normal'
STATUS_WARNING = 'warning'
STATUS_MISMATCH = 'mismatch'
STATUS_OLD_VERSION = 'old_version'
STATUS_VERBAL_NOTE = 'verbal_note'
STATUS_AUTHORIZED = 'authorized'
STATUS_PENDING = 'pending'

STATUS_LABELS = {
    STATUS_NORMAL: '正常通过',
    STATUS_WARNING: '时码偏差',
    STATUS_MISMATCH: '不匹配',
    STATUS_OLD_VERSION: '旧版数据',
    STATUS_VERBAL_NOTE: '口头备注',
    STATUS_AUTHORIZED: '已授权对齐',
    STATUS_PENDING: '待处理',
}

STATUS_COLORS = {
    STATUS_NORMAL: 'success',
    STATUS_WARNING: 'warning',
    STATUS_MISMATCH: 'danger',
    STATUS_OLD_VERSION: 'secondary',
    STATUS_VERBAL_NOTE: 'info',
    STATUS_AUTHORIZED: 'primary',
    STATUS_PENDING: 'muted',
}


class ArchiveSession(db.Model):
    __tablename__ = 'archive_sessions'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    status = db.Column(db.String(50), default=STATUS_PENDING)
    report_content = db.Column(db.Text, default='')
    report_generated_at = db.Column(db.DateTime, nullable=True)

    channel_rows = db.relationship('ChannelRow', backref='session', lazy=True, cascade='all, delete-orphan')
    track_rows = db.relationship('TrackRow', backref='session', lazy=True, cascade='all, delete-orphan')
    timecode_entries = db.relationship('TimecodeEntry', backref='session', lazy=True, cascade='all, delete-orphan')
    notes = db.relationship('Note', backref='session', lazy=True, cascade='all, delete-orphan')
    match_results = db.relationship('MatchResult', backref='session', lazy=True, cascade='all, delete-orphan')
    uploaded_files = db.relationship('UploadedFile', backref='session', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
            'status': self.status,
            'status_label': STATUS_LABELS.get(self.status, self.status),
            'report_generated': self.report_generated_at is not None,
        }


class UploadedFile(db.Model):
    __tablename__ = 'uploaded_files'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('archive_sessions.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.now)
    row_count = db.Column(db.Integer, default=0)
    version_tag = db.Column(db.String(100), default='')

    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'file_type': self.file_type,
            'uploaded_at': self.uploaded_at.strftime('%Y-%m-%d %H:%M:%S'),
            'row_count': self.row_count,
            'version_tag': self.version_tag,
        }


class ChannelRow(db.Model):
    __tablename__ = 'channel_rows'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('archive_sessions.id'), nullable=False)
    source_file_id = db.Column(db.Integer, db.ForeignKey('uploaded_files.id'), nullable=True)
    source_row = db.Column(db.Integer, default=0)
    channel_name = db.Column(db.String(200), default='')
    track_name = db.Column(db.String(200), default='')
    timecode = db.Column(db.String(50), default='')
    timecode_seconds = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(50), default=STATUS_NORMAL)
    is_old_version = db.Column(db.Boolean, default=False)
    raw_data = db.Column(db.Text, default='')
    notes = db.Column(db.Text, default='')

    def to_dict(self):
        return {
            'id': self.id,
            'source_row': self.source_row,
            'channel_name': self.channel_name,
            'track_name': self.track_name,
            'timecode': self.timecode,
            'timecode_seconds': self.timecode_seconds,
            'status': self.status,
            'status_label': STATUS_LABELS.get(self.status, self.status),
            'is_old_version': self.is_old_version,
            'notes': self.notes,
        }


class TrackRow(db.Model):
    __tablename__ = 'track_rows'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('archive_sessions.id'), nullable=False)
    source_file_id = db.Column(db.Integer, db.ForeignKey('uploaded_files.id'), nullable=True)
    source_row = db.Column(db.Integer, default=0)
    track_name = db.Column(db.String(200), default='')
    track_number = db.Column(db.String(50), default='')
    duration = db.Column(db.String(50), default='')
    duration_seconds = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(50), default=STATUS_NORMAL)
    raw_data = db.Column(db.Text, default='')
    notes = db.Column(db.Text, default='')

    def to_dict(self):
        return {
            'id': self.id,
            'source_row': self.source_row,
            'track_name': self.track_name,
            'track_number': self.track_number,
            'duration': self.duration,
            'duration_seconds': self.duration_seconds,
            'status': self.status,
            'status_label': STATUS_LABELS.get(self.status, self.status),
            'notes': self.notes,
        }


class TimecodeEntry(db.Model):
    __tablename__ = 'timecode_entries'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('archive_sessions.id'), nullable=False)
    source_file_id = db.Column(db.Integer, db.ForeignKey('uploaded_files.id'), nullable=True)
    source_row = db.Column(db.Integer, default=0)
    entry_name = db.Column(db.String(200), default='')
    timecode = db.Column(db.String(50), default='')
    timecode_seconds = db.Column(db.Float, default=0.0)
    channel_ref = db.Column(db.String(200), default='')
    status = db.Column(db.String(50), default=STATUS_PENDING)
    raw_data = db.Column(db.Text, default='')
    notes = db.Column(db.Text, default='')

    def to_dict(self):
        return {
            'id': self.id,
            'source_row': self.source_row,
            'entry_name': self.entry_name,
            'timecode': self.timecode,
            'timecode_seconds': self.timecode_seconds,
            'channel_ref': self.channel_ref,
            'status': self.status,
            'status_label': STATUS_LABELS.get(self.status, self.status),
            'notes': self.notes,
        }


class Note(db.Model):
    __tablename__ = 'notes'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('archive_sessions.id'), nullable=False)
    source_file_id = db.Column(db.Integer, db.ForeignKey('uploaded_files.id'), nullable=True)
    note_type = db.Column(db.String(50), default='verbal')
    content = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    is_authorization = db.Column(db.Boolean, default=False)
    related_entries = db.Column(db.Text, default='')
    status = db.Column(db.String(50), default=STATUS_VERBAL_NOTE)

    def to_dict(self):
        return {
            'id': self.id,
            'note_type': self.note_type,
            'content': self.content,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'is_authorization': self.is_authorization,
            'related_entries': self.related_entries,
            'status': self.status,
            'status_label': STATUS_LABELS.get(self.status, self.status),
        }


class MatchResult(db.Model):
    __tablename__ = 'match_results'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('archive_sessions.id'), nullable=False)
    timecode_entry_id = db.Column(db.Integer, db.ForeignKey('timecode_entries.id'), nullable=True)
    channel_row_id = db.Column(db.Integer, db.ForeignKey('channel_rows.id'), nullable=True)
    track_row_id = db.Column(db.Integer, db.ForeignKey('track_rows.id'), nullable=True)
    status = db.Column(db.String(50), default=STATUS_PENDING)
    time_diff_seconds = db.Column(db.Float, default=0.0)
    match_confidence = db.Column(db.Float, default=0.0)
    sources = db.Column(db.Text, default='')
    conclusion = db.Column(db.Text, default='')
    notes = db.Column(db.Text, default='')

    def to_dict(self):
        return {
            'id': self.id,
            'status': self.status,
            'status_label': STATUS_LABELS.get(self.status, self.status),
            'time_diff_seconds': self.time_diff_seconds,
            'match_confidence': self.match_confidence,
            'conclusion': self.conclusion,
            'notes': self.notes,
            'sources': self.sources,
        }
