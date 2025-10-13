const axios = require('axios');

const EVIDENCE_API = process.env.EVIDENCE_API;
const EVIDENCE_JWT = process.env.EVIDENCE_JWT;

/**
 * Post evidence to your hardened backend.
 */
async function postEvidence(payload) {
  const { data } = await axios.post(
    EVIDENCE_API,
    payload,
    { headers: { Authorization: `Bearer ${EVIDENCE_JWT}` } }
  );
  return data;
}

module.exports = { postEvidence };
