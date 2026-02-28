from fastapi import APIRouter, File, UploadFile, HTTPException
import tempfile
import os
from groq import Groq
from app.services.groq_client import groq_rotator
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/voice",
    tags=["voice"]
)

@router.post("/transcribe")
async def transcribe_voice(file: UploadFile = File(...)):
    """Transcribe an uploaded audio file using Groq Whisper."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No audio file uploaded.")
    
    # We must ensure we have a Groq key (Whisper is on Groq)
    # If the current rotator key is gemini, let's try to find a groq key.
    groq_key = None
    if groq_rotator.current_provider == "groq":
        groq_key = groq_rotator.current_key
    else:
        # scan for a groq key
        for p, k in groq_rotator._keys:
            if p == "groq":
                groq_key = k
                break
                
    if not groq_key:
        raise HTTPException(status_code=500, detail="No Groq API key available for Whisper transcription.")

    client = Groq(api_key=groq_key)
    
    # Save uploaded file to a temporary file
    # Whisper needs a file-like object with a name it recognizes (e.g., .mp4, .webm, .wav)
    _, ext = os.path.splitext(file.filename)
    if not ext:
        ext = ".webm" # default if missing
        
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_audio:
            temp_file_path = temp_audio.name
            
        content = await file.read()
        with open(temp_file_path, 'wb') as out_file:
            out_file.write(content)
                
        # Send to Groq Whisper
        with open(temp_file_path, "rb") as file_to_transcribe:
            transcription = client.audio.transcriptions.create(
                file=(os.path.basename(temp_file_path), file_to_transcribe),
                model="whisper-large-v3",
                response_format="json",
                language="en", 
            )
            
        return {"text": transcription.text.strip()}
        
    except Exception as e:
        logger.exception("Error transcribing voice: %s", e)
        raise HTTPException(status_code=500, detail="Failed to transcribe audio.")
        
    finally:
        # Cleanup temp file
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as cleanup_err:
                logger.warning("Failed to clean up temp audio %s: %s", temp_file_path, cleanup_err)
