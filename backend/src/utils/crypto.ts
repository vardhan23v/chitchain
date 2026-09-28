import { ethers } from 'ethers';

export function verifyMessageSignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

export function hashIdentifier(input: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(input));
}
