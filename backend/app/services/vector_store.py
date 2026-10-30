import json
from pathlib import Path

import faiss
import numpy as np


# =========================================================
# Configuration
# =========================================================

VECTOR_STORE_DIR = Path("vector_store")

VECTOR_STORE_DIR.mkdir(
    exist_ok=True
)


# =========================================================
# Save FAISS index
# =========================================================

def save_index(
    index: faiss.Index,
    document_id: int,
) -> None:
    """
    Save a FAISS index for a document.
    """

    index_path = (
        VECTOR_STORE_DIR
        / f"document_{document_id}.index"
    )

    faiss.write_index(
        index,
        str(index_path),
    )


# =========================================================
# Load FAISS index
# =========================================================

def load_index(
    document_id: int,
) -> faiss.Index:
    """
    Load a FAISS index for a document.
    """

    index_path = (
        VECTOR_STORE_DIR
        / f"document_{document_id}.index"
    )

    if not index_path.exists():
        raise FileNotFoundError(
            f"No FAISS index found for document {document_id}"
        )

    return faiss.read_index(
        str(index_path)
    )


# =========================================================
# Create index
# =========================================================

def create_index(
    embeddings: list[list[float]],
) -> faiss.Index:
    """
    Create a FAISS index from embeddings.
    """

    if not embeddings:
        raise ValueError(
            "No embeddings provided"
        )

    vectors = np.array(
        embeddings,
        dtype="float32",
    )

    dimension = vectors.shape[1]

    index = faiss.IndexFlatL2(
        dimension
    )

    index.add(vectors)

    return index

# =========================================================
# Search FAISS index
# =========================================================

def search_index(
    index: faiss.Index,
    query_embedding: list[float],
    top_k: int = 3,
) -> list[tuple[int, float]]:
    """
    Search the FAISS index.

    Returns:
        List of tuples containing:
        (chunk position, distance)
    """

    query_vector = np.array(
        [query_embedding],
        dtype="float32",
    )

    # Do not request more results than
    # the index actually contains.
    top_k = min(
        top_k,
        index.ntotal,
    )

    distances, indices = index.search(
        query_vector,
        top_k,
    )

    results = []

    for index_position, distance in zip(
        indices[0],
        distances[0],
    ):
        if index_position == -1:
            continue

        results.append(
            (
                int(index_position),
                float(distance),
            )
        )

    return results