export type Point = { x: number; y: number };
export type Quad = [Point, Point, Point, Point];
export type FilterMode = "bw" | "color" | "grayscale";

// ─── CONVERSION FICHIER ───────────────────────────────────────────────────

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function pdfFirstPageToDataUrl(
  file: File
): Promise<string | null> {
  try {
    // @ts-ignore
    if (!window.pdfjsLib) {
      await new Promise<void>((res, rej) => {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.onload = () => res();
        script.onerror = () => rej();
        document.head.appendChild(script);
      });
      // @ts-ignore
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    const arrayBuffer = await file.arrayBuffer();
    // @ts-ignore
    const pdf = await window.pdfjsLib
      .getDocument({ data: arrayBuffer })
      .promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({
      canvasContext: canvas.getContext("2d")!,
      viewport,
    }).promise;
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return null;
  }
}

// ─── DÉTECTION DE CONTOURS ────────────────────────────────────────────────

function defaultQuad(): Quad {
  return [
    { x: 0.08, y: 0.08 },
    { x: 0.92, y: 0.08 },
    { x: 0.92, y: 0.92 },
    { x: 0.08, y: 0.92 },
  ];
}

export async function detectDocumentCorners(
  dataUrl: string
): Promise<Quad | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const MAX = 600;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        const gray = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) {
          gray[i] = Math.round(
            0.299 * data[i * 4] +
              0.587 * data[i * 4 + 1] +
              0.114 * data[i * 4 + 2]
          );
        }

        const edges = new Uint8Array(w * h);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const gx =
              -gray[(y - 1) * w + (x - 1)] +
              gray[(y - 1) * w + (x + 1)] +
              -2 * gray[y * w + (x - 1)] +
              2 * gray[y * w + (x + 1)] +
              -gray[(y + 1) * w + (x - 1)] +
              gray[(y + 1) * w + (x + 1)];
            const gy =
              -gray[(y - 1) * w + (x - 1)] +
              -2 * gray[(y - 1) * w + x] +
              -gray[(y - 1) * w + (x + 1)] +
              gray[(y + 1) * w + (x - 1)] +
              2 * gray[(y + 1) * w + x] +
              gray[(y + 1) * w + (x + 1)];
            edges[y * w + x] = Math.min(255, Math.sqrt(gx * gx + gy * gy));
          }
        }

        const threshold = 60;
        const MARGIN = 0.05;
        const minX = Math.round(w * MARGIN);
        const maxX = Math.round(w * (1 - MARGIN));
        const minY = Math.round(h * MARGIN);
        const maxY = Math.round(h * (1 - MARGIN));

        const hProj = new Float32Array(h);
        const vProj = new Float32Array(w);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (edges[y * w + x] > threshold) {
              hProj[y]++;
              vProj[x]++;
            }
          }
        }

        const hThresh = w * 0.03;
        const vThresh = h * 0.03;
        let top = minY, bottom = maxY, left = minX, right = maxX;

        for (let y = minY; y < h / 2; y++) {
          if (hProj[y] > hThresh) { top = y; break; }
        }
        for (let y = maxY; y > h / 2; y--) {
          if (hProj[y] > hThresh) { bottom = y; break; }
        }
        for (let x = minX; x < w / 2; x++) {
          if (vProj[x] > vThresh) { left = x; break; }
        }
        for (let x = maxX; x > w / 2; x--) {
          if (vProj[x] > vThresh) { right = x; break; }
        }

        const docW = right - left;
        const docH = bottom - top;
        if (
          docW / w < 0.2 ||
          docH / h < 0.2 ||
          left >= right ||
          top >= bottom
        ) {
          resolve(defaultQuad());
          return;
        }

        resolve([
          { x: left / w, y: top / h },
          { x: right / w, y: top / h },
          { x: right / w, y: bottom / h },
          { x: left / w, y: bottom / h },
        ]);
      } catch {
        resolve(defaultQuad());
      }
    };
    img.onerror = () => resolve(defaultQuad());
    img.src = dataUrl;
  });
}

// ─── TRANSFORMATION DE PERSPECTIVE ───────────────────────────────────────

function computeHomography(
  srcPts: { x: number; y: number }[],
  dstPts: { x: number; y: number }[]
): number[] | null {
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const { x: sx, y: sy } = srcPts[i];
    const { x: dx, y: dy } = dstPts[i];
    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  const n = 8;
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > maxVal) {
        maxVal = Math.abs(M[row][col]);
        maxRow = row;
      }
    }
    if (maxVal < 1e-12) return null;
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    const pivot = M[col][col];
    for (let k = col; k <= n; k++) M[col][k] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      for (let k = col; k <= n; k++) M[row][k] -= factor * M[col][k];
    }
  }

  return M.map((row) => row[n]);
}

export async function applyPerspectiveWarp(
  dataUrl: string,
  quad: Quad
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const W = img.width;
      const H = img.height;

      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = W;
      srcCanvas.height = H;
      const srcCtx = srcCanvas.getContext("2d")!;
      srcCtx.drawImage(img, 0, 0);
      const srcPixels = srcCtx.getImageData(0, 0, W, H).data;

      const [tl, tr, br, bl] = quad;
      const srcPts = [
        { x: tl.x * W, y: tl.y * H },
        { x: tr.x * W, y: tr.y * H },
        { x: br.x * W, y: br.y * H },
        { x: bl.x * W, y: bl.y * H },
      ];

      const wTop = Math.hypot(srcPts[1].x - srcPts[0].x, srcPts[1].y - srcPts[0].y);
      const wBot = Math.hypot(srcPts[2].x - srcPts[3].x, srcPts[2].y - srcPts[3].y);
      const hLeft = Math.hypot(srcPts[3].x - srcPts[0].x, srcPts[3].y - srcPts[0].y);
      const hRight = Math.hypot(srcPts[2].x - srcPts[1].x, srcPts[2].y - srcPts[1].y);

      const outW = Math.round(Math.max(wTop, wBot));
      const outH = Math.round(Math.max(hLeft, hRight));

      if (outW < 10 || outH < 10) {
        resolve(dataUrl);
        return;
      }

      const dstPts = [
        { x: 0, y: 0 },
        { x: outW - 1, y: 0 },
        { x: outW - 1, y: outH - 1 },
        { x: 0, y: outH - 1 },
      ];

      const H_inv = computeHomography(dstPts, srcPts);

      if (!H_inv) {
        const fallbackCanvas = document.createElement("canvas");
        fallbackCanvas.width = outW;
        fallbackCanvas.height = outH;
        const fCtx = fallbackCanvas.getContext("2d")!;
        fCtx.drawImage(
          img,
          srcPts[0].x, srcPts[0].y,
          srcPts[2].x - srcPts[0].x,
          srcPts[2].y - srcPts[0].y,
          0, 0, outW, outH
        );
        resolve(fallbackCanvas.toDataURL("image/jpeg", 0.93));
        return;
      }

      const [h0, h1, h2, h3, h4, h5, h6, h7] = H_inv;

      const dstCanvas = document.createElement("canvas");
      dstCanvas.width = outW;
      dstCanvas.height = outH;
      const dstCtx = dstCanvas.getContext("2d")!;
      const dstImageData = dstCtx.createImageData(outW, outH);
      const dstPixels = dstImageData.data;

      for (let dy = 0; dy < outH; dy++) {
        for (let dx = 0; dx < outW; dx++) {
          const denom = h6 * dx + h7 * dy + 1.0;
          if (Math.abs(denom) < 1e-10) continue;

          const sx = (h0 * dx + h1 * dy + h2) / denom;
          const sy = (h3 * dx + h4 * dy + h5) / denom;

          const x0 = Math.floor(sx);
          const y0 = Math.floor(sy);
          const x1 = x0 + 1;
          const y1 = y0 + 1;

          const dstIdx = (dy * outW + dx) * 4;

          if (x0 < 0 || y0 < 0 || x1 >= W || y1 >= H) {
            dstPixels[dstIdx] = 255;
            dstPixels[dstIdx + 1] = 255;
            dstPixels[dstIdx + 2] = 255;
            dstPixels[dstIdx + 3] = 255;
            continue;
          }

          const fx = sx - x0;
          const fy = sy - y0;
          const w00 = (1 - fx) * (1 - fy);
          const w10 = fx * (1 - fy);
          const w01 = (1 - fx) * fy;
          const w11 = fx * fy;

          const i00 = (y0 * W + x0) * 4;
          const i10 = (y0 * W + x1) * 4;
          const i01 = (y1 * W + x0) * 4;
          const i11 = (y1 * W + x1) * 4;

          dstPixels[dstIdx]     = Math.round(srcPixels[i00] * w00 + srcPixels[i10] * w10 + srcPixels[i01] * w01 + srcPixels[i11] * w11);
          dstPixels[dstIdx + 1] = Math.round(srcPixels[i00 + 1] * w00 + srcPixels[i10 + 1] * w10 + srcPixels[i01 + 1] * w01 + srcPixels[i11 + 1] * w11);
          dstPixels[dstIdx + 2] = Math.round(srcPixels[i00 + 2] * w00 + srcPixels[i10 + 2] * w10 + srcPixels[i01 + 2] * w01 + srcPixels[i11 + 2] * w11);
          dstPixels[dstIdx + 3] = 255;
        }
      }

      dstCtx.putImageData(dstImageData, 0, 0);
      resolve(dstCanvas.toDataURL("image/jpeg", 0.97));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ─── FILTRE SCANNER PROFESSIONNEL ────────────────────────────────────────

export async function applyDocumentFilter(
  dataUrl: string,
  mode: FilterMode = "bw"
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const W = img.width;
      const H = img.height;

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, W, H);
      const data = imageData.data;

      if (mode === "color") {
        for (let i = 0; i < data.length; i += 4) {
          data[i]     = Math.min(255, Math.max(0, (data[i]     - 128) * 1.3 + 148));
          data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.3 + 148));
          data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.3 + 148));
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.95));
        return;
      }

      // Étape 1 : Niveaux de gris
      const gray = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) {
        gray[i] = Math.round(
          0.299 * data[i * 4] +
          0.587 * data[i * 4 + 1] +
          0.114 * data[i * 4 + 2]
        );
      }

      if (mode === "grayscale") {
        let minV = 255, maxV = 0;
        for (let i = 0; i < gray.length; i++) {
          if (gray[i] < minV) minV = gray[i];
          if (gray[i] > maxV) maxV = gray[i];
        }
        const range = maxV - minV || 1;
        for (let i = 0; i < W * H; i++) {
          const v = Math.round(((gray[i] - minV) / range) * 255);
          data[i * 4]     = v;
          data[i * 4 + 1] = v;
          data[i * 4 + 2] = v;
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.95));
        return;
      }

      // Étape 2 : Seuillage adaptatif Bradley-Roth
      const S = Math.round(Math.min(W, H) / 16);
      const T = 0.15;

      // Image intégrale
      const integral = new Float64Array((W + 1) * (H + 1));
      for (let y = 1; y <= H; y++) {
        for (let x = 1; x <= W; x++) {
          integral[y * (W + 1) + x] =
            gray[(y - 1) * W + (x - 1)] +
            integral[(y - 1) * (W + 1) + x] +
            integral[y * (W + 1) + (x - 1)] -
            integral[(y - 1) * (W + 1) + (x - 1)];
        }
      }

      const result = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const x1 = Math.max(0, x - S);
          const y1 = Math.max(0, y - S);
          const x2 = Math.min(W - 1, x + S);
          const y2 = Math.min(H - 1, y + S);
          const count = (x2 - x1) * (y2 - y1);
          const sum =
            integral[(y2 + 1) * (W + 1) + (x2 + 1)] -
            integral[y1 * (W + 1) + (x2 + 1)] -
            integral[(y2 + 1) * (W + 1) + x1] +
            integral[y1 * (W + 1) + x1];
          const mean = sum / count;
          result[y * W + x] = gray[y * W + x] < mean * (1 - T) ? 0 : 255;
        }
      }

      // Étape 3 : Suppression du bruit isolé
      const cleaned = new Uint8Array(result);
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          if (result[y * W + x] === 0) {
            let whiteNeighbors = 0;
            if (result[(y - 1) * W + x] === 255) whiteNeighbors++;
            if (result[(y + 1) * W + x] === 255) whiteNeighbors++;
            if (result[y * W + (x - 1)] === 255) whiteNeighbors++;
            if (result[y * W + (x + 1)] === 255) whiteNeighbors++;
            if (whiteNeighbors === 4) cleaned[y * W + x] = 255;
          }
        }
      }

      // Étape 4 : Écriture
      for (let i = 0; i < W * H; i++) {
        data[i * 4]     = cleaned[i];
        data[i * 4 + 1] = cleaned[i];
        data[i * 4 + 2] = cleaned[i];
        data[i * 4 + 3] = 255;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
