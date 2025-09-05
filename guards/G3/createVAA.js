export function createVAA(entry) {
 

  // fixed guardian order
  const guardianOrder = ["G1", "G2", "G3"]

  const sortedSigs = guardianOrder
    .map(id => entry.sigs.find(s => s.id === id))
    .filter(Boolean) // remove undefined if any guardian missing

  const vaa = {
    version: 1,
    guardianSetIndex: 0,
    signatures: sortedSigs.map((s, idx) => ({
      guardianIndex: idx,
      signature: s.sig,
      pubkey: s.pub,
    })),
    body: {
      digest: entry.digest,
    }
  }

  return vaa
}
