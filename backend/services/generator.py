import asyncio
import logging
from sqlmodel import Session, select
from database import engine
from models import Job, Thumbnail
from services.openai_service import generate_thumbnail
from services.imagekit_service import upload_file

logger = logging.getLogger(__name__)

STYLES = {
    "bold_dramatic": (
    "Create a bold, dramatic YouTube thumbnail with high contrast, "
    "cinematic lighting, dark moody background, and powerful composition. "
    "\n\nThe person's face should be prominent with a dramatic expression."
),
"clean_minimal": (
    "Create a clean, minimal YouTube thumbnail with bright lighting, "
    "white/light background, modern professional aesthetic, plenty of "
    "whitespace, and sharp clean composition. The person should look "
    "approachable and professional."
),
"vibrant_energetic": (
    "Create a vibrant, energetic YouTube thumbnail with colorful gradients, "
    "dynamic angles, eye-catching pop-art style colors, and energetic "
    "composition. The person should have an excited or engaging expression."
),
}

STYLE_ORDER = [ "bold_dramatic", "clean_minimal", "vibrant_energetic"]

async def generate_single_thumbnail(thumbnail_id:str , prompt : str , headshot_url :str):
    #DB ko call krna h aur generating mark krna h 
    with Session(engine) as session:
        thumb = session.get(Thumbnail,thumbnail_id)
        thumb.status = "generating"
        style_name = thumb.style_name
        session.add(thumb)
        session.commit()

    style_prompt = STYLES[style_name]

    # now calll the AI
    try :
        image_byte = await generate_thumbnail(prompt,style_prompt,headshot_url)
        with Session(engine) as session:
            thumb = session.get(Thumbnail,thumbnail_id)
            job_id = thumb.job_id
    #ab image upload kro
        url = upload_file(
            file_bytes = image_byte,
            file_name = f"{thumbnail_id}.png", folder_path = f"thumbnail/{job_id}/") 
    #ab db me image ki url update krdo 
        with Session(engine) as session:
            thumb = session.get(Thumbnail,thumbnail_id)
            thumb.imagekit_url = url 
            thumb.status = "uploaded"
            session.add(thumb)
            session.commit()
            logger.info(f"Thumbnail {thumbnail_id} generated and uploaded successfully")
        
    except Exception as e :
        logger.error(f"Error generating the thumbnail {thumbnail_id}: {e}")
        with Session(engine) as session:
            thumb = session.get(Thumbnail,thumbnail_id)
            thumb.status = "error"
            thumb.error_message = str(e)[:500]
            session.add(thumb)
            session.commit()

async def process_job(job_id :str):
    #make job processing 
    with Session(engine) as session:
        job = session.get(Job,job_id)
        job.status = "processing"
        prompt = job.prompt
        headshot_url = job.headshot_url
        session.add(job)
        session.commit()

    #saari thumbnails ko dhoondo is job ke 
        thumbnails = session.exec(select(Thumbnail).where(Thumbnail.job_id == job_id)).all()
        thumbnails_ids = [t.id for t in thumbnails]

    #start one worker for each thumbnail 
        tasks = [
            generate_single_thumbnail(tid , prompt , headshot_url)
            for tid in thumbnails_ids
        ]
    #finish hone ka wait kro 
        await asyncio.gather(*tasks , return_exceptions=True)
    
    #job ko mark karo failed ya compleleted 
        with Session(engine) as session :
            thumbnails = session.exec(select(Thumbnail).where(Thumbnail.job_id == job_id)).all()
