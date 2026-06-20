import os
import logging

from fastapi import APIRouter , Depends , HTTPException , UploadFile , File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models import Thumbnail , Job

from services.generator import process_job,STYLE_ORDER
from services.imagekit_service import upload_file, get_variants

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

class CreateJobRequest(BaseModel):
    prompt : str
    num_thumbnails : int 
    headshot_url : str

class CreateJobResponse(BaseModel):
    job_id : str

class ThumbnailResponse(BaseModel):
    id : int
    style : str
    status : str
    imagekit_url : str |None = None
    error_message : str | None = None
    variants : dict | None = None

@router.post("/upload-headshot")
async def upload_headshot (file : UploadFile = File(...)):
    contents = await file.read()
    url = upload_file(
        file_bytes=contents,
        file_name=file.filename or "headshot.jpg",
        folder="/headshots",
        content_type=file.content_type or "image/png",
    )
    return{"url": url}

@router.post("/jobs",response_model= CreateJobResponse)
async def create_job(request: CreateJobRequest , session : Session = Depends
                     (get_session)):
    if request.num_thumbnails < 1 or request.num_thumbnails > 3:
        raise HTTPException(status_code=400 , detail="num thumbnails must be between 1 and 3")