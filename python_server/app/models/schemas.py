"""Pydantic schemas for UniThrift AI verification API."""

from pydantic import BaseModel, Field


class MethodScores(BaseModel):
    traditional_best: float = Field(description="Best traditional CV score across all image pairs")
    traditional_aggregated: float = Field(description="Aggregated traditional CV score (trimmed mean)")
    sift_best_match: float = Field(description="Best SIFT match ratio")
    sift_best_inlier: float = Field(description="Best SIFT RANSAC inlier ratio")
    sift_combined: float = Field(description="Combined SIFT score (70% inlier + 30% match)")
    ssim_aggregated: float = Field(description="Aggregated SSIM structural similarity")
    deep_learning_aggregated: float = Field(description="Aggregated deep learning similarity")
    phash_best: float = Field(description="Best perceptual hash similarity")


class OCRResult(BaseModel):
    match: bool = Field(description="Whether serial numbers matched")
    details: dict | None = Field(default=None, description="OCR match details")


class QualityIssue(BaseModel):
    image_index: int
    passed: bool
    blur_score: float
    brightness: float
    coverage_percent: float
    issues: list[str]


class VerificationResponse(BaseModel):
    verified: bool
    decision: str = Field(description="APPROVED, PENDING, RETRY, or REJECTED")
    message: str
    confidence: float = Field(description="Overall confidence score (0-100)")
    attempt_number: int
    method_scores: MethodScores
    ocr: OCRResult
    quality_issues: list[QualityIssue] = Field(default_factory=list)
    good_pair_count: int = Field(default=0)
    all_traditional_scores: list[float]
    sift_all_ratios: list[float]


class StorableFeatures(BaseModel):
    traditional: list = Field(description="Traditional CV feature dicts (one per image)")
    deep: list = Field(description="ResNet50 feature vectors serialized as float lists")
    ocr_texts: list[str]
    image_count: int


class FeatureExtractionResponse(BaseModel):
    image_count: int
    traditional_features_count: int
    deep_features_count: int
    ocr_texts: list[str]
    features: StorableFeatures


class HealthResponse(BaseModel):
    status: str
    service: str
    deep_learning_enabled: bool
    ocr_enabled: bool
