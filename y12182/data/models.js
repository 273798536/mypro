class Patient {
  constructor(id, name, age, gender, diagnosis, notes) {
    this.id = id;
    this.name = name;
    this.age = age;
    this.gender = gender;
    this.diagnosis = diagnosis;
    this.notes = notes;
    this.createdAt = new Date().toISOString();
  }
}

class SleepScore {
  constructor(id, patientId, date, score, deepSleep, lightSleep, remSleep, awakeTime, notes) {
    this.id = id;
    this.patientId = patientId;
    this.date = date;
    this.score = score;
    this.deepSleep = deepSleep;
    this.lightSleep = lightSleep;
    this.remSleep = remSleep;
    this.awakeTime = awakeTime;
    this.notes = notes;
    this.createdAt = new Date().toISOString();
  }
}

class ForbiddenTrack {
  constructor(id, patientId, trackName, artist, reason, severity) {
    this.id = id;
    this.patientId = patientId;
    this.trackName = trackName;
    this.artist = artist;
    this.reason = reason;
    this.severity = severity;
    this.createdAt = new Date().toISOString();
  }
}

class Playlist {
  constructor(id, patientId, name, tracks, therapistId, status) {
    this.id = id;
    this.patientId = patientId;
    this.name = name;
    this.tracks = tracks;
    this.therapistId = therapistId;
    this.status = status;
    this.createdAt = new Date().toISOString();
    this.modifiedAt = new Date().toISOString();
  }
}

class ModificationLog {
  constructor(id, playlistId, field, oldValue, newValue, operator, reason) {
    this.id = id;
    this.playlistId = playlistId;
    this.field = field;
    this.oldValue = oldValue;
    this.newValue = newValue;
    this.operator = operator;
    this.reason = reason;
    this.timestamp = new Date().toISOString();
  }
}

class EmotionRecord {
  constructor(id, playlistId, trackId, emotion, intensity, timestamp, notes) {
    this.id = id;
    this.playlistId = playlistId;
    this.trackId = trackId;
    this.emotion = emotion;
    this.intensity = intensity;
    this.timestamp = timestamp;
    this.notes = notes;
  }
}

class PlaySession {
  constructor(id, playlistId, startTime, endTime, status, emotionRecords, issues) {
    this.id = id;
    this.playlistId = playlistId;
    this.startTime = startTime;
    this.endTime = endTime;
    this.status = status;
    this.emotionRecords = emotionRecords;
    this.issues = issues;
  }
}

class ValidationResult {
  constructor(playlistId, isValid, warnings, errors, forbiddenMatches) {
    this.playlistId = playlistId;
    this.isValid = isValid;
    this.warnings = warnings;
    this.errors = errors;
    this.forbiddenMatches = forbiddenMatches;
    this.validatedAt = new Date().toISOString();
  }
}

class Report {
  constructor(id, patientId, playlistId, sessionId, summary, emotionAnalysis, issues, recommendations, generatedAt) {
    this.id = id;
    this.patientId = patientId;
    this.playlistId = playlistId;
    this.sessionId = sessionId;
    this.summary = summary;
    this.emotionAnalysis = emotionAnalysis;
    this.issues = issues;
    this.recommendations = recommendations;
    this.generatedAt = generatedAt;
  }
}

module.exports = {
  Patient,
  SleepScore,
  ForbiddenTrack,
  Playlist,
  ModificationLog,
  EmotionRecord,
  PlaySession,
  ValidationResult,
  Report
};
