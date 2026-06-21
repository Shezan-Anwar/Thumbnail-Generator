const API_BASE = "/api";

export async function uploadHeadshot(file) {
    const form = new FormData();
    form.append("file",file);
    const res = await fetch(`${API_BASE}/upload-headshot`,{
        method = "POST",
        body = form ,
    });
    if (!res.ok){
        throw new Error("Failed to upload headshot");
    }
    return res.json();
}