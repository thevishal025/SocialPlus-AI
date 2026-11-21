import pytest
from app.integrations.youtube import youtube_adapter

def test_youtube_url_validation():
    # Standard watch URL
    assert youtube_adapter.validate_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    # Mobile youtu.be link
    assert youtube_adapter.validate_url("https://youtu.be/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    # Shorts URL
    assert youtube_adapter.validate_url("https://www.youtube.com/shorts/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    # Direct 11-char ID
    assert youtube_adapter.validate_url("dQw4w9WgXcQ") == "dQw4w9WgXcQ"

def test_youtube_invalid_url():
    with pytest.raises(ValueError):
        youtube_adapter.validate_url("https://google.com")
    with pytest.raises(ValueError):
        youtube_adapter.validate_url("")

def test_youtube_comment_limit_presets():
    from app.schemas.analysis import YouTubeAnalyzeRequest
    req_1 = YouTubeAnalyzeRequest(url="https://www.youtube.com/watch?v=dQw4w9WgXcQ", max_comments=1)
    assert req_1.max_comments == 1

    req_5k = YouTubeAnalyzeRequest(url="https://www.youtube.com/watch?v=dQw4w9WgXcQ", max_comments=5000)
    assert req_5k.max_comments == 5000

    req_10k = YouTubeAnalyzeRequest(url="https://www.youtube.com/watch?v=dQw4w9WgXcQ", max_comments=10000)
    assert req_10k.max_comments == 10000

    req_inf = YouTubeAnalyzeRequest(url="https://www.youtube.com/watch?v=dQw4w9WgXcQ", max_comments=50000)
    assert req_inf.max_comments == 50000


