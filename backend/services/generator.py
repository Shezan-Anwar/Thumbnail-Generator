import asyncio
import logging
import httpx  
from sqlmodel import Session, select
from database import engine
from models import Job, Thumbnail
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

STYLE_ORDER = ["bold_dramatic", "clean_minimal", "vibrant_energetic"]

async def generate_single_thumbnail(thumbnail_id: str, prompt: str, headshot_url: str):
    # 1. Open Session and mark as generating
    with Session(engine) as session:
        thumb = session.get(Thumbnail, thumbnail_id)
        if not thumb:
            return
        thumb.status = "generating"
        style_name = thumb.style_name
        session.add(thumb)
        session.commit()

    style_prompt = STYLES[style_name]

    try:
        # Construct the Pollinations link string
        combined_prompt = f"{prompt}, {style_prompt}, face from context image {headshot_url}"
        # Sanitize prompt spaces and punctuation so it forms a legal URL path string
        clean_url_prompt = combined_prompt.replace(" ", "_").replace('"', "").replace("'", "")
        pollinations_url = f"https://image.pollinations.ai/p/{clean_url_prompt}?width=1280&height=720&model=flux&nologo=true"

        # 3. Asynchronously fetch the image binary bytes from Pollinations AI over the web
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(pollinations_url)
            if response.status_code != 200:
                raise Exception(f"Pollinations AI connection error: {response.status_code}")
            image_byte = response.content

        # 4. Pull the tracking structural info out of DB
        with Session(engine) as session:
            thumb = session.get(Thumbnail, thumbnail_id)
            job_id = thumb.job_id

        # 5. Send raw image buffer stream directly to ImageKit cloud account
        url_dict = upload_file(
            file_bytes=image_byte,
            file_name=f"{thumbnail_id}.png", 
            folder_path=f"thumbnail/{job_id}/"
        ) 
        
        # Pull the absolute web link string out of the dictionary result object
        uploaded_url = url_dict["url"] if isinstance(url_dict, dict) else url_dict

        # 6. Synchronize variables back to SQLite file (Changed field target to image_url)
        with Session(engine) as session:
            thumb = session.get(Thumbnail, thumbnail_id)
            thumb.imagekit_url = uploaded_url  
            thumb.status = "uploaded"
            session.add(thumb)
            session.commit()
            logger.info(f"Thumbnail {thumbnail_id} generated and uploaded successfully")
        
    except Exception as e:
        logger.error(f"Error generating the thumbnail {thumbnail_id}: {e}")
        with Session(engine) as session:
            thumb = session.get(Thumbnail, thumbnail_id)
            if thumb:
                thumb.status = "failed"  # Fixed typo: changed "error" status string to match "failed" condition loops
                thumb.error_message = str(e)[:500]
                session.add(thumb)
                session.commit()

async def process_job(job_id: str):
    # Mark job as active processing layout phase
    with Session(engine) as session:
        job = session.get(Job, job_id)
        if not job:
            return
        job.status = "processing"
        prompt = job.prompt
        headshot_url = job.headshot_url
        session.add(job)
        session.commit()

        # Gather every single variant targeting this specific parent entry
        thumbnails = session.exec(select(Thumbnail).where(Thumbnail.job_id == job_id)).all()
        thumbnails_ids = [t.id for t in thumbnails]

        # Pack tasks arrays cleanly to process variations in parallel
        tasks = [
            generate_single_thumbnail(tid, prompt, headshot_url)
            for tid in thumbnails_ids
        ]
        
        await asyncio.gather(*tasks, return_exceptions=True)
    
    # Mark the total task summary phase state as failed or complete
    with Session(engine) as session:
        thumbnails = session.exec(select(Thumbnail).where(Thumbnail.job_id == job_id)).all()
        all_failed = all(t.status == "failed" for t in thumbnails)
        job = session.get(Job, job_id)
        if job:
            job.status = "failed" if all_failed else "completed"
            session.add(job)
            session.commit()