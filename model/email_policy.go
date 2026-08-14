package model

import (
	"errors"
	"strings"

	"github.com/QuantumNous/new-api/common"
)

var ErrEmailDomainNotAllowed = errors.New("email domain is not allowed")

// ValidateEmailDomain enforces the configured domain whitelist for every
// account-creation and email-binding path. Empty email addresses retain the
// existing behavior for deployments where email verification is optional.
func ValidateEmailDomain(email string) error {
	if !common.EmailDomainRestrictionEnabled || NormalizeEmail(email) == "" {
		return nil
	}
	_, domain, found := strings.Cut(NormalizeEmail(email), "@")
	if !found || domain == "" {
		return ErrEmailDomainNotAllowed
	}
	for _, allowedDomain := range common.EmailDomainWhitelist {
		if domain == strings.ToLower(strings.TrimSpace(allowedDomain)) {
			return nil
		}
	}
	return ErrEmailDomainNotAllowed
}
