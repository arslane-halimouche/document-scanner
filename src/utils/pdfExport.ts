export async function exportAsPdf(
  dataUrl: string,
  filename: string
): Promise<void> {
  // @ts-ignore
  if (!window.jspdf) {
    await new Promise<void>((res, rej) => {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = () => res();
      script.onerror = () => rej(new Error("jsPDF load failed"));
      document.head.appendChild(script);
    });
  }

  // @ts-ignore
  const { jsPDF } = window.jspdf;

  const img = new Image();
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.src = dataUrl;
  });

  const imgW = img.width;
  const imgH = img.height;
  const orientation = imgW > imgH ? "landscape" : "portrait";
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

  const pageW = orientation === "portrait" ? 210 : 297;
  const pageH = orientation === "portrait" ? 297 : 210;

  const ratio = Math.min(pageW / imgW, pageH / imgH);
  const finalW = imgW * ratio;
  const finalH = imgH * ratio;
  const finalX = (pageW - finalW) / 2;
  const finalY = (pageH - finalH) / 2;

  const format = dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
  doc.addImage(dataUrl, format, finalX, finalY, finalW, finalH);
  doc.save(`${filename}.pdf`);
}

export function exportAsJpeg(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${filename}.jpg`;
  link.click();
}

export async function exportAsPng(
  dataUrl: string,
  filename: string
): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `${filename}.png`;
      link.click();
      resolve();
    };
    img.src = dataUrl;
  });
}
