package controller

import (
	"crypto/sha256"
	"fmt"
)

// payloadFingerprint keeps operational correlation without persisting request
// bodies, credentials, or provider responses in application logs.
func payloadFingerprint(payload []byte) string {
	hash := sha256.Sum256(payload)
	return fmt.Sprintf("bytes=%d sha256=%x", len(payload), hash)
}
