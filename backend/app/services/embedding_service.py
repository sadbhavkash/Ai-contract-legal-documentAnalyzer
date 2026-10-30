from sentence_transformers import SentenceTransformer


# ---------------------------------------------------------
# Load model once
# ---------------------------------------------------------

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

model = SentenceTransformer(MODEL_NAME)


# ---------------------------------------------------------
# Generate embeddings
# ---------------------------------------------------------

def generate_embedding(text: str) -> list[float]:
    """
    Generate an embedding for a single piece of text.
    """

    embedding = model.encode(
        text,
        convert_to_numpy=True,
    )

    return embedding.tolist()


def generate_embeddings(
    texts: list[str],
) -> list[list[float]]:
    """
    Generate embeddings for multiple text chunks.
    """

    embeddings = model.encode(
        texts,
        convert_to_numpy=True,
    )

    return embeddings.tolist()