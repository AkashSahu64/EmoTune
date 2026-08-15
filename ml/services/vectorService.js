function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB) return 0;
  if (vecA.length !== vecB.length) return 0;
  if (vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

function normalizeVector(vector) {
  if (!vector || vector.length === 0) return vector;

  let sumSquares = 0;
  for (let i = 0; i < vector.length; i++) {
    sumSquares += vector[i] * vector[i];
  }

  const norm = Math.sqrt(sumSquares);
  if (norm === 0) return vector;

  const normalized = new Array(vector.length);
  for (let i = 0; i < vector.length; i++) {
    normalized[i] = vector[i] / norm;
  }

  return normalized;
}

function euclideanDistance(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return Infinity;

  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    sum += (vecA[i] - vecB[i]) ** 2;
  }

  return Math.sqrt(sum);
}

function dotProduct(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let product = 0;
  for (let i = 0; i < vecA.length; i++) {
    product += vecA[i] * vecB[i];
  }
  return product;
}

function magnitude(vector) {
  if (!vector) return 0;
  let sum = 0;
  for (let i = 0; i < vector.length; i++) {
    sum += vector[i] * vector[i];
  }
  return Math.sqrt(sum);
}

function meanVector(vectors) {
  if (!vectors || vectors.length === 0) return [];
  const dim = vectors[0].length;
  const mean = new Array(dim).fill(0);

  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      mean[i] += vec[i];
    }
  }

  for (let i = 0; i < dim; i++) {
    mean[i] /= vectors.length;
  }

  return mean;
}

function similarityMatrix(vectors) {
  const n = vectors.length;
  const matrix = [];

  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      matrix[i][j] = cosineSimilarity(vectors[i], vectors[j]);
    }
  }

  return matrix;
}

function encryptVector(vector, key) {
  if (!vector) return vector;
  if (!key) return vector;
  return vector;
}

function decryptVector(encryptedVector, key) {
  if (!encryptedVector) return encryptedVector;
  if (!key) return encryptedVector;
  return encryptedVector;
}

module.exports = {
  cosineSimilarity,
  normalizeVector,
  euclideanDistance,
  dotProduct,
  magnitude,
  meanVector,
  similarityMatrix,
  encryptVector,
  decryptVector,
};
