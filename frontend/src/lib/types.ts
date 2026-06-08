export interface Part {
  partNumber: string;
  mpn?: string;
  name: string;
  brand?: string;
  applianceType?: string;
  partType?: string;
  price?: number;
  currency?: string;
  inStock?: boolean;
  rating?: number;
  reviewCount?: number;
  difficulty?: string;
  installTime?: string;
  installVideoUrl?: string;
  hasVideo?: boolean;
  url?: string;
  imageUrl?: string;
  quantity?: number;
}

export interface CompatibilityResultData {
  partNumber: string | null;
  modelNumber: string;
  compatible: boolean | null;
  confidence: string;
  reason: string;
  part: Part | null;
  modelKnown?: boolean;
  modelBrand?: string | null;
  modelApplianceType?: string | null;
}

export interface InstallGuideData {
  partNumber: string;
  name: string;
  brand?: string;
  applianceType?: string;
  difficulty?: string;
  installTime?: string;
  videoUrl?: string;
  url?: string;
}

export interface CartSummary {
  itemCount: number;
  uniqueItems: number;
  total: number;
  items: { partNumber: string; name: string; price?: number; quantity: number }[];
}

export type Block =
  | { type: "products"; items: Part[] }
  | { type: "compatibility"; result: CompatibilityResultData }
  | { type: "install_guide"; guide: InstallGuideData }
  | { type: "cart_update"; cart: CartSummary }
  | { type: "cart"; items: Part[]; summary: CartSummary };

export interface ImageAttachment {
  data: string; // base64
  mediaType: string; // e.g. "image/jpeg"
  name: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  images?: ImageAttachment[];
  blocks: Block[];
  status: string | null;
  error?: boolean;
}
