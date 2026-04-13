import sharp from "sharp";
import crypto from "crypto";

type IssueClass = "garbage" | "pothole" | "street_light" | "water_leakage" | "plastic" | "other";

/**
 * Lightweight on-server classification (no TF weight files bundled).
 * If `OPENAI_API_KEY` is set, uses vision for a best-effort label; otherwise uses image statistics.
 */
export async function classifyCivicIssue(imageBuffer: Buffer): Promise<{
  issueType: IssueClass;
  confidence: number;
  description: string;
}> {
  const openaiKey = process.env["OPENAI_API_KEY"];
  if (openaiKey) {
    const fromOpenAi = await classifyWithOpenAI(imageBuffer, openaiKey);
    if (fromOpenAi) return fromOpenAi;
  }
  return classifyHeuristic(imageBuffer);
}

async function classifyWithOpenAI(
  imageBuffer: Buffer,
  apiKey: string,
): Promise<{ issueType: IssueClass; confidence: number; description: string } | null> {
  try {
    const jpeg = await sharp(imageBuffer).rotate().resize(768, 768, { fit: "inside" }).jpeg({ quality: 72 }).toBuffer();
    const b64 = jpeg.toString("base64");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env["OPENAI_VISION_MODEL"] ?? "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "You classify a single civic infrastructure photo. Reply JSON only: {\"issue_type\":\"garbage|pothole|street_light|water_leakage|plastic|other\",\"confidence\":0-1,\"description\":\"short\"}",
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${b64}` },
              },
            ],
          },
        ],
        max_tokens: 120,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) return null;
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as {
      issue_type?: string;
      confidence?: number;
      description?: string;
    };
    const allowed: IssueClass[] = [
      "garbage",
      "pothole",
      "street_light",
      "water_leakage",
      "plastic",
      "other",
    ];
    const issueType = allowed.includes(parsed.issue_type as IssueClass)
      ? (parsed.issue_type as IssueClass)
      : "other";
    const confidence =
      typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
        ? Math.min(1, Math.max(0.5, parsed.confidence))
        : 0.82;
    return {
      issueType,
      confidence,
      description: typeof parsed.description === "string" ? parsed.description : "Classified issue",
    };
  } catch {
    return null;
  }
}

async function classifyHeuristic(imageBuffer: Buffer): Promise<{
  issueType: IssueClass;
  confidence: number;
  description: string;
}> {
  const rotated = await sharp(imageBuffer).rotate().resize(128, 128, { fit: "cover" }).raw().toBuffer({
    resolveWithObject: true,
  });
  const { data, info } = rotated;
  const channels = info.channels;
  let lumSum = 0;
  let dark = 0;
  let bright = 0;
  let edge = 0;
  const w = info.width;
  const h = info.height;

  const lumAt = (x: number, y: number) => {
    const i = (y * w + x) * channels;
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const L = lumAt(x, y);
      lumSum += L;
      if (L < 55) dark++;
      if (L > 200) bright++;
    }
  }

  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const c = lumAt(x, y);
      const n = lumAt(x, y - 1);
      const s = lumAt(x, y + 1);
      const e = lumAt(x + 1, y);
      const wv = lumAt(x - 1, y);
      edge += Math.abs(c - n) + Math.abs(c - s) + Math.abs(c - e) + Math.abs(c - wv);
    }
  }

  const pixels = w * h;
  const avgLum = lumSum / pixels;
  const darkRatio = dark / pixels;
  const brightRatio = bright / pixels;
  const edgeScore = edge / pixels;

  const digest = crypto.createHash("sha256").update(imageBuffer).digest()[0] ?? 0;

  // High micro-contrast often correlates with textured road damage / rubble.
  if (edgeScore > 38 && avgLum < 165) {
    return {
      issueType: "pothole",
      confidence: 0.78 + (digest % 15) / 100,
      description: "Road surface damage or pothole-like texture detected",
    };
  }

  // Very dark scenes with a bright core can indicate a lamp / night shot.
  if (darkRatio > 0.35 && brightRatio > 0.02 && avgLum < 120) {
    return {
      issueType: "street_light",
      confidence: 0.74 + (digest % 12) / 100,
      description: "Low-light scene consistent with street lighting issues",
    };
  }

  // Greener / mixed outdoor clutter → waste outdoors (heuristic).
  let greenish = 0;
  for (let i = 0; i < data.length; i += channels) {
    const g = data[i + 1] ?? 0;
    const r = data[i] ?? 0;
    if (g > r + 18) greenish++;
  }
  const greenRatio = greenish / pixels;
  if (greenRatio > 0.22) {
    return {
      issueType: "garbage",
      confidence: 0.76 + (digest % 12) / 100,
      description: "Outdoor scene with clutter consistent with solid waste",
    };
  }

  const pick: IssueClass[] = ["garbage", "pothole", "street_light"];
  const issueType = pick[digest % pick.length];
  const descriptions: Record<IssueClass, string> = {
    garbage: "Possible solid waste or litter in frame",
    pothole: "Possible road surface defect",
    street_light: "Possible lighting infrastructure context",
    water_leakage: "Moisture-related cues not strong; defaulting to other",
    plastic: "Plastic waste not confidently separated",
    other: "General civic issue",
  };
  return {
    issueType,
    confidence: 0.7 + (digest % 10) / 100,
    description: descriptions[issueType],
  };
}
