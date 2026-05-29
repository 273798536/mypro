class NoteManager {
  constructor(notes, speedCurve) {
    this.rawNotes = notes || [];
    this.cleanNotes = [];
    this.dirtyNotes = [];
    this.activeNotes = [];
    this.speedCurve = speedCurve || [{ time: 0, bpm: 120 }];
    this.processData();
  }
  
  processData() {
    this.rawNotes.forEach((note, index) => {
      if (this.isValidNote(note)) {
        this.cleanNotes.push(this.normalizeNote(note, index));
      } else {
        this.dirtyNotes.push({
          note,
          index,
          reason: this.analyzeDirtyReason(note)
        });
      }
    });
    
    this.cleanNotes.sort((a, b) => a.time - b.time);
    this.markSpecialNotes();
  }
  
  isValidNote(note) {
    if (!note) return false;
    if (note.time === null || note.time === undefined) return false;
    if (typeof note.time !== 'number' || isNaN(note.time)) return false;
    if (note.track === null || note.track === undefined) return false;
    if (note.track < 0 || note.track >= 4) return false;
    return true;
  }
  
  analyzeDirtyReason(note) {
    if (!note) return '音符数据为空';
    if (note.time === null || note.time === undefined) return '时间值缺失';
    if (typeof note.time !== 'number' || isNaN(note.time)) return '时间格式无效';
    if (note.track === null || note.track === undefined) return '轨道未指定';
    if (note.track < 0 || note.track >= 4) return '轨道编号超出范围(0-3)';
    return '未知数据格式问题';
  }
  
  normalizeNote(note, index) {
    return {
      id: `note_${index}`,
      time: note.time,
      track: note.track,
      type: note.type || 'quarter',
      remark: note.remark || '',
      hitTime: null,
      judgment: null,
      errorReason: null,
      inSpeedChangeZone: false,
      comboCritical: false
    };
  }
  
  markSpecialNotes() {
    for (let i = 0; i < this.cleanNotes.length; i++) {
      const note = this.cleanNotes[i];
      
      for (const point of this.speedCurve) {
        if (Math.abs(note.time - point.time) < 2) {
          note.inSpeedChangeZone = true;
        }
      }
      
      if (i > 0 && i % 8 === 0) {
        note.comboCritical = true;
      }
    }
  }
  
  getCurrentBPM(currentTime) {
    let currentBPM = this.speedCurve[0].bpm;
    for (let i = 1; i < this.speedCurve.length; i++) {
      if (currentTime >= this.speedCurve[i].time) {
        currentBPM = this.speedCurve[i].bpm;
      }
    }
    return currentBPM;
  }
  
  getNotesToSpawn(currentTime, lookAhead = 2) {
    return this.cleanNotes.filter(note => {
      return !note.spawned && 
             note.time <= currentTime + lookAhead && 
             note.time >= currentTime - 0.5;
    });
  }
  
  getActiveNotes(currentTime) {
    return this.activeNotes.filter(note => !note.hit && !note.missed);
  }
  
  getNoteAtTrack(trackIndex, currentTime) {
    const trackNotes = this.activeNotes.filter(note => 
      note.track === trackIndex && !note.hit && !note.missed
    );
    
    if (trackNotes.length === 0) return null;
    
    trackNotes.sort((a, b) => Math.abs(a.time - currentTime) - Math.abs(b.time - currentTime));
    return trackNotes[0];
  }
  
  spawnNote(note) {
    note.spawned = true;
    this.activeNotes.push(note);
  }
  
  markMissed(currentTime) {
    const missedNotes = [];
    this.activeNotes.forEach(note => {
      if (!note.hit && !note.missed && currentTime - note.time > 0.3) {
        note.missed = true;
        missedNotes.push(note);
      }
    });
    return missedNotes;
  }
  
  getDirtyNotesReport() {
    return this.dirtyNotes.map(d => ({
      index: d.index,
      reason: d.reason,
      remark: d.note?.remark || '无备注',
      rawTime: d.note?.time,
      rawTrack: d.note?.track
    }));
  }
  
  getTotalNotes() {
    return this.cleanNotes.length;
  }
}
