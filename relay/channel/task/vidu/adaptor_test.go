package vidu

import (
	"net/http/httptest"
	"testing"

	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestViduQ3RequestUsesQualityMetadataAsResolution(t *testing.T) {
	request := &relaycommon.TaskSubmitReq{
		Prompt:   "A slow camera orbit",
		Duration: 12,
		Size:     "1280x720",
		Metadata: map[string]any{"quality": "540p"},
	}
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{UpstreamModelName: "viduq3-turbo"},
	}

	payload, err := (&TaskAdaptor{}).convertToRequestPayload(request, info)

	require.NoError(t, err)
	assert.Equal(t, "540p", payload.Resolution)
	assert.Equal(t, 12, payload.Duration)
}

func TestViduQ3EstimateBillingUsesResolutionAndDuration(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Set("task_request", relaycommon.TaskSubmitReq{
		Prompt:   "A slow camera orbit",
		Duration: 16,
		Metadata: map[string]any{"quality": "720p"},
	})
	info := &relaycommon.RelayInfo{
		OriginModelName: "viduq3-turbo",
		ChannelMeta:     &relaycommon.ChannelMeta{UpstreamModelName: "viduq3-turbo"},
	}

	ratios := (&TaskAdaptor{}).EstimateBilling(ctx, info)

	assert.InDelta(t, 16*0.0276/0.0184, ratios["request_cost"], 1e-9)
}
