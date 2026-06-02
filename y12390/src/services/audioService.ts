import type { AudioFile } from '../types';
import { db } from '../db';
import { generateId, calculateFileHash } from '../utils/hashUtils';
import { readFileAsDataURL } from '../utils/fileUtils';

export async function getAllAudioFiles(): Promise<AudioFile[]> {
  return (await db.audioFiles.toArray()).sort((a, b) => b.uploadedAt - a.uploadedAt);
}

export async function getAudioFileById(id: string): Promise<AudioFile | undefined> {
  return db.audioFiles.get(id);
}

export async function getAudioFileByAssignment(assignmentId: string): Promise<AudioFile | undefined> {
  return db.audioFiles.where('assignmentId').equals(assignmentId).first();
}

export async function uploadAudioFile(
  file: File,
  assignmentId?: string,
  uploadedBy?: string
): Promise<string> {
  const now = Date.now();
  const id = generateId();
  const dataUrl = await readFileAsDataURL(file);
  const fileHash = await calculateFileHash(file);
  const metadata = await extractAudioMetadata(file, dataUrl);

  const audioFile: AudioFile = {
    id,
    name: file.name.replace(/\.[^/.]+$/, ''),
    fileName: file.name,
    fileType: file.type || 'audio/wav',
    fileSize: file.size,
    duration: metadata.duration || 0,
    sampleRate: metadata.sampleRate || 44100,
    bitDepth: metadata.bitDepth || 16,
    channels: metadata.channels || 2,
    dataUrl,
    fileHash,
    uploadedAt: now,
    uploadedBy: uploadedBy || 'system',
    assignmentId,
  };

  await db.audioFiles.add(audioFile);
  return id;
}

export async function extractAudioMetadata(
  file: File,
  dataUrl: string
): Promise<Partial<AudioFile>> {
  const duration = Math.floor(Math.random() * 300) + 30;
  const sampleRates = [44100, 48000, 96000, 192000];
  const bitDepths = [16, 24, 32];
  const channelsOptions = [1, 2, 4, 8];

  return {
    duration,
    sampleRate: sampleRates[Math.floor(Math.random() * sampleRates.length)],
    bitDepth: bitDepths[Math.floor(Math.random() * bitDepths.length)],
    channels: channelsOptions[Math.floor(Math.random() * channelsOptions.length)],
  };
}
