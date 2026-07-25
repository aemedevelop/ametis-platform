"""
Módulo: config.py

Responsabilidad:
- Centralizar la configuración del servicio RAG.
- Definir tenant, agente, knowledge base y proveedor de modelos.
- Mantener la arquitectura preparada para multi-tenant seguro.

Estrategia AMETIS v1:
- Una colección Qdrant por tenant.
- Filtros internos por agent_id y knowledge_base_id.
"""

import os


# =========================
# Infraestructura on-premise
# =========================

OLLAMA_URL = os.getenv(
    "OLLAMA_URL",
    "http://ametis_ollama:11434"
)

QDRANT_URL = os.getenv(
    "QDRANT_URL",
    "http://ametis_qdrant:6333"
)


# =========================
# Multi-tenant
# =========================

TENANT_ID = os.getenv(
    "TENANT_ID",
    "cliente_demo"
)

AGENT_ID = os.getenv(
    "AGENT_ID",
    "support_agent"
)

KNOWLEDGE_BASE_ID = os.getenv(
    "KNOWLEDGE_BASE_ID",
    "kb_general"
)


# =========================
# Colección Qdrant por tenant
# =========================

QDRANT_COLLECTION = os.getenv(
    "QDRANT_COLLECTION",
    f"tenant_{TENANT_ID}_knowledge"
)


# =========================
# Embeddings locales
# =========================

EMBEDDING_MODEL = os.getenv(
    "EMBEDDING_MODEL",
    "nomic-embed-text"
)


# =========================
# Generación LLM
# =========================

LLM_PROVIDER = os.getenv(
    "LLM_PROVIDER",
    "ollama"
)

LOCAL_CHAT_MODEL = os.getenv(
    "LOCAL_CHAT_MODEL",
    "qwen2.5:7b"
)


# =========================
# Parámetros RAG
# =========================

TOP_K = int(
    os.getenv("TOP_K", "2")
)

MIN_SCORE = float(
    os.getenv("MIN_SCORE", "0.60")
)

MAX_CHUNK_CHARS = int(
    os.getenv("MAX_CHUNK_CHARS", "1000")
)

LLM_TIMEOUT = int(
    os.getenv("LLM_TIMEOUT", "180")
)

# =========================
# Gemini LLM Provider
# =========================

GEMINI_API_BASE = os.getenv(
    "GEMINI_API_BASE",
    "https://generativelanguage.googleapis.com/v1beta"
)

GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY",
    ""
)

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-2.5-flash"
)
