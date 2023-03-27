import { DormintBoostersTraits } from "../typechain-types";

type Traits = {
  category: number
}

export const getTokensRangeTraitsMap = async (
  traitsInstance: DormintBoostersTraits,
  fromTokenId: number,
  toTokenId: number,
  randomDelay = false
) => {
  if (toTokenId < fromTokenId) {
    throw new Error("'toTokenId' can't be less than 'fromTokenId'")
  }

  const testTrait = await traitsInstance.getTraits(0)
  if (!testTrait.available) {
    throw new Error("Traits are not available yet")
  }

  const result: Array<{ tokenId: number; data: Traits }> = []

  const total = toTokenId - fromTokenId;
  const part = ~~(total / 100);

  for (let tokenId = fromTokenId; tokenId <= toTokenId; tokenId++) {
    // (Optional) Add random delay between 0 and 500ms
    if (randomDelay) {
      await new Promise(resolve => setTimeout(resolve, ~~(Math.random() * 500)))
    }

    if (tokenId % part == 0) {
      const elapsed = tokenId - fromTokenId;
      console.log(`Processing ${(elapsed / total * 100).toFixed(0)}%`)
    }

    const { traits } = await traitsInstance.getTraits(tokenId)
    result.push({
      tokenId,
      data: {
        category: traits.category,
      } as Traits
    })
  }

  return result
}
