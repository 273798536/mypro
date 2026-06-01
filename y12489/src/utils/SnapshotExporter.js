export class SnapshotExporter {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
  }

  export(filename, metadata = {}) {
    const dataUrl = this.sceneManager.getScreenshotDataUrl();
    
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
    
    this.exportMetadata(filename, metadata);
    
    return {
      success: true,
      filename,
      dataUrl,
      metadata
    };
  }

  exportMetadata(imageFilename, metadata) {
    const metadataFilename = imageFilename.replace('.png', '_metadata.json');
    const metadataContent = {
      exportedAt: new Date().toISOString(),
      imageFile: imageFilename,
      ...metadata
    };
    
    const blob = new Blob([JSON.stringify(metadataContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = metadataFilename;
    link.href = url;
    link.click();
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    return metadataContent;
  }

  exportWithWarnings(filename, metadata, warnings) {
    const fullMetadata = {
      ...metadata,
      warnings: warnings.exportWarnings()
    };
    
    return this.export(filename, fullMetadata);
  }

  async exportWithDelay(filename, metadata, delayMs = 100) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const result = this.export(filename, metadata);
        resolve(result);
      }, delayMs);
    });
  }
}
