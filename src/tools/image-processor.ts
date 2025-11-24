export class ImageProcessor {
  static validateBase64Image(base64String: string): boolean {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");

    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(base64Data) && base64Data.length > 0;
  }

  static cleanBase64String(base64String: string): string {
    return base64String.replace(/^data:image\/\w+;base64,/, "");
  }

  static estimateImageSize(base64String: string): number {
    const cleanString = this.cleanBase64String(base64String);
    const paddingChars = cleanString.endsWith("==")
      ? 2
      : cleanString.endsWith("=")
      ? 1
      : 0;
    const size = Math.ceil((cleanString.length * 3) / 4) - paddingChars;
    return Math.max(size, 0);
  }

  static validateImageSize(
    base64String: string,
    maxSizeMB: number = 5
  ): boolean {
    const sizeBytes = this.estimateImageSize(base64String);
    const sizeMB = sizeBytes / (1024 * 1024);
    return sizeMB <= maxSizeMB;
  }
}
