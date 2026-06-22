from imagekitio import ImageKit
from config import IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT

# Stable client constructor configuration hook
imagekit = ImageKit(private_key=IMAGEKIT_PRIVATE_KEY)

def upload_file(file_bytes: bytes, file_name: str, folder: str = "/", *args, **kwargs) -> str:
    """
    Accepts raw binary blocks from both files flawlessly and packs them into a 
    valid tuple object wrapper to satisfy ImageKit SDK parameter validation constraints.
    """
    try:
        # 1. Dynamically parse content_type depending on which file called it
        content_type = "image/png"
        if args:
            content_type = args[0]  
        elif "content_type" in kwargs:
            content_type = kwargs["content_type"]

        # 2. Format file into the specific payload tuple structure required by your SDK version:
        # Structure format layout: (file_name, file_bytes, content_type)
        file_payload_tuple = (file_name, file_bytes, content_type)

        # 3. Ship directly to your cloud storage dashboard workspace using flat parameters
        result = imagekit.files.upload(
            file=file_payload_tuple,            # ✨ Fixed: Passed as a valid file tuple format
            file_name=file_name,
            folder=folder,                      
            use_unique_file_name=True,          
            is_private_file=False               
        )

        # 4. Extract target landing destination URL link string out safely
        if hasattr(result, "url") and result.url:
            return result.url
        elif isinstance(result, dict) and "url" in result:
            return result["url"]
            
        return getattr(result, "response_metadata", {}).get("raw", {}).get("url", "")

    except Exception as e:
        print(f"Internal ImageKit Upload Error Exception Context: {e}")
        raise e

def get_variants(base_url: str) -> dict:
    """Returns 3 variant sizes URLs using your workspace endpoint configuration context."""
    clean_base = base_url
    if base_url.startswith("/") and IMAGEKIT_URL_ENDPOINT:
        endpoint = IMAGEKIT_URL_ENDPOINT.rstrip("/")
        clean_base = f"{endpoint}/{base_url.lstrip('/')}"

    return {
        "youtube": f"{clean_base}?tr=w-1280,h-720,c-maintain_ratio,fo-auto",
        "shorts": f"{clean_base}?tr=w-1080,h-1920,c-maintain_ratio,fo-auto",
        "square": f"{clean_base}?tr=w-1080,h-1080,c-maintain_ratio,fo-auto",
    }