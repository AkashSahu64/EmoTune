const constants = require('../config/constants');

async function checkClaim(claimText) {
    const axios = require('axios');
  const sources = [];

  try {
    const apiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;
    if (apiKey) {
      const response = await axios.get(constants.ENDPOINTS.GOOGLE_FACT_CHECK, {
        params: {
          query: claimText,
          key: apiKey,
          languageCode: 'en',
          maxAgeDays: 365,
        },
        timeout: 5000,
      });

      if (response.data?.claims) {
        for (const claim of response.data.claims) {
          if (claim.claimReview) {
            for (const review of claim.claimReview) {
              let reliability = 0.5;
              const rating = (review.textualRating || '').toLowerCase();
              if (rating.includes('true') || rating.includes('correct') || rating.includes('accurate')) reliability = 0.8;
              else if (rating.includes('false') || rating.includes('incorrect') || rating.includes('misleading')) reliability = 0.3;
              else if (rating.includes('partly') || rating.includes('half')) reliability = 0.5;

              sources.push({
                url: review.url || '',
                title: review.title || review.publisher?.name || 'Fact check source',
                reliability,
                publisher: review.publisher?.name || 'Unknown',
                date: review.reviewDate || null,
              });
            }
          }
        }
      }
    }
  } catch (error) {
    if (error.code !== 'ENOTFOUND' && error.code !== 'ECONNREFUSED') {
      console.warn('External fact check API error:', error.message);
    }
  }

  return sources;
}

function computeCommunityScore(votesArray) {
  if (!votesArray || votesArray.length === 0) {
    return constants.TRUTH_DEFAULT_SCORE;
  }

  const prior = constants.TRUTH_BAYESIAN_PRIOR;
  const pseudoCount = constants.TRUTH_BAYESIAN_PSEUDO_COUNT;

  let upWeight = 0;
  let downWeight = 0;

  for (const vote of votesArray) {
    const weight = vote.weight || 1;
    if (vote.vote === 1) upWeight += weight;
    else if (vote.vote === -1) downWeight += weight;
    else if (vote.vote === 0) {
      upWeight += weight * 0.5;
      downWeight += weight * 0.5;
    }
  }

  const totalWeight = upWeight + downWeight;
  if (totalWeight === 0) return prior;

  const observed = upWeight / totalWeight;
  const score = (observed * totalWeight + prior * pseudoCount) / (totalWeight + pseudoCount);

  return Math.max(0, Math.min(1, score));
}

async function batchCheckClaims(claims) {
  const results = await Promise.allSettled(
    claims.map((claim) => checkClaim(claim))
  );
  return results.map((r, i) => ({
    claim: claims[i],
    sources: r.status === 'fulfilled' ? r.value : [],
    score: r.status === 'fulfilled' ? computeCommunityScore([]) : constants.TRUTH_DEFAULT_SCORE,
  }));
}

module.exports = {
  checkClaim,
  computeCommunityScore,
  batchCheckClaims,
};
