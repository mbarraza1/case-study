"""
Catalog / retrieval layer (the "RAG" backbone).

Loads the scraped parts.json + models.json and exposes the four data operations
the agent's tools need: lookup, search, compatibility, and symptom-based
troubleshooting. Retrieval here is deterministic keyword/field scoring — fast,
explainable, and grounded (the agent can only return parts that exist).

This module is the single seam between "where the data lives" and the rest of the
app. Swapping the JSON for Postgres + pgvector (or a live PartSelect feed) means
re-implementing only the functions below; tools.py and agent.py never change.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Optional

DATA_DIR = Path(__file__).resolve().parent / "data"

_WORD_RE = re.compile(r"[a-z0-9]+")
# Common words that shouldn't drive retrieval.
_STOP = {
    "the", "a", "an", "is", "are", "my", "for", "to", "of", "and", "with", "on",
    "in", "it", "this", "that", "i", "how", "do", "can", "you", "me", "part",
    "parts", "number", "fix", "fixing", "replace", "replacement", "need", "want",
    "compatible", "compatibility", "work", "works", "model", "appliance",
}


def _norm_model(s: str) -> str:
    """Normalize a model number for comparison (drop spaces, dashes, case)."""
    return re.sub(r"[^A-Z0-9]", "", (s or "").upper())


def _tokens(text: str) -> list[str]:
    return [t for t in _WORD_RE.findall((text or "").lower()) if t not in _STOP and len(t) > 1]


class Catalog:
    def __init__(self, data_dir: Path = DATA_DIR):
        self.data_dir = data_dir
        self.parts: dict[str, dict] = {}
        self.models: dict[str, dict] = {}
        self._part_model_set: dict[str, set[str]] = {}
        self.load()

    # ---- loading ----------------------------------------------------------- #
    def load(self) -> None:
        parts_file = self.data_dir / "parts.json"
        models_file = self.data_dir / "models.json"
        parts = json.loads(parts_file.read_text()) if parts_file.exists() else []
        models = json.loads(models_file.read_text()) if models_file.exists() else {}

        self.parts = {p["partNumber"].upper(): p for p in parts}
        self.models = {k.upper(): v for k, v in models.items()}
        # Precompute each part's normalized compatible-model set for O(1) checks.
        self._part_model_set = {
            ps: {_norm_model(m) for m in p.get("compatibleModels", [])}
            for ps, p in self.parts.items()
        }
        # Fold model-page memberships in too (a model lists parts; mirror that
        # onto the part so compatibility holds from either direction).
        for model_key, info in self.models.items():
            for ps in info.get("parts", []):
                s = self._part_model_set.setdefault(ps.upper(), set())
                s.add(_norm_model(model_key))

    @property
    def loaded(self) -> bool:
        return bool(self.parts)

    def stats(self) -> dict:
        by_type: dict[str, int] = {}
        for p in self.parts.values():
            by_type[p.get("applianceType") or "Unknown"] = by_type.get(p.get("applianceType") or "Unknown", 0) + 1
        enriched = sum(1 for p in self.parts.values() if p.get("enriched"))
        return {
            "parts": len(self.parts),
            "enriched": enriched,
            "models": len(self.models),
            "byApplianceType": by_type,
        }

    # ---- lookups ----------------------------------------------------------- #
    def get_part(self, part_number: str) -> Optional[dict]:
        if not part_number:
            return None
        return self.parts.get(part_number.strip().upper())

    def get_model(self, model_number: str) -> Optional[dict]:
        if not model_number:
            return None
        # exact, then normalized match
        m = self.models.get(model_number.strip().upper())
        if m:
            return m
        target = _norm_model(model_number)
        for key, info in self.models.items():
            if _norm_model(key) == target:
                return info
        return None

    # ---- search (keyword retrieval) --------------------------------------- #
    def search(self, query: str, appliance_type: Optional[str] = None,
               brand: Optional[str] = None, limit: int = 6) -> list[dict]:
        q = (query or "").strip()
        # Direct PS / MPN hit short-circuits ranking.
        direct = self.get_part(q)
        if direct:
            return [direct]
        ps_match = re.search(r"PS\d{4,}", q.upper())
        if ps_match and self.get_part(ps_match.group(0)):
            return [self.get_part(ps_match.group(0))]

        qtokens = _tokens(q)
        results: list[tuple[float, dict]] = []
        for p in self.parts.values():
            if appliance_type and (p.get("applianceType") or "").lower() != appliance_type.lower():
                continue
            if brand and (p.get("brand") or "").lower() != brand.lower():
                continue
            score = self._score(p, qtokens, q)
            if score > 0:
                results.append((score, p))
        results.sort(key=lambda x: (-x[0], -(x[1].get("reviewCount") or 0)))
        return [p for _, p in results[:limit]]

    def _score(self, part: dict, qtokens: list[str], raw_query: str) -> float:
        if not qtokens:
            return 0.0
        name_t = set(_tokens(part.get("name", "")))
        type_t = set(_tokens(part.get("partType", "")))
        sym_t = set(_tokens(" ".join(part.get("symptoms", []))))
        desc_t = set(_tokens(part.get("description", "")))
        brand_t = set(_tokens(part.get("brand", "")))
        score = 0.0
        for t in qtokens:
            if t in name_t:
                score += 3.0
            if t in type_t:
                score += 2.5
            if t in sym_t:
                score += 2.0
            if t in brand_t:
                score += 1.5
            if t in desc_t:
                score += 0.75
        # Only parts with an actual keyword match are results. The in-stock /
        # review boosts merely break ties — they must NOT lift a zero-match part
        # above the threshold, or search would return the whole catalog.
        if score <= 0:
            return 0.0
        if part.get("inStock"):
            score += 0.25
        if part.get("reviewCount"):
            score += min(part["reviewCount"], 500) / 1000.0
        return score

    # ---- compatibility ----------------------------------------------------- #
    def check_compatibility(self, part_number: str, model_number: str) -> dict:
        part = self.get_part(part_number)
        model_info = self.get_model(model_number)
        norm_model = _norm_model(model_number)
        result = {
            "partNumber": (part_number or "").strip().upper(),
            "modelNumber": (model_number or "").strip().upper(),
            "compatible": None,          # True / False / None(unknown)
            "confidence": "unknown",     # high | medium | unknown
            "reason": "",
            "part": _card(part) if part else None,
            "modelKnown": model_info is not None,
            "modelBrand": model_info.get("brand") if model_info else None,
            "modelApplianceType": model_info.get("applianceType") if model_info else None,
        }
        if not part:
            result["reason"] = (f"I couldn't find part {result['partNumber']} in the "
                                f"Refrigerator/Dishwasher catalog.")
            return result

        compat_set = self._part_model_set.get(part["partNumber"].upper(), set())
        # 1. Direct positive: the part's data lists this model.
        if norm_model and norm_model in compat_set:
            result.update(compatible=True, confidence="high",
                          reason=f"Yes — {part['partNumber']} is confirmed compatible with model "
                                 f"{result['modelNumber']}.")
            return result
        # 2. Model is known and is for a different appliance type -> definitely not.
        if model_info and model_info.get("applianceType") and part.get("applianceType") \
                and model_info["applianceType"].lower() != part["applianceType"].lower():
            result.update(
                compatible=False, confidence="high",
                reason=(f"No — {part['partNumber']} is a {part['applianceType'].lower()} part, but "
                        f"{result['modelNumber']} is a {model_info['applianceType'].lower()} "
                        f"({model_info.get('brand') or 'unknown brand'}). They aren't compatible."))
            return result
        # 3. Model known (same appliance) but not in this part's fit list.
        if model_info:
            result.update(
                compatible=False, confidence="medium",
                reason=(f"I don't have {result['modelNumber']} listed among the models "
                        f"{part['partNumber']} fits. It's likely not compatible, but please "
                        f"verify against the model's full part list before ordering."))
            return result
        # 4. We don't know the model at all.
        result.update(
            compatible=None, confidence="unknown",
            reason=(f"I don't have model {result['modelNumber']} in my data, so I can't confirm "
                    f"compatibility. You can check the part's model cross-reference on its "
                    f"PartSelect page, or share the symptom you're trying to fix and I'll suggest "
                    f"the right part."))
        return result

    # ---- parts for a model ------------------------------------------------- #
    def parts_for_model(self, model_number: str, limit: int = 8) -> list[dict]:
        info = self.get_model(model_number)
        if not info:
            return []
        out = []
        for ps in info.get("parts", []):
            p = self.get_part(ps)
            if p:
                out.append(p)
        out.sort(key=lambda p: -(p.get("reviewCount") or 0))
        return out[:limit]

    # ---- troubleshooting --------------------------------------------------- #
    def troubleshoot(self, appliance_type: str, symptom: str,
                     brand: Optional[str] = None, limit: int = 6) -> list[dict]:
        stoks = _tokens(symptom)
        results: list[tuple[float, dict]] = []
        for p in self.parts.values():
            if appliance_type and (p.get("applianceType") or "").lower() != appliance_type.lower():
                continue
            if brand and (p.get("brand") or "").lower() != brand.lower():
                continue
            sym_t = set(_tokens(" ".join(p.get("symptoms", []))))
            type_t = set(_tokens(p.get("partType", "")))
            name_t = set(_tokens(p.get("name", "")))
            score = 0.0
            for t in stoks:
                if t in sym_t:
                    score += 3.0
                if t in type_t:
                    score += 1.5
                if t in name_t:
                    score += 1.0
            if score > 0:
                # prefer parts that actually carry symptom metadata + reviews
                score += min(p.get("reviewCount") or 0, 500) / 1000.0
                results.append((score, p))
        results.sort(key=lambda x: -x[0])
        return [p for _, p in results[:limit]]


# ---- presentation helpers (shared with tools.py) --------------------------- #
def _card(part: Optional[dict]) -> Optional[dict]:
    """Compact, display-ready subset of a part for the chat UI cards."""
    if not part:
        return None
    # Images are served as static files from the Next.js frontend (public/parts/).
    # Parts without a cached image have imageUrl=None; the frontend shows an SVG fallback.
    image_url = part.get("imageUrl")
    return {
        "partNumber": part.get("partNumber"),
        "mpn": part.get("mpn"),
        "name": part.get("name"),
        "brand": part.get("brand"),
        "applianceType": part.get("applianceType"),
        "partType": part.get("partType"),
        "price": part.get("price"),
        "currency": part.get("currency", "USD"),
        "inStock": part.get("inStock"),
        "rating": part.get("rating"),
        "reviewCount": part.get("reviewCount"),
        "difficulty": part.get("difficulty"),
        "installTime": part.get("installTime"),
        "installVideoUrl": part.get("installVideoUrl"),
        "hasVideo": bool(part.get("installVideoUrl")),
        "url": part.get("url"),
        "imageUrl": image_url,
    }


# Singleton used by the app.
catalog = Catalog()
