package controller

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestShouldRetryStopsAfterResponseHasStarted(t *testing.T) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	err := types.NewOpenAIError(errors.New("upstream reset"), types.ErrorCodeBadResponse, http.StatusBadGateway)

	require.True(t, shouldRetry(c, err, 1), "an unwritten 502 can safely use a fallback channel")

	c.String(http.StatusOK, "data: partial\n\n")
	require.True(t, c.Writer.Written())
	require.False(t, shouldRetry(c, err, 1), "a fallback response must not be appended to an active stream")
}

func TestShouldRetryRetriesUpstreamBodyCacheCapacity(t *testing.T) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", nil)
	err := types.NewOpenAIError(
		errors.New("Invalid request: memory body cache capacity exhausted"),
		types.ErrorCodeBadResponseStatusCode,
		http.StatusBadRequest,
	)

	require.True(t, shouldRetry(c, err, 1), "capacity exhaustion is an upstream transient failure")
	require.False(t, shouldRetry(c, err, 0), "no retry budget must still stop retries")
}
