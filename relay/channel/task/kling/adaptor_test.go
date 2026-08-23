package kling

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	relaycommon "github.com/QuantumNous/new-api/relay/common"
)

func TestConvertToRequestPayloadResolvesKlingVideoVersion(t *testing.T) {
	tests := []struct {
		name          string
		metadata      map[string]any
		duration      int
		expectedModel string
		wantError     string
	}{
		{
			name:          "defaults aggregate model to v2.6",
			duration:      5,
			expectedModel: "kling-v2-6",
		},
		{
			name:          "selects v3 from model version",
			metadata:      map[string]any{"model_version": "kling-v3"},
			duration:      15,
			expectedModel: "kling-v3",
		},
		{
			name:      "rejects unsupported version",
			metadata:  map[string]any{"model_version": "kling-v4"},
			duration:  5,
			wantError: "unsupported kling model_version",
		},
		{
			name:      "rejects unsupported v2.6 duration",
			metadata:  map[string]any{"model_version": "kling-v2-6"},
			duration:  15,
			wantError: "kling-v2-6 duration must be 5 or 10 seconds",
		},
	}

	adaptor := &TaskAdaptor{}
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{UpstreamModelName: "kling-video"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := &relaycommon.TaskSubmitReq{
				Prompt:   "A lighthouse above the sea",
				Duration: test.duration,
				Size:     "1280x720",
				Metadata: test.metadata,
			}

			payload, err := adaptor.convertToRequestPayload(request, info)
			if test.wantError != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), test.wantError)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, test.expectedModel, payload.ModelName)
			assert.Equal(t, test.expectedModel, payload.Model)
		})
	}
}

func TestConvertToRequestPayloadDoesNotAllowMetadataModelOverride(t *testing.T) {
	adaptor := &TaskAdaptor{}
	request := &relaycommon.TaskSubmitReq{
		Prompt:   "A lighthouse above the sea",
		Duration: 5,
		Metadata: map[string]any{
			"model_name": "kling-v1",
			"model":      "kling-v1",
		},
	}
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{UpstreamModelName: "kling-video"},
	}

	payload, err := adaptor.convertToRequestPayload(request, info)

	require.NoError(t, err)
	assert.Equal(t, "kling-v2-6", payload.ModelName)
	assert.Equal(t, "kling-v2-6", payload.Model)
}

func TestKlingV26AudioRequiresProAndIsForwarded(t *testing.T) {
	adaptor := &TaskAdaptor{}
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{UpstreamModelName: "kling-video"},
	}

	request := &relaycommon.TaskSubmitReq{
		Prompt:   "A singer on stage",
		Duration: 5,
		Mode:     "std",
		Metadata: map[string]any{"model_version": "kling-v2-6", "sound": "on"},
	}
	_, err := adaptor.convertToRequestPayload(request, info)
	require.ErrorContains(t, err, "audio requires pro mode")

	request.Mode = "pro"
	payload, err := adaptor.convertToRequestPayload(request, info)
	require.NoError(t, err)
	assert.Equal(t, "on", payload.Sound)
}

func TestKlingEstimateBillingUsesVersionModeDurationAndSound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Set("task_request", relaycommon.TaskSubmitReq{
		Prompt:   "A singer on stage",
		Duration: 10,
		Mode:     "pro",
		Metadata: map[string]any{"model_version": "kling-v2-6", "sound": "on"},
	})
	info := &relaycommon.RelayInfo{
		OriginModelName: "kling-video",
		ChannelMeta:     &relaycommon.ChannelMeta{UpstreamModelName: "kling-video"},
	}

	ratios := (&TaskAdaptor{}).EstimateBilling(ctx, info)

	require.Contains(t, ratios, "request_cost")
	assert.InDelta(t, 0.8820/0.1323, ratios["request_cost"], 1e-9)
}

func TestKlingV3BillingMatrix(t *testing.T) {
	price, err := klingRequestPrice("kling-v3", "pro", 15, "on")
	require.NoError(t, err)
	assert.InDelta(t, 0.1058*15, price, 1e-9)
}

func TestKlingImagesMapToFirstAndLastFrames(t *testing.T) {
	request := &relaycommon.TaskSubmitReq{
		Prompt:   "Move from day to night",
		Duration: 5,
		Images: []string{
			"https://example.com/first.png",
			"https://example.com/last.png",
		},
		Metadata: map[string]any{"model_version": "kling-v2-6"},
	}
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{UpstreamModelName: "kling-video"},
	}

	payload, err := (&TaskAdaptor{}).convertToRequestPayload(request, info)

	require.NoError(t, err)
	assert.Equal(t, request.Images[0], payload.Image)
	assert.Equal(t, request.Images[1], payload.ImageTail)
}
