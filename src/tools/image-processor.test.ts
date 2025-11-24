import { assertEquals } from "@std/assert";
import { ImageProcessor } from "./image-processor.ts";

Deno.test("ImageProcessor - accepts valid bare base64 image data", () => {
  const validBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ";
  assertEquals(ImageProcessor.validateBase64Image(validBase64), true);
});

Deno.test("ImageProcessor - accepts base64 data URL", () => {
  const validBase64WithPrefix =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ==";
  assertEquals(ImageProcessor.validateBase64Image(validBase64WithPrefix), true);
});

Deno.test("ImageProcessor - rejects empty or malformed strings", () => {
  const invalidBase64 = "this is not base64!@#$%";
  const emptyBase64 = "";
  assertEquals(ImageProcessor.validateBase64Image(invalidBase64), false);
  assertEquals(ImageProcessor.validateBase64Image(emptyBase64), false);
});

Deno.test(
  "ImageProcessor - clean removes prefix but keeps untouched data",
  () => {
    const withPrefix = "data:image/jpeg;base64,ABC123==";
    const alreadyClean = "ZXhhbXBsZQ==";
    assertEquals(ImageProcessor.cleanBase64String(withPrefix), "ABC123==");
    assertEquals(ImageProcessor.cleanBase64String(alreadyClean), alreadyClean);
  }
);

Deno.test("ImageProcessor - estimates byte size using RFC4648 math", () => {
  const base64 = "QUJD"; // "ABC"
  const padded = "YWJjZA=="; // "abcd"
  assertEquals(ImageProcessor.estimateImageSize(base64), 3);
  assertEquals(ImageProcessor.estimateImageSize(padded), 4);
});

Deno.test("ImageProcessor - validates size limits correctly", () => {
  const fiveMB = "A".repeat(Math.floor((5 * 1024 * 1024 * 4) / 3));
  const overLimit = fiveMB + "AAAA";
  assertEquals(ImageProcessor.validateImageSize(fiveMB, 5), true);
  assertEquals(ImageProcessor.validateImageSize(overLimit, 5), false);
});
