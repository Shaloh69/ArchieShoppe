"""
API routes for UniThrift item verification.

Endpoints:
    POST /verify           - Compare placement image vs return image
    POST /extract-features - Pre-extract features from a listing image
    GET  /health           - Service health check
"""

import logging
import os
import tempfile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..comparison.hybrid import HybridVerifier
from ..config import settings
from ..models.schemas import (
    FeatureExtractionResponse,
    HealthResponse,
    StorableFeatures,
    VerificationResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()

verifier = HybridVerifier()


async def _save_upload(file: UploadFile) -> str:
    """Save a single uploaded file to temp dir and return the path."""
    os.makedirs(settings.upload_dir, exist_ok=True)
    content = await file.read()
    suffix = os.path.splitext(file.filename or "image.jpg")[1] or ".jpg"
    tmp = tempfile.NamedTemporaryFile(dir=settings.upload_dir, suffix=suffix, delete=False)
    tmp.write(content)
    tmp.close()
    return tmp.name


def _cleanup(paths: list[str]):
    for p in paths:
        try:
            os.unlink(p)
        except OSError:
            pass


@router.post("/verify", response_model=VerificationResponse)
async def verify_item(
    reference_image: UploadFile = File(..., description="Placement/listing image (reference)"),
    return_image: UploadFile = File(..., description="Return capture from kiosk camera"),
    attempt_number: int = Form(default=1, ge=1, le=10),
):
    """
    Compare a placement image against the return capture.

    Decision thresholds:
    - >= 85%: APPROVED
    - 60-84%: PENDING (admin manual review)
    - < 60%:  RETRY or REJECTED
    """
    ref_path = ""
    ret_path = ""
    try:
        ref_path = await _save_upload(reference_image)
        ret_path = await _save_upload(return_image)

        result = verifier.verify(
            original_sources=[ref_path],
            kiosk_sources=[ret_path],
            attempt_number=attempt_number,
        )
        return VerificationResponse(**result)
    except Exception as e:
        logger.exception("Verification failed")
        raise HTTPException(status_code=500, detail=f"Verification error: {e}") from e
    finally:
        _cleanup([ref_path, ret_path])


@router.post("/extract-features", response_model=FeatureExtractionResponse)
async def extract_features(
    file: UploadFile = File(..., description="Item image to extract features from"),
):
    """
    Pre-extract features from a listing image.
    Store the result in Item.extractedFeatures for faster verification later.
    """
    path = ""
    try:
        path = await _save_upload(file)
        features = verifier.extract_reference_features([path])
        return FeatureExtractionResponse(
            image_count=features["image_count"],
            traditional_features_count=len(features["traditional"]),
            deep_features_count=len(features["deep"]),
            ocr_texts=features["ocr_texts"],
            features=StorableFeatures(
                traditional=features["traditional"],
                deep=features["deep"],
                ocr_texts=features["ocr_texts"],
                image_count=features["image_count"],
            ),
        )
    except Exception as e:
        logger.exception("Feature extraction failed")
        raise HTTPException(status_code=500, detail=f"Extraction error: {e}") from e
    finally:
        _cleanup([path])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        service=settings.app_name,
        deep_learning_enabled=settings.enable_deep_learning,
        ocr_enabled=settings.enable_ocr,
    )
