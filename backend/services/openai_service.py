import base64
from openai import AsyncOpenAI
from config import OPENAI_API_KEY

client =  AsyncOpenAI(api_key=OPENAI_API_KEY)
async def generate_thumbnail(prompt:str, style_prompt : str , headshot_url : str ) -> bytes:
    
    full_prompt = (
        f"{style_prompt}]\n\n"
        f"User request : {prompt}\n\n"
    )

    response = await client.responses.create(
        model= "gpt-4o",
        input=[
            {"role":"user",
             "content" : [
                 {"type": "input image", "url": headshot_url},
                 {"type":"text","text":full_prompt}
             ] 
            }
        ],
        tools=[
                {
                    "type":"image_generation",
                    "model":"gpt-image-2",
                    "size":"1536x1024",
                    "quality":"high",
                    "output_format":"png"
                }
            ],

    )
    for item in response.output:
        if item.type == "image_generation_call" and item.result:
            return base64.b64decode(item.result)
        
    raise RuntimeError("No image generation resultforund in the response")    